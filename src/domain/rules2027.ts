/**
 * Rules for the 2027 plan year. Update this file each year.
 *
 * Sources:
 * - Applicable percentages: IRS Rev. Proc. 2026-26, section 3.01
 * - Poverty guidelines (2026, 48 states and DC): HHS, 91 FR, January 2026
 * - Enrollment dates: Washington Healthplanfinder, Federal Changes and Updates
 * - Age curve: federal default age rating curve (45 CFR 147.102 guidance)
 */
export const PLAN_YEAR = 2027;

export const FPL_FIRST_PERSON = 15960;
export const FPL_EACH_ADDITIONAL = 5680;

export const APPLICABLE_PERCENTAGE_BANDS = [
  { from: 0, to: 133, initial: 2.15, final: 2.15 },
  { from: 133, to: 150, initial: 3.23, final: 4.3 },
  { from: 150, to: 200, initial: 4.3, final: 6.78 },
  { from: 200, to: 250, initial: 6.78, final: 8.66 },
  { from: 250, to: 300, initial: 8.66, final: 10.22 },
  { from: 300, to: 400, initial: 10.22, final: 10.22 },
];

export const MAX_SUBSIDY_FPL = 400;
export const APPLE_HEALTH_ADULT_FPL = 138;
export const CSR_MAX_FPL = 250;
export const CASCADE_SAVINGS_MAX_FPL = 250;

/** Rated children: only the three oldest under 21 are charged. */
export const MAX_RATED_CHILDREN = 3;

const AGE_FACTORS_21_TO_64 = [
  1.0, 1.0, 1.0, 1.0, 1.004, 1.024, 1.048, 1.087, 1.119, 1.135, 1.159, 1.183, 1.198, 1.214, 1.222,
  1.23, 1.238, 1.246, 1.262, 1.278, 1.302, 1.325, 1.357, 1.397, 1.444, 1.5, 1.563, 1.635, 1.706,
  1.786, 1.865, 1.952, 2.04, 2.135, 2.23, 2.333, 2.437, 2.548, 2.603, 2.714, 2.81, 2.873, 2.952, 3.0,
];
const AGE_FACTORS_15_TO_20 = [0.833, 0.859, 0.885, 0.913, 0.941, 0.97];

export function ageFactor(age: number): number {
  if (age <= 14) return 0.765;
  if (age <= 20) return AGE_FACTORS_15_TO_20[age - 15];
  if (age >= 64) return 3.0;
  return AGE_FACTORS_21_TO_64[age - 21];
}

/** Rough prices before insurance, used to estimate care costs. These are assumptions, not quotes. */
export const CARE_PRICES = {
  primaryVisit: 180,
  specialistVisit: 280,
  genericFill: 30,
  brandFill: 350,
  labTest: 100,
  diagnosticTest: 400,
  scan: 1500,
  erVisit: 2500,
  hospitalStay: 30000,
  hospitalDays: 3,
};

export const ENROLLMENT = {
  opens: 'November 1, 2026',
  januaryDeadline: 'December 31, 2026',
  closes: 'January 15, 2027',
};
