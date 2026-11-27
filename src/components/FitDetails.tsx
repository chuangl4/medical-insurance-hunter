import type { ReactNode } from 'react';
import { FACILITIES } from '../data/facilityNetworks';
import { HOSPITALS, STATUS_LABELS, doctorStatusFor, hospitalStatus, type NetworkStatus } from '../data/hospitalNetworks';
import { EXCEPTION_TERM } from '../data/exceptionPolicies';
import { DOCTOR_STATUS_LABELS, type DoctorStatus } from '../domain/doctors';
import { RESTRICTION_LABELS, TIER_LABELS, drugCostText, fillCostText, listNote, tierShare, type CoverageLookup } from '../domain/drugs';
import type { DrugFitKind, FitLevel, FitPart } from '../domain/fit';
import { facilityAccess, type otherAccess } from '../domain/hospitalAccess';
import type { Provider } from '../domain/profile';
import type { CareScenario } from '../domain/scenarios';
import type { EvaluatedPlan } from '../domain/types';
import { money } from '../format';
import { DoctorHelp } from './DoctorHelp';
import { ExceptionHelp } from './ExceptionHelp';
import type { planFit } from './PlanCard';

export const FIT_MARK = { good: '✓', check: '?', bad: '✕', info: '·' } as const;

/** A medication paid in cash on every plan, by name, with its yearly cost. */
export interface CashMed {
  id: string;
  name: string;
  yearly: number;
}

type Section = 'hospitals' | 'doctors' | 'meds';

interface Row {
  key: string;
  section: Section;
  level: FitLevel;
  /** Unticked in the must-haves: shown, but it doesn't decide the plan's fit. */
  optional: boolean;
  /** A mark other than the level's own, such as "$" for a medication paid in cash. */
  mark?: string;
  name: string;
  body: ReactNode;
}

const HOSPITAL_LEVEL: Record<NetworkStatus, FitLevel> = { in: 'good', limited: 'check', unknown: 'check', out: 'bad', 'not-listed': 'bad' };
const DOCTOR_LEVEL: Record<DoctorStatus, FitLevel> = { in: 'good', likely: 'good', unknown: 'check', unlikely: 'bad', out: 'bad' };
const DRUG_LEVEL: Record<DrugFitKind, FitLevel> = { covered: 'good', unchecked: 'check', notListed: 'check', cash: 'info' };
const LEVEL_ORDER: FitLevel[] = ['bad', 'check', 'good', 'info'];
const SECTION_TITLES: Record<Section, string> = { hospitals: 'Hospitals', doctors: 'Doctors', meds: 'Medications' };
const shortName = (id: string) => FACILITIES.find((f) => f.id === id)?.short ?? HOSPITALS[id].name;

interface Props {
  item: EvaluatedPlan;
  fit: ReturnType<typeof planFit>;
  hospitalIds: string[];
  optionalIds: string[];
  doctors: Provider[];
  checkingDoctors: string[];
  drugLookup: CoverageLookup;
  scenario: CareScenario;
  cashMeds: CashMed[];
}

/**
 * What "Your fit" opens to: anything left to confirm first, then the strip's own sections in the strip's order, each row
 * with the strip's ✓ ? ✕ mark. Hospitals and doctors unticked in the must-haves come last, muted, since they don't
 * decide the fit.
 */
export function FitDetails({ item, fit, hospitalIds, optionalIds, doctors, checkingDoctors, drugLookup, scenario, cashMeds }: Props) {
  const { plan } = item;
  const { drugs, others, parts } = fit;
  const isOptional = (id: string) => optionalIds.includes(id);
  const rows: Row[] = [];

  for (const id of hospitalIds) {
    const status = hospitalStatus(plan, id);
    const access = facilityAccess(plan, id);
    rows.push({
      key: `h-${id}`,
      section: 'hospitals',
      level: HOSPITAL_LEVEL[status],
      optional: isOptional(id),
      name: HOSPITALS[id].name,
      body: (
        <>
          {STATUS_LABELS[status]}
          {access.note && status !== 'in' && <small className="fit-row-note">{access.note}</small>}
          {access.disagrees && (
            <small className="fit-row-note fit-row-flag">
              Healthplanfinder says {access.directorySays === 'in' ? 'in network' : 'not covered'}; confirm with the insurer.
            </small>
          )}
        </>
      ),
    });
  }

  for (const d of doctors) {
    const { status } = doctorStatusFor(d, plan);
    const checking = checkingDoctors.includes(d.id);
    const level = checking && status === 'unknown' ? 'check' : DOCTOR_LEVEL[status];
    rows.push({
      key: `d-${d.id}`,
      section: 'doctors',
      level,
      optional: isOptional(d.id),
      name: d.name,
      body: (
        <>
          {checking && status === 'unknown' ? 'Checking…' : DOCTOR_STATUS_LABELS[status]}{' '}
          <DoctorHelp provider={d} plan={plan} checking={checking} label={level === 'good' ? undefined : 'How to check'} />
        </>
      ),
    });
  }

  const deductible = plan.benefits?.deductible.individual ?? 0;
  for (const { line, how, kind } of drugs) {
    const notes = line.rxcui ? listNote(drugLookup(line.rxcui, plan)).split(', ').filter(Boolean) : [];
    // An older list is a caveat worth seeing, not a footnote.
    const oldList = notes.find((n) => /^\d{4} list$/.test(n));
    const source = notes.filter((n) => n !== oldList).join(', ');
    const exception = how.kind === 'cash' && how.source === 'checked';
    const approved = exception && line.rxcui !== null && scenario.approved.includes(line.rxcui);
    const cost = item.drugCosts[line.itemId];
    const fillCost =
      how.kind === 'plan'
        ? fillCostText(how.share, line.price, deductible)
        : exception && !approved && plan.benefits
          ? fillCostText(tierShare(plan.benefits, 'nonPreferredBrand').share, line.price, deductible)
          : '';
    const fillLabel = how.kind === 'plan' ? 'Each fill' : 'Each fill if approved (highest brand tier)';
    const status =
      how.kind === 'cash'
        ? exception
          ? EXCEPTION_TERM
          : kind === 'cash'
            ? 'Paid in cash'
            : 'Not checked, assumed not covered'
        : how.source === 'checked'
          ? `Covered${how.tier ? ` · ${TIER_LABELS[how.tier].toLowerCase()} tier` : ''}${how.estimated ? ' (tier cost estimated)' : ''}`
          : `Not checked, assumed ${line.assume === 'generic' ? 'a generic' : 'a brand-name'} fill`;
    const restrictions = how.kind === 'plan' ? how.restrictions.map((r) => RESTRICTION_LABELS[r]) : [];
    rows.push({
      key: `m-${line.itemId}`,
      section: 'meds',
      level: DRUG_LEVEL[kind],
      mark: kind === 'cash' ? '$' : undefined,
      optional: false,
      name: line.name,
      body: (
        <>
          {status}
          {how.kind === 'cash' && <> → {money(line.price * line.fillsPerYear)}/yr cash</>}
          {restrictions.map((r) => (
            <span key={r} className="fit-tag">
              {r}
            </span>
          ))}
          {source && <small className="muted"> ({source})</small>}{' '}
          {exception && <ExceptionHelp plan={plan} line={line} approvedInScenario={approved} />}
          {oldList && (
            <small className="fit-row-note fit-row-flag">From the {oldList}: the 2027 list isn't posted yet, so confirm before you enroll.</small>
          )}
          {(fillCost || cost) && (
            <small className="fit-row-note">
              {fillCost && <>{fillLabel}: {fillCost.replace(/ per fill/g, '')}</>}
              {fillCost && cost && ' · '}
              {cost && (
                <>
                  Your scenario{approved ? ', if the exception is approved' : ''}: {drugCostText(cost)}
                </>
              )}
            </small>
          )}
        </>
      ),
    });
  }

  for (const c of cashMeds) {
    rows.push({
      key: `c-${c.id}`,
      section: 'meds',
      level: 'info',
      mark: '$',
      optional: false,
      name: c.name,
      body: <>Paid in cash → {money(c.yearly)}/yr, the same on every plan</>,
    });
  }

  const toConfirm = rows.filter((r) => !r.optional && r.level === 'check');
  const optional = rows.filter((r) => r.optional);
  const bySection = (s: Section) =>
    rows
      .filter((r) => r.section === s && !r.optional && r.level !== 'check')
      .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const partLevel = (s: Section): FitLevel => {
    const part = parts.find((p: FitPart) => p.key === s);
    return part && !part.label.includes('optional') ? part.level : 'info';
  };
  const requiredHospitals = hospitalIds.filter((id) => !isOptional(id));

  return (
    <div className="fit-details">
      {toConfirm.length > 0 && (
        <FitSection title="To confirm" level="check" className="fit-confirm">
          {toConfirm.map((r) => (
            <FitRow key={r.key} row={r} />
          ))}
        </FitSection>
      )}
      {(['hospitals', 'doctors', 'meds'] as const).map((s) => {
        const list = bySection(s);
        if (!list.length) return null;
        return (
          <FitSection
            key={s}
            title={SECTION_TITLES[s]}
            level={partLevel(s)}
            aside={
              s === 'hospitals' && requiredHospitals.length > 0 ? (
                <>
                  Sources:{' '}
                  {requiredHospitals.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ' · '}
                      <a href={HOSPITALS[id].source} target="_blank" rel="noreferrer" title={`${HOSPITALS[id].name}'s list of insurers`}>
                        {shortName(id)}
                      </a>
                    </span>
                  ))}
                </>
              ) : undefined
            }
          >
            {list.map((r) => (
              <FitRow key={r.key} row={r} />
            ))}
          </FitSection>
        );
      })}
      {others.known && <OtherHospitals others={others} />}
      {optional.length > 0 && (
        <FitSection title="Not must-haves" level="info" className="fit-optional" aside="Unticked, so they don't affect this plan's fit">
          {optional.map((r) => (
            <FitRow key={r.key} row={r} />
          ))}
        </FitSection>
      )}
    </div>
  );
}

function FitSection({ title, level, className, aside, children }: { title: string; level: FitLevel; className?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={`fit-section${className ? ` ${className}` : ''}`}>
      <h4 className={`fit-section-head fit-${level}`}>
        <span className="fit-mark" aria-hidden="true">
          {FIT_MARK[level]}
        </span>
        {title}
        {aside && <small className="fit-section-aside">{aside}</small>}
      </h4>
      <ul className="fit-rows">{children}</ul>
    </section>
  );
}

const LEVEL_WORDS: Record<FitLevel, string> = { good: 'OK', check: 'to confirm', bad: 'problem', info: '' };

function FitRow({ row }: { row: Row }) {
  return (
    <li className={`fit-row fit-${row.level}`}>
      <span className="fit-mark" aria-hidden="true">
        {row.mark ?? FIT_MARK[row.level]}
      </span>
      {LEVEL_WORDS[row.level] && <span className="visually-hidden">{LEVEL_WORDS[row.level]}: </span>}
      <span className="fit-row-text">
        <span className="fit-row-name">{row.name}</span> <span className="fit-row-status">{row.body}</span>
      </span>
    </li>
  );
}

function OtherHospitals({ others }: { others: ReturnType<typeof otherAccess> }) {
  return (
    <section className="fit-section">
      <h4 className="fit-section-head fit-info">
        <span className="fit-mark" aria-hidden="true">
          ·
        </span>
        Other hospitals
        <small className="fit-section-aside">For information; doesn't affect the fit</small>
      </h4>
      <p className="fit-others">
        {others.inCount} of {others.total} in network
        {others.conditionalCount > 0 && <>, {others.conditionalCount} with conditions</>}
        {others.missing.length > 0 && <> · not {others.missing.map((f) => f.short).join(', ')}</>}
      </p>
    </section>
  );
}
