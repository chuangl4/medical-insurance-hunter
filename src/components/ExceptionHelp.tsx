import { useState } from 'react';
import { EXCEPTION_RULE, EXCEPTION_TERM, exceptionPolicy } from '../data/exceptionPolicies';
import { money } from '../format';

interface Props {
  carrier: string;
  drugName: string;
  /** This plan's expected year as shown (drug paid in cash), and if exceptions were approved. */
  expectedYear: number | null;
  ifApproved: number | null;
}

/** A "?" that explains "Not on drug list · exception possible" for one plan's insurer. */
export function ExceptionHelp({ carrier, drugName, expectedYear, ifApproved }: Props) {
  const [open, setOpen] = useState(false);
  const policy = exceptionPolicy(carrier);
  const saves = expectedYear !== null && ifApproved !== null ? expectedYear - ifApproved : null;
  return (
    <>
      <button
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-label={`What "${EXCEPTION_TERM}" means for ${drugName} with ${carrier}`}
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
            <strong>{carrier.replace(/ \(.*\)$/, '')}:</strong> {policy.summary}{' '}
            {policy.url && (
              <a href={policy.url} target="_blank" rel="noreferrer">
                {policy.source ?? 'Source'}
              </a>
            )}
          </p>
          {saves !== null && saves > 0 && (
            <p>
              <strong>Cost:</strong> the yearly costs here count {drugName} as paid in cash (the worst case). If an exception
              is approved, this plan's expected year would be about <strong>{money(ifApproved!)}</strong> instead of{' '}
              {money(expectedYear!)}, saving about {money(saves)}.
            </p>
          )}
        </div>
      )}
    </>
  );
}
