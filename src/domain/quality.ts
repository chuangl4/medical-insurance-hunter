import { QUALITY_RATINGS } from '../data/qualityRatings';
import type { Plan, QualityRating } from './types';

/** The CMS quality rating that applies to a plan: its insurer's (the plan ID's first five characters). */
export const qualityFor = (plan: Plan): QualityRating | undefined => QUALITY_RATINGS[plan.id.slice(0, 5)];

/** "★★★★☆" for 4 stars. */
export const starsText = (stars: number): string => '★'.repeat(stars) + '☆'.repeat(5 - stars);
