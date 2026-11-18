/**
 * Each insurer's own provider directory for its 2027 Washington individual plans, so users can check doctors and
 * specialists near them with the insurer's current data. Links come from the plans' 2027 Summaries of Benefits and
 * Coverage or, where those point only to a home page or a retired site, from the insurer's own website. Checked
 * 2026-11-16.
 */
export const PROVIDER_DIRECTORIES_CHECKED = '2026-11-16';

export interface ProviderDirectory {
  url: string;
  /** The network or plan to pick in the directory, when it asks. */
  pick?: string;
  /** True when the link opens the directory on that network already. */
  preselected?: boolean;
}

export const PROVIDER_DIRECTORIES: Record<string, ProviderDirectory> = {
  'Ambetter (Coordinated Care)': { url: 'https://ambetterhealth.com/en/wa/findadoc', pick: 'Washington, then your Ambetter plan' },
  BridgeSpan: { url: 'https://bridgespanhealth.com/go/WA/IndividualValue', pick: 'Individual Value', preselected: true },
  'Community Health Plan of Washington': { url: 'https://individualandfamily.chpw.org/find-a-doctor/', pick: 'Cascade Select' },
  'Kaiser Permanente': { url: 'https://healthy.kaiserpermanente.org/washington/doctors-locations' },
  Molina: { url: 'https://molina.sapphirethreesixtyfive.com/?network_id=10&locale=en&ci=molina', pick: 'WA - Molina Marketplace', preselected: true },
  'Premera Blue Cross': { url: 'https://www.premera.com/find-a-doctor', pick: 'Individual Signature network' },
  'Regence BlueShield': { url: 'https://regence.com/go/WW/IndividualConnect', pick: 'Individual Connect', preselected: true },
  UnitedHealthcare: { url: 'https://uhc.com/xwadocfindoa2027', pick: 'the 2027 Washington Individual & Family network' },
  Wellpoint: { url: 'https://www.wellpoint.com/find-care/?alphaprefix=3809', pick: 'Washington individual plans' },
};
