import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { HOSPITALS } from '../data/hospitalNetworks';
import { applyChatUpdates, changedParts, describeChanges, findGaps, nextGaps } from '../domain/onboarding';
import { newId, type Profile } from '../domain/profile';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  quickReplies?: string[];
  /** What this reply changed in the profile. */
  changes?: string[];
  /** The parts of the profile this reply changed, which the profile highlights (see changedParts). */
  changed?: string[];
  /** The profile before this reply's changes, for Undo. */
  before?: Profile;
  undone?: boolean;
  /** Errors are shown but never sent back to the assistant. */
  error?: boolean;
}

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  messages: ChatMessage[];
  onMessages: (next: ChatMessage[]) => void;
}

/** Messages sent back for context; the profile carries everything older. */
const HISTORY_SENT = 30;
const KNOWN_HOSPITALS = Object.entries(HOSPITALS).map(([id, h]) => ({ id, name: h.name }));

function greeting(profile: Profile): ChatMessage {
  const gaps = nextGaps(profile);
  if (profile.members.length === 0) {
    return {
      id: newId('msg'),
      role: 'assistant',
      text: "Woof! I'm Scout 🐶, and I sniff out health plans. I'll ask a few quick questions so I can find the 2027 plans that fit your family best. Tell me as much or as little as you like at once; I'll sort it out.\n\nFirst up: how many people in your family need coverage next year? Then tell me each person's first name and how old they'll be on January 1.",
      quickReplies: ['Just me', '2 of us', '3 of us', '4 of us'],
    };
  }
  if (gaps.length === 0) {
    return {
      id: newId('msg'),
      role: 'assistant',
      text: "Welcome back! 🐾 Your profile has everything I need. Tell me about any changes, like new care or a new medication, and I'll update it.",
    };
  }
  if (gaps[0].id === 'people') {
    const names = profile.members.map((m) => `${m.label || 'Someone'} (${m.needsAge ? 'age needed' : m.age})`).join(', ');
    return {
      id: newId('msg'),
      role: 'assistant',
      text: `Welcome back! 🐾 Let's make sure I have the whole pack first. So far I have: ${names}. Is that everyone who needs coverage next year?`,
      quickReplies: ["Yes, that's everyone", 'Someone is missing'],
    };
  }
  const all = findGaps(profile);
  return {
    id: newId('msg'),
    role: 'assistant',
    text: `Welcome back! 🐾 I just need a few more things before I can fetch your plans:\n${all.map((g) => `• ${g.label}`).join('\n')}\n\nLet's start with: ${gaps[0].label}. Or tell me anything else you'd like to add.`,
  };
}

export function ChatOnboarding({ profile, onChange, messages, onMessages }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length === 0) onMessages([greeting(profile)]);
    // Only greet once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || busy) return;
    const history = [...messages, { id: newId('msg'), role: 'user' as const, text: content }];
    onMessages(history);
    setText('');
    setBusy(true);
    try {
      const sent = history
        .filter((m) => !m.error)
        .slice(-HISTORY_SENT)
        .map((m) => ({
          role: m.role,
          content: m.undone ? `${m.text}\n\n[The user undid the changes from this reply.]` : m.text,
        }));
      const result = await api.chat({ messages: sent, profile: profileRef.current, knownHospitals: KNOWN_HOSPITALS });
      const before = profileRef.current;
      const after = applyChatUpdates(before, result.updates);
      const changes = describeChanges(before, after, result.updates);
      if (changes.length) onChange(after);
      onMessages([
        ...history,
        {
          id: newId('msg'),
          role: 'assistant',
          text: result.reply,
          quickReplies: result.quickReplies,
          changes,
          changed: changes.length ? changedParts(before, after) : undefined,
          before: changes.length ? before : undefined,
        },
      ]);
    } catch (e) {
      onMessages([...history, { id: newId('msg'), role: 'assistant', text: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const undo = (message: ChatMessage) => {
    if (!message.before) return;
    onChange(message.before);
    onMessages(messages.map((m) => (m.id === message.id ? { ...m, undone: true, before: undefined } : m)));
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const latestId = messages[messages.length - 1]?.id;

  return (
      <section className="panel chat" aria-label="Chat with Scout">
        <header className="chat-head">
          <span className="avatar" aria-hidden="true">
            🐶
          </span>
          <div>
            <h2>Scout</h2>
            <p className="hint">Tell me about your family in your own words. I'll fill in your profile.</p>
          </div>
        </header>
        <div className="chat-log" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble-row ${m.role}`}>
              {m.role === 'assistant' && (
                <span className="avatar" aria-hidden="true">
                  🐶
                </span>
              )}
              <div className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
                <p>{m.text}</p>
                {m.changes && m.changes.length > 0 && (
                  <div className={m.undone ? 'changes undone' : 'changes'}>
                    {/* The profile highlights what changed; the list stays a click away, mainly for small screens. */}
                    <details>
                      <summary className="changes-title">
                        {m.undone ? 'Undone' : 'Updated your profile'}{' '}
                        <span className="muted">
                          ({m.changes.length === 1 ? '1 change' : `${m.changes.length} changes`})
                        </span>
                      </summary>
                      <ul>
                        {m.changes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </details>
                    {m.before && m.id === lastAssistant?.id && m.id === latestId && !busy && (
                      <button type="button" className="link-button" onClick={() => undo(m)}>
                        Undo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="bubble-row assistant">
              <span className="avatar" aria-hidden="true">
                🐶
              </span>
              <div className="bubble assistant typing" aria-label="Scout is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {!busy && lastAssistant?.id === latestId && lastAssistant?.quickReplies && lastAssistant.quickReplies.length > 0 && (
          <div className="chips">
            {lastAssistant.quickReplies.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <textarea
            ref={inputRef}
            value={text}
            rows={2}
            maxLength={4000}
            placeholder="Type your answer… add as much detail as you like"
            aria-label="Your message to Scout"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(text);
              }
            }}
          />
          <button type="submit" className="primary" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
        <small className="hint">
          Your messages go to the Claude API so Scout can read them. Only the details shown under Your profile are saved to your
          profile. Enter sends; Shift+Enter adds a line.
        </small>
      </section>
  );
}
