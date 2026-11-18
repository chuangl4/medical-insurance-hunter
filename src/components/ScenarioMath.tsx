import { scenarioParts, type ScenarioParts } from '../domain/scenarios';
import type { EvaluatedPlan } from '../domain/types';
import { money } from '../format';

interface Props {
  item: EvaluatedPlan;
}

type Part = 'premiums' | 'care' | 'cash';
const PART_LABELS: Record<Part, string> = { premiums: 'Premiums', care: 'Your share of care', cash: 'Cash medications' };
const ROW_NAMES: Record<ScenarioParts['id'], string> = { scenario: 'Your scenario', worst: 'Worst case' };
const CARE_LABELS: Record<ScenarioParts['id'], string> = {
  scenario: 'care',
  worst: 'out-of-pocket limit (all covered care)',
};

/** One total as a short sum: premiums, care (and what covered medications cost within it), and cash medications. */
export function CostParts({ parts }: { parts: ScenarioParts }) {
  return (
    <ul className="cost-parts">
      <li>
        {money(parts.premiums)} <span>premiums</span>
      </li>
      <li>
        + {money(parts.care)}{' '}
        <span>
          {CARE_LABELS[parts.id]}
          {parts.coveredDrugs ? ` (${money(parts.coveredDrugs)} of it covered meds)` : ''}
        </span>
      </li>
      {parts.uncoveredDrugs > 0 && (
        <li>
          + {money(parts.uncoveredDrugs)} <span>meds this plan doesn't cover (cash)</span>
        </li>
      )}
      {parts.alwaysCash > 0 && (
        <li>
          + {money(parts.alwaysCash)} <span>meds you pay cash for on any plan</span>
        </li>
      )}
    </ul>
  );
}

/** One plan's scenario and worst case as stacked bars on a shared scale, with the sums written out. */
export function ScenarioMath({ item }: Props) {
  const rows = scenarioParts(item);
  if (!rows) return <p className="hint">This plan's benefits aren't known, so its yearly costs can't be broken down.</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const parts: Part[] = item.selfPayYear > 0 ? ['premiums', 'care', 'cash'] : ['premiums', 'care'];
  const [scenario, worst] = rows;

  return (
    <div className="scenario-math">
      <p className="scenario-takeaway">
        The worst case costs <strong>{money(worst.total - scenario.total)} more</strong> than your scenario.
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
        {rows.map((r) => (
          <li key={r.id} className="scenario-row">
            <div className="scenario-row-head">
              <span className="scenario-row-name">{ROW_NAMES[r.id]}</span>
              <strong className="num">{money(r.total)}</strong>
            </div>
            <div className="stack-track" role="img" aria-label={`${ROW_NAMES[r.id]}: ${money(r.total)}`}>
              {parts.map((p) =>
                r[p] > 0 ? (
                  <span key={p} className={`stack-seg part-${p}`} style={{ width: `${(r[p] / max) * 100}%` }} title={`${PART_LABELS[p]}: ${money(r[p])}`} />
                ) : null,
              )}
            </div>
            <CostParts parts={r} />
          </li>
        ))}
      </ol>
      <p className="hint">
        Care is what this plan's copays, deductible and coinsurance leave you to pay for your scenario's care. In the worst case it's the
        out-of-pocket limit; cash medications come on top, since the limit doesn't cover them.
      </p>
    </div>
  );
}
