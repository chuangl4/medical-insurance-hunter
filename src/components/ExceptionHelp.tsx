import { useState } from 'react';
import { EXCEPTION_RULE, EXCEPTION_TERM, exceptionPolicy } from '../data/exceptionPolicies';
import { fillCostText, tierShare, type DrugLine } from '../domain/drugs';
import type { Plan } from '../domain/types';
import { costShareText, money } from '../format';

interface Props {
  plan: Plan;
  line: DrugLine;
  /** Whether your scenario assumes an exception is approved for this drug. */
  approvedInScenario: boolean;
}

/** A "?" that explains "Not on drug list · exception possible" for one drug on one plan, and what approval would change. */
export function ExceptionHelp({ plan, line, approvedInScenario }: Props) {
  const [open, setOpen] = useState(false);
  const policy = exceptionPolicy(plan.carrier);
  const cashYear = line.price * line.fillsPerYear;
  // Approved exceptions are priced at the plan's highest brand tier, as in ifExceptionApproved.
  const share = plan.benefits ? tierShare(plan.benefits, 'nonPreferredBrand').share : null;

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
            <strong>Paid in cash:</strong> {money(line.price)} × {line.fillsPerYear} fills = {money(cashYear)} a year, outside the plan's
            deductible and out-of-pocket limit.
          </p>
          {share && plan.benefits && (
            <p>
              <strong>If approved:</strong> usually covered at the highest brand tier ({costShareText(share)}):{' '}
              {fillCostText(share, line.price, plan.benefits.deductible.individual)}. Each fill would then count toward the deductible and
              out-of-pocket limit.
            </p>
          )}
          <p className="muted">
            Your scenario currently {approvedInScenario ? 'assumes an exception is approved' : 'counts it as paid in cash'}. Change that under
            Medications in <strong>Your scenario</strong> to see every plan's cost the other way.
          </p>
        </div>
      )}
    </>
  );
}
