import type { NetworkStatus } from '../data/personalConfig';
import type { DoctorStatus } from './doctors';

/**
 * A plan's fit with the household's own needs, summed up for one line on a plan card. Each part takes statuses
 * already worked out elsewhere, so the summary itself stays free of plan and personal data.
 */
export type FitLevel = 'good' | 'check' | 'bad' | 'info';

export interface FitPart {
  key: 'hospitals' | 'doctors' | 'meds' | 'others' | 'candidates';
  label: string;
  level: FitLevel;
  detail: string;
}

const HOSPITAL_SHORT: Record<NetworkStatus, string> = {
  in: 'in network',
  limited: 'specialty care only',
  out: 'out of network',
  'not-listed': 'not listed',
  unknown: 'unconfirmed',
};

export function hospitalFit(items: { name: string; status: NetworkStatus }[]): FitPart | null {
  if (items.length === 0) return null;
  const inCount = items.filter((h) => h.status === 'in').length;
  const missing = items.filter((h) => h.status !== 'in');
  const level: FitLevel = missing.some((h) => h.status === 'out' || h.status === 'not-listed')
    ? 'bad'
    : missing.length
      ? 'check'
      : 'good';
  const detail = missing.length
    ? `${inCount} of ${items.length} in · ${missing.map((h) => `${h.name} ${HOSPITAL_SHORT[h.status]}`).join(', ')}`
    : items.length === 1
      ? `${items[0].name} in network`
      : `all ${items.length} in network`;
  return { key: 'hospitals', label: 'Hospitals', level, detail };
}

const DOCTOR_SHORT: Record<DoctorStatus | 'checking', string> = {
  in: 'confirmed in',
  likely: 'likely in',
  unknown: 'not confirmed',
  checking: 'checking',
  unlikely: 'likely out',
  out: 'out (you marked)',
};
const DOCTOR_ORDER: (DoctorStatus | 'checking')[] = ['out', 'unlikely', 'unknown', 'checking', 'likely', 'in'];

export function doctorFit(items: { status: DoctorStatus; checking: boolean }[]): FitPart | null {
  if (items.length === 0) return null;
  const keys = items.map((d) => (d.checking && d.status === 'unknown' ? 'checking' : d.status));
  const level: FitLevel = keys.some((k) => k === 'out' || k === 'unlikely')
    ? 'bad'
    : keys.some((k) => k === 'unknown' || k === 'checking')
      ? 'check'
      : 'good';
  const detail = DOCTOR_ORDER.filter((k) => keys.includes(k))
    .map((k) => `${keys.filter((x) => x === k).length} ${DOCTOR_SHORT[k]}`)
    .join(' · ');
  return { key: 'doctors', label: items.length === 1 ? 'Doctor' : 'Doctors', level, detail };
}

/** covered: on the plan's drug list; unchecked: assumed covered; notListed: not on the list; cash: always paid in cash. */
export type DrugFitKind = 'covered' | 'unchecked' | 'notListed' | 'cash';

export function drugFit(kinds: DrugFitKind[]): FitPart | null {
  if (kinds.length === 0) return null;
  const n = (k: DrugFitKind) => kinds.filter((x) => x === k).length;
  // A drug off the list is already priced at cash in the plan's costs, and an exception may be approved, so it's
  // something to look into rather than a miss like an out-of-network hospital.
  const level: FitLevel = n('notListed') || n('unchecked') ? 'check' : n('covered') ? 'good' : 'info';
  const detail = [
    n('covered') && `${n('covered')} covered`,
    n('notListed') && `${n('notListed')} not on drug list`,
    n('unchecked') && `${n('unchecked')} not checked`,
    n('cash') && `${n('cash')} paid in cash`,
  ]
    .filter(Boolean)
    .join(' · ');
  return { key: 'meds', label: kinds.length === 1 ? 'Medication' : 'Medications', level, detail };
}

/** The worst level among the must-have parts; info parts don't count. */
export function overallFit(parts: FitPart[]): Exclude<FitLevel, 'info'> | null {
  const levels = parts.map((p) => p.level).filter((l) => l !== 'info');
  if (levels.length === 0) return null;
  return levels.includes('bad') ? 'bad' : levels.includes('check') ? 'check' : 'good';
}
