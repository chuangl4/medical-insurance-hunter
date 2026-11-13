import type { FilingStatus, ImmigrationStatus } from '../domain/types';
import { HOSPITALS } from '../data/hospitalNetworks';
import { findGaps } from '../domain/onboarding';
import { newId, type AnswerKey, type CareItem, type Profile, type ProfileMember } from '../domain/profile';
import { parseOptionalNumber } from '../format';
import { CareItemRow } from './CareItemRow';

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  onDone: () => void;
  onOpenChat: () => void;
}

const wholeNumber = (text: string, max: number): number => Math.min(max, Math.max(0, Math.floor(Number(text) || 0)));

const blankItem = (): CareItem => ({
  id: newId('care'),
  name: '',
  category: 'specialistVisits',
  perYear: 1,
  monthlyCost: null,
  notes: '',
});

export function ProfileForm({ profile, onChange, onDone, onOpenChat }: Props) {
  const update = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  /** Records that a question was answered here, so the chat doesn't ask it again. */
  const answer = (key: AnswerKey, patch: Partial<Profile>) =>
    update({ ...patch, answered: [...new Set([...(profile.answered ?? []), key])] });
  const providers = profile.providers ?? [];
  const setProviders = (next: typeof providers) => answer('providers', { providers: next });
  const gaps = findGaps(profile);
  const updateMember = (id: string, patch: Partial<ProfileMember>) =>
    update({ members: profile.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const updateItems = (member: ProfileMember, careItems: CareItem[]) => updateMember(member.id, { careItems });

  // Keep the tax household in step with covered people unless the user has set it differently.
  const taxSizeFor = (nextCount: number) =>
    profile.taxHouseholdSize === profile.members.length ? Math.max(1, nextCount) : profile.taxHouseholdSize;

  const addMember = () => {
    const count = profile.members.length + 1;
    const member: ProfileMember = { id: newId('member'), label: `Person ${count}`, age: 30, careItems: [] };
    update({ members: [...profile.members, member], taxHouseholdSize: taxSizeFor(count) });
  };

  const removeMember = (member: ProfileMember) => {
    if (member.careItems.length && !window.confirm(`Remove ${member.label || 'this person'} and their care list?`)) return;
    update({
      members: profile.members.filter((m) => m.id !== member.id),
      taxHouseholdSize: taxSizeFor(profile.members.length - 1),
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
      <div className="panel chat-prompt">
        <span className="avatar" aria-hidden="true">
          🐶
        </span>
        <div>
          {gaps.length ? (
            <p>
              <strong>Scout still needs {gaps.length === 1 ? 'one thing' : `${gaps.length} things`}:</strong>{' '}
              {gaps.map((g) => g.label).join(' · ')}
            </p>
          ) : (
            <p>New care or a new medication? Tell Scout in your own words.</p>
          )}
        </div>
        <button type="button" className="primary" onClick={onOpenChat}>
          {gaps.length ? 'Finish with Scout' : 'Chat with Scout'}
        </button>
      </div>

      <fieldset className="panel">
        <legend>Location</legend>
        <label className="check">
          <input type="checkbox" checked={profile.inKingCounty === true} onChange={(e) => update({ inKingCounty: e.target.checked })} />
          <span>We live in King County, Washington</span>
        </label>
        <p className="hint">Plan data covers King County only for now.</p>
      </fieldset>

      <fieldset className="panel">
        <legend>Who needs coverage</legend>
        <p className="hint">Each item is costed under every plan. Change the numbers to match what your doctors plan; these are estimates, not medical advice.</p>
        <div className="members">
          {profile.members.map((member) => (
            <div className="member" key={member.id}>
              <div className="member-head">
                <label className="field">
                  <span>Name</span>
                  <input value={member.label} maxLength={60} onChange={(e) => updateMember(member.id, { label: e.target.value })} />
                </label>
                <label className="field field-small">
                  <span>Age on Jan 1</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={member.needsAge ? '' : member.age}
                    placeholder="Needed"
                    onChange={(e) => updateMember(member.id, { age: wholeNumber(e.target.value, 120), needsAge: undefined })}
                  />
                </label>
                <button type="button" className="link-button" onClick={() => removeMember(member)}>
                  Remove person
                </button>
              </div>
              {member.age >= 65 && <p className="warn">People 65 and older usually need Medicare instead of these plans.</p>}
              <fieldset className="care-needs">
                <legend>Expected care next year</legend>
                {member.careItems.length === 0 && <p className="hint">No care listed. Tell Scout, or add an item.</p>}
                {member.careItems.map((item) => (
                  <CareItemRow
                    key={item.id}
                    item={item}
                    onChange={(next) => updateItems(member, member.careItems.map((x) => (x.id === item.id ? next : x)))}
                    onRemove={() => updateItems(member, member.careItems.filter((x) => x.id !== item.id))}
                  />
                ))}
                <button type="button" className="secondary" onClick={() => updateItems(member, [...member.careItems, blankItem()])}>
                  Add an item
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={member.careReviewed === true}
                    onChange={(e) => updateMember(member.id, { careReviewed: e.target.checked })}
                  />
                  <span>This list is complete</span>
                </label>
              </fieldset>
            </div>
          ))}
        </div>
        <button type="button" className="secondary" onClick={addMember}>
          Add a person
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={(profile.answered ?? []).includes('roster')}
            onChange={(e) =>
              update({
                answered: e.target.checked
                  ? [...new Set([...(profile.answered ?? []), 'roster' as const])]
                  : (profile.answered ?? []).filter((k) => k !== 'roster'),
              })
            }
          />
          <span>That's everyone who needs coverage</span>
        </label>
      </fieldset>

      <fieldset className="panel">
        <legend>Must-have doctors and hospitals</legend>
        {providers.length === 0 && <p className="hint">None listed.</p>}
        {providers.map((p) => (
          <div className="member-head" key={p.id}>
            <label className="field">
              <span>Name</span>
              <input
                value={p.name}
                maxLength={120}
                onChange={(e) => setProviders(providers.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
              />
            </label>
            <label className="field">
              <span>Network check</span>
              <select
                value={p.hospitalId ?? ''}
                onChange={(e) => setProviders(providers.map((x) => (x.id === p.id ? { ...x, hospitalId: e.target.value || null } : x)))}
              >
                <option value="">Check insurer directories myself</option>
                {Object.entries(HOSPITALS).map(([id, h]) => (
                  <option key={id} value={id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="link-button" onClick={() => setProviders(providers.filter((x) => x.id !== p.id))}>
              Remove
            </button>
          </div>
        ))}
        <p className="hint">Hospitals the app can check filter the plan list. Check any others in each insurer's provider directory.</p>
        <button type="button" className="secondary" onClick={() => setProviders([...providers, { id: newId('provider'), name: '', hospitalId: null }])}>
          Add a doctor or hospital
        </button>
      </fieldset>

      <fieldset className="panel">
        <legend>Income and subsidy details</legend>
        <label className="check">
          <input type="checkbox" checked={profile.overSubsidyLimit} onChange={(e) => update({ overSubsidyLimit: e.target.checked })} />
          <span>My income is above the subsidy limit, so skip these questions</span>
        </label>
        {!profile.overSubsidyLimit && (
          <>
            <div className="form-grid">
              <label className="field">
                <span>Expected 2027 household income</span>
                <input
                  inputMode="numeric"
                  placeholder="For example, 85000"
                  value={profile.annualIncome ?? ''}
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
                  value={profile.taxHouseholdSize}
                  onChange={(e) => answer('taxHousehold', { taxHouseholdSize: Math.max(1, wholeNumber(e.target.value, 20)) })}
                />
                <small>Include dependents, even if they don't need this coverage.</small>
              </label>
              <label className="field">
                <span>Tax filing status</span>
                <select value={profile.filingStatus} onChange={(e) => answer('taxHousehold', { filingStatus: e.target.value as FilingStatus })}>
                  <option value="single">Single or head of household</option>
                  <option value="joint">Married filing jointly</option>
                  <option value="separate">Married filing separately</option>
                </select>
              </label>
              <label className="field">
                <span>Immigration status</span>
                <select value={profile.immigration} onChange={(e) => answer('immigration', { immigration: e.target.value as ImmigrationStatus })}>
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
                checked={profile.affordableEmployerOffer}
                onChange={(e) => answer('employerOffer', { affordableEmployerOffer: e.target.checked })}
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
