import type { Plan } from '../domain/types';
import { PERSONAL, type Hospital, type NetworkStatus } from './personalConfig';

export type { NetworkStatus } from './personalConfig';
export type HospitalId = string;

/** Hospitals come from the personal config, so none are tracked without it. */
export const HOSPITALS: Record<HospitalId, Hospital> = PERSONAL.hospitals ?? {};
export const HOSPITAL_IDS: HospitalId[] = Object.keys(HOSPITALS);
export const REQUIRED_HOSPITALS: HospitalId[] = PERSONAL.requiredHospitals ?? [];

export const STATUS_LABELS: Record<NetworkStatus, string> = {
  in: 'In network',
  limited: 'Authorized specialty care only',
  'not-listed': 'Not listed as in network',
  unknown: 'Unconfirmed',
};

export function hospitalStatus(plan: Plan, hospital: HospitalId): NetworkStatus {
  return HOSPITALS[hospital]?.status(plan) ?? 'unknown';
}
