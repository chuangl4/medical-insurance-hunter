import { describe, expect, it } from 'vitest';
import { FACILITIES, facilityStatus } from '../data/facilityNetworks';
import { disagreements, groupedFacilities, otherAccess } from './hospitalAccess';
import type { Plan } from './types';

const plan = (carrier: string) => ({ id: carrier, carrier }) as Plan;

describe('hospital access', () => {
  it('reads directory results by insurer', () => {
    expect(facilityStatus(plan('Premera Blue Cross'), 'fredHutch')).toBe('in');
    expect(facilityStatus(plan('Kaiser Permanente'), 'virginiaMason')).toBe('out');
    expect(facilityStatus(plan('Unknown Insurer'), 'uw')).toBe('unknown');
  });

  it('puts must-haves first, then specialty centers, then the rest', () => {
    const groups = groupedFacilities(['uw']);
    expect(groups.map((g) => g.tier)).toEqual(['mustHave', 'specialty', 'general']);
    expect(groups[0].facilities.map((f) => f.id)).toEqual(['uw']);
    expect(groups.flatMap((g) => g.facilities)).toHaveLength(FACILITIES.length);
  });

  it('counts the other hospitals and names the missing ones', () => {
    const a = otherAccess(plan('Community Health Plan of Washington'), ['evergreen', 'uw']);
    expect([a.inCount, a.total, a.known]).toEqual([6, 8, true]);
    expect(a.missing.map((f) => f.id)).toEqual(['virginiaMason', 'overlake']);
  });

  it('flags only real disagreements with the hospital list', () => {
    const list = (_: Plan, id: string) => (id === 'uw' ? 'limited' : 'in');
    expect(disagreements(plan('Kaiser Permanente'), ['evergreen', 'uw'], list).map((d) => d.facility.id)).toEqual(['uw']);
    expect(disagreements(plan('Ambetter (Coordinated Care)'), ['uw'], () => 'not-listed')).toEqual([]);
  });
});
