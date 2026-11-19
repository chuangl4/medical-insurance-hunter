import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type User } from './api';
import { ChatOnboarding, type ChatMessage } from './components/ChatOnboarding';
import { CompareTable } from './components/CompareTable';
import { CompareTray } from './components/CompareTray';
import { PlansTab } from './components/PlansTab';
import { ProfileForm } from './components/ProfileForm';
import { AppHeader, type SaveState } from './components/AppHeader';
import { Landing } from './components/Landing';
import { Onboarding } from './components/Onboarding';
import { SubsidySummary } from './components/SubsidySummary';
import { LEGACY_DRUG_NAMES } from './data/careNeeds';
import { KING_COUNTY_PLANS } from './data/kingCounty2027';
import { estimateSubsidy, evaluatePlan, isSoldIn } from './domain/calc';
import { REQUIRED_HOSPITALS } from './data/hospitalNetworks';
import { EMPTY_FILTERS, applyFilters, type Filters } from './domain/filter';
import {
  EMPTY_PROFILE,
  MAX_SHORTLIST,
  householdFromProfile,
  inSetup,
  profileFromLegacy,
  type AppPage,
  type LegacyHousehold,
  type Profile,
} from './domain/profile';
import { PLAN_YEAR } from './domain/rules2027';
import { requiredHospitalsOf, useDoctorLookups } from './useDoctorLookups';
import { useDrugLookups } from './useDrugLookups';
import { coverageLookup } from './domain/drugs';
import { DEFAULT_SCENARIO, applyScenario, scenarioLookup, scenarioSummary, type CareScenario } from './domain/scenarios';
import { ScenarioPanel, medicationNames, takeLegacyScenario } from './components/ScenarioPanel';

/** Where earlier versions kept the household. It's moved into the account on first sign-in. */
const LEGACY_STORAGE_KEY = 'mih.household.v1';
const SAVE_DELAY_MS = 700;

type Page = AppPage | 'household';

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
  const [page, setPage] = useState<Page>('plans');
  const [chatOpen, setChatOpen] = useState(true);
  /** Set when first-time setup has just finished, for a one-time welcome on the plans page. */
  const [justSetUp, setJustSetUp] = useState(false);
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
        // Returning users open where they left off; a Compare page with nothing on it falls back to plans.
        setPage(loaded.lastPage === 'compare' && (loaded.shortlist ?? []).length > 0 ? 'compare' : 'plans');
        setChatOpen(true);
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

  // With nobody left to price plans for, setup starts over, and stays on until it's finished again.
  const emptyHousehold = profile !== null && profile.members.length === 0 && profile.setupDone !== false;
  useEffect(() => {
    if (emptyHousehold) setProfile((prev) => prev && { ...prev, setupDone: false });
  }, [emptyHousehold]);

  const signOut = () => {
    api.signOut().finally(() => {
      setUser(null);
      setProfile(null);
      lastSaved.current = null;
      setChatMessages([]);
      setChatOpen(true);
      setJustSetUp(false);
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
  // Your scenario is saved with the profile, so it follows you to other browsers.
  const scenario = profile?.scenario ?? DEFAULT_SCENARIO;
  const setScenario = useCallback((next: CareScenario) => setProfile((prev) => prev && { ...prev, scenario: next }), []);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const scenarioOpener = useRef<HTMLElement | null>(null);
  const openScenario = useCallback((from: HTMLElement) => {
    scenarioOpener.current = from;
    setScenarioOpen(true);
  }, []);
  const closeScenario = useCallback(() => setScenarioOpen(false), []);
  // A scenario an earlier version kept in this browser moves into the profile once.
  const needsScenario = profile !== null && !profile.scenario;
  useEffect(() => {
    if (!needsScenario) return;
    const legacy = takeLegacyScenario();
    if (legacy) setProfile((prev) => (prev && !prev.scenario ? { ...prev, scenario: legacy } : prev));
  }, [needsScenario, profile]);
  const drugLookup = useMemo(() => coverageLookup(profile?.drugCoverage), [profile?.drugCoverage]);
  const subsidy = useMemo(() => estimateSubsidy(KING_COUNTY_PLANS, household), [household]);
  // Your scenario prices every plan; drug coverage facts (drugLookup) stay as the lists say, for the fit checks.
  const scenarioHousehold = useMemo(() => applyScenario(household, scenario), [household, scenario]);
  const costLookup = useMemo(() => scenarioLookup(drugLookup, scenario), [drugLookup, scenario]);
  const evaluated = useMemo(
    () =>
      KING_COUNTY_PLANS.filter((p) => isSoldIn(p, household.county)).map((p) =>
        evaluatePlan(p, scenarioHousehold, subsidy.monthlyCredit, filters.route === 'direct', costLookup),
      ),
    [household.county, scenarioHousehold, subsidy.monthlyCredit, filters.route, costLookup],
  );
  const scenarioText = profile ? scenarioSummary(scenario, household.members, medicationNames(profile)) : '';
  // The Compare list is saved with the profile. Plans not sold in the current county drop out and don't use up a slot.
  const shortlist = profile?.shortlist ?? [];
  const compared = evaluated.filter((p) => shortlist.includes(p.plan.id));
  const activeCompareIds = compared.map((p) => p.plan.id);

  const toggleCompare = (id: string) =>
    setProfile((prev) => {
      if (!prev) return prev;
      const next = activeCompareIds.includes(id)
        ? activeCompareIds.filter((x) => x !== id)
        : activeCompareIds.length < MAX_SHORTLIST
          ? [...activeCompareIds, id]
          : activeCompareIds;
      return { ...prev, shortlist: next };
    });

  const goTo = (next: Page) => {
    setPage(next);
    if (next !== 'household') setProfile((prev) => (prev && prev.lastPage !== next ? { ...prev, lastPage: next } : prev));
    window.scrollTo({ top: 0 });
  };
  const openHousehold = () => {
    setChatOpen(false);
    goTo('household');
  };
  const finishSetup = () => {
    // Plans need at least one person to price; the form and chat both say who's still missing.
    if (!profile?.members.length) return;
    setProfile((prev) => prev && { ...prev, setupDone: true, lastPage: 'plans' });
    setJustSetUp(true);
    setPage('plans');
    window.scrollTo({ top: 0 });
  };

  if (user === undefined || (user && !profile && !loadError)) {
    return (
      <div className="shell">
        <AppHeader user={null} />
        <main className="app">
          <p className="muted">Loading…</p>
        </main>
      </div>
    );
  }
  if (user === null) {
    return (
      <div className="shell">
        <AppHeader user={null} />
        <main className="app">
          <Landing onSignedIn={startSession} />
        </main>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="shell">
        <AppHeader user={user} onSignOut={signOut} />
        <main className="app">
          <p className="warn">Your profile could not be loaded: {loadError}</p>
        </main>
      </div>
    );
  }

  const profileEditor = (onDone: () => void) =>
    chatOpen ? (
      <ChatOnboarding
        profile={profile}
        onChange={setProfile}
        messages={chatMessages}
        onMessages={setChatMessages}
        onShowPlans={onDone}
        onUseForm={() => setChatOpen(false)}
      />
    ) : (
      <ProfileForm
        profile={profile}
        onChange={setProfile}
        onDone={onDone}
        onOpenChat={() => setChatOpen(true)}
        onPatchProvider={(id, patch) =>
          setProfile((prev) =>
            prev && { ...prev, providers: (prev.providers ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) },
          )
        }
        checking={doctorLookups.checking}
        onRecheck={doctorLookups.recheck}
      />
    );

  if (inSetup(profile)) {
    return (
      <div className="shell">
        <AppHeader user={user} saveState={saveState} onSignOut={signOut} />
        <main className="app">
          <Onboarding mode={chatOpen ? 'chat' : 'form'} onMode={(m) => setChatOpen(m === 'chat')}>
            {profileEditor(finishSetup)}
          </Onboarding>
        </main>
      </div>
    );
  }

  const fitting = justSetUp ? applyFilters(evaluated, filters, doctors).length : 0;
  return (
    <div className="shell">
      <AppHeader
        user={user}
        saveState={saveState}
        nav={[
          { id: 'plans', label: 'Plans', count: evaluated.length },
          { id: 'compare', label: 'Compare', count: compared.length },
        ]}
        current={page}
        onNavigate={(id) => goTo(id as Page)}
        onOpenHousehold={openHousehold}
        onSignOut={signOut}
      />
      <div
        className={['app', scenarioOpen && page !== 'household' && 'with-panel', page === 'plans' && compared.length > 0 && 'with-tray']
          .filter(Boolean)
          .join(' ')}
      >
        {page === 'household' ? (
          <div className="page-head">
            <button type="button" className="back-link" onClick={() => goTo(profile.lastPage ?? 'plans')}>
              ← Back to {profile.lastPage === 'compare' ? 'Compare' : 'plans'}
            </button>
            <h1>Your household and needs</h1>
            <p className="muted">Changes save as you go, and every plan's price and fit updates with them.</p>
          </div>
        ) : (
          <p className="estimate-note" role="note">
            <strong>Estimates.</strong> Premiums and benefits are from {PLAN_YEAR} state and insurer documents; care prices are rough,
            and networks need confirming with the insurer and hospital before you enroll.
          </p>
        )}

        {justSetUp && page === 'plans' && (
          <div className="welcome" role="status">
            <div>
              <strong>You're all set.</strong> {fitting} of {evaluated.length} plans have everything you marked as a must-have, sorted by
              your yearly cost. Tick up to {MAX_SHORTLIST} to compare side by side.
            </div>
            <button type="button" className="link-button" onClick={() => setJustSetUp(false)}>
              Dismiss
            </button>
          </div>
        )}

        {/* The credit only changes prices when there is one; otherwise it belongs with the household's details. */}
        {(page === 'household' || subsidy.monthlyCredit > 0) && (
          <SubsidySummary subsidy={subsidy} hasChildren={household.members.some((m) => m.age < 19)} />
        )}

        <main>
          {page === 'household' && profileEditor(() => goTo('plans'))}
          {page === 'plans' && (
            <PlansTab
              profile={profile}
              members={household.members}
              plans={evaluated}
              filters={filters}
              onFiltersChange={setFilters}
              compareIds={activeCompareIds}
              maxCompare={MAX_SHORTLIST}
              onToggleCompare={toggleCompare}
              onEditHousehold={openHousehold}
              onProfileChange={(update) => setProfile((prev) => prev && update(prev))}
              drugChecking={drugLookups.checking}
              drugErrors={drugLookups.errors}
              onDrugRecheck={drugLookups.recheck}
              doctors={doctors}
              candidates={candidates}
              checkingDoctors={doctorLookups.checking}
              requiredIds={requiredHospitalsOf(profile)}
              drugLines={scenarioHousehold.members.flatMap((m) => m.drugs ?? [])}
              drugLookup={drugLookup}
              scenario={scenario}
              onEditScenario={openScenario}
              scenarioText={scenarioText}
            />
          )}
          {page === 'compare' && (
            <CompareTable plans={compared} onRemove={toggleCompare} onBrowse={() => goTo('plans')} doctors={doctors}
              checkingDoctors={doctorLookups.checking}
              requiredIds={requiredHospitalsOf(profile)}
              drugLines={scenarioHousehold.members.flatMap((m) => m.drugs ?? [])}
              drugLookup={drugLookup}
              scenario={scenario}
              onEditScenario={openScenario}
              scenarioText={scenarioText}
              members={household.members}
            />
          )}
        </main>
        {page === 'plans' && (
          <CompareTray
            plans={compared}
            max={MAX_SHORTLIST}
            onRemove={toggleCompare}
            onClear={() => setProfile((prev) => prev && { ...prev, shortlist: [] })}
            onOpen={() => goTo('compare')}
          />
        )}
        <ScenarioPanel
          open={scenarioOpen && page !== 'household'}
          onClose={closeScenario}
          returnFocus={scenarioOpener}
          profile={profile}
          scenario={scenario}
          onChange={setScenario}
          drugLookup={drugLookup}
          plans={evaluated}
        />
      </div>
    </div>
  );
}
