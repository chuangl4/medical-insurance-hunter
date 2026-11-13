import { CARE_CATEGORIES, CATEGORY_LABELS, type CareCategory, type CareItem } from '../domain/profile';

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
  const setCategory = (category: CareCategory) =>
    onChange({
      ...item,
      category,
      perYear: category === 'selfPay' ? 12 : item.perYear,
      monthlyCost: category === 'selfPay' ? (item.monthlyCost ?? 0) : null,
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
          <span>$ per month</span>
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
      <button type="button" className="link-button" onClick={onRemove} aria-label={`Remove ${item.name || 'this care'}`}>
        Remove
      </button>
      {item.notes && <small className="care-notes">{item.notes}</small>}
    </div>
  );
}
