import { HOSPITALS, STATUS_LABELS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { ChangeScenarioButton } from './ChangeScenarioButton';
import { DOCTOR_STATUS_LABELS } from '../domain/doctors';
import type { Provider } from '../domain/profile';
import type { ReactNode } from 'react';
import { DoctorHelp } from './DoctorHelp';
import { FACILITIES } from '../data/facilityNetworks';
import { facilityAccess } from '../domain/hospitalAccess';
import { LIST_STATUS_LABELS } from '../data/hospitalLists';
import { TIER_LABELS, fillCostText, type DrugTier, listNote, resolveDrug, tierShare, drugCostText, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { EXCEPTION_TERM, exceptionPolicy } from '../data/exceptionPolicies';
import { SURVEY_LABELS, qualityFor, starsText, surveyFor, surveyScoreText } from '../domain/quality';
import {
  OUT_OF_NETWORK_TEXT,
  PRIOR_APPROVAL_LABELS,
  REFERRAL_TEXT,
  URGENT_AWAY_TEXT,
  adultEyeExamsCovered,
  childrensDentalStatus,
  networkRulesFor,
  networkTypeOf,
} from '../domain/networkRules';

const DENTAL_TEXT = { covered: 'Children’s dental check-ups included', notCovered: 'No children’s dental', unknown: 'Children’s dental: not stated' } as const;
import type { EvaluatedPlan, Member } from '../domain/types';
import { ScenarioGuide } from './ScenarioGuide';
import { scenarioParts, type CareScenario, type ScenarioId } from '../domain/scenarios';
import { CostParts } from './ScenarioMath';
import { costShareText, money, moneyOrUnknown, primaryCareText } from '../format';

interface Props {
  plans: EvaluatedPlan[];
  onRemove: (id: string) => void;
  onBrowse: () => void;
  doctors: Provider[];
  checkingDoctors: string[];
  requiredIds: string[];
  drugLines: DrugLine[];
  drugLookup: CoverageLookup;
  /** Your scenario, for the medication choices it makes. */
  scenario: CareScenario;
  /** Your scenario in one line, and a way to change it. */
  scenarioText: string;
  onEditScenario: (from: HTMLElement) => void;
  /** The household, to explain how the yearly costs are worked out. */
  members: Member[];
}

interface Row {
  label: string;
  text: (p: EvaluatedPlan) => ReactNode;
  /** Rows with a numeric value mark the lowest plan. */
  value?: (p: EvaluatedPlan) => number | null;
  /** Hide the row when this is true for every plan. */
  hideIf?: (p: EvaluatedPlan) => boolean;
}

const SCENARIO_KEYS = { scenario: 'scenarioYear', worst: 'worstCase' } as const satisfies Record<ScenarioId, keyof EvaluatedPlan>;
const SCENARIO_LABELS: Record<ScenarioId, string> = { scenario: 'Your scenario', worst: 'Worst case' };

const TIER_ROWS: [DrugTier, string][] = [
  ['generic', 'Generic'],
  ['preferredBrand', 'Preferred brand'],
  ['nonPreferredBrand', 'Non-preferred brand'],
  ['specialty', 'Specialty'],
];

/** The plan's price for each drug tier; tiers its summary doesn't list are priced like preferred brand, and marked. */
const DRUG_TIER_ROW: Row = {
  label: 'Drug tiers (what a covered fill costs)',
  text: (p) => {
    const b = p.plan.benefits;
    if (!b) return 'See plan details';
    return (
      <ul className="tier-list">
        {TIER_ROWS.map(([tier, label]) => {
          const { share, estimated } = tierShare(b, tier);
          return (
            <li key={tier}>
              <span>{label}</span> {costShareText(share)}
              {estimated && <small className="muted"> (not in summary; brand price assumed)</small>}
            </li>
          );
        })}
      </ul>
    );
  },
};

/** What the insurer requires to cover a drug its list leaves out, and what it would cost if approved. */
const EXCEPTION_ROW: Row = {
  label: 'Drugs not on the list',
  text: (p) => {
    const policy = exceptionPolicy(p.plan.carrier);
    const b = p.plan.benefits;
    return (
      <>
        <span className={policy.published ? undefined : 'muted'}>{policy.summary}</span>
        {policy.url && (
          <>
            {' '}
            <a href={policy.url} target="_blank" rel="noreferrer">
              Source
            </a>
          </>
        )}
        {b && <small className="fill-cost">If approved, usually the highest brand tier: {costShareText(tierShare(b, 'nonPreferredBrand').share)}.</small>}
      </>
    );
  },
};

const ROWS: Row[] = [
  { label: 'Monthly premium', text: (p) => money(p.netMonthly), value: (p) => p.netMonthly },
  { label: 'Tax credit', text: (p) => (p.creditMonthly > 0 ? `${money(p.creditMonthly)}/mo` : 'None') },
  { label: SCENARIO_LABELS.scenario, text: (p) => moneyOrUnknown(p.scenarioYear), value: (p) => p.scenarioYear },
  { label: SCENARIO_LABELS.worst, text: (p) => moneyOrUnknown(p.worstCase), value: (p) => p.worstCase },
  { label: 'Deductible', text: (p) => moneyOrUnknown(p.deductible), value: (p) => p.deductible },
  { label: 'Out-of-pocket limit', text: (p) => moneyOrUnknown(p.oopMax), value: (p) => p.oopMax },
  { label: 'Primary care', text: (p) => primaryCareText(p.plan.benefits) },
  { label: 'Specialist', text: (p) => costShareText(p.plan.benefits?.specialist) },
  { label: 'Lab tests', text: (p) => costShareText(p.plan.benefits?.lab) },
  { label: 'X-rays, ultrasounds, eye tests', text: (p) => costShareText(p.plan.benefits?.diagnostic) },
  { label: 'CT or MRI scans', text: (p) => costShareText(p.plan.benefits?.scan) },
  { label: 'Emergency room', text: (p) => costShareText(p.plan.benefits?.er) },
  { label: 'Hospital stay', text: (p) => costShareText(p.plan.benefits?.hospital) },
  { label: 'Metal level', text: (p) => p.plan.metal.charAt(0).toUpperCase() + p.plan.metal.slice(1) },
  {
    label: 'Network',
    text: (p) => {
      const net = networkTypeOf(p.plan);
      return net.type ? `${net.type}${net.fromOlderDocs ? ' (from 2026 documents; confirm)' : ''}` : 'See plan details';
    },
  },
  {
    label: 'Urgent care away from network',
    text: (p) => { const r = networkRulesFor(p.plan)?.urgentCareAway; return r ? URGENT_AWAY_TEXT[r.coverage].replace(/^Urgent care[^:]*: /, '').replace(/^./, (c) => c.toUpperCase()) : 'See plan details'; },
  },
  {
    label: 'Prior approval (per summary)',
    text: (p) => { const a = networkRulesFor(p.plan)?.priorApproval; return !a ? 'See plan details' : a.length ? a.map((x) => PRIOR_APPROVAL_LABELS[x]).join(', ') : 'Not listed (still required for some care)'; },
  },
  {
    label: 'Adult eye exams · children’s dental',
    text: (p) => {
      const r = networkRulesFor(p.plan);
      if (!r) return 'See plan details';
      const eye = adultEyeExamsCovered(r);
      return `${eye === null ? 'Eye: not stated' : eye ? 'Eye exams covered' : 'No eye exams'} · ${DENTAL_TEXT[childrensDentalStatus(r)]}`;
    },
  },
  { label: 'Specialist referral', text: (p) => { const r = networkRulesFor(p.plan); return r ? REFERRAL_TEXT[r.referral] : 'See plan details'; } },
  { label: 'Outside the network', text: (p) => { const r = networkRulesFor(p.plan); return r ? OUT_OF_NETWORK_TEXT[r.outOfNetwork].replace('Outside the network: ', '').replace(/^./, (c) => c.toUpperCase()) : 'See plan details'; } },
  {
    label: 'Quality rating (CMS)',
    text: (p) => { const q = qualityFor(p.plan); return q?.overall ? `${starsText(q.overall)} ${q.overall} of 5` : 'Not rated'; },
    // Rows mark the lowest value as best, so more stars count as lower.
    value: (p) => { const o = qualityFor(p.plan)?.overall; return o ? -o : null; },
  },
  {
    label: 'Medical care · experience · admin',
    text: (p) => { const q = qualityFor(p.plan); return q ? [q.medicalCare, q.memberExperience, q.planAdministration].map((s) => (s ? `${s}` : '–')).join(' · ') : 'Not rated'; },
  },
  ...(['planRating', 'gettingCareQuickly', 'customerService'] as const).map((m) => ({
    label: `Members: ${SURVEY_LABELS[m].replace(/ \(.*\)$/, '').toLowerCase()}`,
    text: (p: EvaluatedPlan) => { const v = surveyFor(p.plan)?.[m]; return v === null || v === undefined ? 'No survey' : surveyScoreText(m, v); },
    // Higher is better; rows mark the lowest value as best.
    value: (p: EvaluatedPlan) => { const v = surveyFor(p.plan)?.[m]; return v === null || v === undefined ? null : -v; },
  })),
  { label: 'HSA plan', text: (p) => (p.plan.hsaEligible ? 'Yes' : 'No') },
  { label: 'Cascade Care', text: (p) => (p.plan.cascadeCare ? 'Yes' : 'No') },
];


export function CompareTable({ plans, onRemove, onBrowse, doctors, checkingDoctors, requiredIds, drugLines, drugLookup, scenario, scenarioText, onEditScenario, members }: Props) {
  const drugRows: Row[] = drugLines.map((line) => ({
    label: line.name,
    text: (p) => {
      const benefits = p.plan.benefits;
      if (!benefits) return 'See plan details';
      const how = resolveDrug(line, p.plan, benefits, drugLookup);
      const note = line.rxcui ? listNote(drugLookup(line.rxcui, p.plan)) : '';
      const suffix = note ? ` (${note})` : '';
      const deductible = benefits.deductible.individual;
      const cashYear = money(line.price * line.fillsPerYear);
      const cost = p.drugCosts[line.itemId];
      const inScenario = cost && <small className="fill-cost scenario-cost">In your scenario: {drugCostText(cost)}</small>;
      if (how.kind === 'cash') {
        if (how.source !== 'checked') return <>Not checked: {cashYear}/yr cash{suffix}{inScenario}</>;
        const share = tierShare(benefits, 'nonPreferredBrand').share;
        const approved = line.rxcui !== null && scenario.approved.includes(line.rxcui);
        return (
          <>
            {EXCEPTION_TERM}
            {suffix}
            {approved ? (
              <small className="fill-cost">Your scenario assumes the exception is approved (highest brand tier): {fillCostText(share, line.price, deductible)}.</small>
            ) : (
              <small className="fill-cost">Paid in cash, on top of the out-of-pocket limit. If approved: {fillCostText(share, line.price, deductible)}.</small>
            )}
            {inScenario}
          </>
        );
      }
      const label =
        how.source === 'checked' ? `Covered${how.tier ? `, ${TIER_LABELS[how.tier].toLowerCase()}` : ''}` : `Not checked, assumed ${line.assume === 'generic' ? 'generic' : 'brand-name'}`;
      return (
        <>
          {label}: {costShareText(how.share)}
          {suffix}
          <small className="fill-cost">Per fill: {fillCostText(how.share, line.price, deductible)}. Part of care: counts toward the deductible and out-of-pocket limit.</small>
          {inScenario}
        </>
      );
    },
  }));
  const hospitalRows: Row[] = requiredIds.filter((id) => HOSPITALS[id]).map((id) => ({
    label: HOSPITALS[id].name,
    text: (p) => {
      const a = facilityAccess(p.plan, id);
      const status = hospitalStatus(p.plan, id);
      return `${STATUS_LABELS[status]}${a.note && status !== 'in' ? ` (${a.note})` : ''}${a.disagrees ? ` (Healthplanfinder: ${a.directorySays === 'in' ? 'in network' : 'not covered'})` : ''}`;
    },
  }));
  const facilityRows: Row[] = FACILITIES.filter((f) => !requiredIds.includes(f.id)).map((f) => ({
    label: `${f.name}${f.why ? ` (${f.why.split(' (')[0].toLowerCase()})` : ''}`,
    text: (p) => {
      const a = facilityAccess(p.plan, f.id);
      return a.status === 'unknown' ? 'Not checked' : `${LIST_STATUS_LABELS[a.status]}${a.note ? ` (${a.note})` : ''}`;
    },
  }));
  const doctorRows: Row[] = doctors.map((d) => ({
    label: d.name,
    text: (p) => (
      <>
        {DOCTOR_STATUS_LABELS[doctorStatusFor(d, p.plan).status]}{' '}
        <DoctorHelp provider={d} plan={p.plan} checking={checkingDoctors.includes(d.id)} />
      </>
    ),
  }));
  // Each total with the sum behind it; medications sit right under them.
  const scenarioRow = (id: ScenarioId): Row => {
    const key = SCENARIO_KEYS[id];
    return {
      label: SCENARIO_LABELS[id],
      value: (p) => p[key],
      text: (p) => {
        const parts = scenarioParts(p)?.find((x) => x.id === id);
        if (!parts) return moneyOrUnknown(p[key]);
        return (
          <>
            <span className="compare-total">{money(parts.total)}</span>
            <CostParts parts={parts} />
          </>
        );
      },
    };
  };
  const base = ROWS.flatMap((r): Row[] => {
    if (r.label === SCENARIO_LABELS.scenario) return [scenarioRow('scenario')];
    if (r.label === SCENARIO_LABELS.worst) return [scenarioRow('worst'), ...drugRows, DRUG_TIER_ROW, EXCEPTION_ROW];
    return [r];
  });
  const rows = [...hospitalRows, ...doctorRows, ...base, ...facilityRows];
  if (plans.length === 0) {
    return (
      <div className="empty">
        <p>Choose up to four plans to compare them side by side.</p>
        <button type="button" className="primary" onClick={onBrowse}>
          Browse plans
        </button>
      </div>
    );
  }

  return (
    <div className="compare-page">
    <div className="panel compare-wrap">
      <ScenarioGuide members={members} hasCash={members.some((m) => Object.values(m.selfPayDrugs).some((c) => c > 0))} />
      <table className="compare">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {plans.map((p) => (
              <th scope="col" key={p.plan.id}>
                <div>{p.plan.name}</div>
                <div className="muted compare-carrier">{p.plan.carrier}</div>
                <button type="button" className="link-button" onClick={() => onRemove(p.plan.id)}>
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.filter((row) => !row.hideIf || !plans.every(row.hideIf)).map((row) => {
            const values = row.value ? plans.map(row.value).filter((v): v is number => v !== null) : [];
            const lowest = values.length ? Math.min(...values) : null;
            const showBest = plans.length > 1 && lowest !== null && values.some((v) => v !== lowest);
            return (
              <tr key={row.label}>
                <th scope="row">
                  {row.label}
                  {row.label === SCENARIO_LABELS.scenario && (
                    <>
                      {' '}
                      <ChangeScenarioButton onOpen={onEditScenario} />
                      <small className="row-caption">{scenarioText}</small>
                    </>
                  )}
                </th>
                {plans.map((p) => {
                  const isBest = showBest && row.value?.(p) === lowest;
                  return (
                    <td key={p.plan.id} className={isBest ? 'best' : undefined}>
                      {row.text(p)}
                      {isBest && <span className="visually-hidden"> (lowest)</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">Highlighted values are the lowest in each row.</p>
    </div>
    </div>
  );
}
