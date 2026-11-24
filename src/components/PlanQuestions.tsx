import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type PlanAnswer, type PlanReference } from '../api';
import { CONTRACT_SOURCES } from '../data/contractSources';

interface Turn {
  question: string;
  answer: PlanAnswer;
}

/** Earlier turns sent with a follow-up, so "what about…" questions make sense. */
const HISTORY_TURNS = 3;

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
      )}
    </div>
  );
}

/**
 * Questions about one plan, answered from its 2027 contract and the app's checked data, with every claim quoted.
 * Shown only for plans whose contract is loaded. Questions and answers aren't saved.
 */
export function PlanQuestions({ planId }: { planId: string }) {
  const source = CONTRACT_SOURCES[planId];
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warmed = useRef(false);

  // Opening the box is a good sign a question is coming: load the contract into Claude's cache meanwhile.
  useEffect(() => {
    if (!source || warmed.current) return;
    warmed.current = true;
    api.warmPlan(planId).catch(() => {});
  }, [planId, source]);

  if (!source) return null;

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const history = turns.slice(-HISTORY_TURNS).map((t) => ({ question: t.question, answer: answerText(t.answer) }));
      const answer = await api.askPlan(planId, q, history);
      setTurns((t) => [...t, { question: q, answer }]);
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="plan-questions">
      {turns.map((t, i) => (
        <div key={i} className="plan-turn">
          <p className="plan-question">{t.question}</p>
          <Answer answer={t.answer} />
        </div>
      ))}
      <form onSubmit={ask} className="plan-ask">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
          placeholder={turns.length ? 'Ask a follow-up' : 'e.g. Is physical therapy limited? Is a medication covered?'}
          aria-label="Question about this plan"
          disabled={busy}
        />
        <button type="submit" className="primary" disabled={busy || !question.trim()}>
          {busy ? 'Reading…' : 'Ask'}
        </button>
      </form>
      {error && <p className="warn">{error}</p>}
      <p className="muted plan-ask-note">
        Answers come only from{' '}
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.title}
        </a>{' '}
        (checked {source.checked}), the insurer&rsquo;s drug list, and the app&rsquo;s checked network facts. Confirm with{' '}
        {source.insurer} before deciding. Questions aren&rsquo;t saved.
      </p>
    </div>
  );
}
