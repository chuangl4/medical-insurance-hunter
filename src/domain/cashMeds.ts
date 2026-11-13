import type { CareItem, Profile } from './profile';

/** Why an item is paid without insurance. It decides which next steps are suggested. */
export const CASH_REASONS = ['notOnDrugList', 'usuallyNotCovered', 'preferCash'] as const;
export type CashReason = (typeof CASH_REASONS)[number];

export const CASH_REASON_LABELS: Record<CashReason, string> = {
  notOnDrugList: "Not on the plans' drug lists",
  usuallyNotCovered: "Health plans usually don't cover it",
  preferCash: 'I choose to pay cash',
};

/** Shown once, after the steps. */
export const HSA_TIP = 'With an HSA-eligible plan, you can pay cash costs with pre-tax HSA money.';

/** Next steps for one item, worded for the person reading the page. */
export function cashActions(name: string, reason: CashReason | undefined): string[] {
  switch (reason ?? 'notOnDrugList') {
    case 'notOnDrugList':
      return [
        `Look up ${name} in each finalist plan's 2027 drug list. If a plan lists it, switch the item to a brand-name or generic fill so that plan's price is used.`,
        `If it isn't listed, ask the prescriber to request a formulary exception. If approved, the plan covers it and it counts toward your out-of-pocket limit.`,
        `Meanwhile, check a discount-card price (such as GoodRx) and update the monthly cost.`,
      ];
    case 'usuallyNotCovered':
      return [
        `Ask the provider for the exact monthly price of ${name} and update it here.`,
        `Ask whether a covered alternative to ${name} would work.`,
      ];
    case 'preferCash':
      return [`Compare the cash price with each plan's price for ${name} before deciding.`];
  }
}

export const CASH_RULE =
  "Added to every plan's yearly costs. It never counts toward a deductible or out-of-pocket limit, because the plan pays none of it.";

export interface CashLine {
  item: CareItem;
  person: string;
  monthly: number;
  yearly: number;
}

/** Everything in the profile paid without insurance. */
export function cashLines(profile: Profile): CashLine[] {
  return profile.members.flatMap((m) =>
    m.careItems
      .filter((i) => i.category === 'selfPay' && (i.monthlyCost ?? 0) > 0)
      .map((item) => ({ item, person: m.label || 'Someone', monthly: item.monthlyCost ?? 0, yearly: (item.monthlyCost ?? 0) * 12 })),
  );
}
