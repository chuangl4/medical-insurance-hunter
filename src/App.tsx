import { useEffect, useMemo, useState } from 'react';
import { CompareTable } from './components/CompareTable';
import { HouseholdForm, newMember } from './components/HouseholdForm';
import { PlanBrowser } from './components/PlanBrowser';
import { SubsidySummary } from './components/SubsidySummary';
import { KING_COUNTY_PLANS } from './data/kingCounty2027';
import { estimateSubsidy, evaluatePlan, isSoldIn } from './domain/calc';
import { REQUIRED_HOSPITALS } from './data/hospitalNetworks';
import { EMPTY_FILTERS, type Filters } from './domain/filter';
import { ENROLLMENT, PLAN_YEAR } from './domain/rules2027';
import type { Household } from './domain/types';

const STORAGE_KEY = 'mih.household.v1';
const MAX_COMPARE = 4;

const DEFAULT_HOUSEHOLD: Household = {
  county: 'King',
  members: [newMember('m1', 'Person 1', 40)],
  taxHouseholdSize: 1,
  annualIncome: null,
  overSubsidyLimit: false,
  filingStatus: 'single',
  immigration: 'citizen',
  affordableEmployerOffer: false,
};

function loadHousehold(): Household {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Only King County plans are loaded, so an older saved county is replaced.
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Household>;
      return {
        ...DEFAULT_HOUSEHOLD,
        ...parsed,
        county: 'King',
        // Households saved by older versions are missing newer care fields.
        members: (parsed.members ?? DEFAULT_HOUSEHOLD.members).map((m) => ({ ...newMember(m.id, m.label, m.age), ...m })),
      };
    }
  } catch {
    // Storage can be unavailable; the app still works without it.
  }
  return DEFAULT_HOUSEHOLD;
}

type Tab = 'household' | 'plans' | 'compare';

export function App() {
  const [household, setHousehold] = useState<Household>(loadHousehold);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, hospitals: REQUIRED_HOSPITALS });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('household');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
    } catch {
      // Ignore: saving is a convenience.
    }
  }, [household]);

  const subsidy = useMemo(() => estimateSubsidy(KING_COUNTY_PLANS, household), [household]);
  const evaluated = useMemo(
    () =>
      KING_COUNTY_PLANS.filter((p) => isSoldIn(p, household.county)).map((p) =>
        evaluatePlan(p, household, subsidy.monthlyCredit, filters.route === 'direct'),
      ),
    [household, subsidy.monthlyCredit, filters.route],
  );
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

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Medical Insurance Hunter</h1>
          <p className="muted">
            King County, Washington {PLAN_YEAR} plans. Enroll by {ENROLLMENT.januaryDeadline} for January 1 coverage; open enrollment
            ends {ENROLLMENT.closes}.
          </p>
        </div>
      </header>

      <div className="sample-banner" role="note">
        <strong>Use these costs as estimates.</strong> Premiums and benefits come from {PLAN_YEAR} state and insurer
        documents, but care prices are rough assumptions and hospital networks need confirming. Check with the insurer
        and hospital before enrolling. Your information stays in this browser.
      </div>

      <nav className="tabs" aria-label="Steps">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab active' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <SubsidySummary subsidy={subsidy} hasChildren={household.members.some((m) => m.age < 19)} />

      <main>
        {tab === 'household' && (
          <HouseholdForm household={household} onChange={setHousehold} onDone={() => setTab('plans')} />
        )}
        {tab === 'plans' && (
          <PlanBrowser
            plans={evaluated}
            filters={filters}
            onFiltersChange={setFilters}
            compareIds={activeCompareIds}
            maxCompare={MAX_COMPARE}
            onToggleCompare={toggleCompare}
            onOpenCompare={() => setTab('compare')}
          />
        )}
        {tab === 'compare' && (
          <CompareTable plans={compared} onRemove={toggleCompare} onBrowse={() => setTab('plans')} />
        )}
      </main>
    </div>
  );
}
