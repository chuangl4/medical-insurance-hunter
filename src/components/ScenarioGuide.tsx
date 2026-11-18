import { useState } from 'react';
import { HOSPITAL_STAY, SCENARIOS, careSummary, type ScenarioId } from '../domain/scenarios';
import type { Member } from '../domain/types';
import { money } from '../format';

const STORAGE_KEY = 'mih.scenarioGuide.hidden';

function readHidden(): boolean {
  try {
    // Collapsed to a link unless opened before: the plan cards come first.
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Three filled or empty bars: how hard a year each scenario describes. */
export function SeverityMark({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className={`severity severity-${level}`} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? 'on' : undefined} />
      ))}
    </span>
  );
}

const joinNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

interface Props {
  members: Member[];
  hasCash: boolean;
}

/** Explains the three yearly numbers on every plan card, in terms of this household. */
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

  const first = members[0]?.label || 'the first person listed';
  const linked = [...new Set(members.flatMap((m) => (m.drugs ?? []).filter((d) => d.rxcui).map((d) => d.name)))];
  const care = careSummary(members);
  const assumptions: Record<ScenarioId, string> = {
    expected: `Your listed care (${care}) at typical prices, with this plan's copays, deductible and coinsurance applied.`,
    bad: `Everything in the expected year, plus an unplanned ${HOSPITAL_STAY.days}-day hospital stay for ${first}, billed at about ${money(HOSPITAL_STAY.price)} before insurance.`,
    worst: "So much covered care that you reach the plan's out-of-pocket limit. After that the plan pays 100% of covered, in-network care, but medications paid in cash still come on top.",
  };

  return (
    <section className="panel scenario-guide" aria-labelledby="scenario-guide-title">
      <div className="scenario-head">
        <h2 id="scenario-guide-title">Three ways to read each plan's yearly cost</h2>
        <button type="button" className="link-button" onClick={() => toggle(true)}>
          Hide
        </button>
      </div>
      <ol className="scenario-cards">
        {SCENARIOS.map((s) => (
          <li key={s.id} className="scenario-card">
            <div className="scenario-title">
              <SeverityMark level={s.severity} />
              <h3>{s.name}</h3>
            </div>
            <p className="scenario-question">{s.question}</p>
            <p>{assumptions[s.id]}</p>
            <p className="scenario-use">
              <strong>Use it to:</strong> {s.useItTo.charAt(0).toLowerCase() + s.useItTo.slice(1)}
            </p>
          </li>
        ))}
      </ol>
      <h3 className="guide-subhead">How medications are counted</h3>
      <ul className="med-rules">
        {linked.length > 0 && (
          <li>
            <strong>Checked against each plan's drug list</strong> ({joinNames(linked)}). If the plan covers it, each fill costs that plan's
            share for the drug's tier and is part of <em>your share of care</em>: it counts toward the deductible, and the out-of-pocket limit
            caps it. If the plan doesn't list it, it's paid in cash at your price, on top of everything else in every scenario, with no cap.
            An approved exception would move it back into care.
          </li>
        )}
        {hasCash && (
          <li>
            <strong>Paid in cash on any plan.</strong> Medications you listed as paid without insurance cost the same on every plan, and are
            added on top in every scenario.
          </li>
        )}
        <li>
          <strong>Other prescriptions you listed</strong> (generic or brand-name fills without a linked drug) are priced at typical prices
          under each plan's generic or brand-name share, as part of care.
        </li>
      </ul>
      <p className="hint">
        All three include 12 months of premiums{hasCash ? ' and your cash medications, which no plan counts toward its limits' : ''}.
        Care prices are rough averages, not quotes. Open <strong>Plan details</strong> on any plan card to see its numbers as bars.
      </p>
    </section>
  );
}
