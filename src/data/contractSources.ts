/**
 * Where each plan's full 2027 contract is published (the policy, Evidence of Coverage or benefit booklet), by plan
 * ID. Only contracts that were found and checked against the plan's 2027 costs are listed; the rest of the plans
 * have no contract here yet. Used by `npm run contracts`, which downloads and checks them, and by the plan
 * question box, which only shows for plans listed here. Checked 2026-11-22.
 */
export interface ContractSource {
  /** Shared by plans that use one contract; also the file name under server/contracts/. */
  slug: string;
  url: string;
  title: string;
  insurer: string;
  checked: string;
  /** One contract covers several plans and lists each one's costs, so per-plan costs aren't checked by name. */
  shared?: boolean;
  /**
   * The text never states its year (an unfilled "[Eff Date]"), so the year comes from the address's 2027 folder and
   * the plan's 2027 costs, which differ from 2026's, must still match.
   */
  yearFromAddress?: boolean;
}

export const CONTRACTS_CHECKED = '2026-11-22';

const KAISER = 'https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/eoc/wa/individual-family/2027';
const kaiser = (slug: string, file: string, plan: string): ContractSource => ({
  slug,
  url: `${KAISER}/${file}`,
  title: `Kaiser Permanente ${plan} 2027 Evidence of Coverage`,
  insurer: 'Kaiser Permanente',
  checked: CONTRACTS_CHECKED,
  yearFromAddress: true,
});

const ambetter = (id: string, plan: string): ContractSource => ({
  slug: `ambetter-${id}`,
  url: `https://api.centene.com/EOC/2027/${id}-01.pdf`,
  title: `Ambetter ${plan} 2027 Evidence of Coverage`,
  insurer: 'Ambetter from Coordinated Care',
  checked: CONTRACTS_CHECKED,
});

const CHPW: ContractSource = {
  slug: 'chpw-cascade-select',
  url: 'https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/plan/2027_Cascade_Select_Evidence_of_Coverage.pdf',
  title: 'CHPW Cascade Select 2027 Evidence of Coverage',
  insurer: 'Community Health Plan of Washington',
  checked: CONTRACTS_CHECKED,
  shared: true,
};

export const CONTRACT_SOURCES: Record<string, ContractSource> = {
  '80473WA1000005': kaiser('kaiser-cascade-complete-gold', 'on-cascade-complete-gold-wa-en.pdf', 'Cascade Complete Gold'),
  '80473WA1000006': kaiser('kaiser-cascade-silver', 'on-cascade-silver-wa-en.pdf', 'Cascade Silver'),
  '80473WA1000011': kaiser('kaiser-cascade-vital-gold', 'on-cascade-vital-gold-wa-en.pdf', 'Cascade Vital Gold'),
  '49831WA1940005': {
    slug: 'premera-cascade-complete-gold',
    url: 'https://apim.ag.prod.premera.net/api/v1.0/Document/Visitor/PBC%20WA/2027/MCA%20PBC%20WA%20Individual%20FINR%20Medical%20Booklet%20with%20PBC%20WA%20On%20Exchange%20%286adac6b051%29.pdf',
    title: 'Premera Blue Cross Cascade Complete Gold 2027 Benefit Booklet',
    insurer: 'Premera Blue Cross',
    checked: CONTRACTS_CHECKED,
  },
  '87718WA2170013': {
    slug: 'regence-cascade-complete-gold',
    url: 'https://apis.regence.com/v1/publicdocuments/sales/individual/productId/WMW30958/docType/OM/pdf/CascadeCompleteGoldIndividualConnectEx-policy?brand=blu',
    title: 'Regence Cascade Complete Gold 2027 Policy',
    insurer: 'Regence BlueShield',
    checked: CONTRACTS_CHECKED,
  },
  '61836WA0050036': ambetter('61836WA0050036', 'Cascade Select Bronze'),
  '61836WA0050018': ambetter('61836WA0050018', 'Cascade Complete Gold'),
  '61836WA0050038': ambetter('61836WA0050038', 'Cascade Select Complete Gold'),
  '61836WA0050016': ambetter('61836WA0050016', 'Cascade Select Vital Gold'),
  '61836WA0050022': ambetter('61836WA0050022', 'Cascade Vital Gold'),
  '61836WA0050008': ambetter('61836WA0050008', 'Secure Care 5'),
  '61836WA0050037': ambetter('61836WA0050037', 'Cascade Select Silver'),
  '61836WA0050017': ambetter('61836WA0050017', 'Cascade Silver'),
  '18581WA0140001': CHPW,
  '18581WA0140002': CHPW,
  '18581WA0140003': CHPW,
  '18581WA0140004': CHPW,
};
