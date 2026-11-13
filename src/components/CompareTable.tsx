import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, hospitalStatus } from '../data/hospitalNetworks';
import type { EvaluatedPlan } from '../domain/types';
import { costShareText, money, moneyOrUnknown, primaryCareText } from '../format';

interface Props {
  plans: EvaluatedPlan[];
  onRemove: (id: string) => void;
  onBrowse: () => void;
}

interface Row {
  label: string;
  text: (p: EvaluatedPlan) => string;
  /** Rows with a numeric value mark the lowest plan. */
  value?: (p: EvaluatedPlan) => number | null;
}

const ROWS: Row[] = [
  ...HOSPITAL_IDS.map((id) => ({
    label: HOSPITALS[id].name,
    text: (p: EvaluatedPlan) => STATUS_LABELS[hospitalStatus(p.plan, id)],
  })),
  { label: 'Monthly premium', text: (p) => money(p.netMonthly), value: (p) => p.netMonthly },
  { label: 'Tax credit', text: (p) => (p.creditMonthly > 0 ? `${money(p.creditMonthly)}/mo` : 'None') },
  { label: 'Expected year', text: (p) => moneyOrUnknown(p.expectedYear), value: (p) => p.expectedYear },
  { label: 'Bad year', text: (p) => moneyOrUnknown(p.badYear), value: (p) => p.badYear },
  { label: 'Worst case', text: (p) => moneyOrUnknown(p.worstCase), value: (p) => p.worstCase },
  { label: 'Deductible', text: (p) => moneyOrUnknown(p.deductible), value: (p) => p.deductible },
  { label: 'Out-of-pocket limit', text: (p) => moneyOrUnknown(p.oopMax), value: (p) => p.oopMax },
  { label: 'Primary care', text: (p) => primaryCareText(p.plan.benefits) },
  { label: 'Specialist', text: (p) => costShareText(p.plan.benefits?.specialist) },
  { label: 'Generic drugs', text: (p) => costShareText(p.plan.benefits?.genericRx) },
  { label: 'Brand-name drugs', text: (p) => costShareText(p.plan.benefits?.brandRx) },
  { label: 'Lab tests', text: (p) => costShareText(p.plan.benefits?.lab) },
  { label: 'X-rays, ultrasounds, eye tests', text: (p) => costShareText(p.plan.benefits?.diagnostic) },
  { label: 'CT or MRI scans', text: (p) => costShareText(p.plan.benefits?.scan) },
  { label: 'Emergency room', text: (p) => costShareText(p.plan.benefits?.er) },
  { label: 'Hospital stay', text: (p) => costShareText(p.plan.benefits?.hospital) },
  { label: 'Metal level', text: (p) => p.plan.metal.charAt(0).toUpperCase() + p.plan.metal.slice(1) },
  {
    label: 'Network',
    text: (p) => (p.plan.network ? `${p.plan.network}${p.plan.networkNote ? ' (from 2026 documents; confirm)' : ''}` : 'See plan details'),
  },
  { label: 'HSA plan', text: (p) => (p.plan.hsaEligible ? 'Yes' : 'No') },
  { label: 'Cascade Care', text: (p) => (p.plan.cascadeCare ? 'Yes' : 'No') },
];

export function CompareTable({ plans, onRemove, onBrowse }: Props) {
  if (plans.length === 0) {
    return (
      <div className="empty">
        <p>Choose up to four plans to compare them side by side.</p>
        <button type="button" className="primary" onClick={onBrowse}>
          Browse plans
        </button>
      </div>
    );
  }

  return (
    <div className="panel compare-wrap">
      <table className="compare">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {plans.map((p) => (
              <th scope="col" key={p.plan.id}>
                <div>{p.plan.name}</div>
                <div className="muted compare-carrier">{p.plan.carrier}</div>
                <button type="button" className="link-button" onClick={() => onRemove(p.plan.id)}>
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const values = row.value ? plans.map(row.value).filter((v): v is number => v !== null) : [];
            const lowest = values.length ? Math.min(...values) : null;
            const showBest = plans.length > 1 && lowest !== null && values.some((v) => v !== lowest);
            return (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {plans.map((p) => {
                  const isBest = showBest && row.value?.(p) === lowest;
                  return (
                    <td key={p.plan.id} className={isBest ? 'best' : undefined}>
                      {row.text(p)}
                      {isBest && <span className="visually-hidden"> (lowest)</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">Highlighted values are the lowest in each row.</p>
    </div>
  );
}
