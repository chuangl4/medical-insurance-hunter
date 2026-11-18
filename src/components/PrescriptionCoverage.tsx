import { DRUG_TIERS, describeEvidence, listDisagrees, type DrugCoverage, type DrugRef, type PlanDrugStatus } from '../domain/drugs';
import type { Profile } from '../domain/profile';
import type { EvaluatedPlan } from '../domain/types';

interface Props {
  profile: Profile;
  plans: EvaluatedPlan[];
  onChange: (update: (prev: Profile) => Profile) => void;
  /** Drugs (RxNorm ids) being looked up in insurers' drug lists. */
  checking: string[];
  errors: Record<string, string>;
  onRecheck: (rxcui: string) => void;
}

interface LinkedDrug {
  drug: DrugRef;
  /** Care item names and who they're for, for the row label. */
  label: string;
}

/** Every distinct drug linked from a care item. */
export function linkedDrugs(profile: Profile): LinkedDrug[] {
  const byRxcui = new Map<string, LinkedDrug>();
  for (const m of profile.members) {
    for (const item of m.careItems) {
      if (!item.drug) continue;
      const who = m.label || 'Someone';
      const existing = byRxcui.get(item.drug.rxcui);
      byRxcui.set(item.drug.rxcui, { drug: item.drug, label: existing ? `${existing.label}, ${who}` : `${item.name || item.drug.name} · ${who}` });
    }
  }
  return [...byRxcui.values()];
}

const SHORT_TIER: Record<(typeof DRUG_TIERS)[number], string> = {
  preventive: '$0 prev.',
  generic: 'Generic',
  preferredBrand: 'Preferred',
  nonPreferredBrand: 'Non-pref.',
  specialty: 'Specialty',
};

type CellValue = '' | 'not' | `in:${(typeof DRUG_TIERS)[number]}` | 'mixed';

const valueOf = (s: PlanDrugStatus | undefined): CellValue => (!s ? '' : !s.covered ? 'not' : `in:${s.tier ?? 'preferredBrand'}`);
const uniform = (values: CellValue[]): CellValue => (new Set(values).size === 1 ? values[0] : 'mixed');
const shortOf = (v: CellValue) => (v === 'not' ? 'Not on list' : v === 'mixed' ? 'Differs by plan' : v ? SHORT_TIER[v.slice(3) as (typeof DRUG_TIERS)[number]] : '');

/** Medications by insurer: covered (and at which tier) or not. Setting a cell applies to all of that insurer's plans. */
export function PrescriptionCoverage({ profile, plans, onChange, checking, errors, onRecheck }: Props) {
  const drugs = linkedDrugs(profile);
  if (drugs.length === 0) return null;
  const carriers = [...new Set(plans.map((p) => p.plan.carrier))].sort();
  const planIds = (carrier: string) => plans.filter((p) => p.plan.carrier === carrier).map((p) => p.plan.id);

  const cell = (rxcui: string, carrier: string) => {
    const cov = profile.drugCoverage?.[rxcui];
    const ids = planIds(carrier);
    // Your answers may cover only some plans (Healthplanfinder shows bronze and gold only); compare just those.
    const answered = ids.filter((id) => cov?.plans[id]);
    const mineSet = answered.length > 0;
    const value = mineSet ? uniform(answered.map((id) => valueOf(cov?.plans[id]))) : '';
    const partial = mineSet && answered.length < ids.length ? `your answer on ${answered.length} of ${ids.length} plans; the rest ${cov?.fromLists ? 'from drug list' : 'not checked'}` : '';
    const list = cov?.fromLists && ids.some((id) => cov.fromLists![id]) ? uniform(ids.map((id) => valueOf(cov.fromLists![id]))) : '';
    const effective = value || list;
    const statuses = ids.map((id) => cov?.plans[id] ?? cov?.fromLists?.[id]);
    const prior = statuses.some((st) => st?.restrictions?.includes('priorAuth'));
    const disagree = ids.some((id) => listDisagrees(cov, id));
    // Describe the insurer's own list; note separately how many plans only assume it.
    const all = ids.map((id) => cov?.fromLists?.[id]?.evidence).filter((e) => e !== undefined);
    const own = all.find((e) => !e.assumption);
    const assumed = all.filter((e) => e.assumption).length;
    const evidence = own ? { ...own, ...(assumed ? { assumption: `${assumed} of ${ids.length} plans assumed to use this list` } : {}) } : all[0];
    return { value, list, effective, prior, disagree, evidence, mineSet, partial };
  };

  const set = (rxcui: string, carrier: string, value: CellValue, priorAuth: boolean) =>
    onChange((prev) => {
      const current: DrugCoverage = prev.drugCoverage?.[rxcui] ?? { checkedAt: '', source: '', plans: {} };
      const nextPlans = { ...current.plans };
      for (const id of planIds(carrier)) {
        if (value === '' || value === 'mixed') delete nextPlans[id];
        else if (value === 'not') nextPlans[id] = { covered: false };
        else nextPlans[id] = { covered: true, tier: value.slice(3) as PlanDrugStatus['tier'], ...(priorAuth ? { restrictions: ['priorAuth'] } : {}) };
      }
      const sources = new Set([current.source, 'your entries'].filter(Boolean));
      return {
        ...prev,
        drugCoverage: {
          ...prev.drugCoverage,
          [rxcui]: { ...current, checkedAt: new Date().toISOString(), source: [...sources].join('; '), plans: nextPlans },
        },
      };
    });

  return (
    <section className="panel hospital-access rx-coverage" aria-labelledby="rx-coverage-title">
      <h2 id="rx-coverage-title" className="panel-title">
        Prescription coverage by insurer <span className="muted">· {drugs.length} linked {drugs.length === 1 ? 'medication' : 'medications'}</span>
      </h2>
      <div className="table-scroll">
        <table className="access-grid rx-grid">
          <thead>
            <tr>
              <th scope="col">Medication</th>
              {carriers.map((c) => (
                <th key={c} scope="col" className="facility-col">
                  {c.replace(/ \(.*\)$/, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugs.map(({ drug, label }) => {
              const cov = profile.drugCoverage?.[drug.rxcui];
              const isChecking = checking.includes(drug.rxcui);
              return (
                <tr key={drug.rxcui}>
                  <th scope="row">
                    {label}
                    <small title={drug.name}>{drug.name.length > 60 ? `${drug.name.slice(0, 57)}…` : drug.name}</small>
                    <small>
                      {isChecking
                        ? 'Searching insurers\' drug lists…'
                        : cov?.listsCheckedAt
                          ? `Drug lists searched ${cov.listsCheckedAt.slice(0, 10)}`
                          : errors[drug.rxcui] ?? 'Drug lists not searched yet'}{' '}
                      {!isChecking && (
                        <button type="button" className="link-button" onClick={() => onRecheck(drug.rxcui)}>
                          {cov?.listsCheckedAt ? 'Search again' : 'Search'}
                        </button>
                      )}
                    </small>
                    {cov?.checkedAt && Object.keys(cov.plans).length > 0 && (
                      <small>
                        Your answers: {cov.source} · {cov.checkedAt.slice(0, 10)}
                      </small>
                    )}
                    {cov?.fromLists && (
                      <details className="rx-sources">
                        <summary>Where these come from</summary>
                        <ul>
                          {carriers.map((carrier) => {
                            const c = cell(drug.rxcui, carrier);
                            return c.evidence ? (
                              <li key={carrier}>
                                <a href={c.evidence.url} target="_blank" rel="noreferrer">
                                  {describeEvidence(carrier, c.evidence)}
                                </a>
                                {c.list && `: ${shortOf(c.list)}`}
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </details>
                    )}
                  </th>
                  {carriers.map((carrier) => {
                    const { value, list, effective, prior, disagree, evidence, mineSet, partial } = cell(drug.rxcui, carrier);
                    const tip = [
                      mineSet ? `Your answer: ${shortOf(value)}${partial ? ` (${partial})` : ''}` : '',
                      list && evidence ? `Drug list: ${shortOf(list)} (${describeEvidence(carrier, evidence)})` : '',
                    ]
                      .filter(Boolean)
                      .join('\n');
                    return (
                      <td
                        key={carrier}
                        className={`rx-cell rx-${effective === '' ? 'unknown' : effective === 'not' ? 'out' : effective === 'mixed' ? 'mixed' : 'in'}`}
                        title={tip || undefined}
                      >
                        <select
                          aria-label={`${drug.name} with ${carrier}`}
                          value={value}
                          onChange={(e) => set(drug.rxcui, carrier, e.target.value as CellValue, prior)}
                        >
                          <option value="">{list ? shortOf(list) : isChecking ? 'Checking…' : 'Not checked'}</option>
                          {value === 'mixed' && <option value="mixed">Differs by plan</option>}
                          <option value="not">Not on drug list</option>
                          <optgroup label="Covered as">
                            {DRUG_TIERS.map((t) => (
                              <option key={t} value={`in:${t}`}>
                                {SHORT_TIER[t]}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {value.startsWith('in:') ? (
                          <label className="rx-pa">
                            <input type="checkbox" checked={prior} onChange={(e) => set(drug.rxcui, carrier, value, e.target.checked)} /> Prior auth
                          </label>
                        ) : (
                          !mineSet && prior && <small className="rx-pa">Prior auth</small>
                        )}
                        <small className="rx-origin">
                          {mineSet ? (partial ? <span title={partial}>Your answer (some plans)</span> : 'Your answer') : list ? 'From drug list' : ''}
                          {disagree && (
                            <span className="flag-mark" title={`The drug list says ${shortOf(list)}`}>
                              {' '}
                              ! list says {shortOf(list)}
                            </span>
                          )}
                        </small>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Each linked medication is searched in every insurer's 2027 drug list automatically ("From drug list"). Choosing a value
        sets your own answer for all of that insurer's plans, for example after checking Healthplanfinder or calling the
        insurer; your answer wins, and <strong>!</strong> marks where it disagrees with the list. A covered drug is priced
        with the plan's cost share for its tier and counts toward the deductible and out-of-pocket limit; a drug that isn't
        covered is paid at your cash price. Drug lists change, so confirm before enrolling.
      </p>
    </section>
  );
}
