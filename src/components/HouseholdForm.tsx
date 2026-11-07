import {
  CARE_NEEDS,
  CARE_NEED_IDS,
  SELF_PAY_DRUGS,
  SELF_PAY_DRUG_IDS,
  toggleCareNeed,
  type CareCounts,
} from '../data/careNeeds';
import type { FilingStatus, Household, ImmigrationStatus, Member } from '../domain/types';
import { parseOptionalNumber } from '../format';

interface Props {
  household: Household;
  onChange: (next: Household) => void;
  onDone: () => void;
}

const CARE_FIELDS: { key: keyof CareCounts; label: string }[] = [
  { key: 'primaryVisits', label: 'Primary care visits' },
  { key: 'specialistVisits', label: 'Specialist visits' },
  { key: 'genericFills', label: 'Generic drug fills' },
  { key: 'brandFills', label: 'Brand-name drug fills' },
  { key: 'labTests', label: 'Lab tests' },
  { key: 'diagnosticTests', label: 'X-rays, ultrasounds, eye tests' },
  { key: 'scans', label: 'CT or MRI scans' },
  { key: 'erVisits', label: 'ER visits' },
  { key: 'hospitalStays', label: 'Hospital stays' },
];

export const newMember = (id: string, label: string, age: number): Member => ({
  id,
  label,
  age,
  primaryVisits: 2,
  specialistVisits: 0,
  genericFills: 0,
  brandFills: 0,
  labTests: 0,
  diagnosticTests: 0,
  scans: 0,
  erVisits: 0,
  hospitalStays: 0,
  careNeeds: [],
  selfPayDrugs: {},
});

const wholeNumber = (text: string, max: number): number =>
  Math.min(max, Math.max(0, Math.floor(Number(text) || 0)));

export function HouseholdForm({ household, onChange, onDone }: Props) {
  const update = (patch: Partial<Household>) => onChange({ ...household, ...patch });
  const updateMember = (id: string, patch: Partial<Member>) =>
    update({ members: household.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const setSelfPay = (member: Member, id: string, monthlyCost: number | undefined) => {
    const selfPayDrugs = { ...member.selfPayDrugs };
    if (monthlyCost === undefined) delete selfPayDrugs[id];
    else selfPayDrugs[id] = monthlyCost;
    updateMember(member.id, { selfPayDrugs });
  };

  // Keep the tax household in step with covered people unless the user has set it differently.
  const taxSizeFor = (nextCount: number) =>
    household.taxHouseholdSize === household.members.length ? nextCount : household.taxHouseholdSize;

  const addMember = () => {
    const number = household.members.length + 1;
    const member = newMember(`m${Date.now()}`, `Person ${number}`, 30);
    update({ members: [...household.members, member], taxHouseholdSize: taxSizeFor(number) });
  };

  const removeMember = (id: string) => {
    if (household.members.length === 1) return;
    update({
      members: household.members.filter((m) => m.id !== id),
      taxHouseholdSize: taxSizeFor(household.members.length - 1),
    });
  };

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onDone();
      }}
    >
      <fieldset className="panel">
        <legend>Location</legend>
        <p>King County, Washington</p>
        <p className="hint">Other counties aren't available yet.</p>
      </fieldset>

      <fieldset className="panel">
        <legend>Who needs coverage</legend>
        <p className="hint">Tick any ongoing care to add typical amounts, then change the numbers to match what your doctors plan. These are rough starting points, not medical advice.</p>
        <div className="members">
          {household.members.map((member) => (
            <div className="member" key={member.id}>
              <div className="member-head">
                <label className="field">
                  <span>Name (optional)</span>
                  <input value={member.label} onChange={(e) => updateMember(member.id, { label: e.target.value })} />
                </label>
                <label className="field field-small">
                  <span>Age on Jan 1</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={member.age}
                    onChange={(e) => updateMember(member.id, { age: wholeNumber(e.target.value, 120) })}
                  />
                </label>
                {household.members.length > 1 && (
                  <button type="button" className="link-button" onClick={() => removeMember(member.id)}>
                    Remove
                  </button>
                )}
              </div>
              {member.age >= 65 && <p className="warn">People 65 and older usually need Medicare instead of these plans.</p>}
              <fieldset className="care-needs">
                <legend>Ongoing care</legend>
                {CARE_NEED_IDS.map((id) => (
                  <label className="check" key={id}>
                    <input
                      type="checkbox"
                      checked={member.careNeeds.includes(id)}
                      onChange={() => update({ members: household.members.map((m) => (m.id === member.id ? toggleCareNeed(m, id) : m)) })}
                    />
                    <span>
                      {CARE_NEEDS[id].label}
                      <small> Adds {CARE_NEEDS[id].adds}.</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="care-needs">
                <legend>Medications paid without insurance</legend>
                <small className="hint">
                  These count at full price on every plan and don't apply to the deductible or out-of-pocket limit. If an
                  insurer approves coverage, untick it and enter brand-name fills instead.
                </small>
                {SELF_PAY_DRUG_IDS.map((id) => {
                  const monthlyCost = member.selfPayDrugs[id];
                  return (
                    <div className="self-pay" key={id}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={monthlyCost !== undefined}
                          onChange={(e) => setSelfPay(member, id, e.target.checked ? SELF_PAY_DRUGS[id].monthlyCost : undefined)}
                        />
                        <span>{SELF_PAY_DRUGS[id].label}</span>
                      </label>
                      {monthlyCost !== undefined && (
                        <label className="inline-field">
                          <span>Cost per month</span>
                          <input
                            type="number"
                            min={0}
                            value={monthlyCost}
                            onChange={(e) => setSelfPay(member, id, Math.max(0, Number(e.target.value) || 0))}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </fieldset>
              <div className="care-grid">
                {CARE_FIELDS.map(({ key, label }) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={0}
                      max={366}
                      value={member[key]}
                      onChange={(e) => updateMember(member.id, { [key]: wholeNumber(e.target.value, 366) })}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="secondary" onClick={addMember}>
          Add a person
        </button>
      </fieldset>

      <fieldset className="panel">
        <legend>Income and subsidy details</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={household.overSubsidyLimit}
            onChange={(e) => update({ overSubsidyLimit: e.target.checked })}
          />
          <span>My income is above the subsidy limit, so skip these questions</span>
        </label>
        {!household.overSubsidyLimit && (
          <>
        <div className="form-grid">
          <label className="field">
            <span>Expected 2027 household income</span>
            <input
              inputMode="numeric"
              placeholder="For example, 85000"
              value={household.annualIncome ?? ''}
              onChange={(e) => update({ annualIncome: parseOptionalNumber(e.target.value) })}
            />
            <small>Modified adjusted gross income for everyone on your tax return.</small>
          </label>
          <label className="field">
            <span>People on your tax return</span>
            <input
              type="number"
              min={1}
              max={20}
              value={household.taxHouseholdSize}
              onChange={(e) => update({ taxHouseholdSize: Math.max(1, wholeNumber(e.target.value, 20)) })}
            />
            <small>Include dependents, even if they don't need this coverage.</small>
          </label>
          <label className="field">
            <span>Tax filing status</span>
            <select value={household.filingStatus} onChange={(e) => update({ filingStatus: e.target.value as FilingStatus })}>
              <option value="single">Single or head of household</option>
              <option value="joint">Married filing jointly</option>
              <option value="separate">Married filing separately</option>
            </select>
          </label>
          <label className="field">
            <span>Immigration status</span>
            <select value={household.immigration} onChange={(e) => update({ immigration: e.target.value as ImmigrationStatus })}>
              <option value="citizen">U.S. citizen or national</option>
              <option value="qualified">Permanent resident, Cuban-Haitian Entrant, or COFA migrant</option>
              <option value="other">Other</option>
            </select>
            <small>Used only for this estimate. If your family's statuses differ, confirm with Healthplanfinder.</small>
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={household.affordableEmployerOffer}
            onChange={(e) => update({ affordableEmployerOffer: e.target.checked })}
          />
          <span>Someone here has an offer of affordable employer coverage</span>
        </label>
          </>
        )}
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="primary">
          See plans
        </button>
      </div>
    </form>
  );
}
