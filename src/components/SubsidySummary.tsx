import type { SubsidyEstimate } from '../domain/types';
import { money } from '../format';

export function SubsidySummary({ subsidy, hasChildren }: { subsidy: SubsidyEstimate; hasChildren: boolean }) {
  return (
    <section className="summary" aria-label="Premium tax credit estimate" aria-live="polite">
      <div className="summary-figures">
        <div>
          <span className="label">Estimated tax credit</span>
          <strong className="figure">{money(subsidy.monthlyCredit)}/mo</strong>
        </div>
        <div>
          <span className="label">Income vs. poverty level</span>
          <strong className="figure">{subsidy.fplPercent === null ? '—' : `${Math.round(subsidy.fplPercent)}%`}</strong>
        </div>
        <div>
          <span className="label">Benchmark silver plan</span>
          <strong className="figure">
            {subsidy.benchmarkMonthly === null ? 'None' : `${money(subsidy.benchmarkMonthly)}/mo`}
          </strong>
        </div>
      </div>
      <p className="summary-note">{subsidy.message}</p>
      {subsidy.csrEligible && (
        <p className="summary-note">
          You may also qualify for lower deductibles and copays on Silver plans from the exchange. Those savings aren't
          included in the costs shown.
        </p>
      )}
      {subsidy.cascadeSavingsPossible && (
        <p className="summary-note">Washington's Cascade Care Savings may lower premiums further, and isn't included here.</p>
      )}
      {hasChildren && subsidy.fplPercent !== null && (
        <p className="summary-note">
          Children can qualify for Apple Health at higher incomes than adults. If yours do, they generally can't get a tax
          credit, so check this before relying on the estimate.
        </p>
      )}
      {subsidy.monthlyCredit > 0 && (
        <p className="summary-note">
          If your actual income differs, you may have to repay excess credit at tax time, and repayment is no longer
          capped by income.
        </p>
      )}
    </section>
  );
}
