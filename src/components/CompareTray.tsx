import { useState } from 'react';
import type { EvaluatedPlan } from '../domain/types';
import { money } from '../format';

interface Props {
  plans: EvaluatedPlan[];
  max: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: () => void;
}

/**
 * Pinned to the bottom of the plan list once a plan is picked, so the way to Compare is always in view while scrolling.
 * Shows each pick with its yearly cost, the slots left, and why the button is waiting when only one plan is picked.
 */
export function CompareTray({ plans, max, onRemove, onClear, onOpen }: Props) {
  // On narrow screens the slots fold away behind a one-line summary.
  const [expanded, setExpanded] = useState(false);
  if (plans.length === 0) return null;

  const ready = plans.length >= 2;
  const full = plans.length >= max;
  const status = full
    ? `Compare is full: ${max} plans. Remove one to add another.`
    : ready
      ? `${plans.length} of ${max} picked.`
      : 'Pick one more plan to compare.';

  return (
    <aside className={expanded ? 'compare-tray expanded' : 'compare-tray'} aria-label="Plans to compare">
      <div className="tray-inner">
        <button type="button" className="tray-summary" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
          {plans.length} plan{plans.length === 1 ? '' : 's'} picked <span aria-hidden="true">{expanded ? '▾' : '▴'}</span>
        </button>
        <ul className="tray-slots">
          {plans.map((p) => (
            <li key={p.plan.id} className="tray-slot">
              <div className="tray-slot-text">
                <strong title={p.plan.name}>{p.plan.name}</strong>
                <span className="muted">{p.scenarioYear === null ? p.plan.carrier : `${money(p.scenarioYear)}/yr in your scenario`}</span>
              </div>
              <button type="button" className="tray-remove" aria-label={`Remove ${p.plan.name} from compare`} onClick={() => onRemove(p.plan.id)}>
                ✕
              </button>
            </li>
          ))}
          {Array.from({ length: max - plans.length }, (_, i) => (
            <li key={`empty-${i}`} className="tray-slot empty-slot" aria-hidden="true">
              {i === 0 ? '+ Add a plan' : ''}
            </li>
          ))}
        </ul>
        <div className="tray-actions">
          <button type="button" className="primary" disabled={!ready} onClick={onOpen}>
            {ready ? `Compare ${plans.length} plans →` : 'Compare'}
          </button>
          <p className="tray-status" role="status">
            {status}{' '}
            <button type="button" className="link-button" onClick={onClear}>
              Clear
            </button>
          </p>
        </div>
      </div>
    </aside>
  );
}
