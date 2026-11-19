import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { pickDrug, type DrugOption, type DrugRef } from '../domain/drugs';

interface Props {
  name: string;
  drug: DrugRef | undefined;
  /** The user said it isn't in the drug database, so the app stops asking. */
  notInDatabase?: boolean;
  /**
   * A name to look up on its own, set when the user finishes typing it. A clear match is linked; otherwise the
   * closest products are offered.
   */
  lookup?: string;
  /** A drug to link, or none; `notInDatabase` records that there's nothing to link it to. */
  onChange: (drug: DrugRef | undefined, notInDatabase?: boolean) => void;
}

type Results = { query: string; options: DrugOption[]; auto?: boolean };

/** Links a medication to its RxNorm entry, so its coverage can be checked plan by plan. */
export function DrugLink({ name, drug, notInDatabase, lookup, onChange }: Props) {
  const [query, setQuery] = useState(name.split(/\s+/)[0] ?? '');
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [matched, setMatched] = useState(false);
  // Only a name the user just entered is looked up on its own, once; slower searches give way to newer ones.
  const lastLookup = useRef<string | undefined>(undefined);
  const searchId = useRef(0);

  const run = async (text: string, auto: boolean) => {
    const id = ++searchId.current;
    setBusy(true);
    setError(null);
    try {
      const found = await api.searchDrugs(text);
      if (id !== searchId.current) return;
      if (!auto) return setResults(found);
      const { match, choices } = pickDrug(text, found.options);
      if (match) {
        onChange({ rxcui: match.rxcui, name: match.name }, false);
        setMatched(true);
        setOpen(false);
      } else {
        setResults({ query: found.query, options: choices, auto: true });
        setOpen(true);
      }
    } catch (e) {
      if (id !== searchId.current) return;
      setError((e as Error).message);
      if (auto) setOpen(true);
    } finally {
      if (id === searchId.current) setBusy(false);
    }
  };

  useEffect(() => {
    const text = lookup?.trim() ?? '';
    if (lookup === lastLookup.current) return;
    lastLookup.current = lookup;
    if (drug || notInDatabase || text.length < 2) return;
    setQuery(text);
    run(text, true);
    // Runs only when a new name is entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup]);

  const notStandard = (
    <button
      type="button"
      className="link-button"
      onClick={() => {
        onChange(undefined, true);
        setOpen(false);
      }}
    >
      It's not a standard drug
    </button>
  );

  if (drug && !open) {
    return (
      <p className="drug-link">
        <span className="drug-badge">Rx</span> {drug.name}
        {matched && <small className="muted"> (matched from the name you typed)</small>}{' '}
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Change
        </button>{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMatched(false);
            onChange(undefined);
          }}
        >
          Unlink
        </button>
      </p>
    );
  }
  if (!open && busy) {
    return (
      <p className="drug-link">
        <small className="muted">Looking it up in the drug database…</small>
      </p>
    );
  }
  if (!open && notInDatabase) {
    return (
      <p className="drug-link">
        <small className="muted">Not in the drug database, so plans' drug lists aren't checked for it.</small>{' '}
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Search again
        </button>
      </p>
    );
  }
  if (!open) {
    return (
      <p className="drug-link needs-link">
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Link to the drug database
        </button>{' '}
        <small className="muted">so each plan's coverage can be checked and priced</small> {notStandard}
      </p>
    );
  }
  return (
    <div className="drug-search">
      {results?.auto && results.options.length > 0 && <p className="drug-ask">Which one is it? Pick the strength and form on the label.</p>}
      {results?.auto && results.options.length === 0 && (
        <p className="drug-ask">
          Couldn't find "{results.query}" in the drug database. Check the spelling, or try the name on the label.
        </p>
      )}
      <div className="drug-search-row">
        <label className="field">
          <span>Medication name</span>
          <input
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), run(query.trim(), false))}
          />
        </label>
        <button type="button" className="secondary" disabled={busy || query.trim().length < 2} onClick={() => run(query.trim(), false)}>
          {busy ? 'Searching…' : 'Search'}
        </button>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <p className="warn">{error}</p>}
      {results && !results.auto && results.options.length === 0 && <p className="hint">Nothing found for "{results.query}". Try the brand or generic name.</p>}
      {results && results.options.length > 0 && (
        <>
          {results.query.toLowerCase() !== query.trim().toLowerCase() && <p className="hint">Showing results for "{results.query}".</p>}
          <ul className="drug-results">
            {results.options.map((o) => (
              <li key={o.rxcui}>
                <span>
                  {o.name} <small className="muted">{o.brand ? 'brand' : 'generic'}</small>
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    onChange({ rxcui: o.rxcui, name: o.name }, false);
                    setMatched(false);
                    setOpen(false);
                  }}
                >
                  This one
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">
        From RxNorm, the National Library of Medicine's drug database. {!drug && notStandard}
      </p>
    </div>
  );
}
