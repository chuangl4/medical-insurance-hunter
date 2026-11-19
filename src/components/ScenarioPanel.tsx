import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { CoverageLookup } from '../domain/drugs';
import { EMPTY_PROFILE, householdFromProfile, type Profile } from '../domain/profile';
import {
  ER_VISIT_PRICE,
  HOSPITAL_STAY,
  PRESETS,
  careSummary,
  presetOf,
  type CareScenario,
  type ListedCare,
} from '../domain/scenarios';
import type { EvaluatedPlan } from '../domain/types';
import { money, parseOptionalNumber } from '../format';

const STORAGE_KEY = 'mih.scenario.v1';
const LISTED_OPTIONS: { value: ListedCare; label: string }[] = [
  { value: 0, label: 'None (a healthy year)' },
  { value: 0.5, label: 'Half as much' },
  { value: 1, label: 'As listed' },
  { value: 2, label: 'Twice as much' },
];

const count = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : 0);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * A scenario an earlier version kept in this browser, checked field by field, or null. It moves into the profile once.
 */
let legacyScenario: CareScenario | null | undefined;
export function takeLegacyScenario(): CareScenario | null {
  // Read once per page load: the profile can load more than once, and reading clears the browser's copy.
  if (legacyScenario === undefined) legacyScenario = readLegacyScenario();
  return legacyScenario;
}

function readLegacyScenario(): CareScenario | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Record<keyof CareScenario, unknown>> | null;
    localStorage.removeItem(STORAGE_KEY);
    if (!raw || typeof raw !== 'object') return null;
    return {
      listedCare: LISTED_OPTIONS.find((o) => o.value === raw.listedCare)?.value ?? 1,
      hospitalStays: Math.round(count(raw.hospitalStays, 5)),
      erVisits: Math.round(count(raw.erVisits, 10)),
      majorBill: count(raw.majorBill, 10_000_000),
      forMember: typeof raw.forMember === 'string' ? raw.forMember : null,
      approved: strings(raw.approved).filter((r) => /^\d{1,10}$/.test(r)),
      stopped: strings(raw.stopped),
    };
  } catch {
    return null;
  }
}

export interface MedItem {
  id: string;
  name: string;
  who: string;
  rxcui: string | null;
  /** Monthly cash price, for medications always paid in cash. */
  monthly: number | null;
}

/** The household's medications: linked ones are priced per plan, unlinked cash ones cost the same everywhere. */
export function medItems(profile: Profile): MedItem[] {
  return profile.members.flatMap((m) =>
    m.careItems.flatMap((item): MedItem[] => {
      const who = m.label || 'Someone';
      if (item.drug) return item.category === 'genericFills' || item.category === 'brandFills' || item.category === 'selfPay' ? [{ id: item.id, name: item.name || item.drug.name, who, rxcui: item.drug.rxcui, monthly: null }] : [];
      return item.category === 'selfPay' && item.monthlyCost ? [{ id: item.id, name: item.name, who, rxcui: null, monthly: item.monthlyCost }] : [];
    }),
  );
}

/** Medication names by care item id and by RxNorm id, for the one-line scenario summary. */
export function medicationNames(profile: Profile): Record<string, string> {
  return Object.fromEntries(medItems(profile).flatMap((m) => [[m.id, m.name], ...(m.rxcui ? [[m.rxcui, m.name]] : [])]));
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** The button that opened the panel, to move focus back to on close. */
  returnFocus: RefObject<HTMLElement | null>;
  profile: Profile | null;
  scenario: CareScenario;
  onChange: (next: CareScenario) => void;
  /** Drug coverage as the lists say, to count the plans that don't list each drug. */
  drugLookup: CoverageLookup;
  plans: EvaluatedPlan[];
}

function Stepper(props: { label: string; value: number; max: number; hint: string; onChange: (n: number) => void }) {
  return (
    <label className="sc-field">
      <span>{props.label}</span>
      <input type="number" min={0} max={props.max} step={1} value={props.value} onChange={(e) => props.onChange(Math.max(0, Math.min(props.max, Math.round(Number(e.target.value) || 0))))} />
      <small className="hint">{props.hint}</small>
    </label>
  );
}

/**
 * A side panel that sets the care every plan's "Your scenario" cost is priced against, from presets or by hand. It
 * leaves the page usable, so the numbers behind it update as you change things. Changes save with your profile.
 */
export function ScenarioPanel({ open, onClose, returnFocus, profile, scenario, onChange, drugLookup, plans }: Props) {
  const members = useMemo(() => householdFromProfile(profile ?? EMPTY_PROFILE).members, [profile]);
  const meds = useMemo(() => (profile ? medItems(profile) : []), [profile]);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Back to the "Change" button that opened the panel.
      returnFocus.current?.focus();
    };
  }, [open, onClose, returnFocus]);

  if (!profile || !open) return null;
  const set = (patch: Partial<CareScenario>) => onChange({ ...scenario, ...patch });
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const preset = presetOf(scenario);
  const notListed = (rxcui: string) => plans.filter((p) => drugLookup(rxcui, p.plan)?.covered === false).length;

  return (
    <aside ref={panel} className="scenario-panel" role="dialog" aria-modal="false" aria-labelledby="scenario-panel-title" tabIndex={-1}>
      <div className="sc-head">
        <h2 id="scenario-panel-title">Your scenario</h2>
        <button type="button" className="secondary sc-close" onClick={onClose}>
          Done
        </button>
        <p className="hint">
          Every plan's <strong>Your scenario</strong> cost prices this care, and updates as you change it. <strong>Worst case</strong> only
          uses your medication choices. Saved with your profile.
        </p>
      </div>

      <div className="sc-presets" role="group" aria-label="Start from a preset">
        <span className="need-label">Start from</span>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="view" aria-pressed={preset === p.id} onClick={() => set(p.care)}>
            {p.label}
          </button>
        ))}
        {preset === null && <span className="sc-custom">Custom</span>}
      </div>

      <div className="sc-grid">
        <fieldset className="sc-group">
          <legend>Listed care</legend>
          <label className="sc-field">
            <span>Visits and tests</span>
            <select value={scenario.listedCare} onChange={(e) => set({ listedCare: LISTED_OPTIONS.find((o) => o.value === Number(e.target.value))?.value ?? 1 })}>
              {LISTED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <small className="hint">You listed {careSummary(members)}. Medications are set below.</small>
          </label>
        </fieldset>

        <fieldset className="sc-group sc-unplanned">
          <legend>Unplanned care</legend>
          {members.length > 1 && (
            <label className="sc-field">
              <span>For</span>
              <select value={scenario.forMember ?? members[0]?.id ?? ''} onChange={(e) => set({ forMember: e.target.value })}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label || 'Unnamed'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Stepper
            label="Hospital stays"
            value={scenario.hospitalStays}
            max={5}
            hint={`About ${money(HOSPITAL_STAY.price)} billed for a ${HOSPITAL_STAY.days}-day stay.`}
            onChange={(hospitalStays) => set({ hospitalStays })}
          />
          <Stepper label="ER visits" value={scenario.erVisits} max={10} hint={`About ${money(ER_VISIT_PRICE)} billed each.`} onChange={(erVisits) => set({ erVisits })} />
          <label className="sc-field">
            <span>Other major bill</span>
            <input
              inputMode="numeric"
              placeholder="$0"
              value={scenario.majorBill ? scenario.majorBill : ''}
              onChange={(e) => set({ majorBill: parseOptionalNumber(e.target.value) ?? 0 })}
            />
            <small className="hint">Surgery, cancer care and the like, as billed before insurance; charged like a hospital stay.</small>
          </label>
        </fieldset>

        {meds.length > 0 && (
          <fieldset className="sc-group sc-meds">
            <legend>Medications</legend>
            {meds.map((m) => {
              const taking = !scenario.stopped.includes(m.id);
              const missing = m.rxcui ? notListed(m.rxcui) : 0;
              return (
                <div key={m.id} className="sc-med">
                  <label className="check">
                    <input type="checkbox" checked={taking} onChange={() => set({ stopped: toggle(scenario.stopped, m.id) })} />
                    <span>
                      {m.name} <span className="muted">· {m.who}</span>
                    </span>
                  </label>
                  {taking && m.rxcui && missing > 0 && (
                    <label className="sc-field sc-indent">
                      <span>
                        Not on {missing} of {plans.length} plans' drug lists. On those plans:
                      </span>
                      <select
                        value={scenario.approved.includes(m.rxcui) ? 'approved' : 'cash'}
                        onChange={(e) => {
                          const approved = scenario.approved.filter((x) => x !== m.rxcui);
                          set({ approved: e.target.value === 'approved' ? [...approved, m.rxcui!] : approved });
                        }}
                      >
                        <option value="cash">Pay cash</option>
                        <option value="approved">Assume an exception is approved</option>
                      </select>
                    </label>
                  )}
                  {taking && m.monthly !== null && <small className="hint sc-indent">{money(m.monthly)} a month in cash on any plan.</small>}
                </div>
              );
            })}
          </fieldset>
        )}
      </div>
    </aside>
  );
}
