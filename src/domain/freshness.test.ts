import { describe, expect, it } from 'vitest';
import { dataSources, dueSources, type DataSource } from './freshness';

const source = (over: Partial<DataSource> = {}): DataSource => ({
  id: 'x',
  label: 'Test data',
  checked: '2026-01-01',
  maxAgeDays: 100,
  refresh: 'Refresh it.',
  ...over,
});

describe('data freshness', () => {
  it('flags a source only once it is older than its limit', () => {
    expect(dueSources(new Date('2026-04-11T12:00:00Z'), [source()])).toEqual([]);
    const due = dueSources(new Date('2026-04-12T12:00:00Z'), [source()]);
    expect(due).toHaveLength(1);
    expect(due[0].reasons[0]).toMatch(/101 days ago \(limit 100\)/);
  });
  it('flags a source with a problem regardless of age', () => {
    expect(dueSources(new Date('2026-01-02T00:00:00Z'), [source({ problem: 'Wrong year.' })])[0].reasons).toEqual(['Wrong year.']);
  });
  it('lists every hand-maintained dataset with a valid date and a refresh step', () => {
    for (const s of dataSources()) {
      expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.refresh.length).toBeGreaterThan(10);
    }
  });
});
