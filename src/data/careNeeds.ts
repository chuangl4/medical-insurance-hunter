import { PERSONAL } from './personalConfig';

/**
 * Personal presets, passed to the care parser as reference notes so it can reuse prices and
 * breakdowns you've already researched. They're never added to a profile on their own.
 */
export const PARSER_HINTS: string[] = [
  ...Object.values(PERSONAL.careNeeds ?? {}).map((need) => `${need.label}: typically ${need.adds}.`),
  ...Object.values(PERSONAL.selfPayDrugs ?? {}).map(
    (drug) => `${drug.label}: about $${drug.monthlyCost} a month if paid without insurance.`,
  ),
];

/** Names for medication ids saved by earlier versions of the app. */
export const LEGACY_DRUG_NAMES: Record<string, string> = {
  otherMedication: 'Medication not covered by plans',
  ...Object.fromEntries(Object.entries(PERSONAL.selfPayDrugs ?? {}).map(([id, drug]) => [id, drug.label])),
};
