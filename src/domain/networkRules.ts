import { NETWORK_RULES } from '../data/networkRules';
import type { NetworkRules, NetworkType, Plan, PriorApprovalService } from './types';

/**
 * The network rules on a Summary of Benefits and Coverage's first pages, or null if the text isn't a 2027 SBC.
 * Every SBC uses the same federal template, so the plan type, the referral question, and the specialist row of the
 * cost table (in-network, then out-of-network) are in fixed wording.
 */
export function parseSbc(text: string): Omit<NetworkRules, 'source'> | null {
  const t = text.replace(/\s+/g, ' ');
  if (!/2027/.test(t)) return null;
  const type = t.match(/Plan Type:?\s*(HMO|EPO|PPO|POS)\b/i)?.[1].toUpperCase() as NetworkRules['type'] | undefined;
  const ref = t.match(/Do you need a referral to see a specialist\?\s*(.{0,160})/i)?.[1] ?? '';
  if (!type && !ref) return null;
  const referral: NetworkRules['referral'] = /^No\b/i.test(ref) ? 'no' : /self-refer/i.test(ref) ? 'yesSomeSelf' : /^Yes\b/i.test(ref) ? 'yes' : 'unknown';
  const row = t.split(/Specialist visit\.?\s*/i).slice(1).map((r) => r.slice(0, 160)).find((r) => /\$|%|no charge/i.test(r.slice(0, 40)));
  const outOfNetwork: NetworkRules['outOfNetwork'] = !row ? 'unknown' : /not covered/i.test(row.split(/Preventive/i)[0]) ? 'emergencyOnly' : 'partial';
  const directoryPhone = directoryPhoneOf(t);
  const restrictions = restrictionsOf(t);
  return { type: type ?? null, referral, outOfNetwork, ...(directoryPhone ? { directoryPhone } : {}), ...restrictions };
}

/** The template's service labels, which end one row of the cost table and start the next. */
const ROW_LABELS =
  /Primary care visit|Specialist visit|Preventive care|Diagnostic test|Imaging \(|Generic drugs|Preferred generic|Preferred brand|Non-preferred brand|Specialty drugs|Facility fee \(|Physician\/surgeon fee|Emergency room care|Emergency medical transportation|Urgent care|Outpatient services|Inpatient services|Office visits|Childbirth\/delivery|Home health care|Rehabilitation services|Habilitation services|Skilled nursing care|Durable medical equipment|Hospice services|Children.s eye exam|Children.s glasses|Children.s dental|If you |Excluded Services|Page \d+ of \d+|Common Medical Event/gi;

/** The text of the cost-table row that starts with `label`, up to the next row's label. */
function rowAfter(body: string, label: RegExp): string | null {
  const m = body.match(label);
  if (!m || m.index === undefined) return null;
  const rest = body.slice(m.index + m[0].length);
  ROW_LABELS.lastIndex = 0;
  let end = rest.length;
  for (const next of rest.matchAll(ROW_LABELS)) {
    if (next.index! > 5) { end = next.index!; break; }
  }
  return rest.slice(0, Math.min(end, 400)).trim();
}

const APPROVAL = /authori[sz]ation|authori[sz]ed|pre-?certif|pre-?approv|prior approval|must be approved/i;
const COST = /\$\s?\d[\d,]*(?:\.\d+)?[^$%]{0,45}?(?:visit|day|admission|trip|stay|prescription|copay)|\d+%\s*coinsurance|Not covered|Covered as In-Network|No charge/gi;
const PRIOR_APPROVAL_ROWS: [PriorApprovalService, RegExp][] = [
  ['hospitalStay', /Facility fee \(e\.g\.,? hospital room\)/i],
  ['outpatientSurgery', /Facility fee \(e\.g\.,? ambulatory surgery center\)/i],
  ['imaging', /Imaging \(CT\/?PET scans?,? ?MRI/i],
  ['mentalHealthInpatient', /Inpatient services/i],
  ['skilledNursing', /Skilled nursing care/i],
  ['homeHealth', /Home health care/i],
  ['rehabilitation', /Rehabilitation services/i],
  ['equipment', /Durable medical equipment/i],
  ['hospice', /Hospice services?/i],
  ['specialtyDrugs', /Specialty drugs/i],
];

/**
 * Sentences in a row that state a rule a member must follow (a deadline, a provider restriction), not cost details
 * or reassurances such as "copay waived if admitted".
 */
const RULE = /notify|non-plan|not covered inside|limited to (?:the )?initial|transfer/i;
function ruleSentences(row: string): string | undefined {
  const found = row
    .split(/(?<=[.;])\s+/)
    .map((x) => x.replace(/^.*?(?=(?:Must|Non-Plan|You must|Members must|Limited)\b)/, '').trim())
    .filter((x) => RULE.test(x));
  return found.length ? found.join(' ').slice(0, 240) : undefined;
}

/** Restrictions in the cost table and the excluded/other-covered boxes. */
export function restrictionsOf(t: string): Pick<NetworkRules, 'urgentCareAway' | 'emergencyNote' | 'priorApproval' | 'childrensDental' | 'notCovered' | 'otherCovered'> {
  const start = t.search(/Common Medical Event/i);
  const body = start >= 0 ? t.slice(start) : t;

  const priorApproval = PRIOR_APPROVAL_ROWS.filter(([, label]) => APPROVAL.test(rowAfter(body, label) ?? '')).map(([k]) => k);

  // The row label, not a mention in another row's note: a cost follows it.
  const urgentRow = rowAfter(body, /Urgent care(?=\s+(?:\$|\d|No charge|Not covered))/i);
  let urgentCareAway: NetworkRules['urgentCareAway'] = { coverage: 'unknown' };
  if (urgentRow) {
    const costs = [...urgentRow.matchAll(COST)].map((m) => m[0].trim());
    const away = costs[1] ?? '';
    const note = ruleSentences(urgentRow);
    const coverage = /not covered inside the service area/i.test(urgentRow)
      ? 'outsideServiceAreaOnly'
      : /^not covered/i.test(away)
        ? 'notCovered'
        : /covered as in-network/i.test(away) || (away && away.replace(/\s/g, '') === (costs[0] ?? '').replace(/\s/g, ''))
          ? 'sameAsNetwork'
          : away
            ? 'covered'
            : 'unknown';
    urgentCareAway = { coverage, ...(note ? { note: note.slice(0, 200) } : {}) };
  }

  const emergencyNote = ruleSentences(rowAfter(body, /Emergency room care(?=\s+(?:\$|\d|No charge|Not covered))/i) ?? '');

  // The in-network cost comes first; a plan that covers check-ups shows a price or "No charge".
  const dentalCost = rowAfter(body, /Children.s dental check[- ]*up/i)?.match(COST)?.[0];
  const childrensDental: NetworkRules['childrensDental'] = dentalCost ? (/^not covered/i.test(dentalCost) ? 'notCovered' : 'covered') : undefined;

  const box = (re: RegExp) =>
    (t.match(re)?.[1] ?? '')
      .replace(/Page \d+ of \d+/gi, ' ')
      .replace(/Services Your Plan Generally Does NOT Cover \([^)]*\)/gi, ' ')
      .split(/[•●]/)
      .map((s) => s.replace(/\s+/g, ' ').trim().replace(/\s*\d+ of \d+$/, ''))
      .filter((s) => s.length > 2 && s.length < 90);
  const notCovered = box(/Services Your Plan Generally Does NOT Cover \([^)]*\)(.*?)Other Covered Services/i);
  const otherCovered = box(/Other Covered Services \([^)]*\)(.*?)(?:Your Rights to Continue|$)/i);

  return {
    urgentCareAway,
    ...(emergencyNote ? { emergencyNote } : {}),
    priorApproval,
    ...(childrensDental ? { childrensDental } : {}),
    ...(notCovered.length ? { notCovered } : {}),
    ...(otherCovered.length ? { otherCovered } : {}),
  };
}

/** The phone number in the summary's "Will you pay less if you use a network provider?" answer. */
export function directoryPhoneOf(t: string): string | undefined {
  const answer = (t.match(/Will you pay less if you use a network provider\?\s*(.{0,400})/i)?.[1] ?? '').split(/This plan uses a provider network/i)[0];
  return answer.match(/(?:1-)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/)?.[0];
}
export const networkRulesFor = (plan: Plan): NetworkRules | undefined => NETWORK_RULES[plan.id];

/** The CHPW 2027 Benefit Highlights: the cost sharing every Cascade Care plan at a metal level shares. */
const CASCADE_STANDARD_SHEET = 'https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf';

/**
 * Where to read a plan's benefits: its own 2027 summary when one was found (not one borrowed from a sibling plan),
 * else the document its cost sharing came from. `shared` is set when that is the Cascade Care standard sheet, which
 * belongs to Community Health Plan of Washington rather than the plan's insurer.
 */
export function benefitDetailsLink(plan: Plan): { url: string; shared: boolean } | null {
  const rules = networkRulesFor(plan);
  if (rules && !rules.inferredFrom) return { url: rules.source, shared: false };
  if (!plan.benefits) return null;
  return { url: plan.benefits.source, shared: plan.benefits.source === CASCADE_STANDARD_SHEET };
}

/** The plan's network type: from its 2027 summary when stated, else from the plan data. */
export function networkTypeOf(plan: Plan): { type: NetworkType | null; fromOlderDocs: boolean } {
  const fromSummary = networkRulesFor(plan)?.type;
  if (fromSummary === 'HMO' || fromSummary === 'EPO' || fromSummary === 'PPO') return { type: fromSummary, fromOlderDocs: false };
  return { type: plan.network, fromOlderDocs: Boolean(plan.network && plan.networkNote) };
}

export const REFERRAL_TEXT: Record<NetworkRules['referral'], string> = {
  no: 'See specialists without a referral',
  yes: 'Referral needed to see specialists',
  yesSomeSelf: 'Referral needed for most specialists (some you can see directly)',
  unknown: 'Referral rules not stated',
};

export const OUT_OF_NETWORK_TEXT: Record<NetworkRules['outOfNetwork'], string> = {
  emergencyOnly: 'Outside the network: emergencies only',
  partial: 'Outside the network: partly covered',
  unknown: 'Outside the network: not stated',
};

/** What the network types mean, for the explanation. */
export const NETWORK_TYPE_HELP: Record<NetworkType, string> = {
  HMO: 'HMO: you use the plan’s own network of doctors and hospitals. Some HMOs also need a referral from your primary doctor before you see a specialist.',
  EPO: 'EPO: you use the plan’s network, but usually without referrals. Like an HMO, care outside the network isn’t covered except emergencies.',
  PPO: 'PPO: the plan also pays part of the cost outside its network, usually at a higher share for you.',
};

export const PRIOR_APPROVAL_LABELS: Record<PriorApprovalService, string> = {
  hospitalStay: 'hospital stays',
  outpatientSurgery: 'outpatient surgery',
  imaging: 'CT/PET/MRI scans',
  mentalHealthInpatient: 'inpatient mental health care',
  skilledNursing: 'skilled nursing',
  homeHealth: 'home health care',
  rehabilitation: 'rehabilitation',
  equipment: 'medical equipment',
  hospice: 'hospice',
  specialtyDrugs: 'specialty drugs',
};

export const URGENT_AWAY_TEXT: Record<NonNullable<NetworkRules['urgentCareAway']>['coverage'], string> = {
  sameAsNetwork: 'Urgent care at any clinic: covered at the in-network cost',
  covered: 'Urgent care at any clinic: covered (cost may differ)',
  outsideServiceAreaOnly: "Urgent care outside the network: covered only away from the plan's service area",
  notCovered: 'Urgent care outside the network: not covered',
  unknown: 'Urgent care outside the network: not stated',
};

/** Adult routine eye exams, which most of these plans exclude. */
export const adultEyeExamsCovered = (r: NetworkRules): boolean | null =>
  r.otherCovered?.some((x) => /eye/i.test(x)) ? true : r.notCovered?.some((x) => /eye/i.test(x)) ? false : null;

/**
 * Whether the plan includes children's dental check-ups, which most plans leave to a separate dental plan. The cost
 * table's row decides; the exclusions box is only a fallback, since many summaries mark the row "Not covered" without
 * listing it there. 'unknown' when neither says, so a missing row is never reported as included.
 */
export function childrensDentalStatus(r: NetworkRules): 'covered' | 'notCovered' | 'unknown' {
  if (r.childrensDental) return r.childrensDental;
  return r.notCovered?.some((x) => /dental/i.test(x) && /child|&|services/i.test(x)) ? 'notCovered' : 'unknown';
}
