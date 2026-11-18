import { useMemo, useState, type ReactNode } from 'react';
import { HOSPITALS, HOSPITAL_IDS } from '../data/hospitalNetworks';
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  applyFilters,
  networkOf,
  optionCounts,
  type NetworkChoice,
  sortPlans,
  type BuyingRoute,
  type Filters,
  type SortKey,
} from '../domain/filter';
import type { EvaluatedPlan, Metal } from '../domain/types';
import { money, parseOptionalNumber } from '../format';
import { OVERALL_TEXT, PlanCard, planFit, type PlanCardContext } from './PlanCard';

interface Props extends PlanCardContext {
  plans: EvaluatedPlan[];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  compareIds: string[];
  maxCompare: number;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  /** Shown above the plan list, such as how to read the yearly costs. */
  intro?: ReactNode;
}

const METALS: Metal[] = ['bronze', 'silver', 'gold', 'platinum'];
const NETWORKS: NetworkChoice[] = ['EPO', 'HMO', 'PPO', 'unconfirmed'];
const NETWORK_LABELS: Record<string, string> = { unconfirmed: 'Not confirmed' };
const GROUPS = ['good', 'check', 'bad'] as const;
const GROUP_HINTS: Record<(typeof GROUPS)[number], string> = {
  good: 'Every hospital, doctor and medication checks out.',
  check: "Nothing is known to be out of network, but something is unconfirmed, or a medication isn't on the drug list (its cash price is already in the costs).",
  bad: 'A must-have hospital or doctor is out of network or not listed. Open "Your fit" to see which.',
};
const ROUTE_LABELS: Record<BuyingRoute, string> = {
  any: 'Anywhere',
  exchange: 'Through Healthplanfinder',
  direct: 'Directly from the insurer (no credit)',
};

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

/** Filters about the plans themselves, as opposed to the household's must-haves. */
const planFiltersOnly = (f: Filters): Filters => ({ ...EMPTY_FILTERS, hospitals: f.hospitals, doctors: f.doctors });
const moreFilterCount = (f: Filters) =>
  [f.route !== 'any', f.hsaOnly, f.cascadeOnly, f.maxMonthly !== null, f.maxDeductible !== null, f.maxOopMax !== null].filter(Boolean).length;

/** Each active plan filter as a removable chip. */
function activeChips(f: Filters): { key: string; label: string; clear: Partial<Filters> }[] {
  return [
    ...(f.search.trim() ? [{ key: 'search', label: `“${f.search.trim()}”`, clear: { search: '' } }] : []),
    ...f.metals.map((m) => ({ key: `metal-${m}`, label: m.charAt(0).toUpperCase() + m.slice(1), clear: { metals: f.metals.filter((x) => x !== m) } })),
    ...f.networks.map((n) => ({ key: `net-${n}`, label: NETWORK_LABELS[n] ?? n, clear: { networks: f.networks.filter((x) => x !== n) } })),
    ...f.carriers.map((c) => ({ key: `car-${c}`, label: c, clear: { carriers: f.carriers.filter((x) => x !== c) } })),
    ...(f.route !== 'any' ? [{ key: 'route', label: f.route === 'exchange' ? 'Healthplanfinder' : 'Direct from insurer', clear: { route: 'any' as const } }] : []),
    ...(f.hsaOnly ? [{ key: 'hsa', label: 'HSA', clear: { hsaOnly: false } }] : []),
    ...(f.cascadeOnly ? [{ key: 'cascade', label: 'Cascade Care', clear: { cascadeOnly: false } }] : []),
    ...(f.maxMonthly !== null ? [{ key: 'maxM', label: `Premium ≤ ${money(f.maxMonthly)}`, clear: { maxMonthly: null } }] : []),
    ...(f.maxDeductible !== null ? [{ key: 'maxD', label: `Deductible ≤ ${money(f.maxDeductible)}`, clear: { maxDeductible: null } }] : []),
    ...(f.maxOopMax !== null ? [{ key: 'maxO', label: `Out-of-pocket ≤ ${money(f.maxOopMax)}`, clear: { maxOopMax: null } }] : []),
  ];
}

function CheckGroup<T extends string>(props: {
  legend: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  capitalize?: boolean;
  /** Plans each option would show given the other filters. Options with none are disabled unless already ticked. */
  counts?: Record<string, number>;
  labels?: Record<string, string>;
  help?: { summary: string; text: string };
}) {
  return (
    <fieldset className="filter-group">
      <legend>{props.legend}</legend>
      {props.options.map((option) => {
        const count = props.counts?.[option] ?? 0;
        const checked = props.selected.includes(option);
        const empty = props.counts !== undefined && count === 0 && !checked;
        return (
          <label className={empty ? 'check is-empty' : 'check'} key={option}>
            <input type="checkbox" checked={checked} disabled={empty} onChange={() => props.onChange(toggled(props.selected, option))} />
            <span className={props.capitalize ? 'capitalize' : undefined}>{props.labels?.[option] ?? option}</span>
            {props.counts && <span className="count">{count}</span>}
          </label>
        );
      })}
      {props.help && (
        <details className="filter-help">
          <summary>{props.help.summary}</summary>
          <small className="hint">{props.help.text}</small>
        </details>
      )}
    </fieldset>
  );
}

function NumberFilter(props: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input inputMode="numeric" placeholder="Any" value={props.value ?? ''} onChange={(e) => props.onChange(parseOptionalNumber(e.target.value))} />
    </label>
  );
}

export function PlanBrowser(props: Props) {
  const { plans, filters, onFiltersChange, compareIds, maxCompare, onToggleCompare, onOpenCompare, intro, ...context } = props;
  const { doctors } = context;
  const [sortKey, setSortKey] = useState<SortKey>('expectedYear');
  const [descending, setDescending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupByFit, setGroupByFit] = useState(true);
  const [moreOpen, setMoreOpen] = useState(() => moreFilterCount(filters) > 0);
  const set = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  const carriers = useMemo(() => [...new Set(plans.map((p) => p.plan.carrier))].sort(), [plans]);
  const counts = useMemo(
    () => ({
      metals: optionCounts(plans, filters, 'metals', (p) => p.metal, doctors),
      networks: optionCounts(plans, filters, 'networks', networkOf, doctors),
      carriers: optionCounts(plans, filters, 'carriers', (p) => p.carrier, doctors),
    }),
    [plans, filters, doctors],
  );
  const visible = useMemo(() => sortPlans(applyFilters(plans, filters, doctors), sortKey, descending), [plans, filters, doctors, sortKey, descending]);
  const fits = new Map(visible.map((p) => [p.plan.id, planFit(p, context).overall]));
  const canGroup = [...fits.values()].some((f) => f !== null);
  const grouped = groupByFit && canGroup;
  const chips = activeChips(filters);
  const mustHaveCount = filters.hospitals.length + filters.doctors.length;
  const hasMustHaves = HOSPITAL_IDS.length + doctors.length > 0;
  const more = moreFilterCount(filters);

  const renderList = (items: EvaluatedPlan[]) => (
    <ul className="plan-list">
      {items.map((item) => (
        <PlanCard
          key={item.plan.id}
          item={item}
          selected={compareIds.includes(item.plan.id)}
          compareFull={compareIds.length >= maxCompare}
          onToggleCompare={onToggleCompare}
          {...context}
        />
      ))}
    </ul>
  );

  return (
    <div className="browser">
      <button type="button" className="secondary filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
        {filtersOpen ? 'Hide filters' : `Filters${chips.length ? ` (${chips.length})` : ''}`}
      </button>
      <aside className={filtersOpen ? 'filters open' : 'filters'} aria-label="Filters">
        {hasMustHaves && (
          <section className="filter-section must-haves">
            <h2>Your must-haves</h2>
            <fieldset className="filter-group">
              <legend className="visually-hidden">Must be in network</legend>
              {HOSPITAL_IDS.map((id) => (
                <label className="check" key={id}>
                  <input type="checkbox" checked={filters.hospitals.includes(id)} onChange={() => set({ hospitals: toggled(filters.hospitals, id) })} />
                  <span>{HOSPITALS[id].name}</span>
                </label>
              ))}
              {doctors.map((d) => (
                <label className="check" key={d.id}>
                  <input type="checkbox" checked={filters.doctors.includes(d.id)} onChange={() => set({ doctors: toggled(filters.doctors, d.id) })} />
                  <span>{d.name}</span>
                </label>
              ))}
              <small className="hint">
                Ticked ones hide plans that don't cover them.{doctors.length > 0 && ' A doctor hides a plan only after you mark them out of network for its insurer.'}
              </small>
            </fieldset>
          </section>
        )}

        <section className="filter-section">
          <div className="filters-head">
            <h2>Plan filters</h2>
            {chips.length > 0 && (
              <button type="button" className="link-button" onClick={() => onFiltersChange(planFiltersOnly(filters))}>
                Clear
              </button>
            )}
          </div>
          <label className="field">
            <span>Search</span>
            <input type="search" placeholder="Plan or carrier" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </label>
          <CheckGroup legend="Metal level" capitalize options={METALS} selected={filters.metals} counts={counts.metals} onChange={(metals) => set({ metals })} />
          <CheckGroup
            legend="Network type"
            options={NETWORKS}
            selected={filters.networks}
            counts={counts.networks}
            labels={NETWORK_LABELS}
            help={{
              summary: 'EPO, HMO, PPO?',
              text: "No PPO plans are listed for King County. An EPO lets you see specialists without a referral, like a PPO, but doesn't pay for out-of-network care except emergencies. 'Not confirmed' means the plan's documents didn't say.",
            }}
            onChange={(networks) => set({ networks })}
          />
          <CheckGroup legend="Carrier" options={carriers} selected={filters.carriers} counts={counts.carriers} onChange={(next) => set({ carriers: next })} />
          <button type="button" className="link-button more-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
            {moreOpen ? 'Fewer filters' : `More filters${more ? ` (${more} on)` : ''}`}
          </button>
          {moreOpen && (
            <>
              <label className="field">
                <span>Where you buy</span>
                <select value={filters.route} onChange={(e) => set({ route: e.target.value as BuyingRoute })}>
                  {(Object.keys(ROUTE_LABELS) as BuyingRoute[]).map((r) => (
                    <option key={r} value={r}>
                      {ROUTE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="filter-group">
                <legend>Features</legend>
                <label className="check">
                  <input type="checkbox" checked={filters.hsaOnly} onChange={(e) => set({ hsaOnly: e.target.checked })} />
                  <span>HSA plan</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={filters.cascadeOnly} onChange={(e) => set({ cascadeOnly: e.target.checked })} />
                  <span>Cascade Care</span>
                </label>
              </fieldset>
              <fieldset className="filter-group">
                <legend>Maximums</legend>
                <NumberFilter label="Monthly premium" value={filters.maxMonthly} onChange={(maxMonthly) => set({ maxMonthly })} />
                <NumberFilter label="Deductible" value={filters.maxDeductible} onChange={(maxDeductible) => set({ maxDeductible })} />
                <NumberFilter label="Out-of-pocket limit" value={filters.maxOopMax} onChange={(maxOopMax) => set({ maxOopMax })} />
              </fieldset>
            </>
          )}
        </section>
      </aside>

      <section className="results" aria-label="Plans">
        <div className="results-bar">
          <p aria-live="polite">
            <strong>{visible.length}</strong> of {plans.length} plans
            {mustHaveCount > 0 && <span className="muted"> · covering your {mustHaveCount} must-haves</span>}
          </p>
          <div className="sort">
            <label className="inline-field">
              <span>Sort by</span>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            {canGroup && (
              <label className="check inline-check">
                <input type="checkbox" checked={groupByFit} onChange={(e) => setGroupByFit(e.target.checked)} />
                <span>Group by fit</span>
              </label>
            )}
            <button type="button" className="secondary" onClick={() => setDescending((d) => !d)}>
              {descending ? 'Highest first' : 'Lowest first'}
            </button>
            {compareIds.length > 0 && (
              <button type="button" className="primary" onClick={onOpenCompare}>
                Compare {compareIds.length}
              </button>
            )}
          </div>
        </div>
        {chips.length > 0 && (
          <ul className="filter-chips" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.key}>
                <button type="button" className="filter-chip" aria-label={`Remove filter ${c.label}`} onClick={() => set(c.clear)}>
                  {c.label} <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {intro}

        {visible.length === 0 && (
          <div className="empty">
            <p>No plans match these filters.</p>
            {chips.length > 0 ? (
              <button type="button" className="secondary" onClick={() => onFiltersChange(planFiltersOnly(filters))}>
                Clear plan filters
              </button>
            ) : (
              mustHaveCount > 0 && (
                <button type="button" className="secondary" onClick={() => set({ hospitals: [], doctors: [] })}>
                  Show plans that miss a must-have
                </button>
              )
            )}
          </div>
        )}

        {grouped
          ? GROUPS.map((level) => {
              // A plan with nothing to judge it by joins the ones to confirm rather than dropping out.
              const members = visible.filter((p) => (fits.get(p.plan.id) ?? 'check') === level);
              if (members.length === 0) return null;
              return (
                <section key={level} className={`fit-group fit-group-${level}`} aria-labelledby={`fit-group-${level}`}>
                  <div className="fit-group-head">
                    <h2 id={`fit-group-${level}`}>
                      {OVERALL_TEXT[level]} <span className="muted">({members.length})</span>
                    </h2>
                    <p className="hint">{GROUP_HINTS[level]}</p>
                  </div>
                  {renderList(members)}
                </section>
              );
            })
          : renderList(visible)}
        <p className="hint">
          Yearly costs include premiums and in-network care, using rough price assumptions. Open "Plan details" on any plan for how each
          number is worked out, and its "Your fit" line for where each hospital, doctor and medication stands.
        </p>
      </section>
    </div>
  );
}
