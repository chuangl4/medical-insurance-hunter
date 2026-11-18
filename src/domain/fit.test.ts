import { describe, expect, it } from 'vitest';
import { doctorFit, drugFit, hospitalFit, overallFit } from './fit';

describe('hospitalFit', () => {
  it('is good when every hospital is in network', () => {
    expect(hospitalFit([{ name: 'North General', status: 'in' }, { name: 'Lakeside', status: 'in' }])).toMatchObject({
      level: 'good',
      detail: 'all 2 in network',
    });
  });

  it('names the hospitals that are missing', () => {
    const fit = hospitalFit([{ name: 'North General', status: 'in' }, { name: 'Lakeside', status: 'not-listed' }]);
    expect(fit).toMatchObject({ level: 'bad', detail: '1 of 2 in · Lakeside not listed' });
  });

  it('asks to check conditional or unconfirmed hospitals', () => {
    expect(hospitalFit([{ name: 'Lakeside', status: 'limited' }])?.level).toBe('check');
  });

  it('is absent without hospitals', () => {
    expect(hospitalFit([])).toBeNull();
  });
});

describe('doctorFit', () => {
  it('counts statuses, worst first', () => {
    const fit = doctorFit([
      { status: 'likely', checking: false },
      { status: 'unknown', checking: false },
      { status: 'unknown', checking: true },
    ]);
    expect(fit).toMatchObject({ level: 'check', detail: '1 not confirmed · 1 checking · 1 likely in' });
  });

  it('is bad when a doctor is out', () => {
    expect(doctorFit([{ status: 'out', checking: false }])?.level).toBe('bad');
  });
});

describe('drugFit', () => {
  it('flags drugs missing from the drug list', () => {
    expect(drugFit(['covered', 'covered', 'notListed'])).toMatchObject({ level: 'bad', detail: '2 covered · 1 not on drug list' });
  });

  it('treats cash-only medications as information', () => {
    expect(drugFit(['cash'])?.level).toBe('info');
  });
});

describe('overallFit', () => {
  it('takes the worst must-have level and ignores information', () => {
    const good = hospitalFit([{ name: 'North General', status: 'in' }])!;
    const cash = drugFit(['cash'])!;
    expect(overallFit([good, cash])).toBe('good');
    expect(overallFit([good, doctorFit([{ status: 'unknown', checking: false }])!])).toBe('check');
    expect(overallFit([cash])).toBeNull();
  });
});
