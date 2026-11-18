import { useState } from 'react';
import { EXCEPTION_RULE, EXCEPTION_TERM, exceptionPolicy } from '../data/exceptionPolicies';
import { fillCostText, tierShare, type Approvals, type DrugLine } from '../domain/drugs';
import type { EvaluatedPlan } from '../domain/types';
import { costShareText, money } from '../format';

interface Props {
  /** The plan as shown, with this drug paid in cash. */
  item: EvaluatedPlan;
  line: DrugLine;
  /** The plan's costs if just this drug were approved by exception. */
  approved: Approvals[string][string] | undefined;
}

const SCENARIOS = [
  { key: 'expectedYear', label: 'Expected year' },
  { key: 'badYear', label: 'Bad year' },
  { key: 'worstCase', label: 'Worst case' },
] as const;

/** A "?" that explains "Not on drug list · exception possible" for one drug on one plan, with what approval would change. */
export function ExceptionHelp({ item, line, approved }: Props) {
  const [open, setOpen] = useState(false);
  const { plan } = item;
  const policy = exceptionPolicy(plan.carrier);
  const cashYear = line.price * line.fillsPerYear;
  // Approved exceptions are priced at the plan's highest brand tier, as in ifExceptionApproved.
  const share = plan.benefits ? tierShare(plan.benefits, 'nonPreferredBrand').share : null;
  const deductibleFirst = share !== null && (share.kind === 'coinsurance' || share.afterDeductible);
  const rows = approved
    ? SCENARIOS.flatMap((s) => {
        const now = item[s.key];
        const then = approved[s.key];
        return now !== null && then !== null ? [{ ...s, now, then, saves: now - then }] : [];
      })
    : [];
  const expectedSaves = rows.find((r) => r.key === 'expectedYear')?.saves ?? 0;

  return (
    <>
      <button
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-label={`What "${EXCEPTION_TERM}" means for ${line.name} with ${plan.carrier}`}
        title="What this means"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <div className="help-steps exception-help">
          <p>
            <strong>{EXCEPTION_TERM}.</strong> {EXCEPTION_RULE}
          </p>
          <p>
            <strong>{plan.carrier.replace(/ \(.*\)$/, '')}:</strong> {policy.summary}{' '}
            {policy.url && (
              <a href={policy.url} target="_blank" rel="noreferrer">
                {policy.source ?? 'Source'}
              </a>
            )}
          </p>
          <p>
            <strong>{line.name} on this plan.</strong> The costs shown count it as paid in cash: {money(line.price)} × {line.fillsPerYear}{' '}
            fills = {money(cashYear)} a year, which doesn't count toward the plan's deductible or out-of-pocket limit.
            {share && plan.benefits && <> If approved, it would usually be covered at the highest brand tier ({costShareText(share)}): {fillCostText(share, line.price, plan.benefits.deductible.individual)}. Each fill would then count toward the deductible and out-of-pocket limit.</>}
          </p>
          {rows.length > 0 && (
            <table className="exception-table">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">As shown</th>
                  <th scope="col">If approved</th>
                  <th scope="col">Saves</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{r.label}</th>
                    <td>{money(r.now)}</td>
                    <td>{money(r.then)}</td>
                    <td>{money(Math.max(0, r.saves))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {deductibleFirst && plan.benefits && expectedSaves < cashYear * 0.9 && (
            <p>
              <strong>Why the expected year saves {expectedSaves < 1 ? 'nothing' : 'less'}:</strong> the deductible comes first. Until
              covered spending reaches {money(plan.benefits.deductible.individual)} for that person (or{' '}
              {money(plan.benefits.deductible.family)} for the family), you pay the full price of each fill, just as in cash. The savings come
              after that, and the out-of-pocket limit caps the total, which is why the bad year and worst case save more.
            </p>
          )}
          <p className="muted">
            This assumes the plan's price for a fill equals your cash price. Insurers usually pay a lower negotiated price, which is what
            you'd pay during the deductible, so approval may save more than shown.
          </p>
        </div>
      )}
    </>
  );
}
