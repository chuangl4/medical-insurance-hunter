import { useState } from 'react';
import { HOSPITALS, HOSPITAL_IDS, STATUS_LABELS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { EXCEPTION_TERM } from '../data/exceptionPolicies';
import { DOCTOR_STATUS_LABELS } from '../domain/doctors';
import { RESTRICTION_LABELS, TIER_LABELS, listNote, resolveDrug, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { doctorFit, drugFit, hospitalFit, overallFit, type DrugFitKind, type FitPart } from '../domain/fit';
import { facilityAccess, otherAccess } from '../domain/hospitalAccess';
import { networkTypeOf } from '../domain/networkRules';
import type { Provider } from '../domain/profile';
import type { EvaluatedPlan } from '../domain/types';
import { costShareText, money, moneyOrUnknown, primaryCareText } from '../format';
import { DoctorHelp } from './DoctorHelp';
import { ExceptionHelp } from './ExceptionHelp';
import { NetworkRulesLine } from './NetworkRulesLine';
import { PlanRules } from './PlanRules';
import { QualityRatingLine } from './QualityRatingLine';
import { ScenarioMath } from './ScenarioMath';
import { SeverityMark } from './ScenarioGuide';

const CHANNEL_LABEL = { on: 'Exchange only', off: 'Direct only', both: 'Exchange or direct' };
const FIT_MARK = { good: '✓', check: '?', bad: '✕', info: '·' } as const;
const OVERALL_TEXT = { good: 'Fits your needs', check: 'Fits, with things to confirm', bad: 'Misses a need' } as const;

export interface PlanCardContext {
  doctors: Provider[];
  candidates: Provider[];
  checkingDoctors: string[];
  firstName: string;
  requiredIds: string[];
  drugLines: DrugLine[];
  drugLookup: CoverageLookup;
  ifApproved: Record<string, number | null>;
}

interface Props extends PlanCardContext {
  item: EvaluatedPlan;
  selected: boolean;
  compareFull: boolean;
  onToggleCompare: (id: string) => void;
}

/**
 * One plan. Always shown: what it is, what it costs, and one line on how it fits the household. "Your fit" opens the
 * per-hospital, per-doctor and per-medication details; "Plan details" opens the general facts about the plan.
 */
export function PlanCard(props: Props) {
  const { item, selected, compareFull, onToggleCompare, doctors, candidates, checkingDoctors, firstName, requiredIds, drugLines, drugLookup, ifApproved } = props;
  const { plan } = item;
  const [fitOpen, setFitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const drugs = plan.benefits
    ? drugLines.map((line) => {
        const how = resolveDrug(line, plan, plan.benefits!, drugLookup);
        const kind: DrugFitKind =
          how.kind === 'cash' ? (how.source === 'checked' ? 'notListed' : line.rxcui ? 'unchecked' : 'cash') : how.source === 'checked' ? 'covered' : 'unchecked';
        return { line, how, kind };
      })
    : [];
  const myCandidates = candidates.filter((c) => c.candidateFor === plan.carrier);
  const others = otherAccess(plan, requiredIds);
  const parts = [
    hospitalFit(HOSPITAL_IDS.map((id) => ({ name: HOSPITALS[id].name, status: hospitalStatus(plan, id) }))),
    doctorFit(doctors.map((d) => ({ status: doctorStatusFor(d, plan).status, checking: checkingDoctors.includes(d.id) }))),
    drugFit(drugs.map((d) => d.kind)),
    others.known
      ? ({
          key: 'others',
          label: 'Other hospitals',
          level: 'info',
          detail: `${others.inCount + others.conditionalCount} of ${others.total}`,
        } satisfies FitPart)
      : null,
    myCandidates.length
      ? ({ key: 'candidates', label: 'Candidates', level: 'info', detail: `${myCandidates.length} with this insurer` } satisfies FitPart)
      : null,
  ].filter((p): p is FitPart => p !== null);
  const overall = overallFit(parts);
  const net = networkTypeOf(plan);

  return (
    <li className={`plan-card${overall ? ` plan-fit-${overall}` : ''}`}>
      <div className="plan-head">
        <div>
          <h3>{plan.name}</h3>
          <p className="muted">{plan.carrier}</p>
        </div>
        <label className="check compare-check">
          <input type="checkbox" checked={selected} disabled={!selected && compareFull} onChange={() => onToggleCompare(plan.id)} />
          <span>Compare</span>
        </label>
      </div>
      <div className="badges">
        <span className={`badge metal-${plan.metal}`}>{plan.metal}</span>
        {net.type && (
          <span className="badge" title={net.fromOlderDocs ? plan.networkNote : undefined}>
            {net.type}
            {net.fromOlderDocs && ' (2026)'}
          </span>
        )}
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
      {!plan.benefits && <p className="warn">We couldn't find this plan's 2027 benefit summary, so its yearly costs aren't estimated.</p>}

      <NetworkRulesLine plan={plan} />

      {parts.length > 0 && (
        <button
          type="button"
          className="fit-strip"
          aria-expanded={fitOpen}
          aria-label={`${overall ? OVERALL_TEXT[overall] : 'Your needs'}: ${parts.map((p) => `${p.label} ${p.detail}`).join('; ')}. ${fitOpen ? 'Hide' : 'Show'} details.`}
          onClick={() => setFitOpen((o) => !o)}
        >
          <span className="fit-title">Your fit</span>
          {parts.map((p) => (
            <span key={p.key} className={`fit-part fit-${p.level}`}>
              <span className="fit-mark" aria-hidden="true">
                {FIT_MARK[p.level]}
              </span>
              <span className="fit-label">{p.label}</span> {p.detail}
            </span>
          ))}
          <span className="fit-more" aria-hidden="true">
            {fitOpen ? 'Hide' : 'Details'}
          </span>
        </button>
      )}

      {fitOpen && (
        <div className="fit-details">
          {HOSPITAL_IDS.length > 0 && (
            <ul className="hospital-list">
              {HOSPITAL_IDS.map((id) => {
                const status = hospitalStatus(plan, id);
                const access = facilityAccess(plan, id);
                return (
                  <li key={id} className={`hospital status-${status}`}>
                    <span className="hospital-name">{HOSPITALS[id].name}:</span> {STATUS_LABELS[status]}
                    {access.note && status !== 'in' && <span className="muted"> ({access.note})</span>}
                    {access.disagrees && (
                      <span className="flag-inline">
                        {' '}
                        · Healthplanfinder says {access.directorySays === 'in' ? 'in network' : 'not covered'}; confirm
                      </span>
                    )}
                  </li>
                );
              })}
              <li className="hint">
                From hospital and insurer lists, often by insurer rather than plan. Check{' '}
                {HOSPITAL_IDS.map((id, index) => (
                  <span key={id}>
                    {index > 0 && ' and '}
                    <a href={HOSPITALS[id].source} target="_blank" rel="noreferrer">
                      {HOSPITALS[id].name}'s list
                    </a>
                  </span>
                ))}
                .
              </li>
            </ul>
          )}
          {others.known && (
            <p className={`access-line${others.missing.length ? '' : ' access-full'}`}>
              <span className="hospital-name">Other hospitals:</span> {others.inCount} of {others.total} in network
              {others.conditionalCount > 0 && <>, {others.conditionalCount} with conditions</>}
              {others.missing.length > 0 && <> · not {others.missing.map((f) => f.short).join(', ')}</>}
            </p>
          )}
          {doctors.length > 0 && (
            <ul className="hospital-list">
              {doctors.map((d) => {
                const { status } = doctorStatusFor(d, plan);
                const checking = checkingDoctors.includes(d.id);
                return (
                  <li key={d.id} className={`hospital doctor-${status}`}>
                    <span className="hospital-name">{d.name}:</span> {checking && status === 'unknown' ? 'Checking…' : DOCTOR_STATUS_LABELS[status]}{' '}
                    <DoctorHelp provider={d} plan={plan} checking={checking} />
                  </li>
                );
              })}
            </ul>
          )}
          {myCandidates.length > 0 && (
            <ul className="hospital-list candidate-list">
              <li className="muted">Candidate doctors with this insurer:</li>
              {myCandidates.map((c) => {
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
          {drugs.length > 0 && (
            <ul className="hospital-list rx-list">
              {drugs.map(({ line, how }) => {
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
                    {exception && <ExceptionHelp carrier={plan.carrier} drugName={line.name} expectedYear={item.expectedYear} ifApproved={ifApproved[plan.id] ?? null} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <button type="button" className="link-button math-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((o) => !o)}>
        {detailsOpen ? 'Hide plan details' : 'Plan details: costs explained, copays, rules, quality'}
      </button>
      {detailsOpen && (
        <div className="plan-details">
          {plan.benefits && (
            <section>
              <h4>How the yearly costs add up</h4>
              <ScenarioMath item={item} firstName={firstName} />
            </section>
          )}
          {plan.benefits && (
            <section>
              <h4>Copays and coinsurance</h4>
              <dl className="copay-grid">
                {[
                  ['Primary care', primaryCareText(plan.benefits)],
                  ['Specialist', costShareText(plan.benefits.specialist)],
                  ['Generic drugs', costShareText(plan.benefits.genericRx)],
                  ['Brand drugs', costShareText(plan.benefits.brandRx)],
                  ['Lab', costShareText(plan.benefits.lab)],
                  ['Tests', costShareText(plan.benefits.diagnostic)],
                  ['Emergency room', costShareText(plan.benefits.er)],
                  ['Hospital stay', costShareText(plan.benefits.hospital)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section>
            <h4>Plan rules</h4>
            <PlanRules plan={plan} />
          </section>
          <section>
            <h4>Quality</h4>
            <QualityRatingLine plan={plan} />
          </section>
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
        </div>
      )}
    </li>
  );
}
