import { useMemo, useState } from 'react';
import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { DOCTOR_STATUS_LABELS } from '../domain/doctors';
import type { Provider } from '../domain/profile';
import { DoctorHelp } from './DoctorHelp';
import { ExceptionHelp } from './ExceptionHelp';
import { NetworkRulesLine } from './NetworkRulesLine';
import { QualityRatingLine } from './QualityRatingLine';
import { PlanRules } from './PlanRules';
import { networkTypeOf } from '../domain/networkRules';
import { EXCEPTION_TERM } from '../data/exceptionPolicies';
import { SeverityMark } from './ScenarioGuide';
import { HospitalAccess } from './HospitalAccess';
import { disagreements, otherAccess } from '../domain/hospitalAccess';
import { RESTRICTION_LABELS, TIER_LABELS, listNote, resolveDrug, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { ScenarioMath } from './ScenarioMath';
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
import { costShareText, money, moneyOrUnknown, parseOptionalNumber, primaryCareText } from '../format';

interface Props {
  plans: EvaluatedPlan[];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  compareIds: string[];
  maxCompare: number;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  /** Must-have doctors and clinics (providers that aren't tracked hospitals). */
  doctors: Provider[];
  /** Candidate doctors, shown on their insurer's plans only. */
  candidates: Provider[];
  /** Doctors being looked up right now. */
  checkingDoctors: string[];
  /** Who the bad-year hospital stay is for. */
  firstName: string;
  /** Hospitals that must be in network (ids shared with the hospital-access data). */
  requiredIds: string[];
  /** Medications linked to drugs, priced per plan. */
  drugLines: DrugLine[];
  drugLookup: CoverageLookup;
  /** Each plan's expected year if every drug it doesn't list were approved by exception. */
  ifApproved: Record<string, number | null>;
}

const METALS: Metal[] = ['bronze', 'silver', 'gold', 'platinum'];
const NETWORKS: NetworkChoice[] = ['EPO', 'HMO', 'PPO', 'unconfirmed'];
const NETWORK_LABELS: Record<string, string> = { unconfirmed: 'Not confirmed' };
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
  /** Plans each option would show given the other filters. Options with none are disabled unless already ticked. */
  counts?: Record<string, number>;
  labels?: Record<string, string>;
  note?: string;
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
      {props.note && <small className="hint">{props.note}</small>}
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
  const { plans, filters, onFiltersChange, compareIds, maxCompare, onToggleCompare, onOpenCompare, doctors, checkingDoctors, firstName, requiredIds, drugLines, drugLookup, ifApproved, candidates } = props;
  const [mathOpen, setMathOpen] = useState<string[]>([]);
  const [rulesOpen, setRulesOpen] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('expectedYear');
  const [descending, setDescending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const visible = useMemo(
    () => sortPlans(applyFilters(plans, filters, doctors), sortKey, descending),
    [plans, filters, doctors, sortKey, descending],
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
        {HOSPITAL_IDS.length + doctors.length > 0 && (
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
          {doctors.map((d) => (
            <label className="check" key={d.id}>
              <input
                type="checkbox"
                checked={filters.doctors.includes(d.id)}
                onChange={() => set({ doctors: toggled(filters.doctors, d.id) })}
              />
              <span>{d.name}</span>
            </label>
          ))}
          {doctors.length > 0 && (
            <small className="hint">A doctor hides a plan only after you mark them out of network for its insurer.</small>
          )}
        </fieldset>
        )}
        <CheckGroup
          legend="Metal level"
          capitalize
          options={METALS}
          selected={filters.metals}
          counts={counts.metals}
          onChange={(metals) => set({ metals })}
        />
        <CheckGroup
          legend="Network type"
          options={NETWORKS}
          selected={filters.networks}
          counts={counts.networks}
          labels={NETWORK_LABELS}
          note="No PPO plans are listed for King County. An EPO lets you see specialists without a referral, like a PPO, but doesn't pay for out-of-network care except emergencies. 'Not confirmed' means the plan's documents didn't say."
          onChange={(networks) => set({ networks })}
        />
        <CheckGroup
          legend="Carrier"
          options={carriers}
          selected={filters.carriers}
          counts={counts.carriers}
          onChange={(next) => set({ carriers: next })}
        />
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

        <HospitalAccess plans={plans} visible={visible} requiredIds={requiredIds} />

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
                  {(() => {
                    const net = networkTypeOf(plan);
                    return (
                      net.type && (
                        <span className="badge" title={net.fromOlderDocs ? plan.networkNote : undefined}>
                          {net.type}
                          {net.fromOlderDocs && ' (2026)'}
                        </span>
                      )
                    );
                  })()}
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
                    <dt>
                      <SeverityMark level={1} /> Expected year
                    </dt>
                    <dd>{moneyOrUnknown(item.expectedYear)}</dd>
                    {item.selfPayYear > 0 && plan.benefits && <small>incl. {money(item.selfPayYear)} cash meds</small>}
                  </div>
                  <div>
                    <dt>
                      <SeverityMark level={2} /> Bad year
                    </dt>
                    <dd>{moneyOrUnknown(item.badYear)}</dd>
                  </div>
                  <div>
                    <dt>
                      <SeverityMark level={3} /> Worst case
                    </dt>
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
                <NetworkRulesLine plan={plan} />
                <QualityRatingLine plan={plan} />
                {plan.benefits && (
                  <button
                    type="button"
                    className="link-button math-toggle"
                    aria-expanded={mathOpen.includes(plan.id)}
                    onClick={() => setMathOpen((open) => toggled(open, plan.id))}
                  >
                    {mathOpen.includes(plan.id) ? 'Hide the math' : 'See the math'}
                  </button>
                )}
                <button
                  type="button"
                  className="link-button math-toggle"
                  aria-expanded={rulesOpen.includes(plan.id)}
                  onClick={() => setRulesOpen((open) => toggled(open, plan.id))}
                >
                  {rulesOpen.includes(plan.id) ? 'Hide plan rules' : 'Plan rules'}
                </button>
                {mathOpen.includes(plan.id) && <ScenarioMath item={item} firstName={firstName} />}
                {rulesOpen.includes(plan.id) && <PlanRules plan={plan} />}
                {HOSPITAL_IDS.length > 0 && (
                <ul className="hospital-list">
                  {HOSPITAL_IDS.map((id) => {
                    const status = hospitalStatus(plan, id);
                    const flag = disagreements(plan, [id], hospitalStatus)[0];
                    return (
                      <li key={id} className={`hospital status-${status}`}>
                        <span className="hospital-name">{HOSPITALS[id].name}:</span> {STATUS_LABELS[status]}
                        {flag && (
                          <span className="flag-inline">
                            {' '}
                            · Healthplanfinder says {flag.directorySays === 'in' ? 'in network' : 'not covered'}; confirm
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                )}
                {(() => {
                  const access = otherAccess(plan, requiredIds);
                  if (!access.known) return null;
                  return (
                    <p className={`access-line${access.missing.length ? '' : ' access-full'}`}>
                      <span className="hospital-name">Other hospitals:</span> {access.inCount} of {access.total} in network
                      {access.missing.length > 0 && <> · not {access.missing.map((f) => f.short).join(', ')}</>}
                    </p>
                  );
                })()}
                {plan.benefits && drugLines.length > 0 && (
                  <ul className="hospital-list rx-list">
                    {drugLines.map((line) => {
                      const how = resolveDrug(line, plan, plan.benefits!, drugLookup);
                      const note = line.rxcui ? listNote(drugLookup(line.rxcui, plan)) : '';
                      const exception = how.kind === 'cash' && how.source === 'checked';
                      const text =
                        how.kind === 'cash'
                          ? `${exception ? EXCEPTION_TERM : 'Not checked, assumed not covered'} → ${money(line.price * line.fillsPerYear)}/yr cash`
                          : how.source === 'checked'
                            ? `Covered${how.tier ? `, ${TIER_LABELS[how.tier].toLowerCase()}` : ''}${how.estimated ? ' (tier cost estimated)' : ''}${how.restrictions.length ? ` · ${how.restrictions.map((r) => RESTRICTION_LABELS[r]).join(', ')}` : ''}`
                            : `Not checked, assumed ${line.assume === 'generic' ? 'a generic' : 'a brand-name'} fill`;
                      return (
                        <li key={line.itemId} className={`hospital rx-${how.kind === 'cash' ? 'out' : how.source === 'checked' ? 'in' : 'unknown'}`}>
                          <span className="hospital-name">{line.name}:</span> {text}
                          {note && <small className="muted"> ({note})</small>}{' '}
                          {exception && (
                            <ExceptionHelp carrier={plan.carrier} drugName={line.name} expectedYear={item.expectedYear} ifApproved={ifApproved[plan.id] ?? null} />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {doctors.length > 0 && (
                  <ul className="hospital-list">
                    {doctors.map((d) => {
                      const { status } = doctorStatusFor(d, plan);
                      const checking = checkingDoctors.includes(d.id);
                      return (
                        <li key={d.id} className={`hospital doctor-${status}`}>
                          <span className="hospital-name">{d.name}:</span>{' '}
                          {checking && status === 'unknown' ? 'Checking…' : DOCTOR_STATUS_LABELS[status]}{' '}
                          <DoctorHelp provider={d} plan={plan} checking={checking} />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {candidates.some((c) => c.candidateFor === plan.carrier) && (
                  <ul className="hospital-list candidate-list">
                    <li className="muted">Candidate doctors with this insurer:</li>
                    {candidates
                      .filter((c) => c.candidateFor === plan.carrier)
                      .map((c) => {
                        const mark = c.confirmed?.[plan.carrier];
                        return (
                          <li key={c.id} className={`hospital doctor-${mark ?? 'likely'}`}>
                            <span className="hospital-name">{c.name}</span>
                            {c.note && <span className="muted"> ({c.note})</span>}:{' '}
                            {mark === 'in' ? 'You confirmed in network' : mark === 'out' ? 'You marked out of network' : "Listed in the insurer's directory; confirm"}
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
          Yearly costs include premiums and in-network care, using rough price assumptions. See the guide above the list, or
          "See the math" on any plan, for how each number is worked out.
        </p>
      </section>
    </div>
  );
}
