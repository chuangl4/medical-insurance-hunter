import { DRUG_TIERS, TIER_LABELS, type DrugCoverage, type DrugRef, type PlanDrugStatus } from '../domain/drugs';
import type { Profile } from '../domain/profile';
import type { EvaluatedPlan } from '../domain/types';

interface Props {
  profile: Profile;
  plans: EvaluatedPlan[];
  onChange: (update: (prev: Profile) => Profile) => void;
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

/** Medications by insurer: covered (and at which tier) or not. Setting a cell applies to all of that insurer's plans. */
export function PrescriptionCoverage({ profile, plans, onChange }: Props) {
  const drugs = linkedDrugs(profile);
  if (drugs.length === 0) return null;
  const carriers = [...new Set(plans.map((p) => p.plan.carrier))].sort();
  const planIds = (carrier: string) => plans.filter((p) => p.plan.carrier === carrier).map((p) => p.plan.id);

  const cell = (rxcui: string, carrier: string) => {
    const cov = profile.drugCoverage?.[rxcui];
    const values = new Set(planIds(carrier).map((id) => valueOf(cov?.plans[id])));
    const value: CellValue = values.size === 1 ? [...values][0] : 'mixed';
    const prior = planIds(carrier).some((id) => cov?.plans[id]?.restrictions?.includes('priorAuth'));
    return { value, prior };
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
        drugCoverage: { ...prev.drugCoverage, [rxcui]: { checkedAt: new Date().toISOString(), source: [...sources].join('; '), plans: nextPlans } },
      };
    });

  return (
    <details className="panel hospital-access rx-coverage" open>
      <summary>
        <span>
          <strong>Prescription coverage</strong> by insurer: {drugs.length} linked {drugs.length === 1 ? 'medication' : 'medications'}
        </span>
        <span className="cash-toggle">Show or hide</span>
      </summary>
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
              return (
                <tr key={drug.rxcui}>
                  <th scope="row">
                    {label}
                    <small title={drug.name}>{drug.name.length > 60 ? `${drug.name.slice(0, 57)}…` : drug.name}</small>
                    {cov?.checkedAt && (
                      <small>
                        {cov.source} · {cov.checkedAt.slice(0, 10)}
                      </small>
                    )}
                  </th>
                  {carriers.map((carrier) => {
                    const { value, prior } = cell(drug.rxcui, carrier);
                    return (
                      <td key={carrier} className={`rx-cell rx-${value === '' ? 'unknown' : value === 'not' ? 'out' : value === 'mixed' ? 'mixed' : 'in'}`}>
                        <select
                          aria-label={`${drug.name} with ${carrier}`}
                          title={value.startsWith('in:') ? `Covered: ${TIER_LABELS[value.slice(3) as (typeof DRUG_TIERS)[number]]}` : undefined}
                          value={value}
                          onChange={(e) => set(drug.rxcui, carrier, e.target.value as CellValue, prior)}
                        >
                          <option value="">Not checked</option>
                          {value === 'mixed' && <option value="mixed">Differs by plan</option>}
                          <option value="not">Not covered</option>
                          <optgroup label="Covered as">
                            {DRUG_TIERS.map((t) => (
                              <option key={t} value={`in:${t}`}>
                                {SHORT_TIER[t]}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {value.startsWith('in:') && (
                          <label className="rx-pa">
                            <input type="checkbox" checked={prior} onChange={(e) => set(drug.rxcui, carrier, value, e.target.checked)} /> Prior auth
                          </label>
                        )}
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
        Each choice applies to all of that insurer's plans and updates their yearly costs: a covered drug is priced with the
        plan's cost share for its tier and counts toward the deductible and out-of-pocket limit; a drug that isn't covered
        is paid at your cash price. Check a drug in each insurer's 2027 drug list or Healthplanfinder's prescription search.
        "Not checked" uses what you chose in Your household (generic, brand-name, or cash).
      </p>
    </details>
  );
}
