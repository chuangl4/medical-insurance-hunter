import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '../api';
import { dueSources } from '../domain/freshness';
import { ENROLLMENT } from '../domain/rules2027';

export type SaveState = 'saved' | 'saving' | 'error';

export interface NavItem {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  user: User | null;
  saveState?: SaveState;
  nav?: NavItem[];
  current?: string;
  onNavigate?: (id: string) => void;
  /** Opens the household page; left out while there is no household to edit yet. */
  onOpenHousehold?: () => void;
  onSignOut?: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today until the January 1 coverage deadline; negative once it has passed. */
export function daysToDeadline(today: Date, deadline: string = ENROLLMENT.januaryDeadline): number {
  const end = new Date(`${deadline} 23:59:59`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

function initialsOf(user: User): string {
  const source = user.name?.trim() || user.email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (user.name?.trim() && words[1] ? words[1][0] : '')).toUpperCase();
}

export function Brand() {
  return (
    <span className="brand">
      <svg className="brand-mark" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
        <rect width="24" height="24" rx="7" fill="currentColor" />
        <path d="M12 6v12M6 12h12" stroke="var(--accent-text)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="brand-name">Insurance Hunter</span>
    </span>
  );
}

function DeadlineChip() {
  const days = daysToDeadline(new Date());
  if (days < 0) return null;
  const text = days === 0 ? 'Enroll today' : `${days} day${days === 1 ? '' : 's'} left`;
  return (
    <span className={days <= 14 ? 'deadline-chip soon' : 'deadline-chip'} title={`Enroll by ${ENROLLMENT.januaryDeadline} for coverage starting January 1. Open enrollment ends ${ENROLLMENT.closes}.`}>
      <span className="deadline-label">Jan 1 coverage</span> {text}
    </span>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span className={`save-indicator ${state}`} role="status">
      {state === 'saving' ? 'Saving…' : state === 'error' ? 'Not saved. Check your connection.' : <span title="All changes saved">✓ Saved</span>}
    </span>
  );
}

function AccountMenu({ user, onOpenHousehold, onSignOut }: { user: User; onOpenHousehold?: () => void; onSignOut?: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const due = useMemo(() => (user.isAdmin ? dueSources(new Date()) : []), [user.isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (action?: () => void) => () => {
    setOpen(false);
    action?.();
  };

  return (
    <div className="account-menu" ref={root}>
      <button
        ref={button}
        type="button"
        className="avatar-button"
        aria-expanded={open}
        aria-controls="account-popover"
        aria-label={`Account: ${user.email}${due.length ? `. ${due.length} data sources need a refresh` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initialsOf(user)}
        {due.length > 0 && <span className="avatar-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div id="account-popover" className="account-popover">
          <div className="account-who">
            <span className="avatar-large" aria-hidden="true">
              {initialsOf(user)}
            </span>
            <div>
              {user.name && <strong>{user.name}</strong>}
              <span className="muted">{user.email}</span>
            </div>
          </div>
          <ul className="account-actions">
            {onOpenHousehold && (
              <li>
                <button type="button" onClick={choose(onOpenHousehold)}>
                  Your household and needs
                </button>
              </li>
            )}
            <li>
              <button type="button" onClick={choose(onSignOut)}>
                Sign out
              </button>
            </li>
          </ul>
          {user.isAdmin && (
            <details className="account-admin" open={due.length > 0}>
              <summary>
                <strong>Admin:</strong>{' '}
                {due.length ? `${due.length} data source${due.length === 1 ? ' needs' : 's need'} a refresh` : 'all data sources are current'}
              </summary>
              {due.length > 0 && (
                <ul>
                  {due.map((d) => (
                    <li key={d.id}>
                      <strong>{d.label}</strong>: {d.reasons.join('; ').replace(/\.$/, '')}.
                      <br />
                      <span className="muted">{d.refresh}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** The bar across the top of every page: brand, page links, the enrollment countdown, and the account menu. */
export function AppHeader({ user, saveState, nav, current, onNavigate, onOpenHousehold, onSignOut }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />
        {nav && nav.length > 0 && (
          <nav className="topnav" aria-label="Pages">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                className={current === n.id ? 'topnav-link active' : 'topnav-link'}
                aria-current={current === n.id ? 'page' : undefined}
                onClick={() => onNavigate?.(n.id)}
              >
                {n.label}
                {n.count !== undefined && <span className="count">{n.count}</span>}
              </button>
            ))}
          </nav>
        )}
        <div className="topbar-end">
          <DeadlineChip />
          {user && saveState && <SaveIndicator state={saveState} />}
          {user && <AccountMenu user={user} onOpenHousehold={onOpenHousehold} onSignOut={onSignOut} />}
        </div>
      </div>
    </header>
  );
}
