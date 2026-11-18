import { FACILITY_SOURCE } from '../data/facilityNetworks';
import { LIST_STATUS_LABELS } from '../data/hospitalLists';
import { NETWORK_NAMES, planNetwork } from '../data/planNetworks';
import { TIER_LABELS, facilityAccess, groupedFacilities, type AccessStatus } from '../domain/hospitalAccess';
import type { EvaluatedPlan } from '../domain/types';

interface Props {
  /** Every plan sold in the county, to list each network once. */
  plans: EvaluatedPlan[];
  /** Plans passing the current filters; other networks are dimmed. */
  visible: EvaluatedPlan[];
  requiredIds: string[];
}

const SYMBOL: Record<AccessStatus, string> = { in: '✓', conditional: '◐', out: '✕', notListed: '✕', unclear: '?', unknown: '–' };
const usable = (s: AccessStatus) => s === 'in' || s === 'conditional';

/** Networks by hospitals: which Seattle-area hospitals each individual-plan network covers, per the hospitals' own lists. */
export function HospitalAccess({ plans, visible, requiredIds }: Props) {
  const groups = groupedFacilities(requiredIds);
  const columns = groups.flatMap((g) => g.facilities);
  const visibleIds = new Set(visible.map((p) => p.plan.id));
  const rows = [...new Map(plans.map((p) => [planNetwork(p.plan) ?? p.plan.carrier, p.plan])).entries()]
    .map(([key, plan]) => {
      const members = plans.filter((p) => (planNetwork(p.plan) ?? p.plan.carrier) === key);
      return {
        key,
        plan,
        label: NETWORK_NAMES[key as keyof typeof NETWORK_NAMES] ?? plan.carrier,
        count: members.length,
        shown: members.some((p) => visibleIds.has(p.plan.id)),
        usableCount: columns.filter((f) => usable(facilityAccess(plan, f.id).status)).length,
      };
    })
    .sort((a, b) => b.usableCount - a.usableCount || a.label.localeCompare(b.label));
  const notes = rows.flatMap((r) =>
    columns.flatMap((f) => {
      const a = facilityAccess(r.plan, f.id);
      return a.note || a.disagrees ? [{ row: r, facility: f, access: a }] : [];
    }),
  );

  return (
    <section className="panel hospital-access" aria-labelledby="hospital-access-title">
      <h2 id="hospital-access-title" className="panel-title">
        Hospital access by network <span className="muted">· {columns.length} Seattle-area hospitals; networks your filters hide are dimmed</span>
      </h2>
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
              <th scope="col">Network</th>
              {columns.map((f) => (
                <th key={f.id} scope="col" className="facility-col" title={`${f.name}, ${f.address}${f.why ? ` · ${f.why}` : ''}`}>
                  {f.short}
                  {f.why && <small>{f.why.split(' (')[0]}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.shown ? undefined : 'dimmed'}>
                <th scope="row">
                  {r.label}
                  <small>
                    {r.usableCount} of {columns.length} · {r.count} {r.count === 1 ? 'plan' : 'plans'}
                    {!r.shown && ' · filtered out'}
                  </small>
                </th>
                {columns.map((f) => {
                  const a = facilityAccess(r.plan, f.id);
                  const label = a.status === 'unknown' ? 'Not checked' : LIST_STATUS_LABELS[a.status];
                  const where = a.from === 'hospital' ? `${f.short}'s own ${a.year} list` : a.from === 'healthplanfinder' ? FACILITY_SOURCE.name : 'no source';
                  const title = `${f.name}: ${label}${a.note ? ` (${a.note})` : ''}, per ${where}.${
                    a.disagrees ? ` Healthplanfinder says ${a.directorySays === 'in' ? 'in network' : 'not covered'}.` : ''
                  }`;
                  return (
                    <td key={f.id} className={`access access-${a.status}${a.disagrees ? ' access-flag' : ''}`} title={title}>
                      <span aria-hidden="true">{SYMBOL[a.status]}</span>
                      {a.disagrees && (
                        <span className="flag-mark" aria-hidden="true">
                          !
                        </span>
                      )}
                      <span className="visually-hidden">{title}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes.length > 0 && (
        <details className="access-notes">
          <summary>
            Conditions and disagreements ({notes.filter((n) => n.access.status === 'conditional').length} with conditions,{' '}
            {notes.filter((n) => n.access.disagrees).length} where Healthplanfinder disagrees)
          </summary>
        <ul className="flag-list">
          {notes.map(({ row, facility, access }) => (
            <li key={row.key + facility.id}>
              {access.disagrees ? (
                <span className="flag-mark" aria-hidden="true">
                  !
                </span>
              ) : (
                <span aria-hidden="true">{SYMBOL[access.status]}</span>
              )}{' '}
              <strong>{row.label}</strong> at {facility.short}: {access.status === 'unknown' ? 'not checked' : LIST_STATUS_LABELS[access.status].toLowerCase()}
              {access.note && <> ({access.note})</>}
              {access.disagrees && <>; Healthplanfinder says {access.directorySays === 'in' ? 'in network' : 'not covered'}</>}.
            </li>
          ))}
        </ul>
        </details>
      )}
      <p className="hint">
        ✓ in network · ◐ with conditions · ✕ out of network or not on the hospital's list · ? unclear · – not checked. Each
        cell uses the hospital's own published list where it has one (hover for the year and source), else{' '}
        {FACILITY_SOURCE.name} ({FACILITY_SOURCE.checked}). <strong>!</strong> means the two disagree. Hospitals list
        networks, so plans sharing a network share a row. Confirm with the hospital before relying on any cell.
      </p>
    </section>
  );
}
