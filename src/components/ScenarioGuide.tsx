import { useState } from 'react';
import type { Member } from '../domain/types';

const STORAGE_KEY = 'mih.scenarioGuide.hidden';

function readHidden(): boolean {
  try {
    // Collapsed to a link unless opened before: the plan cards come first.
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

const joinNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

interface Props {
  /** The household as your scenario has it, to name the medications. */
  members: Member[];
  hasCash: boolean;
}

/** Explains the two yearly numbers on every plan, and how medications are counted in them. */
export function ScenarioGuide({ members, hasCash }: Props) {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = (next: boolean) => {
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Remembering the choice is a convenience only.
    }
  };

  if (hidden) {
    return (
      <button type="button" className="link-button scenario-reopen" onClick={() => toggle(false)}>
        How are the yearly costs worked out?
      </button>
    );
  }

  const linked = [...new Set(members.flatMap((m) => (m.drugs ?? []).filter((d) => d.rxcui).map((d) => d.name)))];

  return (
    <section className="panel scenario-guide" aria-labelledby="scenario-guide-title">
      <div className="scenario-head">
        <h2 id="scenario-guide-title">How the yearly costs are worked out</h2>
        <button type="button" className="link-button" onClick={() => toggle(true)}>
          Hide
        </button>
      </div>
      <ol className="scenario-cards scenario-cards-2">
        <li className="scenario-card">
          <h3>Your scenario</h3>
          <p className="scenario-question">What would the year you have in mind cost?</p>
          <p>
            12 months of premiums, plus your share of the care in <strong>Your scenario</strong> at typical prices after this plan's
            copays, deductible and coinsurance, plus medications paid in cash.
          </p>
        </li>
        <li className="scenario-card">
          <h3>Worst case</h3>
          <p className="scenario-question">What is the most we could pay?</p>
          <p>
            12 months of premiums, plus the plan's out-of-pocket limit, plus medications paid in cash. Past the limit the plan pays 100% of
            covered, in-network care, but cash medications still come on top.
          </p>
        </li>
      </ol>
      <h3 className="guide-subhead">How medications are counted</h3>
      <ul className="med-rules">
        {linked.length > 0 && (
          <li>
            <strong>Checked against each plan's drug list</strong> ({joinNames(linked)}). If the plan covers it, each fill costs that plan's
            share for the drug's tier, as part of care: it counts toward the deductible, and the out-of-pocket limit caps it. If the plan
            doesn't list it, it's paid in cash at your price, on top, with no cap, unless your scenario assumes an exception is approved;
            then it's covered at the plan's highest brand tier.
          </li>
        )}
        {hasCash && (
          <li>
            <strong>Paid in cash on any plan.</strong> Medications you listed as paid without insurance cost the same on every plan, and are
            added on top.
          </li>
        )}
        <li>
          <strong>Other prescriptions you listed</strong> (generic or brand-name fills without a linked drug) are priced at typical prices
          under each plan's generic or brand-name share, as part of care.
        </li>
      </ul>
      <p className="hint">
        Care prices are rough averages, not quotes. Open <strong>Plan details</strong> on any plan card to see its numbers as bars, and each
        medication's fills under <strong>Your fit</strong>.
      </p>
    </section>
  );
}
