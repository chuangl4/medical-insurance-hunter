import { describe, expect, it } from 'vitest';
import { FACILITIES, facilityStatus } from '../data/facilityNetworks';
import { planNetwork } from '../data/planNetworks';
import { disagreements, facilityAccess, groupedFacilities, listNetworkStatus, otherAccess } from './hospitalAccess';
import type { Plan } from './types';

const plan = (carrier: string, name = carrier) => ({ id: carrier, carrier, name }) as Plan;

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

  it('counts the other hospitals, with conditions, and names the missing ones', () => {
    const a = otherAccess(plan('Community Health Plan of Washington'), ['evergreen', 'uw']);
    expect([a.inCount, a.conditionalCount, a.total, a.known]).toEqual([3, 3, 8, true]);
    expect(a.missing.map((f) => f.id)).toEqual(['virginiaMason', 'overlake']);
  });

  it('tells an insurer’s two networks apart', () => {
    expect(planNetwork(plan('Ambetter (Coordinated Care)', 'Ambetter Cascade Select Gold'))).toBe('ambetterCascadeSelect');
    expect(planNetwork(plan('Ambetter (Coordinated Care)', 'Ambetter Cascade Gold'))).toBe('ambetter');
    expect(facilityAccess(plan('Ambetter (Coordinated Care)', 'Ambetter Cascade Gold'), 'virginiaMason').status).toBe('in');
    expect(facilityAccess(plan('Ambetter (Coordinated Care)', 'Ambetter Cascade Select Gold'), 'virginiaMason').status).toBe('unclear');
  });

  it('prefers the hospital’s own list, keeps its conditions, and falls back to Healthplanfinder', () => {
    const kaiserUw = facilityAccess(plan('Kaiser Permanente'), 'uw');
    expect(kaiserUw).toMatchObject({ status: 'conditional', from: 'hospital', year: '2027', directorySays: 'in', disagrees: false });
    expect(kaiserUw.note).toMatch(/specialty care only/);
    expect(facilityAccess(plan('Kaiser Permanente'), 'swedishFirstHill')).toMatchObject({ status: 'in', from: 'healthplanfinder' });
    expect(listNetworkStatus('uw')(plan('Kaiser Permanente'))).toBe('limited');
    expect(listNetworkStatus('evergreen')(plan('Kaiser Permanente'))).toBe('not-listed');
  });

  it('flags where a hospital’s list and Healthplanfinder disagree', () => {
    // Healthplanfinder lists Kaiser at Evergreen; Evergreen's exchange list doesn't.
    expect(disagreements(plan('Kaiser Permanente')).map((d) => d.facility.id)).toContain('evergreen');
    expect(disagreements(plan('Premera Blue Cross'))).toEqual([]);
  });
});
