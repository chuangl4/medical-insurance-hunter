/**
 * What each insurer publishes about approving a drug that isn't on its drug list (a formulary exception), for
 * the "Not on drug list · exception possible" explanation. Public information; checked 2026-11-16.
 */

export const EXCEPTION_TERM = 'Not on drug list · exception possible';

/** The rule every individual plan follows (45 CFR 156.122(c)). */
export const EXCEPTION_RULE =
  "The plan doesn't list this drug, but every individual plan must let the prescriber request an exception: the insurer decides within 72 hours (24 if urgent), and a denial can go to an independent reviewer whose decision the insurer must follow. If approved, the drug is usually covered for up to a year at the plan's highest brand tier.";

export interface ExceptionPolicy {
  /** One line on what the insurer requires. */
  summary: string;
  /** How much is published: clear current criteria, or not. */
  published: boolean;
  url?: string;
  source?: string;
}

export const EXCEPTION_POLICIES: Record<string, ExceptionPolicy> = {
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
