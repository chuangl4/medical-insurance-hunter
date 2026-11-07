import type { Benefits, CostShare } from './domain/types';

export const money = (value: number): string =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const parseOptionalNumber = (text: string): number | null => {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const moneyOrUnknown = (value: number | null): string => (value === null ? 'Not available' : money(value));

export const costShareText = (share: CostShare | undefined): string => {
  if (!share) return 'Not available';
  if (share.kind === 'coinsurance') {
    return share.rate === 0 ? '$0 after deductible' : `${Math.round(share.rate * 100)}% after deductible`;
  }
  const amount = share.perDayMax === undefined ? money(share.amount) : `${money(share.amount)}/day, up to ${share.perDayMax} days`;
  return share.afterDeductible ? `${amount} after deductible` : amount;
};

export const primaryCareText = (benefits: Benefits | null): string => {
  if (!benefits) return 'Not available';
  const regular = costShareText(benefits.primary);
  const intro = benefits.introVisits;
  return intro ? `${money(intro.copay)} for first ${intro.count} visits, then ${regular}` : regular;
};
