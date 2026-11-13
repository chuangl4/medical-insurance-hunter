import { describe, expect, it } from 'vitest';
import { autoPick, doctorStatus, lookupSteps, nameParts, type DoctorFields, type DoctorRecord } from './doctors';
import type { Plan } from './types';

const plan = (carrier: string) => ({ id: carrier, carrier }) as Plan;
const hospitals: Record<string, string> = { A: 'in', B: 'out' };
const status = (doc: DoctorFields, carrier: string) =>
  doctorStatus(doc, plan(carrier), (p) => hospitals[p.carrier] ?? 'unknown', () => 'Hospital One').status;

const checked: DoctorFields = {
  name: 'Test Doctor',
  clinicCheck: {
    checkedAt: '',
    summary: '',
    clinicName: '',
    clinicUrl: null,
    hospitalId: 'h1',
    carriers: [
      { carrier: 'C', finding: 'accepts', detail: '', url: null },
      { carrier: 'A', finding: 'does-not-accept', detail: '', url: null },
    ],
    premeraListed: false,
  },
};

describe('doctor network status', () => {
  it('is unknown until checked', () => {
    expect(status({ name: 'Test Doctor' }, 'A')).toBe('unknown');
  });
  it('uses website findings, then the hospital the doctor works for', () => {
    expect(status(checked, 'A')).toBe('unlikely'); // the clinic says no, even though the hospital is in network
    expect(status(checked, 'B')).toBe('unlikely'); // works at a hospital that is out of network
    expect(status(checked, 'C')).toBe('likely');
    expect(status(checked, 'Premera Blue Cross')).toBe('unlikely'); // not in Premera's directory
    expect(status({ ...checked, clinicCheck: { ...checked.clinicCheck!, carriers: [] } }, 'A')).toBe('likely');
    expect(status(checked, 'D')).toBe('unknown');
  });
  it("lets the user's confirmation win", () => {
    expect(status({ ...checked, confirmed: { A: 'in', C: 'out' } }, 'A')).toBe('in');
    expect(status({ ...checked, confirmed: { A: 'in', C: 'out' } }, 'C')).toBe('out');
  });
});

const record = (name: string, npi = '1234567890'): DoctorRecord => ({ npi, name, credential: 'MD', specialty: 'Testing', locations: ['1 Main St · Testville, WA · 555-010-0100'] });

describe('automatic registry matches', () => {
  it('reads first and last names from how people write them', () => {
    expect(nameParts('Dr. Test Q. Doctor, MD')).toEqual({ first: 'Test', last: 'Doctor' });
    expect(nameParts('Dr Doctor')).toEqual({ first: '', last: 'Doctor' });
  });
  it('picks only when the match is clear', () => {
    expect(autoPick('Dr. Test Doctor', [record('Pat Doctor')])?.name).toBe('Pat Doctor');
    const two = [record('Test Q. Doctor', '1'), record('Other Doctor', '2')];
    expect(autoPick('Dr. Test Doctor', two)?.npi).toBe('1');
    expect(autoPick('Dr. Test Doctor', [...two, record('Test Doctor', '3')])).toBeNull();
    expect(autoPick('Dr Doctor', two)).toBeNull();
    expect(autoPick('Dr. Q Doctor', two)?.npi).toBe('1'); // goes by a middle name
  });
});

describe('explaining what the app tried', () => {
  const ctx = { carrier: 'Insurer A', planName: 'Gold Plan', checking: false, hospitalNames: { h1: 'Hospital One' } };
  it('says when nothing has run yet, or the search needs a choice', () => {
    expect(lookupSteps({ name: 'Dr Doctor' }, ctx)[0]).toMatchObject({ state: 'missing', text: 'Not searched yet.' });
    const several = lookupSteps(
      { name: 'Dr Doctor', lookup: { registry: { at: '', query: 'Doctor', outcome: 'several', detail: '', candidates: [record('A'), record('B')] } } },
      ctx,
    );
    expect(several[0].text).toContain('found 2 people');
    expect(several[1].text).toBe('Waits for a registry match.');
  });
  it('walks through a finished check and suggests calling the office', () => {
    const steps = lookupSteps({ ...checked, doctor: record('Test Doctor') }, ctx);
    expect(steps.map((s) => s.title)).toEqual(['Found in the national provider registry', 'Clinic and health system websites', 'Hospital', 'Your answer']);
    expect(steps[1]).toMatchObject({ state: 'missing' });
    expect(steps[1].text).toContain("don't mention Insurer A");
    expect(steps[3].text).toContain('555-010-0100');
    expect(steps[3].text).toContain('"Gold Plan"');
  });
});
