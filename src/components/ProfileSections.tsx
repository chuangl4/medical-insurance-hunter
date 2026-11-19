import type { FilingStatus, ImmigrationStatus } from '../domain/types';
import { useMemo, type ReactNode } from 'react';
import { HOSPITALS } from '../data/hospitalNetworks';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { carriersToCheck, requiredHospitalsOf } from '../useDoctorLookups';
import { checklist, findGaps } from '../domain/onboarding';
import { needsDrugLink, newId, type AnswerKey, type CareItem, type Profile, type ProfileMember, type Provider } from '../domain/profile';
import { money, parseOptionalNumber } from '../format';
import { CareItemRow } from './CareItemRow';
import { DoctorPanel } from './DoctorPanel';

export type SectionId = 'people' | 'location' | 'providers' | 'income';

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  /** Parts Scout's latest reply changed, to highlight (see changedParts). */
  changed?: string[];
  /** The section being edited, if any. Only one is open at a time. */
  open: SectionId | null;
  onOpen: (id: SectionId | null) => void;
  onDone: () => void;
  /** Updates one provider in the latest profile. Used for slow lookups that finish after other edits. */
  onPatchProvider: (id: string, patch: Partial<Provider>) => void;
  /** Doctors being looked up right now. */
  checking: string[];
  onRecheck: (provider: Provider) => void;
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

const FILING_LABEL: Record<FilingStatus, string> = {
  single: 'Single or head of household',
  joint: 'Married filing jointly',
  separate: 'Married filing separately',
};

interface SectionProps {
  id: SectionId;
  title: string;
  done: boolean;
  /** Scout just changed something here. */
  fresh?: boolean;
  open: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
}

/** One part of the profile: a short summary, and the full fields while it's being edited. */
function Section({ id, title, done, fresh, open, onToggle, summary, children }: SectionProps) {
  const bodyId = `profile-${id}`;
  return (
    <section className={['ps-card', open && 'open', fresh && 'ps-fresh', done ? 'ps-done' : 'ps-todo'].filter(Boolean).join(' ')} aria-label={title}>
      <div className="ps-head">
        <span className="ps-mark" aria-hidden="true">
          {done ? '✓' : '○'}
        </span>
        <h3>{title}</h3>
        {fresh && <span className="ps-fresh-tag">Just updated</span>}
        <span className="visually-hidden">{done ? '(done)' : '(still needed)'}</span>
        <button type="button" className="ps-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
          {open ? 'Done' : 'Edit'}
        </button>
      </div>
      <div id={bodyId} className={open ? 'ps-body' : 'ps-summary'}>
        {open ? children : summary}
      </div>
    </section>
  );
}

export function ProfileSections({ profile, onChange, changed = [], open, onOpen, onDone, onPatchProvider, checking, onRecheck }: Props) {
  const update = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  /** Records that a question was answered here, so the chat doesn't ask it again. */
  const answer = (key: AnswerKey, patch: Partial<Profile>) =>
    update({ ...patch, answered: [...new Set([...(profile.answered ?? []), key])] });
  const providers = profile.providers ?? [];
  // Candidate doctors from earlier versions stay saved but aren't shown.
  const shown = providers.filter((p) => !p.candidateFor);
  const setProviders = (next: typeof providers) => answer('providers', { providers: next });
  const hospitalKey = requiredHospitalsOf(profile).join(',');
  const carriers = useMemo(() => carriersToCheck(hospitalKey ? hospitalKey.split(',') : []), [hospitalKey]);
  const updateMember = (id: string, patch: Partial<ProfileMember>) =>
    update({ members: profile.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const updateItems = (member: ProfileMember, careItems: CareItem[]) => updateMember(member.id, { careItems });

  const gaps = new Set(findGaps(profile).map((g) => g.id));
  const anyGap = (...prefixes: string[]) => [...gaps].some((id) => prefixes.some((p) => id === p || id.startsWith(`${p}:`)));
  const steps = checklist(profile);
  const doneCount = steps.filter((s) => s.done).length;
  const complete = gaps.size === 0;
  const fresh = new Set(changed);
  const freshClass = (key: string) => (fresh.has(key) ? 'ps-fresh-line' : undefined);
  const toggle = (id: SectionId) => onOpen(open === id ? null : id);

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

  const incomeSummary = profile.overSubsidyLimit
    ? 'Income above the subsidy limit, so no tax credit.'
    : [
        profile.annualIncome === null || profile.annualIncome === undefined ? 'Income not given' : `${money(profile.annualIncome)} income`,
        `${profile.taxHouseholdSize} on the tax return`,
        FILING_LABEL[profile.filingStatus],
        profile.affordableEmployerOffer ? 'affordable job-based offer' : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <aside className="profile-side" aria-label="Your profile">
      <div className="ps-progress">
        <div className="ps-progress-head">
          <h2>Your profile</h2>
          <span className="muted">
            {doneCount} of {steps.length} done
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
          <div className="progress-bar" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>

      <Section
        id="people"
        fresh={fresh.has('section:people')}
        title="Who needs coverage"
        done={!anyGap('people', 'age', 'care', 'drug')}
        open={open === 'people'}
        onToggle={() => toggle('people')}
        summary={
          profile.members.length === 0 ? (
            <p className="hint">No one yet.</p>
          ) : (
            profile.members.map((m) => (
              <div className="ps-member" key={m.id}>
                <strong className={freshClass(`member:${m.id}`)}>
                  {m.label || 'Unnamed'}, {m.needsAge ? 'age needed' : m.age}
                </strong>
                {m.careItems.length === 0 ? (
                  <p className="hint">{m.careReviewed ? 'No regular care expected.' : 'No care listed yet.'}</p>
                ) : (
                  <ul>
                    {m.careItems.map((i) => (
                      <li key={i.id} className={freshClass(`item:${i.id}`)}>
                        {i.name || 'Unnamed item'}{' '}
                        <span className="muted">{i.category === 'selfPay' ? `$${i.monthlyCost ?? 0}/mo` : `×${i.perYear}/yr`}</span>
                        {needsDrugLink(i) && <span className="ps-flag"> · confirm which drug</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )
        }
      >
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
      </Section>

      <Section
        id="location"
        fresh={fresh.has('section:location')}
        title="Where you live"
        done={!gaps.has('location')}
        open={open === 'location'}
        onToggle={() => toggle('location')}
        summary={
          profile.inKingCounty === true ? (
            <p>King County, Washington</p>
          ) : profile.inKingCounty === false ? (
            <p className="warn">Outside King County. Plan prices here may not match where you live.</p>
          ) : (
            <p className="hint">Not answered yet.</p>
          )
        }
      >
        <label className="check">
          <input type="checkbox" checked={profile.inKingCounty === true} onChange={(e) => update({ inKingCounty: e.target.checked })} />
          <span>We live in King County, Washington</span>
        </label>
        <p className="hint">Plan data covers King County only for now.</p>
      </Section>

      <Section
        id="providers"
        fresh={fresh.has('section:providers')}
        title="Must-have doctors and hospitals"
        done={!gaps.has('providers')}
        open={open === 'providers'}
        onToggle={() => toggle('providers')}
        summary={
          shown.length === 0 ? (
            <p className="hint">None listed.</p>
          ) : (
            <ul className="ps-list">
              {shown.map((p) => (
                <li key={p.id} className={freshClass(`provider:${p.id}`)}>
                  {p.name || 'Unnamed'}{' '}
                  <span className="muted">{p.hospitalId ? 'hospital' : checking.includes(p.id) ? 'checking networks…' : 'doctor or clinic'}</span>
                </li>
              ))}
            </ul>
          )
        }
      >
        {shown.length === 0 && <p className="hint">None listed.</p>}
        {shown.map((p) => (
          <div className="provider-row" key={p.id}>
            <div className="member-head">
              <label className="field">
                <span>Name</span>
                <input
                  value={p.name}
                  maxLength={120}
                  onChange={(e) => setProviders(providers.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={p.hospitalId ?? ''}
                  onChange={(e) => setProviders(providers.map((x) => (x.id === p.id ? { ...x, hospitalId: e.target.value || null } : x)))}
                >
                  <option value="">Doctor or clinic</option>
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
            {!p.hospitalId && p.name.trim() && (
              <DoctorPanel
                provider={p}
                carriers={carriers}
                onPatch={(patch) => onPatchProvider(p.id, patch)}
                checking={checking.includes(p.id)}
                onRecheck={() => onRecheck(p)}
              />
            )}
          </div>
        ))}
        <p className="hint">
          Hospitals the app tracks filter the plan list. For a must-have doctor or clinic, the app finds them in the national registry
          and checks their clinic's website on its own; mark each insurer once you've confirmed it.
          {carriers.length < new Set(KING_COUNTY_PLANS.map((p) => p.carrier)).size &&
            ` Only insurers with plans covering your must-have hospitals are shown: ${carriers.join(', ')}.`}
        </p>
        <button type="button" className="secondary" onClick={() => setProviders([...providers, { id: newId('provider'), name: '', hospitalId: null }])}>
          Add a doctor or hospital
        </button>
      </Section>

      <Section
        id="income"
        fresh={fresh.has('section:income')}
        title="Income and subsidies"
        done={!anyGap('taxHousehold', 'income', 'employerOffer', 'immigration')}
        open={open === 'income'}
        onToggle={() => toggle('income')}
        summary={<p>{incomeSummary}</p>}
      >
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
                  <option value="single">{FILING_LABEL.single}</option>
                  <option value="joint">{FILING_LABEL.joint}</option>
                  <option value="separate">{FILING_LABEL.separate}</option>
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
      </Section>

      <div className="ps-actions">
        {complete && (
          <button type="button" className="primary" onClick={onDone}>
            Show me plans
          </button>
        )}
      </div>
    </aside>
  );
}
