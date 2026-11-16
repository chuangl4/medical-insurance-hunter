import { useState } from 'react';
import { api } from '../api';
import type { DrugRef } from '../domain/drugs';

interface Props {
  name: string;
  drug: DrugRef | undefined;
  onChange: (drug: DrugRef | undefined) => void;
}

type Option = { rxcui: string; name: string; brand: boolean };

/** Links a medication to its RxNorm entry, so its coverage can be checked plan by plan. */
export function DrugLink({ name, drug, onChange }: Props) {
  const [query, setQuery] = useState(name.split(/\s+/)[0] ?? '');
  const [results, setResults] = useState<{ query: string; options: Option[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      setResults(await api.searchDrugs(query.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (drug && !open) {
    return (
      <p className="drug-link">
        <span className="drug-badge">Rx</span> {drug.name}{' '}
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Change
        </button>{' '}
        <button type="button" className="link-button" onClick={() => onChange(undefined)}>
          Unlink
        </button>
      </p>
    );
  }
  if (!open) {
    return (
      <p className="drug-link">
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Link to the drug database
        </button>{' '}
        <small className="muted">so each plan's coverage can be checked and priced</small>
      </p>
    );
  }
  return (
    <div className="drug-search">
      <div className="drug-search-row">
        <label className="field">
          <span>Medication name</span>
          <input value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())} />
        </label>
        <button type="button" className="secondary" disabled={busy || query.trim().length < 2} onClick={search}>
          {busy ? 'Searching…' : 'Search'}
        </button>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <p className="warn">{error}</p>}
      {results && results.options.length === 0 && <p className="hint">Nothing found for "{results.query}". Try the brand or generic name.</p>}
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
                    onChange({ rxcui: o.rxcui, name: o.name });
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
      <p className="hint">From RxNorm, the National Library of Medicine's drug database. Pick the exact strength and form.</p>
    </div>
  );
}
