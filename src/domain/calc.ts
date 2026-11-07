import {
  APPLE_HEALTH_ADULT_FPL,
  APPLICABLE_PERCENTAGE_BANDS,
  CARE_PRICES,
  CASCADE_SAVINGS_MAX_FPL,
  CSR_MAX_FPL,
  FPL_EACH_ADDITIONAL,
  FPL_FIRST_PERSON,
  MAX_RATED_CHILDREN,
  MAX_SUBSIDY_FPL,
  ageFactor,
} from './rules2027';
import type { Benefits, CostShare, EvaluatedPlan, Household, Member, Plan, SubsidyEstimate } from './types';

export function povertyLine(householdSize: number): number {
  return FPL_FIRST_PERSON + FPL_EACH_ADDITIONAL * (Math.max(1, householdSize) - 1);
}

/** Expected share of income toward the benchmark plan, or null above the subsidy limit. */
export function contributionPercent(fplPercent: number): number | null {
  if (fplPercent > MAX_SUBSIDY_FPL) return null;
  const band =
    APPLICABLE_PERCENTAGE_BANDS.find((b) => fplPercent >= b.from && fplPercent < b.to) ??
    APPLICABLE_PERCENTAGE_BANDS[APPLICABLE_PERCENTAGE_BANDS.length - 1];
  const progress = (fplPercent - band.from) / (band.to - band.from);
  return band.initial + (band.final - band.initial) * progress;
}

export function monthlyPremium(plan: Plan, ages: number[]): number {
  const adults = ages.filter((age) => age >= 21);
  const ratedChildren = ages
    .filter((age) => age < 21)
    .sort((a, b) => b - a)
    .slice(0, MAX_RATED_CHILDREN);
  const factor = [...adults, ...ratedChildren].reduce((sum, age) => sum + ageFactor(age), 0);
  return plan.basePremium * factor;
}

export function isSoldIn(plan: Plan, county: string): boolean {
  return plan.counties === 'all' || plan.counties.includes(county);
}

/** Second-lowest-cost silver plan on the exchange, the benchmark for the premium tax credit. */
export function benchmarkPremium(plans: Plan[], household: Household): number | null {
  const premiums = plans
    .filter((p) => p.metal === 'silver' && p.channel !== 'off' && isSoldIn(p, household.county))
    .map((p) =>
      monthlyPremium(
        p,
        household.members.map((m) => m.age),
      ),
    )
    .sort((a, b) => a - b);
  if (premiums.length === 0) return null;
  return premiums[Math.min(1, premiums.length - 1)];
}

export function estimateSubsidy(plans: Plan[], household: Household): SubsidyEstimate {
  const benchmarkMonthly = benchmarkPremium(plans, household);
  const base: SubsidyEstimate = {
    status: 'needs-income',
    monthlyCredit: 0,
    fplPercent: null,
    contributionPercent: null,
    benchmarkMonthly,
    csrEligible: false,
    cascadeSavingsPossible: false,
    message: 'Enter your expected income to estimate a premium tax credit.',
  };
  if (household.overSubsidyLimit) {
    return {
      ...base,
      status: 'over-income',
      message: 'You said your income is above the subsidy limit, so no premium tax credit is included.',
    };
  }
  const income = household.annualIncome;
  if (income === null) return base;

  const fplPercent = (income / povertyLine(household.taxHouseholdSize)) * 100;
  const withFpl = { ...base, fplPercent };

  if (household.immigration === 'other') {
    return {
      ...withFpl,
      status: 'ineligible',
      cascadeSavingsPossible: fplPercent <= CASCADE_SAVINGS_MAX_FPL,
      message:
        'From January 1, 2027, federal help is limited to citizens and nationals, lawful permanent residents, Cuban-Haitian Entrants, and COFA migrants. State help may still be available.',
    };
  }
  if (household.filingStatus === 'separate') {
    return {
      ...withFpl,
      status: 'ineligible',
      message: 'Married couples generally must file jointly to get a premium tax credit. Limited exceptions apply.',
    };
  }
  if (household.affordableEmployerOffer) {
    return {
      ...withFpl,
      status: 'ineligible',
      message: 'An affordable employer plan generally rules out a premium tax credit for those offered it.',
    };
  }
  if (fplPercent < APPLE_HEALTH_ADULT_FPL) {
    return {
      ...withFpl,
      status: 'likely-apple-health',
      message: 'This income may qualify for Washington Apple Health (Medicaid), so no tax credit is shown. Check before buying a plan.',
    };
  }
  const contribution = contributionPercent(fplPercent);
  if (contribution === null) {
    return {
      ...withFpl,
      status: 'over-income',
      message: `Income is above ${MAX_SUBSIDY_FPL}% of the poverty level, so no premium tax credit is available in 2027.`,
    };
  }

  const contributionMonthly = (income * contribution) / 100 / 12;
  const monthlyCredit = Math.max(0, (benchmarkMonthly ?? 0) - contributionMonthly);
  return {
    ...withFpl,
    status: monthlyCredit > 0 ? 'eligible' : 'no-credit-needed',
    monthlyCredit,
    contributionPercent: contribution,
    csrEligible: fplPercent <= CSR_MAX_FPL,
    cascadeSavingsPossible: fplPercent <= CASCADE_SAVINGS_MAX_FPL,
    message:
      monthlyCredit > 0
        ? 'The credit is only available when you buy through Washington Healthplanfinder.'
        : 'Your expected contribution is above the benchmark premium, so the estimated credit is $0.',
  };
}

function costAmount(share: Extract<CostShare, { kind: 'copay' }>): number {
  return share.perDayMax === undefined
    ? share.amount
    : share.amount * Math.min(CARE_PRICES.hospitalDays, share.perDayMax);
}

/**
 * Household out-of-pocket cost for in-network care. Each person has their own deductible and
 * out-of-pocket limit inside the family totals.
 */
export function outOfPocket(benefits: Benefits, members: Member[], extraStaysForFirstMember = 0): number {
  const isFamily = members.length > 1;
  let familyDeductibleLeft = isFamily ? benefits.deductible.family : benefits.deductible.individual;
  let familyOopLeft = isFamily ? benefits.oopMax.family : benefits.oopMax.individual;
  let total = 0;

  members.forEach((member, index) => {
    let deductibleLeft = benefits.deductible.individual;
    let oopLeft = benefits.oopMax.individual;
    let introLeft = benefits.introVisits?.count ?? 0;

    const pay = (owed: number) => {
      const paid = Math.min(owed, oopLeft, familyOopLeft);
      oopLeft -= paid;
      familyOopLeft -= paid;
      total += paid;
    };
    const charge = (price: number, share: CostShare) => {
      if (share.kind === 'copay' && !share.afterDeductible) {
        pay(Math.min(costAmount(share), price));
        return;
      }
      const toDeductible = Math.min(price, deductibleLeft, familyDeductibleLeft);
      deductibleLeft -= toDeductible;
      familyDeductibleLeft -= toDeductible;
      const rest = price - toDeductible;
      const afterDeductible =
        share.kind === 'copay' ? (rest > 0 ? Math.min(costAmount(share), rest) : 0) : rest * share.rate;
      pay(toDeductible + afterDeductible);
    };
    const visit = (price: number, share: CostShare, introApplies: boolean) => {
      if (introApplies && introLeft > 0 && benefits.introVisits) {
        introLeft -= 1;
        pay(Math.min(benefits.introVisits.copay, price));
      } else {
        charge(price, share);
      }
    };
    const repeat = (count: number, action: () => void) => {
      for (let i = 0; i < count; i += 1) action();
    };

    repeat(member.primaryVisits, () => visit(CARE_PRICES.primaryVisit, benefits.primary, true));
    repeat(member.specialistVisits, () =>
      visit(CARE_PRICES.specialistVisit, benefits.specialist, benefits.introVisits?.includesSpecialist ?? false),
    );
    repeat(member.genericFills, () => charge(CARE_PRICES.genericFill, benefits.genericRx));
    repeat(member.brandFills, () => charge(CARE_PRICES.brandFill, benefits.brandRx));
    repeat(member.labTests, () => charge(CARE_PRICES.labTest, benefits.lab));
    repeat(member.diagnosticTests, () => charge(CARE_PRICES.diagnosticTest, benefits.diagnostic));
    repeat(member.scans, () => charge(CARE_PRICES.scan, benefits.scan));
    repeat(member.erVisits, () => charge(CARE_PRICES.erVisit, benefits.er));
    repeat(member.hospitalStays + (index === 0 ? extraStaysForFirstMember : 0), () =>
      charge(CARE_PRICES.hospitalStay, benefits.hospital),
    );
  });
  return total;
}

export function evaluatePlan(
  plan: Plan,
  household: Household,
  monthlyCredit: number,
  buyDirect = false,
): EvaluatedPlan {
  const isFamily = household.members.length > 1;
  const fullMonthly = monthlyPremium(
    plan,
    household.members.map((m) => m.age),
  );
  const creditAllowed = plan.channel !== 'off' && !buyDirect;
  const creditMonthly = creditAllowed ? Math.min(monthlyCredit, fullMonthly) : 0;
  const netMonthly = fullMonthly - creditMonthly;
  const annualPremium = netMonthly * 12;
  const { benefits } = plan;
  const selfPayYear =
    household.members.reduce(
      (sum, m) => sum + Object.values(m.selfPayDrugs).reduce((total, cost) => total + (cost ?? 0), 0),
      0,
    ) * 12;
  const base = { plan, fullMonthly, creditMonthly, netMonthly, selfPayYear };
  if (!benefits) {
    return { ...base, expectedYear: null, badYear: null, worstCase: null, deductible: null, oopMax: null };
  }
  const oopMax = isFamily ? benefits.oopMax.family : benefits.oopMax.individual;

  return {
    ...base,
    expectedYear: annualPremium + selfPayYear + outOfPocket(benefits, household.members),
    badYear: annualPremium + selfPayYear + outOfPocket(benefits, household.members, 1),
    worstCase: annualPremium + selfPayYear + oopMax,
    deductible: isFamily ? benefits.deductible.family : benefits.deductible.individual,
    oopMax,
  };
}
