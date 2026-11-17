import type { Plan } from '../domain/types';

/**
 * The provider network each King County individual plan uses. Hospitals contract by network, not by insurer, and an
 * insurer can sell more than one (Ambetter's standard plans and its Cascade Select public-option plans). Each other
 * insurer sells one individual network in King County for 2027; its plans' benefit summaries name it.
 */
export type NetworkId =
  | 'ambetter'
  | 'ambetterCascadeSelect'
  | 'bridgespanIndividualValue'
  | 'chpwCascadeSelect'
  | 'kaiserWashington'
  | 'molinaMarketplace'
  | 'premeraIndividualSignature'
  | 'regenceIndividualConnect'
  | 'uhcIndividual'
  | 'wellpointIndividual';

export const NETWORK_NAMES: Record<NetworkId, string> = {
  ambetter: 'Ambetter (standard and Cascade plans)',
  ambetterCascadeSelect: 'Ambetter Cascade Select',
  bridgespanIndividualValue: 'BridgeSpan Individual Value',
  chpwCascadeSelect: 'Community Health Plan Cascade Select',
  kaiserWashington: 'Kaiser Permanente Washington',
  molinaMarketplace: 'Molina Marketplace',
  premeraIndividualSignature: 'Premera Individual Signature',
  regenceIndividualConnect: 'Regence Individual Connect',
  uhcIndividual: 'UnitedHealthcare individual',
  wellpointIndividual: 'Wellpoint individual',
};

const BY_CARRIER: Record<string, NetworkId> = {
  BridgeSpan: 'bridgespanIndividualValue',
  'Community Health Plan of Washington': 'chpwCascadeSelect',
  'Kaiser Permanente': 'kaiserWashington',
  Molina: 'molinaMarketplace',
  'Premera Blue Cross': 'premeraIndividualSignature',
  'Regence BlueShield': 'regenceIndividualConnect',
  UnitedHealthcare: 'uhcIndividual',
  Wellpoint: 'wellpointIndividual',
};

export function planNetwork(plan: Pick<Plan, 'carrier' | 'name'>): NetworkId | null {
  if (plan.carrier === 'Ambetter (Coordinated Care)') return /Cascade Select/i.test(plan.name) ? 'ambetterCascadeSelect' : 'ambetter';
  return BY_CARRIER[plan.carrier] ?? null;
}
