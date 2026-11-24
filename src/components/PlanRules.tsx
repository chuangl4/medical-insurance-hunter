import {
  OUT_OF_NETWORK_TEXT,
  PRIOR_APPROVAL_LABELS,
  REFERRAL_TEXT,
  URGENT_AWAY_TEXT,
  adultEyeExamsCovered,
  childrensDentalStatus,
  networkRulesFor,
} from '../domain/networkRules';
import type { Plan } from '../domain/types';

/** The plan's rules and limits from its 2027 Summary of Benefits and Coverage. */
export function PlanRules({ plan }: { plan: Plan }) {
  const rules = networkRulesFor(plan);
  if (!rules) return <p className="muted">This plan's 2027 summary wasn't found.</p>;
  const insurer = plan.carrier.replace(/ \(.*\)$/, '');
  const approvals = rules.priorApproval ?? [];
  const eye = adultEyeExamsCovered(rules);
  const dentalIncluded = childrensDentalStatus(rules) === 'covered';
  return (
    <div className="help-steps plan-rules">
      <span>
        <strong>Getting care:</strong> {REFERRAL_TEXT[rules.referral]}. {OUT_OF_NETWORK_TEXT[rules.outOfNetwork]}.
      </span>
      <span>
        <strong>Emergencies:</strong> covered at any emergency room at the in-network cost.
        {rules.emergencyNote && <> The plan adds: “{rules.emergencyNote}”</>}
      </span>
      <span>
        <strong>Away from home:</strong> {rules.urgentCareAway ? URGENT_AWAY_TEXT[rules.urgentCareAway.coverage] : URGENT_AWAY_TEXT.unknown}
        {rules.urgentCareAway?.note && <> (“{rules.urgentCareAway.note}”)</>}.
      </span>
      <span>
        <strong>Prior approval:</strong>{' '}
        {approvals.length ? (
          <>
            the summary says the insurer must approve {approvals.map((a) => PRIOR_APPROVAL_LABELS[a]).join(', ')} in advance
            {rules.type === 'HMO' && rules.referral !== 'no' ? ', and it decides where planned hospital care happens' : ''}.
          </>
        ) : (
          <>
            this summary doesn’t list any, but {insurer} still requires approval for some services, typically planned hospital stays and
            advanced imaging. Check {insurer}’s prior-authorization list or call before planned care.
          </>
        )}
      </span>
      {(eye !== null || dentalIncluded) && (
        <span>
          <strong>Stands out:</strong>{' '}
          {[
            eye === true ? 'covers routine eye exams for adults (most of these plans don’t)' : null,
            dentalIncluded ? 'includes children’s dental check-ups (most plans don’t; ask the insurer what else it covers)' : null,
          ]
            .filter(Boolean)
            .join('; ') || 'nothing unusual'}
          .
        </span>
      )}
      {rules.notCovered && (
        <span>
          <strong>Not covered:</strong> {rules.notCovered.join('; ')}.
        </span>
      )}
      {rules.otherCovered && (
        <span>
          <strong>Also covered:</strong> {rules.otherCovered.join('; ')}.
        </span>
      )}
      <span className="muted">
        From the plan’s 2027{' '}
        <a href={rules.source} target="_blank" rel="noreferrer">
          Summary of Benefits and Coverage
        </a>
        {rules.inferredFrom && ` (this plan’s own summary wasn’t found; these are the rules of ${rules.inferredFrom})`}. The full plan
        document has more limits.
      </span>
    </div>
  );
}
