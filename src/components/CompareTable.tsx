import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { DOCTOR_STATUS_LABELS } from '../domain/doctors';
import type { Provider } from '../domain/profile';
import type { ReactNode } from 'react';
import { DoctorHelp } from './DoctorHelp';
import { FACILITIES } from '../data/facilityNetworks';
import { facilityAccess } from '../domain/hospitalAccess';
import { LIST_STATUS_LABELS } from '../data/hospitalLists';
import { TIER_LABELS, fillCostText, listNote, resolveDrug, tierShare, type Approvals, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { EXCEPTION_TERM } from '../data/exceptionPolicies';
import { SURVEY_LABELS, qualityFor, starsText, surveyFor, surveyScoreText } from '../domain/quality';
import {
  OUT_OF_NETWORK_TEXT,
  PRIOR_APPROVAL_LABELS,
  REFERRAL_TEXT,
  URGENT_AWAY_TEXT,
  adultEyeExamsCovered,
  childrensDentalExcluded,
  networkRulesFor,
  networkTypeOf,
} from '../domain/networkRules';
import type { EvaluatedPlan, Member } from '../domain/types';
import { ScenarioGuide } from './ScenarioGuide';
import { SCENARIOS, scenarioParts, type ScenarioId } from '../domain/scenarios';
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
  /** Costs if one drug the plan doesn't list were approved by exception. */
  approvals: Approvals;
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

const ROWS: Row[] = [
  ...HOSPITAL_IDS.map((id) => ({
    label: HOSPITALS[id].name,
    text: (p: EvaluatedPlan) => STATUS_LABELS[hospitalStatus(p.plan, id)],
  })),
  { label: 'Monthly premium', text: (p) => money(p.netMonthly), value: (p) => p.netMonthly },
  { label: 'Tax credit', text: (p) => (p.creditMonthly > 0 ? `${money(p.creditMonthly)}/mo` : 'None') },
  { label: 'Expected year', text: (p) => moneyOrUnknown(p.expectedYear), value: (p) => p.expectedYear },
  { label: 'Bad year', text: (p) => moneyOrUnknown(p.badYear), value: (p) => p.badYear },
  { label: 'Worst case', text: (p) => moneyOrUnknown(p.worstCase), value: (p) => p.worstCase },
  {
    label: 'Cash medications (in each total above)',
    text: (p) => `${money(p.selfPayYear)} a year`,
    hideIf: (p) => p.selfPayYear === 0,
  },
  { label: 'Deductible', text: (p) => moneyOrUnknown(p.deductible), value: (p) => p.deductible },
  { label: 'Out-of-pocket limit', text: (p) => moneyOrUnknown(p.oopMax), value: (p) => p.oopMax },
  { label: 'Primary care', text: (p) => primaryCareText(p.plan.benefits) },
  { label: 'Specialist', text: (p) => costShareText(p.plan.benefits?.specialist) },
  { label: 'Generic drugs', text: (p) => costShareText(p.plan.benefits?.genericRx) },
  { label: 'Brand-name drugs', text: (p) => costShareText(p.plan.benefits?.brandRx) },
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
      return `${eye === null ? 'Eye: not stated' : eye ? 'Eye exams covered' : 'No eye exams'} · ${childrensDentalExcluded(r) ? 'No children’s dental' : 'Children’s dental included'}`;
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

const SCENARIO_KEYS = { expected: 'expectedYear', bad: 'badYear', worst: 'worstCase' } as const satisfies Record<ScenarioId, keyof EvaluatedPlan>;

export function CompareTable({ plans, onRemove, onBrowse, doctors, checkingDoctors, requiredIds, drugLines, drugLookup, approvals, members }: Props) {
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
      if (how.kind === 'cash') {
        if (how.source !== 'checked') return `Not checked: ${cashYear}/yr cash${suffix}`;
        const share = tierShare(benefits, 'nonPreferredBrand').share;
        return (
          <>
            {EXCEPTION_TERM}: {cashYear}/yr cash{suffix}
            <small className="fill-cost">Counted as cash in every scenario, on top of the out-of-pocket limit.</small>
            <small className="fill-cost">If approved (highest brand tier): {fillCostText(share, line.price, deductible)}.</small>
          </>
        );
      }
      const label =
        how.source === 'checked' ? `Covered${how.tier ? `, ${TIER_LABELS[how.tier].toLowerCase()}` : ''}` : `Not checked, assumed ${line.assume === 'generic' ? 'generic' : 'brand-name'}`;
      return (
        <>
          {label}: {costShareText(how.share)}
          {suffix}
          <small className="fill-cost">Per fill: {fillCostText(how.share, line.price, deductible)}.</small>
          <small className="fill-cost">Counted in your share of care, so it goes toward the deductible and out-of-pocket limit.</small>
        </>
      );
    },
  }));
  const hospitalRows: Row[] = HOSPITAL_IDS.map((id) => ({
    label: HOSPITALS[id].name,
    text: (p) => {
      const a = facilityAccess(p.plan, id);
      const status = hospitalStatus(p.plan, id);
      return `${STATUS_LABELS[status]}${a.note && status !== 'in' ? ` (${a.note})` : ''}${a.disagrees ? ` (Healthplanfinder: ${a.directorySays === 'in' ? 'in network' : 'not covered'})` : ''}`;
    },
  }));
  const facilityRows: Row[] = FACILITIES.filter((f) => !requiredIds.includes(f.id) && !HOSPITAL_IDS.includes(f.id)).map((f) => ({
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
  // Each scenario's total, the sum behind it, and what approving each unlisted medication would make it.
  const scenarioRow = (id: ScenarioId): Row => {
    const meta = SCENARIOS.find((x) => x.id === id)!;
    const key = SCENARIO_KEYS[id];
    return {
      label: meta.name,
      value: (p) => p[key],
      text: (p) => {
        const parts = scenarioParts(p)?.find((x) => x.id === id);
        if (!parts) return moneyOrUnknown(p[key]);
        const approvalLines = drugLines.flatMap((line) => {
          const then = line.rxcui ? approvals[p.plan.id]?.[line.rxcui]?.[key] : null;
          return then !== null && then !== undefined ? [{ id: line.itemId, name: line.name, then }] : [];
        });
        return (
          <>
            <span className="compare-total">{money(parts.total)}</span>
            <CostParts parts={parts} />
            {approvalLines.length > 0 && (
              <ul className="approval-lines">
                {approvalLines.map((a) => (
                  <li key={a.id}>
                    If {a.name} were approved: ≈ {money(a.then)}
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      },
    };
  };
  const base = ROWS.slice(HOSPITAL_IDS.length).flatMap((r): Row[] => {
    if (r.label === 'Expected year') return [scenarioRow('expected')];
    if (r.label === 'Bad year') return [scenarioRow('bad')];
    if (r.label === 'Worst case') return [scenarioRow('worst'), ...drugRows];
    return r.label.startsWith('Cash medications') ? [] : [r];
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
                <th scope="row">{row.label}</th>
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
  );
}
