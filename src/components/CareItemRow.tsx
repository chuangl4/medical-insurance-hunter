import { CASH_REASONS, CASH_REASON_LABELS, CASH_RULE, HSA_TIP, cashActions, type CashReason } from '../domain/cashMeds';
import { CARE_CATEGORIES, CATEGORY_LABELS, type CareCategory, type CareItem } from '../domain/profile';
import { money } from '../format';
import { DrugLink } from './DrugLink';

const MEDICATION: CareCategory[] = ['genericFills', 'brandFills', 'selfPay'];

type EditableItem = Omit<CareItem, 'id'>;

interface Props<T extends EditableItem> {
  item: T;
  onChange: (next: T) => void;
  onRemove: () => void;
}

const wholeNumber = (text: string, max: number): number => Math.min(max, Math.max(0, Math.floor(Number(text) || 0)));

/** One editable care entry: what it is, how it's billed, and how often or how much. */
export function CareItemRow<T extends EditableItem>({ item, onChange, onRemove }: Props<T>) {
  const selfPay = item.category === 'selfPay';
  const medication = MEDICATION.includes(item.category);
  const linkedFill = Boolean(item.drug) && !selfPay;
  const setCategory = (category: CareCategory) =>
    onChange({
      ...item,
      category,
      perYear: category === 'selfPay' ? 12 : item.perYear,
      monthlyCost: category === 'selfPay' ? (item.monthlyCost ?? 0) : item.drug ? item.monthlyCost : null,
      drug: MEDICATION.includes(category) ? item.drug : undefined,
      cashReason: category === 'selfPay' ? (item.cashReason ?? 'notOnDrugList') : undefined,
    });

  return (
    <div className="care-item">
      <label className="field care-name">
        <span>Care</span>
        <input value={item.name} maxLength={120} onChange={(e) => onChange({ ...item, name: e.target.value })} />
      </label>
      <label className="field">
        <span>Counts as</span>
        <select value={item.category} onChange={(e) => setCategory(e.target.value as CareCategory)}>
          {CARE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      {selfPay ? (
        <label className="field field-small">
          <span>{item.drug ? '$ per month, cash price' : '$ per month'}</span>
          <input
            type="number"
            min={0}
            value={item.monthlyCost ?? 0}
            onChange={(e) => onChange({ ...item, monthlyCost: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      ) : (
        <label className="field field-small">
          <span>Times a year</span>
          <input
            type="number"
            min={0}
            max={366}
            value={item.perYear}
            onChange={(e) => onChange({ ...item, perYear: wholeNumber(e.target.value, 366) })}
          />
        </label>
      )}
      {linkedFill && (
        <label className="field field-small">
          <span>$ per fill, cash price</span>
          <input
            type="number"
            min={0}
            placeholder="Typical"
            value={item.monthlyCost ?? ''}
            onChange={(e) => onChange({ ...item, monthlyCost: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      )}
      <button type="button" className="link-button" onClick={onRemove} aria-label={`Remove ${item.name || 'this care'}`}>
        Remove
      </button>
      {medication && <DrugLink name={item.name} drug={item.drug} onChange={(drug) => onChange({ ...item, drug })} />}
      {item.notes && <small className="care-notes">{item.notes}</small>}
      {selfPay && (
        <div className="cash-detail">
          <p>
            {money(item.monthlyCost ?? 0)} a month × 12 = <strong>{money((item.monthlyCost ?? 0) * 12)} a year</strong>.{' '}
            {item.drug
              ? "This is what a plan that doesn't cover it costs you. Plans that cover it use their own price instead; see Prescription coverage on the Plans page."
              : CASH_RULE}
          </p>
          <div className="cash-detail-row">
            <label className="inline-field">
              <span>Why it's paid in cash</span>
              <select
                value={item.cashReason ?? 'notOnDrugList'}
                onChange={(e) => onChange({ ...item, cashReason: e.target.value as CashReason })}
              >
                {CASH_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {CASH_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <details className="cash-steps-toggle">
              <summary>What to do</summary>
              <ul>
                {[...cashActions(item.name || 'this medication', item.cashReason), HSA_TIP].map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
