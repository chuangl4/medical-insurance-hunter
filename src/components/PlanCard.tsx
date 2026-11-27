import { useState } from 'react';
import { ChangeScenarioButton } from './ChangeScenarioButton';
import { HOSPITALS, doctorStatusFor, hospitalStatus } from '../data/hospitalNetworks';
import { resolveDrug, type CoverageLookup, type DrugLine } from '../domain/drugs';
import { doctorFit, drugFit, hospitalFit, overallFit, type DrugFitKind, type FitPart } from '../domain/fit';
import { otherAccess } from '../domain/hospitalAccess';
import { benefitDetailsLink, networkTypeOf } from '../domain/networkRules';
import type { Provider } from '../domain/profile';
import type { EvaluatedPlan } from '../domain/types';
import { costShareText, money, moneyOrUnknown, primaryCareText } from '../format';
import { FIT_MARK, FitDetails, type CashMed } from './FitDetails';
import { NetworkRulesLine } from './NetworkRulesLine';
import { PlanRules } from './PlanRules';
import { CONTRACT_SOURCES } from '../data/contractSources';
import { QualityRatingLine } from './QualityRatingLine';
import { ScenarioMath } from './ScenarioMath';
import type { CareScenario } from '../domain/scenarios';

const CHANNEL_LABEL = { on: 'Exchange only', off: 'Direct only', both: 'Exchange or direct' };
export const OVERALL_TEXT = { good: 'Fits your needs', check: 'Fits, with things to confirm', bad: 'Misses a need' } as const;

export interface PlanCardContext {
  doctors: Provider[];
  checkingDoctors: string[];
  requiredIds: string[];
  /** Must-have hospitals and doctors unticked in the filters: still shown on each plan, but missing one no longer makes a plan miss a need. */
  optionalIds: string[];
  drugLines: DrugLine[];
  drugLookup: CoverageLookup;
  /** Your scenario, for the medication choices it makes. */
  scenario: CareScenario;
  /** Your scenario in one line, and a way to change it. */
  scenarioText: string;
  onEditScenario: (from: HTMLElement) => void;
  /** Opens the question panel for a plan that has a contract loaded. */
  onAsk: (planId: string, from: HTMLElement) => void;
  /** Medications paid in cash on every plan, listed under "Your fit" since they're in every plan's costs. */
  cashMeds?: CashMed[];
}

interface Props extends PlanCardContext {
  item: EvaluatedPlan;
  selected: boolean;
  compareFull: boolean;
  onToggleCompare: (id: string) => void;
  /** No household yet, so there's nothing to check the plan against. */
  hideFit?: boolean;
}

/** The household's must-have hospitals the app has network status for. */
const trackedHospitals = (requiredIds: string[]) => requiredIds.filter((id) => HOSPITALS[id]);

/**
 * A strip part for must-haves, with any unticked ones added to its detail. Unticked ones never set its mark: with no
 * must-haves left, the part is information only.
 */
function withOptional(required: FitPart | null, optional: FitPart | null): FitPart | null {
  if (!optional) return required;
  if (!required) return { ...optional, label: `${optional.label} (optional)`, level: 'info' };
  return { ...required, detail: `${required.detail} · optional: ${optional.detail}` };
}

/** How a plan fits the household: the parts of the "Your fit" line, and what the details list. */
export function planFit(
  item: EvaluatedPlan,
  ctx: Pick<PlanCardContext, 'doctors' | 'checkingDoctors' | 'requiredIds' | 'optionalIds' | 'drugLines' | 'drugLookup'>,
) {
  const { plan } = item;
  const drugs = plan.benefits
    ? ctx.drugLines.map((line) => {
        const how = resolveDrug(line, plan, plan.benefits!, ctx.drugLookup);
        const kind: DrugFitKind =
          how.kind === 'cash' ? (how.source === 'checked' ? 'notListed' : line.rxcui ? 'unchecked' : 'cash') : how.source === 'checked' ? 'covered' : 'unchecked';
        return { line, how, kind };
      })
    : [];
  const others = otherAccess(plan, ctx.requiredIds);
  const required = (id: string) => !ctx.optionalIds.includes(id);
  const hospitalIds = trackedHospitals(ctx.requiredIds);
  const hospitalPart = (ids: string[]) => hospitalFit(ids.map((id) => ({ name: HOSPITALS[id].name, status: hospitalStatus(plan, id) })));
  const doctorPart = (docs: Provider[]) =>
    doctorFit(docs.map((d) => ({ status: doctorStatusFor(d, plan).status, checking: ctx.checkingDoctors.includes(d.id) })));
  const drugPart = drugFit(drugs.map((d) => d.kind));
  const hospitalReq = hospitalPart(hospitalIds.filter(required));
  const doctorReq = doctorPart(ctx.doctors.filter((d) => required(d.id)));
  const parts = [
    withOptional(hospitalReq, hospitalPart(hospitalIds.filter((id) => !required(id)))),
    withOptional(doctorReq, doctorPart(ctx.doctors.filter((d) => !required(d.id)))),
    drugPart,
    others.known
      ? ({ key: 'others', label: 'Other hospitals', level: 'info', detail: `${others.inCount + others.conditionalCount} of ${others.total}` } satisfies FitPart)
      : null,
  ].filter((p): p is FitPart => p !== null);
  // The line shows every hospital and doctor; only the ticked must-haves decide whether the plan misses a need.
  const judged = [hospitalReq, doctorReq, drugPart].filter((p): p is FitPart => p !== null);
  return { drugs, others, parts, overall: overallFit(judged) };
}

/**
 * One plan. Always shown: what it is, what it costs, and one line on how it fits the household. "Your fit" opens the
 * per-hospital, per-doctor and per-medication details; "Plan details" opens the general facts about the plan.
 */
export function PlanCard(props: Props) {
  const { item, selected, compareFull, onToggleCompare, hideFit, doctors, checkingDoctors, drugLookup, scenario, onEditScenario, onAsk } = props;
  const { plan } = item;
  const [fitOpen, setFitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fit = planFit(item, props);
  const { parts, overall } = fit;
  const hospitalIds = trackedHospitals(props.requiredIds);
  const net = networkTypeOf(plan);
  const hasContract = Boolean(CONTRACT_SOURCES[plan.id]);
  const details = benefitDetailsLink(plan);

  return (
    <li className={`plan-card${overall ? ` plan-fit-${overall}` : ''}`}>
      <div className="plan-head">
        <div>
          <h3>{plan.name}</h3>
          <p className="muted">{plan.carrier}</p>
        </div>
        <div className="plan-head-actions">
          {hasContract && (
            <button
              type="button"
              className="ask-toggle"
              aria-label={`Ask about ${plan.name}`}
              title="Ask questions about this plan, answered from its 2027 contract"
              onClick={(e) => onAsk(plan.id, e.currentTarget)}
            >
              <span aria-hidden="true">💬</span> Ask
            </button>
          )}
          <button
            type="button"
            className={selected ? 'compare-toggle on' : 'compare-toggle'}
            aria-pressed={selected}
            disabled={!selected && compareFull}
            title={!selected && compareFull ? 'Compare is full. Remove a plan from the tray to add this one.' : undefined}
            onClick={() => onToggleCompare(plan.id)}
          >
            {selected ? '✓ Comparing' : compareFull ? 'Compare full' : '+ Compare'}
          </button>
        </div>
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
          <dt>Your scenario</dt>
          <dd>
            {moneyOrUnknown(item.scenarioYear)}
            <ChangeScenarioButton onOpen={onEditScenario} />
          </dd>
          {item.selfPayYear > 0 && plan.benefits && <small>incl. {money(item.selfPayYear)} cash meds</small>}
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
      {!plan.benefits && <p className="warn">We couldn't find this plan's 2027 benefit summary, so its yearly costs aren't estimated.</p>}

      <NetworkRulesLine plan={plan} />

      {!hideFit && parts.length > 0 && (
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

      {!hideFit && fitOpen && (
        <FitDetails
          item={item}
          fit={fit}
          hospitalIds={hospitalIds}
          optionalIds={props.optionalIds}
          doctors={doctors}
          checkingDoctors={checkingDoctors}
          drugLookup={drugLookup}
          scenario={scenario}
          cashMeds={props.cashMeds ?? []}
        />
      )}

      <button type="button" className="link-button math-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((o) => !o)}>
        {detailsOpen ? 'Hide plan details' : 'Plan details: costs explained, copays, rules, quality'}
      </button>
      {detailsOpen && (
        <div className="plan-details">
          {plan.benefits && (
            <section>
              <h4>How the yearly costs add up</h4>
              <ScenarioMath item={item} />
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
          {hasContract && (
            <button type="button" className="link-button ask-link" onClick={(e) => onAsk(plan.id, e.currentTarget)}>
              Ask a question about this plan's coverage →
            </button>
          )}
          <p className="plan-links">
            {details && (
              <a href={details.url} target="_blank" rel="noreferrer">
                {details.shared ? 'Cascade Care standard benefits' : 'Benefit details'}
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
