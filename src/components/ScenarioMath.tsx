import { HOSPITAL_STAY, SCENARIOS, scenarioParts, type ScenarioParts } from '../domain/scenarios';
import type { EvaluatedPlan } from '../domain/types';
import { money } from '../format';
import { SeverityMark } from './ScenarioGuide';

interface Props {
  item: EvaluatedPlan;
  firstName: string;
}

type Part = 'premiums' | 'care' | 'cash';
const PART_LABELS: Record<Part, string> = { premiums: 'Premiums', care: 'Your share of care', cash: 'Cash medications' };

/** One plan's three scenarios as stacked bars on a shared scale, with the arithmetic written out. */
export function ScenarioMath({ item, firstName }: Props) {
  const rows = scenarioParts(item);
  if (!rows) return <p className="hint">This plan's benefits aren't known, so its yearly costs can't be broken down.</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const parts: Part[] = item.selfPayYear > 0 ? ['premiums', 'care', 'cash'] : ['premiums', 'care'];
  const [expected, bad, worst] = rows;
  const stayCost = bad.care - expected.care;

  const explain = (r: ScenarioParts) => {
    const sum = `${money(r.premiums)} premiums + ${money(r.care)} care${r.cash ? ` + ${money(r.cash)} cash medications` : ''}`;
    if (r.id === 'expected') return `${sum}. The care amount is what this plan's copays, deductible and coinsurance leave you to pay for your listed care.`;
    if (r.id === 'bad')
      return `${sum}. The ${HOSPITAL_STAY.days}-day stay for ${firstName} adds ${money(stayCost)} of the ${money(HOSPITAL_STAY.price)} bill; the plan pays the rest.`;
    return `${sum}. The care amount is this plan's out-of-pocket limit, the most it lets you pay for covered, in-network care in a year.`;
  };

  return (
    <div className="scenario-math">
      <p className="scenario-takeaway">
        A bad year costs <strong>{money(bad.total - expected.total)} more</strong> than expected; the worst case costs{' '}
        <strong>{money(worst.total - expected.total)} more</strong>.
      </p>
      <ul className="chart-legend" aria-label="Legend">
        {parts.map((p) => (
          <li key={p}>
            <span className={`swatch part-${p}`} aria-hidden="true" />
            {PART_LABELS[p]}
          </li>
        ))}
      </ul>
      <ol className="scenario-rows">
        {rows.map((r) => {
          const meta = SCENARIOS.find((s) => s.id === r.id)!;
          return (
            <li key={r.id} className="scenario-row">
              <div className="scenario-row-head">
                <span className="scenario-row-name">
                  <SeverityMark level={meta.severity} /> {meta.name}
                </span>
                <strong className="num">{money(r.total)}</strong>
              </div>
              <div className="stack-track" role="img" aria-label={`${meta.name}: ${explain(r)}`}>
                {parts.map((p) =>
                  r[p] > 0 ? (
                    <span
                      key={p}
                      className={`stack-seg part-${p}`}
                      style={{ width: `${(r[p] / max) * 100}%` }}
                      title={`${PART_LABELS[p]}: ${money(r[p])}`}
                    />
                  ) : null,
                )}
              </div>
              <p className="scenario-explain">{explain(r)}</p>
            </li>
          );
        })}
      </ol>
      <p className="hint">
        Premiums are the same in every scenario; only your share of care changes. The bars share one scale, so their lengths
        compare directly.
      </p>
    </div>
  );
}
