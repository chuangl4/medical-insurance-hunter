import { useMemo, useState } from 'react';
import { dueSources } from '../domain/freshness';

const HIDE_KEY = 'mih-freshness-hidden';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Remembers a "hide for a week" for this set of due items; storage can be unavailable, so every access is guarded. */
function hiddenUntil(signature: string): number {
  try {
    const saved = JSON.parse(localStorage.getItem(HIDE_KEY) ?? 'null') as { signature: string; until: number } | null;
    return saved && saved.signature === signature ? saved.until : 0;
  } catch {
    return 0;
  }
}

/** For admins: hand-maintained data that is due for a refresh. */
export function DataFreshnessBanner() {
  const due = useMemo(() => dueSources(new Date()), []);
  const signature = due.map((d) => `${d.id}:${d.checked}`).join('|');
  const [hidden, setHidden] = useState(() => hiddenUntil(signature) > Date.now());
  if (!due.length || hidden) return null;

  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, JSON.stringify({ signature, until: Date.now() + WEEK_MS }));
    } catch {
      // Without storage, hiding lasts until the page reloads.
    }
    setHidden(true);
  };

  return (
    <aside className="admin-banner" role="status">
      <details>
        <summary>
          <strong>Admin:</strong> {due.length} {due.length === 1 ? 'data source needs' : 'data sources need'} a refresh:{' '}
          {due.map((d) => d.label).join(', ')}
        </summary>
        <ul>
          {due.map((d) => (
            <li key={d.id}>
              <strong>{d.label}</strong>: {d.reasons.join('; ').replace(/\.$/, '')}.
              <br />
              <span className="muted">{d.refresh}</span>
            </li>
          ))}
        </ul>
      </details>
      <button type="button" className="link-button" onClick={hide}>
        Hide for a week
      </button>
    </aside>
  );
}
