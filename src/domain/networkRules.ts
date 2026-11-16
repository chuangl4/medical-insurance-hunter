import { NETWORK_RULES } from '../data/networkRules';
import type { NetworkRules, NetworkType, Plan } from './types';

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
  return { type: type ?? null, referral, outOfNetwork };
}

export const networkRulesFor = (plan: Plan): NetworkRules | undefined => NETWORK_RULES[plan.id];

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
