import { useMemo, useState } from 'react';
import { FACILITIES } from '../data/facilityNetworks';
import { HOSPITALS, HOSPITAL_IDS } from '../data/hospitalNetworks';
import { cashLines } from '../domain/cashMeds';
import { applyFilters, type Filters } from '../domain/filter';
import type { Profile, Provider } from '../domain/profile';
import type { EvaluatedPlan, Member } from '../domain/types';
import { money } from '../format';
import { CashMedsSummary } from './CashMedsSummary';
import { HospitalAccess } from './HospitalAccess';
import { PlanBrowser } from './PlanBrowser';
import type { PlanCardContext } from './PlanCard';
import { PrescriptionCoverage, linkedDrugs } from './PrescriptionCoverage';
import { ScenarioGuide } from './ScenarioGuide';

type View = 'plans' | 'hospitals' | 'drugs';

interface Props extends PlanCardContext {
  profile: Profile;
  members: Member[];
  plans: EvaluatedPlan[];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  compareIds: string[];
  maxCompare: number;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  onEditHousehold: () => void;
  onProfileChange: (update: (prev: Profile) => Profile) => void;
  drugChecking: string[];
  drugErrors: Record<string, string>;
  onDrugRecheck: (rxcui: string) => void;
}

const toggled = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
const joinNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const hospitalName = (id: string) => HOSPITALS[id]?.name ?? FACILITIES.find((f) => f.id === id)?.short ?? id;

/** Doctors the automatic lookup couldn't finish on its own. */
function unfinishedLookups(doctors: Provider[], checking: string[]): string[] {
  return doctors
    .filter((d) => !d.clinicCheck && !checking.includes(d.id) && !Object.keys(d.confirmed ?? {}).length)
    .filter((d) => d.lookup?.registry || d.lookup?.websites)
    .map((d) => d.name.trim());
}

/**
 * The Browse plans step. A short "Your needs" bar sums up what's personal, then one of three views: the plan list
 * (the default), hospitals by network, or prescriptions by insurer.
 */
export function PlansTab(props: Props) {
  const { profile, members, plans, filters, onEditHousehold, onProfileChange, drugChecking, drugErrors, onDrugRecheck, ...rest } = props;
  const { doctors, candidates, checkingDoctors, requiredIds } = rest;
  const [view, setView] = useState<View>('plans');

  const visible = useMemo(() => applyFilters(plans, filters, doctors), [plans, filters, doctors]);
  const drugs = linkedDrugs(profile);
  const cash = cashLines(profile);
  const cashTotal = cash.reduce((sum, l) => sum + l.yearly, 0);
  const unfinished = unfinishedLookups(doctors, checkingDoctors);
  const { onFiltersChange } = rest;
  // Must-haves double as filters: ticked ones hide plans that miss them.
  const mustHaves = [
    ...HOSPITAL_IDS.map((id) => ({
      id,
      name: HOSPITALS[id].name,
      on: filters.hospitals.includes(id),
      toggle: () => onFiltersChange({ ...filters, hospitals: toggled(filters.hospitals, id) }),
    })),
    ...doctors.map((d) => ({
      id: d.id,
      name: d.name,
      on: filters.doctors.includes(d.id),
      toggle: () => onFiltersChange({ ...filters, doctors: toggled(filters.doctors, d.id) }),
    })),
  ];
  // Must-have hospitals the app has no per-plan status for; shown, but they can't filter.
  const extraHospitals = requiredIds.filter((id) => !HOSPITAL_IDS.includes(id));
  const hasDrugView = drugs.length > 0 || cash.length > 0;
  const views: { id: View; label: string }[] = [
    { id: 'plans', label: `Plans (${visible.length})` },
    { id: 'hospitals', label: 'Hospitals by network' },
    ...(hasDrugView ? [{ id: 'drugs' as const, label: 'Prescriptions by insurer' }] : []),
  ];

  const coveredBy = (rxcui: string) => {
    const cov = profile.drugCoverage?.[rxcui];
    const status = (id: string) => cov?.plans[id] ?? cov?.fromLists?.[id];
    return { covered: plans.filter((p) => status(p.plan.id)?.covered).length, total: plans.length };
  };

  return (
    <div className="plans-tab">
      <section className="needs-bar" aria-label="Your needs">
        <span className="needs-title">Your needs</span>
        <div className="needs-groups">
          {mustHaves.length > 0 && (
            <div className="needs-group" role="group" aria-labelledby="must-have-label">
              <span id="must-have-label" className="need-label">
                Must-haves
              </span>
              <ul className="needs-list">
                {mustHaves.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="need need-toggle"
                      aria-pressed={m.on}
                      title={m.on ? `Showing only plans with ${m.name}. Click to show all.` : `Click to show only plans with ${m.name}.`}
                      onClick={m.toggle}
                    >
                      <span className="need-check" aria-hidden="true">
                        {m.on ? '✓' : ''}
                      </span>
                      {m.name}
                    </button>
                  </li>
                ))}
                {extraHospitals.map((id) => (
                  <li key={id} className="need need-static">
                    {hospitalName(id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(hasDrugView || candidates.length > 0) && (
            <ul className="needs-list">
              {hasDrugView && (
                <li>
                  <button type="button" className="need" onClick={() => setView('drugs')}>
                    <span className="need-label">Medications</span> {drugs.length} checked against drug lists
                    {cash.length > 0 && ` · ${money(cashTotal)}/yr paid in cash`}
                  </button>
                </li>
              )}
              {candidates.length > 0 && (
                <li>
                  <button type="button" className="need" onClick={onEditHousehold}>
                    <span className="need-label">Candidates</span> {candidates.length} doctor{candidates.length === 1 ? '' : 's'}, shown on
                    their insurer's plans
                  </button>
                </li>
              )}
            </ul>
          )}
          {mustHaves.length > 0 && (
            <p className="needs-hint">
              Ticked must-haves hide plans that miss them.{doctors.length > 0 && ' A doctor hides a plan only once you mark them out of network for its insurer.'}
            </p>
          )}
        </div>
        <button type="button" className="link-button" onClick={onEditHousehold}>
          Edit needs
        </button>
        {unfinished.length > 0 && (
          <p className="needs-todo" role="note">
            <strong>Needs your help:</strong> the app couldn't finish looking up {joinNames(unfinished)}. Open a plan's "Your fit" line and
            use the ? next to the name, then pick the right person or mark each insurer in{' '}
            <button type="button" className="link-button" onClick={onEditHousehold}>
              Your household
            </button>
            .
          </p>
        )}
      </section>

      <div className="view-switch" role="group" aria-label="View">
        {views.map((v) => (
          <button key={v.id} type="button" className={view === v.id ? 'view active' : 'view'} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Kept mounted so sorting and open cards survive a look at the other views. */}
      <div hidden={view !== 'plans'}>
        <PlanBrowser
          plans={plans}
          filters={filters}
          {...rest}
          intro={<ScenarioGuide members={members} hasCash={members.some((m) => Object.values(m.selfPayDrugs).some((c) => c > 0))} />}
        />
      </div>
      {view === 'hospitals' && <HospitalAccess plans={plans} visible={visible} requiredIds={requiredIds} />}
      {view === 'drugs' && (
        <div className="drug-view">
          <CashMedsSummary profile={profile} coveredBy={coveredBy} onEdit={onEditHousehold} />
          <PrescriptionCoverage
            profile={profile}
            plans={plans}
            onChange={onProfileChange}
            checking={drugChecking}
            errors={drugErrors}
            onRecheck={onDrugRecheck}
          />
        </div>
      )}
    </div>
  );
}
