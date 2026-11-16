import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { DrugCoverage, DrugTier, ListDrugStatus, Restriction } from './domain/drugs';
import type { Profile } from './domain/profile';

const linkedRxcuis = (profile: Profile | null) => [
  ...new Set((profile?.members ?? []).flatMap((m) => m.careItems.flatMap((i) => (i.drug ? [i.drug.rxcui] : [])))),
];

/**
 * Looks up each linked medication in insurers' drug lists once, and again on request. Results go in
 * `fromLists`, beside (never over) the user's own answers in `plans`.
 */
export function useDrugLookups(profile: Profile | null, setProfile: (update: (prev: Profile | null) => Profile | null) => void) {
  const [checking, setChecking] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());

  const check = useCallback(
    async (rxcui: string) => {
      if (inFlight.current.has(rxcui)) return;
      inFlight.current.add(rxcui);
      setChecking((c) => [...c, rxcui]);
      try {
        const found = await api.drugCoverage(rxcui);
        const fromLists: Record<string, ListDrugStatus> = {};
        for (const [planId, f] of Object.entries(found)) {
          fromLists[planId] = {
            covered: f.covered,
            ...(f.tier ? { tier: f.tier as DrugTier } : {}),
            ...(f.restrictions?.length ? { restrictions: f.restrictions as Restriction[] } : {}),
            evidence: {
              kind: f.source,
              url: f.sourceUrl.split(' ')[0],
              planYear: f.planYear,
              ...(f.matchedRow ? { row: f.matchedRow.slice(0, 300) } : {}),
              ...(f.asGeneric ? { asGeneric: true } : {}),
              ...(f.assumption ? { assumption: f.assumption } : {}),
            },
          };
        }
        const now = new Date().toISOString();
        setProfile((prev) => {
          if (!prev) return prev;
          const current: DrugCoverage = prev.drugCoverage?.[rxcui] ?? { checkedAt: '', source: '', plans: {} };
          return { ...prev, drugCoverage: { ...prev.drugCoverage, [rxcui]: { ...current, fromLists, listsCheckedAt: now } } };
        });
        setErrors(({ [rxcui]: _, ...rest }) => rest);
      } catch (e) {
        setErrors((prev) => ({ ...prev, [rxcui]: e instanceof Error ? e.message : 'The drug lists could not be searched.' }));
      } finally {
        inFlight.current.delete(rxcui);
        setChecking((c) => c.filter((x) => x !== rxcui));
      }
    },
    [setProfile],
  );

  const key = linkedRxcuis(profile).join(',');
  const coverage = profile?.drugCoverage;
  useEffect(() => {
    // Once per drug: a failed lookup waits for "Check again" rather than retrying on every render.
    for (const rxcui of key ? key.split(',') : []) {
      if (!coverage?.[rxcui]?.listsCheckedAt && !errors[rxcui]) void check(rxcui);
    }
  }, [key, coverage, errors, check]);

  return { checking, errors, recheck: check };
}
