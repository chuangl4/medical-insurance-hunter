import { doctorStatus, type DoctorFields } from '../domain/doctors';
import { listNetworkStatus } from '../domain/hospitalAccess';
import type { Plan } from '../domain/types';
import { FACILITIES, FACILITY_SOURCE } from './facilityNetworks';
import { HOSPITAL_LISTS } from './hospitalLists';

export type HospitalId = string;
/** 'out' is confirmed out of network; 'not-listed' only means the hospital's list didn't name the plan. */
export type NetworkStatus = 'in' | 'limited' | 'out' | 'not-listed' | 'unknown';

export interface Hospital {
  name: string;
  source: string;
  status: (plan: Plan) => NetworkStatus;
}

/**
 * Every hospital the app can check networks for, the same for everyone. Which ones matter to a household comes from
 * its own profile: a must-have provider with a `hospitalId`.
 */
export const HOSPITALS: Record<HospitalId, Hospital> = Object.fromEntries(
  FACILITIES.map((f) => [f.id, { name: f.name, source: HOSPITAL_LISTS[f.id]?.source ?? FACILITY_SOURCE.url, status: listNetworkStatus(f.id) }]),
);

export const STATUS_LABELS: Record<NetworkStatus, string> = {
  in: 'In network',
  limited: 'Authorized specialty care only',
  out: 'Out of network',
  'not-listed': 'Not listed as in network',
  unknown: 'Unconfirmed',
};

export function hospitalStatus(plan: Plan, hospital: HospitalId): NetworkStatus {
  return HOSPITALS[hospital]?.status(plan) ?? 'unknown';
}

/** A doctor's likely network status for a plan, using the hospitals the app tracks. */
export const doctorStatusFor = (doctor: DoctorFields, plan: Plan) =>
  doctorStatus(doctor, plan, hospitalStatus, (id) => HOSPITALS[id]?.name ?? id);
