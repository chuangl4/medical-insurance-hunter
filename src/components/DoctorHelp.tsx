import { useState } from 'react';
import { HOSPITALS, STATUS_LABELS, hospitalStatus } from '../data/hospitalNetworks';
import { lookupSteps } from '../domain/doctors';
import type { Provider } from '../domain/profile';
import type { Plan } from '../domain/types';

interface Props {
  provider: Provider;
  checking: boolean;
  /** Explain the status for this plan; without it, only the lookups are described. */
  plan?: Plan;
}

const STATE_MARKS = { done: '✓', missing: '–', failed: '✕', running: '…' } as const;
const hospitalNames = () => Object.fromEntries(Object.entries(HOSPITALS).map(([id, h]) => [id, h.name]));

/** A "?" button that lists what the app tried for a doctor and what's left to confirm. */
export function DoctorHelp({ provider, checking, plan }: Props) {
  const [open, setOpen] = useState(false);
  const hospitalId = provider.clinicCheck?.hospitalId;
  const steps = lookupSteps(provider, {
    carrier: plan?.carrier,
    planName: plan?.name,
    checking,
    hospitalNames: hospitalNames(),
    hospitalStatusText: plan && hospitalId ? STATUS_LABELS[hospitalStatus(plan, hospitalId)] : undefined,
  });
  return (
    <>
      <button
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-label={`What the app checked for ${provider.name}`}
        title="What the app checked"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <ol className="help-steps">
          {steps.map((s) => (
            <li key={s.title} className={`step step-${s.state}`}>
              <span className="step-mark" aria-hidden="true">
                {STATE_MARKS[s.state]}
              </span>
              <span>
                <strong>{s.title}.</strong> {s.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
