import { useMemo, useState } from 'react';
import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, hospitalStatus } from '../data/hospitalNetworks';
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  applyFilters,
  sortPlans,
  type BuyingRoute,
  type Filters,
  type SortKey,
} from '../domain/filter';
import type { EvaluatedPlan, Metal, NetworkType } from '../domain/types';
import { costShareText, money, moneyOrUnknown, parseOptionalNumber, primaryCareText } from '../format';

interface Props {
  plans: EvaluatedPlan[];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  compareIds: string[];
  maxCompare: number;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
}

const METALS: Metal[] = ['bronze', 'silver', 'gold', 'platinum'];
const NETWORKS: NetworkType[] = ['HMO', 'PPO', 'EPO'];
const CHANNEL_LABEL = { on: 'Exchange only', off: 'Direct only', both: 'Exchange or direct' };

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function CheckGroup<T extends string>(props: {
  legend: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  capitalize?: boolean;
}) {
  return (
    <fieldset className="filter-group">
      <legend>{props.legend}</legend>
      {props.options.map((option) => (
        <label className="check" key={option}>
          <input
            type="checkbox"
            checked={props.selected.includes(option)}
            onChange={() => props.onChange(toggled(props.selected, option))}
          />
          <span className={props.capitalize ? 'capitalize' : undefined}>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

function NumberFilter(props: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        inputMode="numeric"
        placeholder="Any"
        value={props.value ?? ''}
        onChange={(e) => props.onChange(parseOptionalNumber(e.target.value))}
      />
    </label>
  );
}

export function PlanBrowser(props: Props) {
  const { plans, filters, onFiltersChange, compareIds, maxCompare, onToggleCompare, onOpenCompare } = props;
  const [sortKey, setSortKey] = useState<SortKey>('expectedYear');
  const [descending, setDescending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  const carriers = useMemo(() => [...new Set(plans.map((p) => p.plan.carrier))].sort(), [plans]);
  const visible = useMemo(
    () => sortPlans(applyFilters(plans, filters), sortKey, descending),
    [plans, filters, sortKey, descending],
  );

  return (
    <div className="browser">
      <button
        type="button"
        className="secondary filters-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        {filtersOpen ? 'Hide filters' : 'Show filters'}
      </button>
      <aside className={filtersOpen ? 'filters open' : 'filters'} aria-label="Filters">
        <div className="filters-head">
          <h2>Filters</h2>
          <button type="button" className="link-button" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
            Clear all
          </button>
        </div>
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Plan or carrier"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Where you buy</span>
          <select value={filters.route} onChange={(e) => set({ route: e.target.value as BuyingRoute })}>
            <option value="any">Anywhere</option>
            <option value="exchange">Through Healthplanfinder</option>
            <option value="direct">Directly from the insurer (no credit)</option>
          </select>
        </label>
        {HOSPITAL_IDS.length > 0 && (
        <fieldset className="filter-group">
          <legend>Must be in network</legend>
          {HOSPITAL_IDS.map((id) => (
            <label className="check" key={id}>
              <input
                type="checkbox"
                checked={filters.hospitals.includes(id)}
                onChange={() => set({ hospitals: toggled(filters.hospitals, id) })}
              />
              <span>{HOSPITALS[id].name}</span>
            </label>
          ))}
        </fieldset>
        )}
        <CheckGroup legend="Metal level" capitalize options={METALS} selected={filters.metals} onChange={(metals) => set({ metals })} />
        <CheckGroup legend="Network type" options={NETWORKS} selected={filters.networks} onChange={(networks) => set({ networks })} />
        <CheckGroup legend="Carrier" options={carriers} selected={filters.carriers} onChange={(next) => set({ carriers: next })} />
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
      </aside>

      <section className="results" aria-label="Plans">
        <div className="results-bar">
          <p aria-live="polite">
            <strong>{visible.length}</strong> of {plans.length} plans
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

        {visible.length === 0 && (
          <div className="empty">
            <p>No plans match these filters.</p>
            <button type="button" className="secondary" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </div>
        )}

        <ul className="plan-list">
          {visible.map((item) => {
            const { plan } = item;
            const selected = compareIds.includes(plan.id);
            return (
              <li className="plan-card" key={plan.id}>
                <div className="plan-head">
                  <div>
                    <h3>{plan.name}</h3>
                    <p className="muted">{plan.carrier}</p>
                  </div>
                  <label className="check compare-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && compareIds.length >= maxCompare}
                      onChange={() => onToggleCompare(plan.id)}
                    />
                    <span>Compare</span>
                  </label>
                </div>
                <div className="badges">
                  <span className={`badge metal-${plan.metal}`}>{plan.metal}</span>
                  {plan.network && <span className="badge">{plan.network}</span>}
                  <span className="badge">{CHANNEL_LABEL[plan.channel]}</span>
                  {plan.hsaEligible && <span className="badge">HSA</span>}
                  {plan.cascadeCare && <span className="badge">Cascade Care</span>}
                </div>
                <dl className="metrics">
                  <div className="metric-lead">
                    <dt>Monthly premium</dt>
                    <dd>{money(item.netMonthly)}</dd>
                    {item.creditMonthly > 0 && <small>{money(item.fullMonthly)} before credit</small>}
                  </div>
                  <div className="metric-lead">
                    <dt>Expected year</dt>
                    <dd>{moneyOrUnknown(item.expectedYear)}</dd>
                  </div>
                  <div>
                    <dt>Bad year</dt>
                    <dd>{moneyOrUnknown(item.badYear)}</dd>
                  </div>
                  <div>
                    <dt>Worst case</dt>
                    <dd>{moneyOrUnknown(item.worstCase)}</dd>
                  </div>
                  <div>
                    <dt>Deductible</dt>
                    <dd>{moneyOrUnknown(item.deductible)}</dd>
                  </div>
                  <div>
                    <dt>Out-of-pocket limit</dt>
                    <dd>{moneyOrUnknown(item.oopMax)}</dd>
                  </div>
                </dl>
                {item.selfPayYear > 0 && plan.benefits && (
                  <p className="muted plan-copays">Yearly costs include {money(item.selfPayYear)} for medications paid without insurance.</p>
                )}
                {HOSPITAL_IDS.length > 0 && (
                <ul className="hospital-list">
                  {HOSPITAL_IDS.map((id) => {
                    const status = hospitalStatus(plan, id);
                    return (
                      <li key={id} className={`hospital status-${status}`}>
                        <span className="hospital-name">{HOSPITALS[id].name}:</span> {STATUS_LABELS[status]}
                      </li>
                    );
                  })}
                </ul>
                )}
                {plan.benefits ? (
                  <p className="muted plan-copays">
                    Primary: {primaryCareText(plan.benefits)} · Specialist: {costShareText(plan.benefits.specialist)} ·
                    Generic: {costShareText(plan.benefits.genericRx)} · Brand: {costShareText(plan.benefits.brandRx)} · Lab:{' '}
                    {costShareText(plan.benefits.lab)} · Tests: {costShareText(plan.benefits.diagnostic)} · ER:{' '}
                    {costShareText(plan.benefits.er)} · Hospital: {costShareText(plan.benefits.hospital)}
                  </p>
                ) : (
                  <p className="warn">We couldn't find this plan's 2027 benefit summary, so its yearly costs aren't estimated.</p>
                )}
                <p className="plan-links">
                  {plan.benefits && (
                    <a href={plan.benefits.source} target="_blank" rel="noreferrer">
                      Benefit details
                    </a>
                  )}
                  <a href={plan.ratesSource} target="_blank" rel="noreferrer">
                    Premium source
                  </a>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="hint">
          {HOSPITAL_IDS.length > 0 && (
            <>
          Hospital statuses come from hospital and insurer lists, which are often by insurer rather than by plan. "Not
          listed" means the plan wasn't on the hospital's list or the hospital said it isn't contracted. Check{' '}
          {HOSPITAL_IDS.map((id, index) => (
            <span key={id}>
              {index > 0 && ' and '}
              <a href={HOSPITALS[id].source} target="_blank" rel="noreferrer">
                {HOSPITALS[id].name}'s list
              </a>
            </span>
          ))}
              .{' '}
            </>
          )}
          Yearly costs include premiums and in-network care, using rough price assumptions. A bad year adds one three-day
          hospital stay for the first person listed. Worst case is premiums plus the out-of-pocket limit.
        </p>
      </section>
    </div>
  );
}
