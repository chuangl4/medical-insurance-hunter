import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { DOCTOR_STATUS_LABELS } from '../domain/doctors';
import type { Provider } from '../domain/profile';
import type { ReactNode } from 'react';
import { DoctorHelp } from './DoctorHelp';
import { FACILITIES, facilityStatus } from '../data/facilityNetworks';
import { disagreements } from '../domain/hospitalAccess';
import { TIER_LABELS, listNote, resolveDrug, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { EXCEPTION_TERM } from '../data/exceptionPolicies';
import { OUT_OF_NETWORK_TEXT, REFERRAL_TEXT, networkRulesFor, networkTypeOf } from '../domain/networkRules';
import type { EvaluatedPlan } from '../domain/types';
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
  ifApproved: Record<string, number | null>;
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
  { label: 'Specialist referral', text: (p) => { const r = networkRulesFor(p.plan); return r ? REFERRAL_TEXT[r.referral] : 'See plan details'; } },
  { label: 'Outside the network', text: (p) => { const r = networkRulesFor(p.plan); return r ? OUT_OF_NETWORK_TEXT[r.outOfNetwork].replace('Outside the network: ', '').replace(/^./, (c) => c.toUpperCase()) : 'See plan details'; } },
  { label: 'HSA plan', text: (p) => (p.plan.hsaEligible ? 'Yes' : 'No') },
  { label: 'Cascade Care', text: (p) => (p.plan.cascadeCare ? 'Yes' : 'No') },
];

export function CompareTable({ plans, onRemove, onBrowse, doctors, checkingDoctors, requiredIds, drugLines, drugLookup, ifApproved }: Props) {
  const drugRows: Row[] = drugLines.map((line) => ({
    label: line.name,
    text: (p) => {
      if (!p.plan.benefits) return 'See plan details';
      const how = resolveDrug(line, p.plan, p.plan.benefits, drugLookup);
      const note = line.rxcui ? listNote(drugLookup(line.rxcui, p.plan)) : '';
      const suffix = note ? ` (${note})` : '';
      if (how.kind === 'cash') {
        if (how.source !== 'checked') return `Not checked: ${money(line.price * line.fillsPerYear)}/yr cash${suffix}`;
        const approved = ifApproved[p.plan.id];
        const ifOk = approved !== null && approved !== undefined && p.expectedYear !== null ? `; if approved, expected year ≈ ${money(approved)}` : '';
        return `${EXCEPTION_TERM}: ${money(line.price * line.fillsPerYear)}/yr cash${ifOk}${suffix}`;
      }
      return how.source === 'checked' ? `Covered${how.tier ? `, ${TIER_LABELS[how.tier].toLowerCase()}` : ''}: ${costShareText(how.share)}${suffix}` : 'Not checked';
    },
  }));
  const hospitalRows: Row[] = HOSPITAL_IDS.map((id) => ({
    label: HOSPITALS[id].name,
    text: (p) => {
      const flag = disagreements(p.plan, [id], hospitalStatus)[0];
      return `${STATUS_LABELS[hospitalStatus(p.plan, id)]}${flag ? ` (Healthplanfinder: ${flag.directorySays === 'in' ? 'in network' : 'not covered'})` : ''}`;
    },
  }));
  const facilityRows: Row[] = FACILITIES.filter((f) => !requiredIds.includes(f.id) && !HOSPITAL_IDS.includes(f.id)).map((f) => ({
    label: `${f.name}${f.why ? ` (${f.why.split(' (')[0].toLowerCase()})` : ''}`,
    text: (p) => ({ in: 'In network', out: 'Not covered', unknown: 'Not checked' })[facilityStatus(p.plan, f.id)],
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
  const base = ROWS.slice(HOSPITAL_IDS.length);
  const cashIndex = base.findIndex((r) => r.label.startsWith('Cash medications'));
  const rows = [...hospitalRows, ...doctorRows, ...base.slice(0, cashIndex + 1), ...drugRows, ...base.slice(cashIndex + 1), ...facilityRows];
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
