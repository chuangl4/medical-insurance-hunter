/**
 * What each insurer publishes about approving a drug that isn't on its drug list (a formulary exception), for
 * the "Not on drug list · exception possible" explanation. Public information; checked 2026-11-16.
 */

export const EXCEPTION_POLICIES_CHECKED = '2026-11-16';

export const EXCEPTION_TERM = 'Not on drug list · exception possible';

/** The rule every individual plan follows (45 CFR 156.122(c)). */
export const EXCEPTION_RULE =
  "The plan doesn't list this drug, but every individual plan must let the prescriber request an exception: the insurer decides within 72 hours (24 if urgent), and a denial can go to an independent reviewer whose decision the insurer must follow. If approved, the drug is usually covered for up to a year at the plan's highest brand tier. In Washington, the plan must grant it when, for example, the listed drug isn't tolerated or is contraindicated; it can't make you ask again for each refill while your prescriber keeps prescribing it; and what you pay counts toward the out-of-pocket limit (WAC 284-43-2021).";

export interface ExceptionPolicy {
  /** One line on what the insurer requires. */
  summary: string;
  /** How much is published: clear current criteria, or not. */
  published: boolean;
  url?: string;
  source?: string;
}

export const EXCEPTION_POLICIES: Record<string, ExceptionPolicy> = {
  // Added 2026-11-18 from each insurer's own pages and drug lists, as noted per entry.
  'Community Health Plan of Washington': {
    summary:
      "Express Scripts reviews requests under CHPW's Medical Necessity for Non-Formulary Medications policy, using its published clinical review criteria. You or your provider can ask online, by fax, or at 1-800-753-2851. Most approvals last a year; a denial can be appealed to CHPW.",
    published: true,
    url: 'https://individualandfamily.chpw.org/member-center/member-resources/prescription-drug-coverage/',
    source: 'CHPW individual and family prescription drug coverage page, checked 2026-11-18',
  },
  UnitedHealthcare: {
    summary:
      'Optum Rx reviews requests. Your provider sends the diagnosis, medication history and clinical justification (online, or 1-800-711-4555), or you can start one at myuhc.com/exchange. If approved, the drug is covered at the second-highest tier. Its criteria for each drug aren\'t published there.',
    published: false,
    url: 'https://www.uhc.com/content/dam/uhcdotcom/en/Pharmacy/PDFs/IFP-PY2026-Updates-to-your-Prescription-Drug-List-WA.pdf',
    source: 'UnitedHealthcare Washington 2026 Individual & Family drug list update notice',
  },
  Wellpoint: {
    summary:
      "Your prescriber asks Wellpoint to review coverage (prior authorization) by calling Member Services or sending its form; if approved, you pay what your plan's benefit says. The drug list doesn't publish the criteria.",
    published: false,
    url: 'https://fm.formularynavigator.com/FBO/143/2027_Select_4_Tier_WA_IND.pdf',
    source: 'Wellpoint 2027 Washington individual drug list',
  },
  'Regence BlueShield': {
    summary:
      "Current criteria for its individual plans weren't found; its drug lists are published as data files without them. Ask Regence for its formulary exception request; Washington's rules apply either way.",
    published: false,
  },
  BridgeSpan: {
    summary:
      "Current criteria for its individual plans weren't found; its drug lists are published as data files without them. Ask BridgeSpan for its formulary exception request; Washington's rules apply either way.",
    published: false,
  },
  // Kaiser: from the drug list its 2027 individual plan summaries link to (kp.org/wa/if-sg-2027).
  'Kaiser Permanente': {
    summary:
      'Covers a non-listed drug when the prescriber shows medical necessity: contraindications, adverse reactions, reduced effect, other risk of harm, or barriers to following treatment. Kaiser may recommend a listed alternative instead; temporary coverage can be asked for while it decides. Request through Member Services, 1-888-630-4636. When a generic exists, the brand is generally non-formulary.',
    published: true,
    url: 'https://wa.kaiserpermanente.org/static/pdf/public/formulary/if-sg-2027.pdf',
    source: 'Kaiser Permanente Washington 2026–2027 individual and small group drug formulary, effective November 2026',
  },
  'Premera Blue Cross': {
    summary:
      'Approves a non-listed drug when the prescriber documents failure, intolerance, or a contraindication with at least two listed alternatives (one if only one exists). Approval up to 12 months; renewal needs evidence it is working.',
    published: true,
    url: 'https://www.premera.com/medicalpolicies-individual/5.01.572.pdf',
    source: 'Premera policy 5.01.572 (individual plans), effective July 1, 2026',
  },
  'Ambetter (Coordinated Care)': {
    summary:
      'Uses drug-specific criteria where it has them; these typically require the matching diagnosis and failure of two listed alternatives from different drug classes, unless side effects or contraindications. Other drugs follow its non-formulary policy (HIM.PA.103). Approval 12 months.',
    published: true,
    url: 'https://www.ambetterhealth.com/en/wa/provider-resources/clinical-payment-policies/',
    source: 'Ambetter Washington pharmacy policies, reviewed February 2026',
  },
  Molina: {
    summary:
      "Offers exceptions through its Medication Exception Request form. Its current Washington criteria aren't published; its last general policy (December 2024) asks for a medical reason the listed alternatives won't work. Ask Molina what it requires.",
    published: false,
    url: 'https://www.molinamarketplace.com/~/media/Molina/PublicWebsite/PDF/Providers/wa/marketplace/formulary-exception-letter.pdf',
    source: 'Molina Washington Marketplace exception letter (2021)',
  },
};

export const exceptionPolicy = (carrier: string): ExceptionPolicy =>
  EXCEPTION_POLICIES[carrier] ?? {
    summary: "This insurer's exception criteria haven't been looked up yet. Ask the insurer what it requires.",
    published: false,
  };
