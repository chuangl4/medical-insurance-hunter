import { FACILITY_SOURCE, facilityStatus } from '../data/facilityNetworks';
import { STATUS_LABELS, hospitalStatus } from '../data/hospitalNetworks';
import { TIER_LABELS, disagreements, groupedFacilities } from '../domain/hospitalAccess';
import type { EvaluatedPlan, Plan } from '../domain/types';

interface Props {
  /** Every plan sold in the county, to list each insurer once. */
  plans: EvaluatedPlan[];
  /** Plans passing the current filters; other insurers are dimmed. */
  visible: EvaluatedPlan[];
  requiredIds: string[];
}

const listLabel = (status: string) => (STATUS_LABELS as Record<string, string>)[status]?.toLowerCase() ?? status;

/** Insurers by hospitals: which Seattle-area hospitals each insurer's individual plans cover. */
export function HospitalAccess({ plans, visible, requiredIds }: Props) {
  const groups = groupedFacilities(requiredIds);
  const columns = groups.flatMap((g) => g.facilities);
  const visibleCarriers = new Set(visible.map((p) => p.plan.carrier));
  const carriers = [...new Map(plans.map((p) => [p.plan.carrier, p.plan])).values()]
    .map((plan) => ({ plan, inCount: columns.filter((f) => facilityStatus(plan, f.id) === 'in').length, count: plans.filter((p) => p.plan.carrier === plan.carrier).length }))
    .sort((a, b) => b.inCount - a.inCount || a.plan.carrier.localeCompare(b.plan.carrier));
  const flagged = (plan: Plan) => disagreements(plan, requiredIds, hospitalStatus);
  const allFlags = carriers.flatMap(({ plan }) => flagged(plan).map((d) => ({ carrier: plan.carrier, ...d })));

  return (
    <details className="panel hospital-access" open>
      <summary>
        <span>
          <strong>Hospital access</strong> by insurer: {columns.length} Seattle-area hospitals
        </span>
        <span className="cash-toggle">Show or hide</span>
      </summary>
      <div className="table-scroll">
        <table className="access-grid">
          <colgroup>
            <col className="insurer-col" />
            {columns.map((f) => (
              <col key={f.id} />
            ))}
          </colgroup>
          <thead>
            <tr className="tier-row">
              <td />
              {groups.map((g) => (
                <th key={g.tier} scope="colgroup" colSpan={g.facilities.length} className={`tier tier-${g.tier}`}>
                  {TIER_LABELS[g.tier]}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="col">Insurer</th>
              {columns.map((f) => (
                <th key={f.id} scope="col" className="facility-col" title={`${f.name}, ${f.address}${f.why ? ` · ${f.why}` : ''}`}>
                  {f.short}
                  {f.why && <small>{f.why.split(' (')[0]}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carriers.map(({ plan, inCount, count }) => {
              const flags = flagged(plan);
              return (
                <tr key={plan.carrier} className={visibleCarriers.has(plan.carrier) ? undefined : 'dimmed'}>
                  <th scope="row">
                    {plan.carrier}
                    <small>
                      {inCount} of {columns.length} · {count} {count === 1 ? 'plan' : 'plans'}
                      {!visibleCarriers.has(plan.carrier) && ' · filtered out'}
                    </small>
                  </th>
                  {columns.map((f) => {
                    const s = facilityStatus(plan, f.id);
                    const flag = flags.find((d) => d.facility.id === f.id);
                    const text = s === 'in' ? 'In network' : s === 'out' ? 'Not covered' : 'Not checked';
                    return (
                      <td
                        key={f.id}
                        className={`access access-${s}${flag ? ' access-flag' : ''}`}
                        title={flag ? `Healthplanfinder: ${text}. ${f.name}'s own list: ${listLabel(flag.listSays)}.` : `${f.name}: ${text}`}
                      >
                        <span aria-hidden="true">{s === 'in' ? '✓' : s === 'out' ? '✕' : '–'}</span>
                        {flag && (
                          <span className="flag-mark" aria-hidden="true">
                            !
                          </span>
                        )}
                        <span className="visually-hidden">
                          {f.name}: {text}
                          {flag ? `. The hospital's own list says ${listLabel(flag.listSays)}.` : ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {allFlags.length > 0 && (
        <ul className="flag-list">
          {allFlags.map((d) => (
            <li key={d.carrier + d.facility.id}>
              <span className="flag-mark" aria-hidden="true">
                !
              </span>{' '}
              <strong>{d.carrier}</strong> at {d.facility.short}: Healthplanfinder says{' '}
              {d.directorySays === 'in' ? 'in network' : 'not covered'}; the hospital's own list says {listLabel(d.listSays)}.
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        ✓ in network · ✕ not covered, per {FACILITY_SOURCE.name} on {FACILITY_SOURCE.checked} (main campus; the same for
        every plan of an insurer; silver plans assumed to match). <strong>!</strong> means the hospital's own insurance
        list disagrees; the plan filter follows the hospital list, so confirm with the hospital before relying on either.
        "Authorized specialty care only" often means a referral is needed. Hover a hospital for its address.
      </p>
    </details>
  );
}
