import type { NetworkId } from './planNetworks';

/**
 * Each hospital's own published list of the individual (exchange) plans it accepts, by network. These name plans and
 * networks, and conditions, more precisely than Healthplanfinder's facility search, which answers per insurer.
 * Collected 2026-11-17 from the pages linked below; hospitals update them yearly, so check the date.
 *
 * - in: listed as in network.
 * - conditional: listed, with a condition (the note quotes or summarizes the hospital's words).
 * - out: the hospital says it isn't in network.
 * - notListed: the list doesn't name this network (usually not in network).
 * - unclear: the list names something that may or may not be this network.
 */
export type ListStatus = 'in' | 'conditional' | 'out' | 'notListed' | 'unclear';

export interface ListEntry {
  status: ListStatus;
  note?: string;
}

export interface HospitalList {
  source: string;
  /** The plan year the list says it covers, or "undated". */
  year: string;
  /** Networks the list says something about; any other network is treated as not listed. */
  entries: Partial<Record<NetworkId, ListEntry>>;
}

const UW_SPECIALTY_ONLY = 'Authorized specialty care only; does not include primary care';

const UW_MEDICINE: HospitalList = {
  source: 'https://www.uwmedicine.org/patient-resources/billing-and-insurance/washington-health-benefit-exchange',
  year: '2027',
  entries: {
    chpwCascadeSelect: { status: 'conditional', note: UW_SPECIALTY_ONLY },
    kaiserWashington: { status: 'conditional', note: UW_SPECIALTY_ONLY },
    molinaMarketplace: { status: 'in' },
    premeraIndividualSignature: { status: 'in' },
    uhcIndividual: { status: 'in' },
    regenceIndividualConnect: { status: 'out', note: "UW Medicine says it isn't in Regence's exchange plans, including Individual Connect" },
    bridgespanIndividualValue: { status: 'out', note: "UW Medicine says it isn't in Regence's exchange plans, including BridgeSpan" },
  },
};

export const HOSPITAL_LISTS: Record<string, HospitalList> = {
  uw: UW_MEDICINE,
  uwNorthwest: UW_MEDICINE,
  harborview: UW_MEDICINE,
  evergreen: {
    source: 'https://www.evergreenhealth.com/patients-visitors/before-your-visit/insurance-plans-coverage/insurance-for-evergreenhealth-medical-center/',
    year: '2026/2027',
    entries: {
      ambetter: { status: 'in' },
      ambetterCascadeSelect: { status: 'in' },
      chpwCascadeSelect: { status: 'in' },
      molinaMarketplace: { status: 'in' },
      premeraIndividualSignature: { status: 'in' },
      uhcIndividual: { status: 'unclear', note: 'The list names only UnitedHealthcare "Cascade Select"; King County’s 2027 UnitedHealthcare plans aren’t Cascade Select' },
      kaiserWashington: { status: 'notListed', note: 'Kaiser appears only among employer plans (Kaiser HMO/PPO), not in the exchange section' },
      regenceIndividualConnect: { status: 'out', note: 'EvergreenHealth says it isn’t in Regence’s Individual Connect network' },
    },
  },
  overlake: {
    source:
      'https://www.overlakehospital.org/sites/default/files/2026-07/2026%20Overlake%20Medical%20Center%20and%20Clinics_Contracted%20and%20Non-Contracted%20Payor%20Updated%20June%202026.pdf',
    year: '2026 (updated June 2026)',
    entries: {
      ambetter: { status: 'in' },
      ambetterCascadeSelect: { status: 'in' },
      molinaMarketplace: { status: 'in' },
      premeraIndividualSignature: { status: 'in' },
      uhcIndividual: { status: 'in' },
      kaiserWashington: {
        status: 'conditional',
        note: 'All services need a referral or authorization; only Overlake’s Issaquah primary care and urgent care clinics are in network',
      },
      chpwCascadeSelect: { status: 'out' },
      regenceIndividualConnect: { status: 'out' },
      bridgespanIndividualValue: { status: 'out' },
    },
  },
  valley: {
    source: 'https://www.valleymed.org/patients--visitors/billing-and-insurance/washington-health-benefit-exchange',
    year: '2026',
    entries: {
      chpwCascadeSelect: { status: 'conditional', note: 'Authorized specialty care only; does not include primary care' },
      kaiserWashington: { status: 'conditional', note: 'Authorized specialty care only; does not include primary care' },
      molinaMarketplace: { status: 'in' },
      premeraIndividualSignature: { status: 'in' },
      uhcIndividual: { status: 'in' },
      regenceIndividualConnect: { status: 'out', note: 'Valley says most Regence individual plans no longer include it from 2026' },
    },
  },
  fredHutch: {
    source: 'https://fredhutch.org/en/patient-care/patient-services/insurance-and-billing/washington-healthplanfinder.html',
    year: 'undated (page updated November 2026)',
    entries: {
      chpwCascadeSelect: { status: 'in' },
      molinaMarketplace: { status: 'in' },
      premeraIndividualSignature: { status: 'in' },
      kaiserWashington: { status: 'conditional', note: 'Out of network, but Kaiser members can get care at Fred Hutch with prior authorization' },
      uhcIndividual: { status: 'unclear', note: 'The list names UnitedHealthcare "Charter"; confirm it is this plan’s network' },
    },
  },
  seattleChildrens: {
    source: 'https://www.seattlechildrens.org/clinics/paying-for-care/insurance/insurance-plans',
    year: 'undated ("updated yearly")',
    entries: {
      bridgespanIndividualValue: { status: 'in' },
      chpwCascadeSelect: { status: 'in' },
      ambetter: { status: 'in' },
      ambetterCascadeSelect: { status: 'in' },
      molinaMarketplace: { status: 'in' },
      premeraIndividualSignature: { status: 'in', note: 'Some Premera networks need a primary care or specialist referral' },
      wellpointIndividual: { status: 'out' },
      regenceIndividualConnect: { status: 'unclear', note: 'Regence is accepted except named networks; exchange plans aren’t mentioned' },
      kaiserWashington: { status: 'unclear', note: 'Only Kaiser’s Northwest (Oregon) plans are mentioned, as not contracted' },
    },
  },
  virginiaMason: {
    source: 'https://vmfh.org/billing-insurance/insurance-plans/vmmc-insurance-plans',
    year: 'undated',
    entries: {
      ambetter: { status: 'in', note: 'Listed as "Ambetter CCCWAExchange"' },
      ambetterCascadeSelect: { status: 'unclear', note: 'Listed as "Ambetter CCCWAExchange"; Cascade Select isn’t named' },
      premeraIndividualSignature: { status: 'in' },
      regenceIndividualConnect: { status: 'unclear', note: 'Lists "Regence Individual & Family Network", not Individual Connect' },
      uhcIndividual: { status: 'unclear', note: 'Lists UnitedHealthcare "Charter"; confirm it is this plan’s network' },
      kaiserWashington: { status: 'notListed', note: 'Only Kaiser’s PPO plans are listed; Virginia Mason says Kaiser access may be limited' },
    },
  },
};

export const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  in: 'In network',
  conditional: 'In network, with conditions',
  out: 'Out of network',
  notListed: 'Not on the hospital’s list',
  unclear: 'Unclear on the hospital’s list',
};
