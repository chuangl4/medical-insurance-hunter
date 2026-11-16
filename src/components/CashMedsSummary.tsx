import { CASH_REASON_LABELS, CASH_RULE, HSA_TIP, cashActions, cashLines, type CashReason } from '../domain/cashMeds';
import type { Profile } from '../domain/profile';
import { money } from '../format';

interface Props {
  profile: Profile;
  onEdit: () => void;
  /** How many plans cover a linked drug, out of all plans. */
  coveredBy?: (rxcui: string) => { covered: number; total: number };
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * One line above the plan list, since the amount is the same for every plan. The breakdown and next steps
 * open on demand.
 */
export function CashMedsSummary({ profile, onEdit, coveredBy }: Props) {
  const lines = cashLines(profile);
  if (lines.length === 0) return null;
  const total = lines.reduce((sum, l) => sum + l.yearly, 0);
  const coverage = (l: (typeof lines)[number]) => (l.item.drug && coveredBy ? coveredBy(l.item.drug.rxcui) : null);
  const someCovered = lines.some((l) => (coverage(l)?.covered ?? 0) > 0);

  // Group next steps by reason so related medications share one set of steps.
  const byReason = new Map<CashReason, string[]>();
  for (const l of lines) {
    const reason = l.item.cashReason ?? 'notOnDrugList';
    byReason.set(reason, [...(byReason.get(reason) ?? []), l.item.name]);
  }

  return (
    <details className="panel cash-summary">
      <summary>
        <span>
          {someCovered ? (
            <>
              <strong>Up to {money(total)} a year</strong> for {lines.length === 1 ? '1 medication' : `${lines.length} medications`}{' '}
              paid without insurance, on plans that don't cover them.
            </>
          ) : (
            <>
              <strong>{money(total)} a year</strong> for {lines.length === 1 ? '1 medication' : `${lines.length} medications`} paid
              without insurance is included in every plan's yearly costs.
            </>
          )}
        </span>
        <span className="cash-toggle">Why and what to do</span>
      </summary>
      <div className="cash-body">
        <div className="table-scroll">
          <table className="cash-table">
            <thead>
              <tr>
                <th scope="col">Medication</th>
                <th scope="col">For</th>
                <th scope="col">Calculation</th>
                <th scope="col">Why it's paid in cash</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.item.id}>
                  <th scope="row">{l.item.name}</th>
                  <td>{l.person}</td>
                  <td className="num">
                    {money(l.monthly)}/mo × 12 = <strong>{money(l.yearly)}</strong>
                  </td>
                  <td>
                    {CASH_REASON_LABELS[l.item.cashReason ?? 'notOnDrugList']}
                    {l.item.notes && <small className="muted cash-note">{l.item.notes}</small>}
                    {(() => {
                      const c = coverage(l);
                      if (!c) return null;
                      return (
                        <small className="cash-note">
                          {c.covered > 0
                            ? `Covered by ${c.covered} of ${c.total} plans, which price it by their own drug benefit instead.`
                            : 'Not covered by any plan checked so far.'}
                        </small>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{CASH_RULE} Since it's the same for every plan, it doesn't change which plan ranks first.</p>
        <h3>What you can do</h3>
        {[...byReason].map(([reason, names]) => (
          <div className="cash-group" key={reason}>
            <h4>{joinNames(names)}</h4>
            <ol className="cash-steps">
              {cashActions(joinNames(names), reason).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
        <p className="hint">{HSA_TIP}</p>
        <button type="button" className="link-button" onClick={onEdit}>
          Change prices or reasons in Your household
        </button>
      </div>
    </details>
  );
}
