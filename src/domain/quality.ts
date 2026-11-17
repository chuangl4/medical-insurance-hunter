import { MEMBER_SURVEY, MEMBER_SURVEY_NATIONAL_MEDIAN, QUALITY_RATINGS } from '../data/qualityRatings';
import type { MemberSurvey, Plan, QualityRating } from './types';

/** The CMS quality rating that applies to a plan: its insurer's (the plan ID's first five characters). */
export const qualityFor = (plan: Plan): QualityRating | undefined => QUALITY_RATINGS[plan.id.slice(0, 5)];

/** "★★★★☆" for 4 stars. */
export const starsText = (stars: number): string => '★'.repeat(stars) + '☆'.repeat(5 - stars);


/** Members' survey answers for a plan's insurer. */
export const surveyFor = (plan: Plan): MemberSurvey | undefined => MEMBER_SURVEY[plan.id.slice(0, 5)];

export type SurveyMeasure = Exclude<keyof MemberSurvey, 'respondents'>;

export const SURVEY_LABELS: Record<SurveyMeasure, string> = {
  planRating: 'Rating of the plan',
  careRating: 'Rating of all their health care',
  gettingNeededCare: 'Getting needed care (tests, treatment, specialists)',
  gettingCareQuickly: 'Getting care quickly (appointments when needed)',
  customerService: 'Customer service',
};

/**
 * A score next to the national middle. With roughly 100–250 members surveyed per insurer, differences under 5 points
 * are within normal survey noise, so they read as "typical".
 */
export function compareToNation(measure: SurveyMeasure, score: number | null): 'above' | 'typical' | 'below' | null {
  if (score === null) return null;
  const diff = score - MEMBER_SURVEY_NATIONAL_MEDIAN[measure];
  return diff >= 5 ? 'above' : diff <= -5 ? 'below' : 'typical';
}

/** "6.9 / 10" for the 0–10 ratings, "63 / 100" for the others. */
export const surveyScoreText = (measure: SurveyMeasure, score: number): string =>
  measure === 'planRating' || measure === 'careRating' ? `${(score / 10).toFixed(1)} / 10` : `${score} / 100`;

/** Legal names to search in the Insurance Commissioner's company lookup. */
export const LEGAL_NAMES: Record<string, string> = {
  'Ambetter (Coordinated Care)': 'Coordinated Care Corporation',
  BridgeSpan: 'BridgeSpan Health Company',
  'Community Health Plan of Washington': 'Community Health Plan of Washington',
  'Kaiser Permanente': 'Kaiser Foundation Health Plan of Washington',
  Molina: 'Molina Healthcare of Washington',
  'Premera Blue Cross': 'Premera Blue Cross',
  'Regence BlueShield': 'Regence BlueShield',
  UnitedHealthcare: 'UnitedHealthcare of Oregon',
  Wellpoint: 'Wellpoint',
};
export const COMPANY_LOOKUP_URL = 'https://insurance.wa.gov/agent-and-company-lookup-tool';
