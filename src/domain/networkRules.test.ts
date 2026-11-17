import { describe, expect, it } from 'vitest';
import { parseSbc } from './networkRules';

const sbc = (type: string, referral: string, specialistRow: string) =>
  `Summary of Benefits and Coverage Coverage Period: 01/01/2027 - 12/31/2027 Coverage for: Individual/Family | Plan Type: ${type}
   Will you pay less if you use a network provider? Yes. This plan uses a provider network.
   Do you need a referral to see a specialist? ${referral}
   Specialist Visit. Preventive Care. For more information see below.
   If you visit a health care provider's office Specialist visit ${specialistRow} Preventive care/screening No charge Not covered`;

describe('reading network rules from a benefits summary', () => {
  it('reads an EPO without referrals that covers only emergencies outside the network', () => {
    expect(parseSbc(sbc('EPO', 'No. You can see the specialist you choose without a referral.', '$40 copay / visit, deductible does not apply Not covered'))).toEqual({
      type: 'EPO',
      referral: 'no',
      outOfNetwork: 'emergencyOnly',
    });
  });
  it('reads an HMO that needs referrals except some specialists', () => {
    expect(parseSbc(sbc('HMO', 'Yes, but you may self-refer to certain specialists.', '$45 / visit Not covered None'))?.referral).toBe('yesSomeSelf');
  });
  it('reads a PPO that pays part of out-of-network care', () => {
    expect(parseSbc(sbc('PPO', 'No.', '$50 copay 50% coinsurance'))).toEqual({ type: 'PPO', referral: 'no', outOfNetwork: 'partial' });
  });
  it('leaves the type empty for a high-deductible plan that names no network type', () => {
    expect(parseSbc(sbc('HDHP', 'Yes.', '40% coinsurance Not covered'))).toEqual({ type: null, referral: 'yes', outOfNetwork: 'emergencyOnly' });
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
