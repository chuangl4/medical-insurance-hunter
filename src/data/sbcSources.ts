/**
 * 2027 Summary of Benefits and Coverage addresses for plans whose insurer has no predictable address pattern,
 * by plan ID, mostly as linked from Washington Healthplanfinder's plan details (collected 2026-11-16). Used by
 * `npm run network-rules`.
 */
const MOLINA = 'https://www.molinahealthcare.com/-/media/project/pws/healthcare/pdf/pdf/ifp/wa/materials/sbc/2027/english';
const CHPW = 'https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/plan';
const PREMERA = 'https://apim.ag.prod.premera.net/api/v1.0/Document/Visitor/PBC%20WA/2027/MCA%20PBC%20WA%20Individual%20FINR%20SBC%20with%20PBC%20WA%20On%20Exchange%20';

export const SBC_URLS: Record<string, string> = {
  // BridgeSpan
  '53732WA0790026': 'https://bridgespanhealth.com/go/2027/SBC/WA/CascadeBronzeIndividualValueEx.pdf',
  '53732WA0790024': 'https://bridgespanhealth.com/go/2027/SBC/WA/CascadeCompleteGoldIndividualValueEx.pdf',
  '53732WA0790030': 'https://bridgespanhealth.com/go/2027/SBC/WA/CascadeVitalGoldIndividualValueEx.pdf',
  '53732WA0790025': 'https://bridgespanhealth.com/go/2027/SBC/WA/CascadeSilverIndividualValueEx.pdf',
  // Community Health Plan of Washington
  '18581WA0140003': `${CHPW}/bronze/CHPW_Individual_and_Family_CascadeSelect_SBC_Bronze_2027.pdf`,
  '18581WA0140001': `${CHPW}/gold/CHPW_Individual_and_Family_CascadeSelect_SBC_Complete_Gold_2027.pdf`,
  '18581WA0140004': `${CHPW}/gold/CHPW_Individual_and_Family_CascadeSelect_SBC_Vital_Gold_2027.pdf`,
  '18581WA0140002': `${CHPW}/silver/CHPW_Individual_and_Family_CascadeSelect_SBC_Silver_2027.pdf`,
  // Molina
  '84481WA0060007': `${MOLINA}/WA27SBCE_B6_1.pdf`,
  '84481WA0060005': `${MOLINA}/WA27SBCE_G6_1.pdf`,
  '84481WA0060009': `${MOLINA}/WA27SBCE_G7_1.pdf`,
  '84481WA0060006': `${MOLINA}/WA27SBCE_S6_1.pdf`,
  // Premera (Cascade Silver's summary wasn't found; see SAME_NETWORK_AS)
  '49831WA1940007': `${PREMERA}(6adac2f4cf).pdf`,
  '49831WA1940005': `${PREMERA}(6adac2f74f).pdf`,
  '49831WA1940009': `${PREMERA}(6adac2f409).pdf`,
  // Regence
  '87718WA2170015': 'https://regence.com/go/2027/SBC/WW/CascadeBronzeIndividualConnectEx.pdf',
  '87718WA2170013': 'https://regence.com/go/2027/SBC/WW/CascadeCompleteGoldIndividualConnectEx.pdf',
  '87718WA2170027': 'https://regence.com/go/2027/SBC/WW/CascadeVitalGoldIndividualConnectEx.pdf',
  '87718WA2170014': 'https://regence.com/go/2027/SBC/WW/CascadeSilverIndividualConnectEx.pdf',
  '87718WA2170028': 'https://regence.com/go/2027/SBC/WW/BronzeBasic10KIndividualConnectEx.pdf',
  '87718WA2170004': 'https://regence.com/go/2027/SBC/WW/BronzeEssential9000IndividualConnectEx.pdf',
  // Wellpoint (Cascade Silver's summary wasn't found; see SAME_NETWORK_AS)
  '12435WA0010001': 'https://sbc.wellpoint.com/dpsdeeplink/deepLink/WellpointCascadeCompleteGold/0UFW/English/DG166712048516.pdf',
  '12435WA0010002': 'https://sbc.wellpoint.com/dpsdeeplink/deepLink/WellpointCascadeVitalGold/0UFV/English/DG166712048513.pdf',
};

/**
 * Plans whose summary couldn't be found, and a plan from the same insurer on the same network whose rules they
 * share. The rules are marked as inferred.
 */
export const SAME_NETWORK_AS: Record<string, string> = {
  '49831WA1940006': '49831WA1940007', // Premera Cascade Silver -> Cascade Bronze (Individual Signature network)
  '12435WA0010003': '12435WA0010002', // Wellpoint Cascade Silver -> Cascade Vital Gold
};
