import { useState } from 'react';
import { api } from '../api';
import { HOSPITALS } from '../data/hospitalNetworks';
import { PREMERA, nameParts, registryQuery, type ClinicFinding, type Confirmation, type DoctorRecord } from '../domain/doctors';
import { DoctorHelp } from './DoctorHelp';
import type { Provider } from '../domain/profile';

interface Props {
  provider: Provider;
  /** Applies to the provider as it is when called, so a slow check doesn't undo edits made meanwhile. */
  onPatch: (patch: Partial<Provider>) => void;
  /** Insurers to check and confirm, in display order. */
  carriers: string[];
  /** The app is looking this doctor up right now. */
  checking: boolean;
  onRecheck: () => void;
}

const FINDING_LABELS: Record<ClinicFinding, string> = {
  accepts: 'Listed as accepted',
  'does-not-accept': 'Listed as not accepted',
  'not-mentioned': 'Not mentioned',
};

const directorySearch = (carrier: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${carrier} find a doctor Washington individual plans`)}`;

export function DoctorPanel({ provider, onPatch, carriers, checking, onRecheck }: Props) {
  const [query, setQuery] = useState(() => ({ ...nameParts(provider.name), city: '' }));
  const [searched, setSearched] = useState<DoctorRecord[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { doctor, clinicCheck: check } = provider;
  const websiteError = provider.lookup?.websites?.outcome === 'error' && provider.lookup.websites.npi === doctor?.npi;
  // People the automatic search couldn't choose between, until the user searches again.
  const results = searched ?? (provider.lookup?.registry?.candidates.length ? provider.lookup.registry.candidates : null);

  const search = async () => {
    setSearching(true);
    setError(null);
    try {
      setSearched(await api.searchDoctors(query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const pick = (record: DoctorRecord) => {
    setSearched(null);
    const registry = provider.lookup?.registry;
    onPatch({
      doctor: record,
      clinicCheck: undefined,
      name: provider.name.trim() || record.name,
      // Record the name as searched so the automatic search doesn't run again; the website check follows.
      lookup: {
        websites: undefined,
        registry: {
          at: new Date().toISOString(),
          query: registryQuery(provider.name.trim() || record.name),
          outcome: 'several',
          detail: 'Picked by you',
          candidates: registry?.candidates ?? [],
        },
      },
    });
  };

  const confirm = (carrier: string, value: Confirmation | '') => {
    const next = { ...provider.confirmed };
    if (value) next[carrier] = value;
    else delete next[carrier];
    onPatch({ confirmed: next });
  };

  return (
    <div className="doctor-panel">
      {!doctor ? (
        <div className="doctor-search">
          <p className="hint">
            {checking
              ? 'Looking this doctor up in the national provider registry…'
              : results
                ? 'Several people match this name. Pick the right one, and the app will check their clinic\'s website.'
                : provider.lookup?.registry?.outcome === 'none'
                  ? 'The registry search found no one with this name in Washington. Adjust the name and search again.'
                  : provider.lookup?.registry?.outcome === 'error'
                    ? 'The registry search failed. Search again below.'
                    : provider.lookup?.registry
                      ? 'Search the registry for the right person.'
                      : 'The app looks this doctor up automatically.'}{' '}
            <DoctorHelp provider={provider} checking={checking} />
          </p>
          <div className="form-grid">
            <label className="field">
              <span>First name</span>
              <input value={query.first} maxLength={60} onChange={(e) => setQuery({ ...query, first: e.target.value })} />
            </label>
            <label className="field">
              <span>Last name</span>
              <input value={query.last} maxLength={60} onChange={(e) => setQuery({ ...query, last: e.target.value })} />
            </label>
            <label className="field">
              <span>City (optional)</span>
              <input value={query.city} maxLength={60} onChange={(e) => setQuery({ ...query, city: e.target.value })} />
            </label>
          </div>
          <button type="button" className="secondary" disabled={searching || checking || query.last.trim().length < 2} onClick={search}>
            {searching ? 'Searching…' : 'Search the registry'}
          </button>
          {results && results.length === 0 && (
            <p className="hint">No Washington providers matched. Try fewer letters, or end a name with * (for example Jen*).</p>
          )}
          {results && results.length > 0 && (
            <ul className="doctor-results">
              {results.map((r) => (
                <li key={r.npi}>
                  <div>
                    <strong>
                      {r.name}
                      {r.credential && `, ${r.credential}`}
                    </strong>{' '}
                    <span className="muted">{r.specialty}</span>
                    {r.locations.map((l) => (
                      <small className="muted doctor-location" key={l}>
                        {l}
                      </small>
                    ))}
                  </div>
                  <button type="button" className="secondary" onClick={() => pick(r)}>
                    This one
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="doctor-found">
          <p>
            <strong>
              {doctor.name}
              {doctor.credential && `, ${doctor.credential}`}
            </strong>{' '}
            <span className="muted">
              {doctor.specialty} · NPI {doctor.npi}
            </span>{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => onPatch({ doctor: undefined, clinicCheck: undefined, lookup: { ...provider.lookup, websites: undefined } })}
            >
              Not the right person
            </button>
          </p>
          {doctor.locations.map((l) => (
            <small className="muted doctor-location" key={l}>
              {l}
            </small>
          ))}
          <p>
            {checking ? (
              <span className="muted">Checking the clinic and health system websites… This usually takes a minute or two.</span>
            ) : (
              <>
                <button type="button" className="secondary" onClick={onRecheck}>
                  Check websites again
                </button>{' '}
                {websiteError && <span className="warn">The last check didn't finish: {provider.lookup?.websites?.detail}</span>}
              </>
            )}{' '}
            <DoctorHelp provider={provider} checking={checking} />
          </p>
          {check && (
            <div className="doctor-check">
              <p>{check.summary}</p>
              <p className="muted">
                {check.clinicName && <>Practices at {check.clinicUrl ? <a href={check.clinicUrl} target="_blank" rel="noreferrer">{check.clinicName}</a> : check.clinicName}. </>}
                {check.hospitalId && HOSPITALS[check.hospitalId] && <>Works for {HOSPITALS[check.hospitalId].name}. </>}
                {check.premeraListed === true && "Premera's public directory lists this doctor (it doesn't say which network). "}
                {check.premeraListed === false && "Premera's public directory doesn't list this doctor. "}
                Checked {new Date(check.checkedAt).toLocaleDateString()}.
              </p>
            </div>
          )}
        </div>
      )}
      {error && <p className="warn">{error}</p>}

      <div className="table-scroll">
        <table className="doctor-table">
          <thead>
            <tr>
              <th scope="col">Insurer</th>
              <th scope="col">What the websites say</th>
              <th scope="col">Your answer</th>
            </tr>
          </thead>
          <tbody>
            {carriers.map((carrier) => {
              const evidence = check?.carriers.find((c) => c.carrier === carrier);
              return (
                <tr key={carrier}>
                  <th scope="row">
                    {carrier}
                    <small>
                      <a href={directorySearch(carrier)} target="_blank" rel="noreferrer">
                        Find its directory
                      </a>
                    </small>
                  </th>
                  <td>
                    {evidence ? (
                      <>
                        {FINDING_LABELS[evidence.finding]}
                        {evidence.detail && <small className="muted">{evidence.detail}</small>}
                        {evidence.url && (
                          <small>
                            <a href={evidence.url} target="_blank" rel="noreferrer">
                              Source
                            </a>
                          </small>
                        )}
                      </>
                    ) : (
                      <span className="muted">{check ? 'Not mentioned' : 'Not checked'}</span>
                    )}
                    {carrier === PREMERA && check?.premeraListed === false && (
                      <small className="warn">Not in Premera's directory</small>
                    )}
                  </td>
                  <td>
                    <select
                      aria-label={`${provider.name || 'This doctor'} with ${carrier}`}
                      value={provider.confirmed?.[carrier] ?? ''}
                      onChange={(e) => confirm(carrier, e.target.value as Confirmation | '')}
                    >
                      <option value="">Not confirmed</option>
                      <option value="in">In network</option>
                      <option value="out">Out of network</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Clinic websites list insurers, not plans, and can be out of date. Before enrolling, confirm in the insurer's directory
        for the exact plan, or call the office. Marking a doctor out of network hides that insurer's plans.
      </p>
    </div>
  );
}
