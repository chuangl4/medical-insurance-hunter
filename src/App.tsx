import { DataFreshnessBanner } from './components/DataFreshnessBanner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type User } from './api';
import { ChatOnboarding, type ChatMessage } from './components/ChatOnboarding';
import { CompareTable } from './components/CompareTable';
import { PlansTab } from './components/PlansTab';
import { ProfileForm } from './components/ProfileForm';
import { SignIn } from './components/SignIn';
import { SubsidySummary } from './components/SubsidySummary';
import { LEGACY_DRUG_NAMES } from './data/careNeeds';
import { KING_COUNTY_PLANS } from './data/kingCounty2027';
import { estimateSubsidy, evaluatePlan, isSoldIn } from './domain/calc';
import { REQUIRED_HOSPITALS } from './data/hospitalNetworks';
import { EMPTY_FILTERS, type Filters } from './domain/filter';
import { EMPTY_PROFILE, householdFromProfile, profileFromLegacy, type LegacyHousehold, type Profile } from './domain/profile';
import { ENROLLMENT, PLAN_YEAR } from './domain/rules2027';
import { requiredHospitalsOf, useDoctorLookups } from './useDoctorLookups';
import { useDrugLookups } from './useDrugLookups';
import { coverageLookup, ifExceptionApproved } from './domain/drugs';

/** Where earlier versions kept the household. It's moved into the account on first sign-in. */
const LEGACY_STORAGE_KEY = 'mih.household.v1';
const MAX_COMPARE = 4;
const SAVE_DELAY_MS = 700;

type Tab = 'household' | 'plans' | 'compare';
type SaveState = 'saved' | 'saving' | 'error';

function takeLegacyHousehold(): Profile | null {
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    return saved ? profileFromLegacy(JSON.parse(saved) as LegacyHousehold, LEGACY_DRUG_NAMES) : null;
  } catch {
    return null;
  }
}

async function loadProfile(): Promise<Profile> {
  const saved = await api.getProfile();
  if (saved) return saved;
  const legacy = takeLegacyHousehold();
  if (!legacy) return EMPTY_PROFILE;
  await api.saveProfile(legacy);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage can be unavailable; the copy in the account is what counts now.
  }
  return legacy;
}

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, hospitals: REQUIRED_HOSPITALS });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('household');
  const [chatOpen, setChatOpen] = useState(false);
  // Kept in memory only, so the conversation survives switching tabs but not a reload.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const lastSaved = useRef<Profile | null>(null);
  const doctorLookups = useDoctorLookups(profile, setProfile);
  const drugLookups = useDrugLookups(profile, setProfile);

  const startSession = useCallback((signedIn: User) => {
    setUser(signedIn);
    setLoadError(null);
    loadProfile().then(
      (loaded) => {
        lastSaved.current = loaded;
        setProfile(loaded);
        if (loaded.members.length === 0) {
          setTab('household');
          setChatOpen(true);
        }
      },
      (e: Error) => setLoadError(e.message),
    );
  }, []);

  useEffect(() => {
    api.me().then(startSession, () => setUser(null));
  }, [startSession]);

  // Save edits to the account shortly after typing stops.
  useEffect(() => {
    if (!profile || profile === lastSaved.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      api.saveProfile(profile).then(
        () => {
          lastSaved.current = profile;
          setSaveState('saved');
        },
        (e) => {
          setSaveState('error');
          if (e instanceof ApiError && e.status === 401) setUser(null);
        },
      );
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [profile]);

  const signOut = () => {
    api.signOut().finally(() => {
      setUser(null);
      setProfile(null);
      lastSaved.current = null;
      setCompareIds([]);
      setChatMessages([]);
      setChatOpen(false);
    });
  };

  // Must-have hospitals from the profile join the network filter.
  const providerHospitals = (profile?.providers ?? []).flatMap((p) => (p.hospitalId ? [p.hospitalId] : [])).join(',');
  useEffect(() => {
    if (!providerHospitals) return;
    setFilters((f) => ({ ...f, hospitals: [...new Set([...f.hospitals, ...providerHospitals.split(',')])] }));
  }, [providerHospitals]);
  // Doctors and clinics: everything else on the must-have list. Each one joins the filter when added.
  const doctors = useMemo(() => (profile?.providers ?? []).filter((p) => !p.hospitalId && !p.candidateFor && p.name.trim()), [profile?.providers]);
  // Candidate doctors show on their insurer's plans only and never filter.
  const candidates = useMemo(() => (profile?.providers ?? []).filter((p) => p.candidateFor && p.name.trim()), [profile?.providers]);
  const doctorIds = doctors.map((d) => d.id).join(',');
  useEffect(() => {
    if (!doctorIds) return;
    setFilters((f) => ({ ...f, doctors: [...new Set([...f.doctors, ...doctorIds.split(',')])] }));
  }, [doctorIds]);

  const household = useMemo(() => householdFromProfile(profile ?? EMPTY_PROFILE), [profile]);
  const drugLookup = useMemo(() => coverageLookup(profile?.drugCoverage), [profile?.drugCoverage]);
  const subsidy = useMemo(() => estimateSubsidy(KING_COUNTY_PLANS, household), [household]);
  const evaluated = useMemo(
    () =>
      KING_COUNTY_PLANS.filter((p) => isSoldIn(p, household.county)).map((p) =>
        evaluatePlan(p, household, subsidy.monthlyCredit, filters.route === 'direct', drugLookup),
      ),
    [household, subsidy.monthlyCredit, filters.route, drugLookup],
  );
  // What each plan would cost if every drug it doesn't list were approved by exception.
  const ifApproved = useMemo(() => {
    const out: Record<string, number | null> = {};
    const lookup = ifExceptionApproved(drugLookup);
    for (const p of KING_COUNTY_PLANS.filter((p) => isSoldIn(p, household.county))) {
      out[p.id] = evaluatePlan(p, household, subsidy.monthlyCredit, filters.route === 'direct', lookup).expectedYear;
    }
    return out;
  }, [household, subsidy.monthlyCredit, filters.route, drugLookup]);
  // Plans not sold in the current county drop out of the comparison and don't use up a slot.
  const compared = evaluated.filter((p) => compareIds.includes(p.plan.id));
  const activeCompareIds = compared.map((p) => p.plan.id);

  const toggleCompare = (id: string) =>
    setCompareIds(
      activeCompareIds.includes(id)
        ? activeCompareIds.filter((x) => x !== id)
        : activeCompareIds.length < MAX_COMPARE
          ? [...activeCompareIds, id]
          : activeCompareIds,
    );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'household', label: '1. Your household' },
    { id: 'plans', label: `2. Browse plans (${evaluated.length})` },
    { id: 'compare', label: `3. Compare (${compared.length})` },
  ];

  const header = (
    <header className="masthead">
      <div>
        <h1>Medical Insurance Hunter</h1>
        <p className="muted">
          King County, Washington {PLAN_YEAR} plans. Enroll by {ENROLLMENT.januaryDeadline} for January 1 coverage; open enrollment
          ends {ENROLLMENT.closes}.
        </p>
      </div>
      {user && (
        <div className="account">
          <span className="muted">{user.email}</span>
          {profile && (
            <span className={saveState === 'error' ? 'warn save-state' : 'muted save-state'} role="status">
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved. Check your connection.' : 'Saved'}
            </span>
          )}
          <button type="button" className="link-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );

  if (user === undefined || (user && !profile && !loadError)) {
    return (
      <div className="app">
        {header}
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (user === null) {
    return (
      <div className="app">
        {header}
        <SignIn onSignedIn={startSession} />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="app">
        {header}
        <p className="warn">Your profile could not be loaded: {loadError}</p>
      </div>
    );
  }

  const hasPeople = profile.members.length > 0;
  return (
    <div className="app">
      {user.isAdmin && <DataFreshnessBanner />}
      {header}

      <div className="sample-banner" role="note">
        <strong>Use these costs as estimates.</strong> Premiums and benefits come from {PLAN_YEAR} state and insurer
        documents, but care prices are rough assumptions and hospital networks need confirming. Check with the insurer
        and hospital before enrolling. Your profile is saved to your account.
      </div>

      <nav className="tabs" aria-label="Steps">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab active' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            disabled={!hasPeople && t.id !== 'household'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* The credit only changes prices when there is one; otherwise it belongs with the household's details. */}
      {(tab === 'household' || subsidy.monthlyCredit > 0) && (
        <SubsidySummary subsidy={subsidy} hasChildren={household.members.some((m) => m.age < 19)} />
      )}

      <main>
        {tab === 'household' &&
          (chatOpen ? (
            <ChatOnboarding
              profile={profile}
              onChange={setProfile}
              messages={chatMessages}
              onMessages={setChatMessages}
              onShowPlans={() => setTab('plans')}
              onUseForm={() => setChatOpen(false)}
            />
          ) : (
            <ProfileForm
              profile={profile}
              onChange={setProfile}
              onDone={() => setTab('plans')}
              onOpenChat={() => setChatOpen(true)}
              onPatchProvider={(id, patch) =>
                setProfile((prev) =>
                  prev && { ...prev, providers: (prev.providers ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) },
                )
              }
              checking={doctorLookups.checking}
              onRecheck={doctorLookups.recheck}
            />
          ))}
        {tab === 'plans' && (
          <PlansTab
            profile={profile}
            members={household.members}
            plans={evaluated}
            filters={filters}
            onFiltersChange={setFilters}
            compareIds={activeCompareIds}
            maxCompare={MAX_COMPARE}
            onToggleCompare={toggleCompare}
            onOpenCompare={() => setTab('compare')}
            onEditHousehold={() => {
              setChatOpen(false);
              setTab('household');
            }}
            onProfileChange={(update) => setProfile((prev) => prev && update(prev))}
            drugChecking={drugLookups.checking}
            drugErrors={drugLookups.errors}
            onDrugRecheck={drugLookups.recheck}
            doctors={doctors}
            candidates={candidates}
            checkingDoctors={doctorLookups.checking}
            firstName={household.members[0]?.label || 'the first person listed'}
            requiredIds={requiredHospitalsOf(profile)}
            drugLines={household.members.flatMap((m) => m.drugs ?? [])}
            drugLookup={drugLookup}
            ifApproved={ifApproved}
          />
        )}
        {tab === 'compare' && (
          <CompareTable plans={compared} onRemove={toggleCompare} onBrowse={() => setTab('plans')} doctors={doctors}
            checkingDoctors={doctorLookups.checking}
            requiredIds={requiredHospitalsOf(profile)}
            drugLines={household.members.flatMap((m) => m.drugs ?? [])}
            drugLookup={drugLookup}
            ifApproved={ifApproved}
          />
        )}
      </main>
    </div>
  );
}
