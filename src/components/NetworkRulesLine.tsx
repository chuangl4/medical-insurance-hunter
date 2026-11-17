import { useState } from 'react';
import { NETWORK_TYPE_HELP, OUT_OF_NETWORK_TEXT, REFERRAL_TEXT, networkRulesFor, networkTypeOf } from '../domain/networkRules';
import { PROVIDER_DIRECTORIES } from '../data/providerDirectories';
import type { Plan } from '../domain/types';

/** One line of network rules on a plan card (referrals, out-of-network), with a "?" that explains them. */
export function NetworkRulesLine({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const rules = networkRulesFor(plan);
  if (!rules) return null;
  const { type } = networkTypeOf(plan);
  const directory = PROVIDER_DIRECTORIES[plan.carrier];
  return (
    <p className={`network-rules${rules.referral === 'yes' || rules.referral === 'yesSomeSelf' ? ' network-rules-referral' : ''}`}>
      {REFERRAL_TEXT[rules.referral]} · {OUT_OF_NETWORK_TEXT[rules.outOfNetwork]}{' '}
      <button
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-label={`What the network rules mean for ${plan.name}`}
        title="What this means"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {directory && (
        <>
          {' · '}
          <a href={directory.url} target="_blank" rel="noreferrer">
            Find doctors in this network
          </a>
        </>
      )}
      {open && (
        <span className="help-steps network-help">
          {type ? <span>{NETWORK_TYPE_HELP[type]}</span> : <span>This plan’s summary doesn’t name a network type; it uses the insurer’s network.</span>}
          <span>
            <strong>Referrals:</strong>{' '}
            {rules.referral === 'no'
              ? 'you can book with an in-network specialist directly.'
              : 'you need a referral, usually from your primary care doctor, before a specialist visit is covered. Ask the plan which specialists you can see directly (often eye care, women’s health, and behavioral health).'}
          </span>
          <span>
            <strong>Outside the network:</strong>{' '}
            {rules.outOfNetwork === 'emergencyOnly'
              ? 'nothing is paid except emergencies (and urgent care when traveling, if the plan allows it). Check that your doctors and hospitals are in the network.'
              : rules.outOfNetwork === 'partial'
                ? 'the plan pays part of the cost, at a higher share for you.'
                : 'the summary doesn’t say.'}
          </span>
          {directory && (
            <span>
              <strong>Checking doctors:</strong> “Find doctors in this network” opens {plan.carrier.replace(/ \(.*\)$/, '')}’s own directory
              {directory.pick ? (directory.preselected ? ` (it opens on the ${directory.pick} network)` : ` (choose ${directory.pick})`) : ''}. Search by specialty and your ZIP code to see who is in network near you
              {rules.directoryPhone ? `, or call ${rules.directoryPhone}` : ''}. Directories can be out of date, so confirm with the doctor’s office before you enroll.
            </span>
          )}
          <span className="muted">
            From the plan’s 2027{' '}
            <a href={rules.source} target="_blank" rel="noreferrer">
              Summary of Benefits and Coverage
            </a>
            {rules.inferredFrom && `; this plan’s own summary wasn’t found, so these are the rules of ${rules.inferredFrom} on the same network`}.
          </span>
        </span>
      )}
    </p>
  );
}
