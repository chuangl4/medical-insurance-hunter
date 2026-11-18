import { EXCEPTION_POLICIES_CHECKED } from '../data/exceptionPolicies';
import { FACILITY_SOURCE } from '../data/facilityNetworks';
import { FORMULARY_CHECKED, FORMULARY_SOURCES } from '../data/formularySources';
import { HOSPITAL_LISTS_CHECKED } from '../data/hospitalLists';
import { PLANS_COLLECTED } from '../data/kingCounty2027';
import { NETWORK_RULES_BUILT } from '../data/networkRules';
import { PROVIDER_DIRECTORIES_CHECKED } from '../data/providerDirectories';
import { QUALITY_RATINGS_BUILT, QUALITY_RATINGS_YEAR } from '../data/qualityRatings';
import { PLAN_YEAR } from './rules2027';

/** A dataset someone has to refresh by hand (or by running a script), and how old it may get. */
export interface DataSource {
  id: string;
  label: string;
  /** When it was last checked or rebuilt (YYYY-MM-DD). */
  checked: string;
  maxAgeDays: number;
  /** What to do to refresh it. */
  refresh: string;
  /** A problem that makes it due regardless of age, such as a source for an older plan year. */
  problem?: string;
}

export function dataSources(): DataSource[] {
  const oldDrugLists = FORMULARY_SOURCES.filter((f) => f.source.kind === 'pdf' && f.source.planYear < PLAN_YEAR);
  return [
    {
      id: 'plans',
      label: 'Plans, premiums and benefits',
      checked: PLANS_COLLECTED,
      maxAgeDays: 330,
      refresh: `Rebuild src/data/kingCounty${PLAN_YEAR}.ts from the Insurance Commissioner's rate filings and the plans' summaries. Insurers publish the next year's plans each October.`,
    },
    {
      id: 'hospitalLists',
      label: "Hospitals' own plan lists",
      checked: HOSPITAL_LISTS_CHECKED,
      maxAgeDays: 180,
      refresh: "Re-read each hospital's list (links in src/data/hospitalLists.ts) and update the entries and year. Hospitals revise them before open enrollment.",
    },
    {
      id: 'facilitySearch',
      label: 'Healthplanfinder hospital search',
      checked: FACILITY_SOURCE.checked,
      maxAgeDays: 180,
      refresh: "Rerun Healthplanfinder's provider and facility search for each hospital and update src/data/facilityNetworks.ts.",
    },
    {
      id: 'networkRules',
      label: 'Plan rules from benefit summaries',
      checked: NETWORK_RULES_BUILT,
      maxAgeDays: 365,
      refresh: 'Update summary links in src/data/sbcSources.ts if insurers moved them, then run npm run network-rules.',
    },
    {
      id: 'drugLists',
      label: "Insurers' drug lists",
      checked: FORMULARY_CHECKED,
      maxAgeDays: 120,
      refresh: 'Point src/data/formularySources.ts at the new lists, then run npm run formularies, npm run formularies:pdf and npm run formularies:check -- --record.',
      ...(oldDrugLists.length
        ? { problem: `${oldDrugLists.map((f) => `${f.carrier}'s list is for ${(f.source as { planYear: number }).planYear}`).join('; ')}, not ${PLAN_YEAR}.` }
        : {}),
    },
    {
      id: 'qualityRatings',
      label: 'CMS quality ratings and member survey',
      checked: QUALITY_RATINGS_BUILT,
      maxAgeDays: 365,
      refresh: `Run npm run quality-ratings -- ${PLAN_YEAR} once CMS posts the plan year ${PLAN_YEAR} files (usually in the fall).`,
      ...(QUALITY_RATINGS_YEAR < PLAN_YEAR ? { problem: `The ratings are for plan year ${QUALITY_RATINGS_YEAR}, not ${PLAN_YEAR}.` } : {}),
    },
    {
      id: 'providerDirectories',
      label: "Insurers' provider directory links",
      checked: PROVIDER_DIRECTORIES_CHECKED,
      maxAgeDays: 365,
      refresh: 'Open each link in src/data/providerDirectories.ts and check it still lands on the right individual-plan network.',
    },
    {
      id: 'exceptionPolicies',
      label: "Insurers' drug exception policies",
      checked: EXCEPTION_POLICIES_CHECKED,
      maxAgeDays: 365,
      refresh: "Re-read each insurer's formulary exception policy (links in src/data/exceptionPolicies.ts).",
    },
  ];
}

export interface DueSource extends DataSource {
  ageDays: number;
  reasons: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sources older than their limit, or with a problem, as of `today`. */
export function dueSources(today: Date, sources: DataSource[] = dataSources()): DueSource[] {
  return sources.flatMap((s) => {
    const ageDays = Math.floor((today.getTime() - new Date(`${s.checked}T00:00:00Z`).getTime()) / DAY_MS);
    const reasons = [
      ...(ageDays > s.maxAgeDays ? [`last checked ${s.checked}, ${ageDays} days ago (limit ${s.maxAgeDays})`] : []),
      ...(s.problem ? [s.problem] : []),
    ];
    return reasons.length ? [{ ...s, ageDays, reasons }] : [];
  });
}
