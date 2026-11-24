import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { api, type PlanAnswer, type PlanReference } from '../api';
import { CONTRACT_SOURCES } from '../data/contractSources';

export interface AskTurn {
  question: string;
  answer: PlanAnswer;
}

/** Earlier turns sent with a follow-up, so "what about…" questions make sense. */
const HISTORY_TURNS = 3;

/** Plans whose contract was already loaded into Claude's cache during this page load. */
const warmed = new Set<string>();

/**
 * Answers may use Markdown. Bold and heading markers are dropped (bold can span two cited pieces, so it can't be
 * rendered per piece); line breaks are kept, so lists still read as lists.
 */
const plain = (text: string) => text.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '');

const answerText = (a: PlanAnswer) => plain(a.segments.map((s) => s.text).join('')).trim();

const referenceLabel = (r: PlanReference): string =>
  r.kind === 'contract' ? `Contract, page ${r.page}` : r.kind === 'facts' ? 'Checked plan facts' : 'Drug list lookup';

function Answer({ answer }: { answer: PlanAnswer }) {
  return (
    <div className="plan-answer">
      <p className={answer.notStated || answer.unsourced ? 'warn' : undefined}>
        {answer.segments.map((s, i) => (
          <span key={i}>
            {plain(s.text)}
            {s.refs.map((n) => (
              <sup key={n} className="plan-ref-mark">
                [{n}]
              </sup>
            ))}
          </span>
        ))}
      </p>
      {answer.references.length > 0 && (
        <details className="plan-sources">
          <summary>Sources ({answer.references.length})</summary>
          <ol className="plan-refs">
            {answer.references.map((r, i) => (
              <li key={i}>
                <q>{r.quote}</q>{' '}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {referenceLabel(r)}
                  </a>
                ) : (
                  <span className="muted">{referenceLabel(r)}</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

interface Props {
  plan: { id: string; name: string; carrier: string };
  turns: AskTurn[];
  onTurnsChange: (planId: string, update: (turns: AskTurn[]) => AskTurn[]) => void;
  suggestions: string[];
  onClose: () => void;
  /** The button that opened the panel, to move focus back to on close. */
  returnFocus: RefObject<HTMLElement | null>;
}

/**
 * A side panel for questions about one plan, answered from its 2027 contract and the app's checked data, with every
 * claim quoted. The conversation lives in memory only: it survives closing the panel, not a page reload.
 */
export function PlanAskPanel({ plan, turns, onTurnsChange, suggestions, onClose, returnFocus }: Props) {
  const source = CONTRACT_SOURCES[plan.id];
  const panel = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus();
    };
  }, [onClose, returnFocus]);

  // Opening the panel is a good sign a question is coming: load the contract into Claude's cache meanwhile.
  useEffect(() => {
    if (!source || warmed.has(plan.id)) return;
    warmed.add(plan.id);
    api.warmPlan(plan.id).catch(() => {});
  }, [plan.id, source]);

  // A different plan starts fresh, without the last plan's draft, error or spinner.
  useEffect(() => {
    setQuestion('');
    setError(null);
    setBusy(false);
  }, [plan.id]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns.length, busy]);

  if (!source) return null;

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const planId = plan.id;
    setBusy(true);
    setError(null);
    try {
      const history = turns.slice(-HISTORY_TURNS).map((t) => ({ question: t.question, answer: answerText(t.answer) }));
      const answer = await api.askPlan(planId, q, history);
      onTurnsChange(planId, (t) => [...t, { question: q, answer }]);
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  return (
    <aside ref={panel} className="side-panel ask-panel" role="dialog" aria-modal="false" aria-labelledby="ask-panel-title" tabIndex={-1}>
      <div className="ask-head">
        <div>
          <h2 id="ask-panel-title">Ask about {plan.name}</h2>
          <p className="muted">
            {plan.carrier} · answers from{' '}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>{' '}
            (checked {source.checked})
          </p>
        </div>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="ask-body">
        {turns.length === 0 && !busy && (
          <div className="ask-start">
            <p className="muted">
              Ask what this plan covers, what you'd pay, or whether a hospital or medication is included. Every answer quotes its source.
            </p>
            <div className="ask-suggestions" role="group" aria-label="Suggested questions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="view" onClick={() => void ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="plan-turn">
            <p className="plan-question">{t.question}</p>
            <Answer answer={t.answer} />
          </div>
        ))}
        <div role="status" aria-live="polite">
          {busy && <p className="muted ask-waiting">Reading the contract… the first answer on a plan can take about 20 seconds.</p>}
        </div>
        {error && <p className="warn">{error}</p>}
        <div ref={end} />
      </div>

      <div className="ask-foot">
        <form onSubmit={submit} className="ask-form">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1000}
            placeholder={turns.length ? 'Ask a follow-up' : 'Ask about this plan'}
            aria-label={`Question about ${plan.name}`}
            disabled={busy}
          />
          <button type="submit" className="primary" disabled={busy || !question.trim()}>
            Ask
          </button>
        </form>
        <p className="muted ask-note">
          Answers come only from the contract, {source.insurer}'s drug list, and the app's checked network facts. Confirm with{' '}
          {source.insurer} before deciding. Questions aren't saved, and this conversation clears when you reload the page.
        </p>
      </div>
    </aside>
  );
}
