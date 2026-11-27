import { describe, expect, it } from 'vitest';
import type { NetworkRules } from './types';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { adultEyeExamsCovered, benefitDetailsLink, childrensDentalStatus, parseSbc, restrictionsOf } from './networkRules';

const sbc = (type: string, referral: string, specialistRow: string) =>
  `Summary of Benefits and Coverage Coverage Period: 01/01/2027 - 12/31/2027 Coverage for: Individual/Family | Plan Type: ${type}
   Will you pay less if you use a network provider? Yes. This plan uses a provider network.
   Do you need a referral to see a specialist? ${referral}
   Specialist Visit. Preventive Care. For more information see below.
   If you visit a health care provider's office Specialist visit ${specialistRow} Preventive care/screening No charge Not covered`;

describe('reading network rules from a benefits summary', () => {
  it('reads an EPO without referrals that covers only emergencies outside the network', () => {
    expect(parseSbc(sbc('EPO', 'No. You can see the specialist you choose without a referral.', '$40 copay / visit, deductible does not apply Not covered'))).toMatchObject({
      type: 'EPO',
      referral: 'no',
      outOfNetwork: 'emergencyOnly',
    });
  });
  it('reads an HMO that needs referrals except some specialists', () => {
    expect(parseSbc(sbc('HMO', 'Yes, but you may self-refer to certain specialists.', '$45 / visit Not covered None'))?.referral).toBe('yesSomeSelf');
  });
  it('reads a PPO that pays part of out-of-network care', () => {
    expect(parseSbc(sbc('PPO', 'No.', '$50 copay 50% coinsurance'))).toMatchObject({ type: 'PPO', referral: 'no', outOfNetwork: 'partial' });
  });
  it('leaves the type empty for a high-deductible plan that names no network type', () => {
    expect(parseSbc(sbc('HDHP', 'Yes.', '40% coinsurance Not covered'))).toMatchObject({ type: null, referral: 'yes', outOfNetwork: 'emergencyOnly' });
  });
  it('reads the directory phone line', () => {
    const text = sbc('EPO', 'No.', '$40 Not covered').replace(
      'Yes. This plan uses a provider network.',
      'Yes. See https://example.com/find or call 1-800-555-0100 for a list of network providers. This plan uses a provider network.',
    );
    expect(parseSbc(text)?.directoryPhone).toBe('1-800-555-0100');
  });
  it('ignores summaries for other years', () => {
    expect(parseSbc(sbc('EPO', 'No.', '$40 Not covered').replace('2027 - 12/31/2027', '2026 - 12/31/2026'))).toBeNull();
  });
});

describe('plan restrictions from a summary', () => {
  const table = (urgent: string, er: string, hospital: string) =>
    `Common Medical Event Services You May Need What You Will Pay
     If you visit a health care provider's office Primary care visit $15 copay / visit Not covered First 3 primary and urgent care visits combined.
     Specialist visit $40 copay / visit Not covered None
     If you have tests Imaging (CT/PET scans, MRIs) $300 / visit Not covered Preauthorization required.
     If you need immediate medical attention Emergency room care ${er}
     Emergency medical transportation $375 / trip $375 / trip None
     Urgent care ${urgent}
     If you have a hospital stay Facility fee (e.g., hospital room) ${hospital}
     Physician/surgeon fees Included Not covered None
     Excluded Services & Other Covered Services: Services Your Plan Generally Does NOT Cover (Check your policy or plan document for more information and a list of any other excluded services.)
     • Bariatric surgery • Dental care (Adult & Child) • Weight loss programs 4 of 6
     Other Covered Services (Limitations may apply to these services. This isn't a complete list.)
     • Acupuncture • Routine eye care (Adult) Your Rights to Continue Coverage`;

  it('reads a Kaiser-style plan: urgent care only away from the service area, a 24-hour notice, approvals', () => {
    const r = restrictionsOf(
      table(
        '$100 / visit 40% coinsurance Non-Plan providers are not covered inside the service area.',
        '$450 / visit $450 / visit Must notify the plan within 24 hours if admitted to a Non-Plan provider; limited to initial emergency only.',
        '$525 / day Not covered Preauthorization required.',
      ).replace(/\s+/g, ' '),
    );
    expect(r.urgentCareAway).toEqual({ coverage: 'outsideServiceAreaOnly', note: 'Non-Plan providers are not covered inside the service area.' });
    expect(r.emergencyNote).toMatch(/^Must notify the plan within 24 hours/);
    expect(r.priorApproval).toEqual(['hospitalStay', 'imaging']);
    expect(r.notCovered).toEqual(['Bariatric surgery', 'Dental care (Adult & Child)', 'Weight loss programs']);
    expect(r.otherCovered).toEqual(['Acupuncture', 'Routine eye care (Adult)']);
  });

  it('tells covered-at-the-same-cost from not covered, and ignores reassurances', () => {
    const same = restrictionsOf(table('$100 copay / visit $100 copay / visit None', '$450 / visit $450 / visit Copay is waived if admitted within 24 hours.', '40% coinsurance Not covered None').replace(/\s+/g, ' '));
    expect(same.urgentCareAway).toEqual({ coverage: 'sameAsNetwork' });
    expect(same.emergencyNote).toBeUndefined();
    expect(same.priorApproval).toEqual(['imaging']);
    const not = restrictionsOf(table('$100 copay / visit Not covered None', '$450 / visit $450 / visit None', '40% coinsurance Not covered None').replace(/\s+/g, ' '));
    expect(not.urgentCareAway?.coverage).toBe('notCovered');
  });

  it('spots adult eye exams and missing children’s dental', () => {
    const r: NetworkRules = { type: 'HMO', referral: 'no', outOfNetwork: 'emergencyOnly', source: '', notCovered: ['Dental care (Adult & Child)'], otherCovered: ['Routine eye care (Adult)'] };
    expect(adultEyeExamsCovered({ ...r })).toBe(true);
    expect(childrensDentalStatus({ ...r })).toBe('notCovered');
    // Neither the row nor the exclusions box says: unknown, never "included".
    expect(childrensDentalStatus({ ...r, notCovered: ['Dental care (Adult)'] })).toBe('unknown');
    // The cost table's row wins over an exclusions box that doesn't mention children's dental.
    expect(childrensDentalStatus({ ...r, notCovered: ['Dental care (Adult)'], childrensDental: 'notCovered' })).toBe('notCovered');
    expect(childrensDentalStatus({ ...r, childrensDental: 'covered' })).toBe('covered');
  });

  it('reads the children’s dental check-up row', () => {
    const row = (cells: string) =>
      `Common Medical Event If your child needs dental or eye care Children's glasses No charge Not covered Children's dental check-up ${cells} Excluded Services & Other Covered Services:`;
    expect(restrictionsOf(row('Not covered Not covered None')).childrensDental).toBe('notCovered');
    expect(restrictionsOf(row('No charge, deductible does not apply Not covered 2 cleanings / year')).childrensDental).toBe('covered');
    expect(restrictionsOf('Common Medical Event Specialist visit $40 Not covered').childrensDental).toBeUndefined();
  });
});

describe('benefit details link', () => {
  const plan = (id: string) => KING_COUNTY_PLANS.find((p) => p.id === id)!;

  it("links a Cascade Care plan to its insurer's own summary, not the shared CHPW sheet", () => {
    const link = benefitDetailsLink(plan('84481WA0060005')); // Molina Cascade Complete Gold
    expect(link?.shared).toBe(false);
    expect(link?.url).toContain('molinahealthcare.com');
  });

  it('falls back to the shared sheet, labeled as such, when the plan only borrows a sibling summary', () => {
    expect(benefitDetailsLink(plan('49831WA1940006'))?.shared).toBe(true); // Premera Cascade Silver
  });

  it('never sends a non-CHPW plan to the CHPW sheet without marking it shared', () => {
    for (const p of KING_COUNTY_PLANS) {
      const link = benefitDetailsLink(p);
      if (link && !p.carrier.startsWith('Community Health Plan') && link.url.includes('chpw.org')) expect(link.shared).toBe(true);
    }
  });
});
