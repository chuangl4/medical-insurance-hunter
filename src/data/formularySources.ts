/**
 * Where each insurer publishes its 2027 drug list (formulary) for Washington individual plans, and which plans use
 * it. The drug lookup reads these: machine-readable files directly, PDFs after a one-time conversion.
 *
 * Every insurer below uses one drug list for all of its King County individual plans (Ambetter and Cambia list
 * coverage plan by plan inside their files). Collected 2026-11-15; `updated` is the document's own modified date.
 */

export type FormularySource =
  | {
      kind: 'file';
      /** Federal machine-readable format (drugs.json), keyed by RxNorm id and HIOS plan id. */
      format: 'cms-drugs-json';
      urls: string[];
      /** Index the files are listed in, for finding renamed files later. */
      index: string;
    }
  | {
      kind: 'pdf';
      title: string;
      url: string;
      /** Page the list is linked from, for finding the next version. */
      page: string;
      /** The PDF's own modified date. */
      updated: string;
      /** What ties the list to the plans, so the mapping can be rechecked. */
      evidence: string;
    };

export interface CarrierFormulary {
  /** As in `Plan.carrier`. */
  carrier: string;
  source: FormularySource;
  /**
   * Plans missing from the source that are assumed to use the same list as a plan in it, with why. Shown to
   * users as an assumption.
   */
  sameListAs?: { planIds: string[]; listedPlanId: string; reason: string };
  notes?: string;
}

export const FORMULARY_CHECKED = '2026-11-15';

export const FORMULARY_SOURCES: CarrierFormulary[] = [
  {
    carrier: 'Ambetter (Coordinated Care)',
    source: {
      kind: 'file',
      format: 'cms-drugs-json',
      urls: ['https://api.centene.com/ambetter/reference/drugs-AMB-WA.json'],
      index: 'https://apitest.centene.com/ambetter/reference/cms-data-index.json',
    },
    notes: 'All 8 King County plans are in the file for 2027.',
  },
  {
    carrier: 'BridgeSpan',
    source: {
      kind: 'file',
      format: 'cms-drugs-json',
      urls: ['https://cms-machine-readable.cambiahealth.com/drugs1.json', 'https://cms-machine-readable.cambiahealth.com/drugs2.json'],
      index: 'https://cms-machine-readable.cambiahealth.com/index.json',
    },
  },
  {
    carrier: 'Regence BlueShield',
    source: {
      kind: 'file',
      format: 'cms-drugs-json',
      urls: ['https://cms-machine-readable.cambiahealth.com/drugs1.json', 'https://cms-machine-readable.cambiahealth.com/drugs2.json'],
      index: 'https://cms-machine-readable.cambiahealth.com/index.json',
    },
    sameListAs: {
      planIds: ['87718WA2150029', '87718WA2150030', '87718WA2150001', '87718WA2150026', '87718WA2150003', '87718WA2150004'],
      listedPlanId: '87718WA2170004',
      reason:
        "Regence's off-exchange plans aren't in its machine-readable files and it doesn't post a public PDF; assumed to use the same drug list as its exchange plans.",
    },
    notes: 'The 6 exchange plans are in both Cambia files for 2027.',
  },
  {
    carrier: 'Premera Blue Cross',
    source: {
      kind: 'pdf',
      title: 'Premera 2027 M4 drug list',
      url: 'https://www.premera.com/documents/062278_2027.pdf',
      page: 'https://www.premera.com/visitor/covered-drugs',
      updated: '2026-11-12',
      evidence:
        'The list says it is "for all Premera Blue Cross of Washington Metallic plans", and the Preferred Gold SBC links it. The M1 list (062280_2027) is only for American Indian/Alaska Native zero-cost-share variants.',
    },
    notes: "The PDF's text uses shifted glyph codes, so it needs a PDF library that applies the font's ToUnicode maps.",
  },
  {
    carrier: 'Molina',
    source: {
      kind: 'pdf',
      title: 'Molina Healthcare of Washington Marketplace formulary',
      url: 'https://www.molinahealthcare.com/-/media/Project/PWS/Healthcare/PDF/PDF/IFP/WA/Drugs/MHWA-MARKETPLACE-FORMULARY-EN-508.pdf',
      page: 'https://www.molinahealthcare.com/ifp/wa/drugs',
      updated: '2026-10-16',
      evidence:
        "The 2027 SBC (WA27SBCE_G7_1) points to molinamarketplace.com/WAFormulary2027, which now redirects to Molina's new site. The list linked there is the 2026 edition (effective October 1, 2026); Molina's 2027 drug search goes to CVS Caremark's tool and no 2027 PDF is posted yet.",
    },
    notes: 'Interim: 2026 list until Molina posts its 2027 list; the lookup reports the plan year so the app can say so.',
  },
  {
    carrier: 'Kaiser Permanente',
    source: {
      kind: 'pdf',
      title: '2026-2027 Drug Formulary for Core, Connect, and Access PPO Plans',
      url: 'https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/formularies/wa/if-sg-drug-formulary-wa-en.pdf',
      page: 'https://healthy.kaiserpermanente.org/washington/health-wellness/drug-formulary',
      updated: '2026-10-27',
      evidence: 'Listed under "Individual & Family plans" on Kaiser Washington\'s drug formulary page.',
    },
    notes: 'Healthplanfinder showed the same drug tiers on both Cascade and HSA plans, consistent with one list.',
  },
  {
    carrier: 'UnitedHealthcare',
    source: {
      kind: 'pdf',
      title: 'UnitedHealthcare Individual & Family plans Prescription Drug List, Washington, 2027',
      url: 'https://www.uhc.com/content/dam/uhcdotcom/en/ifp/pdls/IFP_M58661-WA_UHC_IFP_PY27_PDL_v2.pdf',
      page: 'https://www.uhc.com/member-resources/pharmacy-benefits/prescription-drug-lists/individual-exchange',
      updated: '2026-10-27',
      evidence: "UnitedHealthcare publishes one prescription drug list per state for its individual plans; this is Washington's for 2027.",
    },
  },
  {
    carrier: 'Wellpoint',
    source: {
      kind: 'pdf',
      title: 'Wellpoint Select 4 Tier Drug List, Washington individual, 2027',
      url: 'https://fm.formularynavigator.com/FBO/143/2027_Select_4_Tier_WA_IND.pdf',
      page: 'https://www.wellpoint.com/pharmacy/drug-list-formulary',
      updated: '2026',
      evidence: 'The Cascade Vital Gold SBC says "refer to Select Drug List at wellpoint.com/WASelectdrugtier4", which redirects here.',
    },
  },
  {
    carrier: 'Community Health Plan of Washington',
    source: {
      kind: 'pdf',
      title: 'Cascade Select Formulary 2027',
      url: 'https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/pharmacy/CS_RX010_Formulary_2027.pdf',
      page: 'https://individualandfamily.chpw.org/member-center/member-resources/prescription-drug-coverage/',
      updated: '2026-10-20',
      evidence: 'The list covers Cascade Select Complete Gold, Vital Gold, Silver, and Bronze.',
    },
  },
];
