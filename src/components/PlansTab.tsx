import { useMemo, useState } from 'react';
import { FACILITIES } from '../data/facilityNetworks';
import { HOSPITALS, HOSPITAL_IDS } from '../data/hospitalNetworks';
import { cashLines } from '../domain/cashMeds';
import { applyFilters, type Filters } from '../domain/filter';
import type { Profile, Provider } from '../domain/profile';
import type { EvaluatedPlan, Member } from '../domain/types';
import { CashMedsSummary } from './CashMedsSummary';
import { HospitalAccess } from './HospitalAccess';
import { PlanBrowser } from './PlanBrowser';
import type { PlanCardContext } from './PlanCard';
import { PrescriptionCoverage, linkedDrugs } from './PrescriptionCoverage';
import { ScenarioGuide } from './ScenarioGuide';
import { medItems } from './ScenarioPanel';

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
  onEditHousehold: () => void;
  onProfileChange: (update: (prev: Profile) => Profile) => void;
  drugChecking: string[];
  drugErrors: Record<string, string>;
  onDrugRecheck: (rxcui: string) => void;
  /** Leaves a medication out of, or back into, your scenario's costs. */
  onToggleMed: (id: string) => void;
}

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
 * The plans page: a note when a doctor lookup needs help, then one of three views: the plan list (the default, with your
 * must-haves at the top of its filters), hospitals by network, or prescriptions by insurer.
 */
export function PlansTab(props: Props) {
  const { profile, members, plans, filters, onEditHousehold, onProfileChange, drugChecking, drugErrors, onDrugRecheck, onToggleMed, ...rest } = props;
  const { doctors, checkingDoctors, requiredIds } = rest;
  const [view, setView] = useState<View>('plans');

  const visible = useMemo(() => applyFilters(plans, filters, doctors), [plans, filters, doctors]);
  const drugs = linkedDrugs(profile);
  const cash = cashLines(profile);
  const unfinished = unfinishedLookups(doctors, checkingDoctors);
  const hospitals = HOSPITAL_IDS.map((id) => ({ id, name: HOSPITALS[id].name }));
  // Must-have hospitals the app has no per-plan status for; shown, but they can't filter.
  const untrackedHospitals = requiredIds.filter((id) => !HOSPITAL_IDS.includes(id)).map((id) => ({ id, name: hospitalName(id) }));
  const meds = medItems(profile).map((m) => ({ id: m.id, name: m.name, who: m.who, included: !rest.scenario.stopped.includes(m.id) }));
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
          hospitals={hospitals}
          untrackedHospitals={untrackedHospitals}
          meds={meds}
          onToggleMed={onToggleMed}
          onEditHousehold={onEditHousehold}
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
