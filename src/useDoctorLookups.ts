import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { HOSPITALS, hospitalStatus } from './data/hospitalNetworks';
import { KING_COUNTY_PLANS } from './data/kingCounty2027';
import { autoPick, nameParts, registryQuery } from './domain/doctors';
import type { Profile, Provider } from './domain/profile';

/** Waits for typing to stop before searching a name. */
const SEARCH_DELAY_MS = 1500;

/** Insurers worth checking a doctor against: those with a plan covering every must-have hospital, else all. */
export function carriersToCheck(hospitalIds: string[]): string[] {
  const all = [...new Set(KING_COUNTY_PLANS.map((p) => p.carrier))].sort();
  if (!hospitalIds.length) return all;
  const fit = all.filter((c) => KING_COUNTY_PLANS.some((p) => p.carrier === c && hospitalIds.every((h) => hospitalStatus(p, h) === 'in')));
  return fit.length ? fit : all;
}

/** The household's must-have hospitals, from its own profile. */
export const requiredHospitalsOf = (profile: Profile | null) => [
  ...new Set((profile?.providers ?? []).flatMap((p) => (p.hospitalId ? [p.hospitalId] : []))),
];

// Candidates belong to one insurer by definition, so they aren't checked against the others.
const isDoctor = (p: Provider) => !p.hospitalId && !p.candidateFor && p.name.trim().length > 0;
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/**
 * Looks up must-have doctors without being asked: a registry search when a name is new, picking the match when
 * it's clear, then one website check per doctor. Each attempt is saved with the provider, so it isn't repeated and
 * the app can explain what it tried. A failed website check isn't retried automatically, since each costs money.
 */
export function useDoctorLookups(profile: Profile | null, setProfile: (update: (prev: Profile | null) => Profile | null) => void) {
  const [checking, setChecking] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());

  const patch = useCallback(
    (id: string, change: (p: Provider) => Partial<Provider>) =>
      setProfile((prev) => prev && { ...prev, providers: (prev.providers ?? []).map((x) => (x.id === id ? { ...x, ...change(x) } : x)) }),
    [setProfile],
  );

  const begin = (id: string) => {
    if (inFlight.current.has(id)) return false;
    inFlight.current.add(id);
    setChecking((c) => [...c, id]);
    return true;
  };
  const end = (id: string) => {
    inFlight.current.delete(id);
    setChecking((c) => c.filter((x) => x !== id));
  };

  const search = useCallback(
    async (provider: Provider) => {
      const query = registryQuery(provider.name);
      if (!begin(provider.id)) return;
      const at = new Date().toISOString();
      try {
        const results = await api.searchDoctors({ ...nameParts(provider.name), city: '' });
        const pick = autoPick(provider.name, results);
        const outcome = pick ? 'found' : results.length ? 'several' : 'none';
        patch(provider.id, (p) => ({
          ...(pick && !p.doctor ? { doctor: pick } : {}),
          lookup: { ...p.lookup, registry: { at, query, outcome, detail: '', candidates: pick ? [] : results } },
        }));
      } catch (e) {
        patch(provider.id, (p) => ({ lookup: { ...p.lookup, registry: { at, query, outcome: 'error', detail: message(e), candidates: [] } } }));
      } finally {
        end(provider.id);
      }
    },
    [patch],
  );

  const runCheck = useCallback(
    async (provider: Provider, hospitalIds: string[]) => {
      const doctor = provider.doctor;
      if (!doctor || !begin(provider.id)) return;
      const at = new Date().toISOString();
      try {
        const hospitals = Object.entries(HOSPITALS).map(([id, h]) => ({ id, name: h.name }));
        const check = await api.checkDoctor({ doctor, carriers: carriersToCheck(hospitalIds), hospitals });
        patch(provider.id, (p) =>
          p.doctor?.npi === doctor.npi
            ? { clinicCheck: check, lookup: { ...p.lookup, websites: { at, npi: doctor.npi, outcome: 'found', detail: '' } } }
            : {},
        );
      } catch (e) {
        patch(provider.id, (p) => ({ lookup: { ...p.lookup, websites: { at, npi: doctor.npi, outcome: 'error', detail: message(e) } } }));
      } finally {
        end(provider.id);
      }
    },
    [patch],
  );

  const providers = profile?.providers;
  const hospitalKey = requiredHospitalsOf(profile).join(',');
  useEffect(() => {
    if (!providers) return;
    const timer = setTimeout(() => {
      for (const p of providers.filter(isDoctor)) {
        if (inFlight.current.has(p.id)) continue;
        const query = registryQuery(p.name);
        if (!p.doctor && query.length >= 2 && p.lookup?.registry?.query !== query) {
          void search(p);
        } else if (p.doctor && !p.clinicCheck && p.lookup?.websites?.npi !== p.doctor.npi) {
          void runCheck(p, hospitalKey ? hospitalKey.split(',') : []);
        }
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [providers, hospitalKey, search, runCheck]);

  return {
    /** Provider ids being looked up right now. */
    checking,
    /** Runs the website check again, on request. */
    recheck: (provider: Provider) => runCheck(provider, hospitalKey ? hospitalKey.split(',') : []),
  };
}
