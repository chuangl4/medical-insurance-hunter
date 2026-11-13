import type { Plan } from './types';

/** A doctor picked from the national provider registry (NPPES). */
export interface DoctorRecord {
  npi: string;
  name: string;
  credential: string;
  specialty: string;
  /** Practice locations, each as one line: street, city, phone. */
  locations: string[];
}

/** What a clinic or health system website says about one insurer. */
export type ClinicFinding = 'accepts' | 'does-not-accept' | 'not-mentioned';
export const CLINIC_FINDINGS = ['accepts', 'does-not-accept', 'not-mentioned'] as const satisfies readonly ClinicFinding[];

export interface CarrierEvidence {
  carrier: string;
  finding: ClinicFinding;
  /** Short explanation, such as the plan or network names the page lists. */
  detail: string;
  url: string | null;
}

/** The result of an automatic check, saved with the provider so it isn't repeated on every visit. */
export interface ClinicCheck {
  checkedAt: string;
  summary: string;
  clinicName: string;
  clinicUrl: string | null;
  /** A hospital the app tracks that the doctor works for, when the websites say so. */
  hospitalId: string | null;
  carriers: CarrierEvidence[];
  /** Whether Premera's public directory lists this NPI in any network; null when it couldn't be checked. */
  premeraListed: boolean | null;
}

/** The user's own answer after checking an insurer's directory or calling the office. */
export type Confirmation = 'in' | 'out';

export type DoctorStatus = 'in' | 'out' | 'likely' | 'unlikely' | 'unknown';

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  in: 'In network (you confirmed)',
  out: 'Out of network (you confirmed)',
  likely: 'Likely in network',
  unlikely: 'Likely out of network',
  unknown: 'Not confirmed',
};

export interface DoctorFields {
  name: string;
  lookup?: DoctorLookup;
  doctor?: DoctorRecord;
  clinicCheck?: ClinicCheck;
  /** Keyed by insurer name, as in `Plan.carrier`. */
  confirmed?: Record<string, Confirmation>;
}

export const PREMERA = 'Premera Blue Cross';

/**
 * How likely a doctor is to be in a plan's network, and why. The user's own confirmation wins; then a clinic
 * website saying no; then any sign of yes. Networks are tracked by insurer, since clinics list insurers, not plans.
 */
export function doctorStatus(
  provider: DoctorFields,
  plan: Plan,
  hospitalStatus: (plan: Plan, hospitalId: string) => string,
  hospitalName: (hospitalId: string) => string,
): { status: DoctorStatus; reason: string } {
  const confirmed = provider.confirmed?.[plan.carrier];
  if (confirmed) return { status: confirmed, reason: `You marked this for ${plan.carrier}.` };

  const check = provider.clinicCheck;
  if (!check) return { status: 'unknown', reason: 'Not checked yet.' };
  const evidence = check.carriers.find((c) => c.carrier === plan.carrier);
  if (evidence?.finding === 'does-not-accept') {
    return { status: 'unlikely', reason: `The clinic's website says it doesn't take ${plan.carrier}. ${evidence.detail}`.trim() };
  }
  if (plan.carrier === PREMERA && check.premeraListed === false) {
    return { status: 'unlikely', reason: "Premera's public directory doesn't list this doctor." };
  }
  const hospital = check.hospitalId ? hospitalStatus(plan, check.hospitalId) : null;
  if (hospital === 'out') {
    return { status: 'unlikely', reason: `Works at ${hospitalName(check.hospitalId!)}, which is out of network for this plan.` };
  }
  if (evidence?.finding === 'accepts') {
    return { status: 'likely', reason: `The clinic's website lists ${plan.carrier}. ${evidence.detail}`.trim() };
  }
  if (hospital === 'in') {
    return { status: 'likely', reason: `Works at ${hospitalName(check.hospitalId!)}, which is in network for this plan.` };
  }
  return { status: 'unknown', reason: "The websites checked didn't say." };
}

/** Plans are hidden only for a confirmed "out"; anything weaker is shown as a warning instead. */
export const excludesPlan = (status: DoctorStatus) => status === 'out';

/** One automatic lookup attempt, saved so the app can explain what it tried. */
export type LookupOutcome = 'found' | 'several' | 'none' | 'error';
export const LOOKUP_OUTCOMES = ['found', 'several', 'none', 'error'] as const satisfies readonly LookupOutcome[];

export interface RegistryLookup {
  at: string;
  /** The name searched, as "First Last". A new name triggers a new search. */
  query: string;
  outcome: LookupOutcome;
  detail: string;
  /** People found when the match wasn't certain, for the user to pick from. */
  candidates: DoctorRecord[];
}

export interface WebsiteLookup {
  at: string;
  npi: string;
  outcome: 'found' | 'error';
  detail: string;
}

export interface DoctorLookup {
  registry?: RegistryLookup;
  websites?: WebsiteLookup;
}

/** Splits "Dr. Jane Q. Doe, MD" into a first and last name for the registry search. */
export function nameParts(name: string): { first: string; last: string } {
  const words = name
    .replace(/,.*$/, '')
    .replace(/^\s*(dr|doctor)\b\.?/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return { first: '', last: words[0] ?? '' };
  return { first: words[0], last: words[words.length - 1] };
}

export const registryQuery = (name: string) => {
  const { first, last } = nameParts(name);
  return `${first} ${last}`.trim();
};

/**
 * Picks a registry result without asking when it's clear: the only result, or the only one with the same last
 * name and a matching first or middle name. Otherwise the user chooses.
 */
export function autoPick(name: string, results: DoctorRecord[]): DoctorRecord | null {
  if (results.length === 1) return results[0];
  const { first, last } = nameParts(name);
  if (!first) return null;
  // A first or middle name counts, since many doctors go by their middle name.
  const exact = results.filter((r) => {
    const words = r.name.toLowerCase().replace(/\./g, '').split(/\s+/);
    return words.slice(0, -1).includes(first.toLowerCase().replace(/\./g, '')) && words[words.length - 1] === last.toLowerCase();
  });
  return exact.length === 1 ? exact[0] : null;
}

export type StepState = 'done' | 'missing' | 'failed' | 'running';
export interface LookupStep {
  title: string;
  text: string;
  state: StepState;
}

export interface StepContext {
  /** The insurer being explained; omit to describe the lookups only. */
  carrier?: string;
  planName?: string;
  checking: boolean;
  /** Names of hospitals the app tracks, by id. */
  hospitalNames: Record<string, string>;
  /** For a plan: how the doctor's hospital is listed for it, such as "In network". */
  hospitalStatusText?: string;
}

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const phoneOf = (doctor?: DoctorRecord) => doctor?.locations.map((l) => l.match(/\d{3}-\d{3}-\d{4}/)?.[0]).find(Boolean);

/** What the app did to work out a doctor's network status, in order, with what's left for the user. */
export function lookupSteps(p: DoctorFields & { lookup?: DoctorLookup }, ctx: StepContext): LookupStep[] {
  const steps: LookupStep[] = [];
  const reg = p.lookup?.registry;
  const doctor = p.doctor;
  const who = doctor ? `${doctor.name}${doctor.credential ? `, ${doctor.credential}` : ''}` : p.name;

  // 1. National registry
  if (doctor) {
    steps.push({
      title: 'Found in the national provider registry',
      text: `${who}, ${doctor.specialty || 'specialty not listed'} (NPI ${doctor.npi})${reg?.outcome === 'found' ? ', matched automatically' : ''}.`,
      state: 'done',
    });
  } else if (!reg) {
    steps.push({ title: 'National provider registry', text: ctx.checking ? 'Searching now…' : 'Not searched yet.', state: ctx.checking ? 'running' : 'missing' });
  } else if (reg.outcome === 'several') {
    steps.push({
      title: 'National provider registry',
      text: `Searched for "${reg.query}" in Washington and found ${reg.candidates.length} people. Pick the right one under Must-have doctors in Your household.`,
      state: 'missing',
    });
  } else if (reg.outcome === 'none') {
    steps.push({
      title: 'National provider registry',
      text: `Searched for "${reg.query}" in Washington and found no one. Check the spelling, or search by last name only, in Your household.`,
      state: 'failed',
    });
  } else {
    steps.push({ title: 'National provider registry', text: `The search didn't work: ${reg.detail}`, state: 'failed' });
  }

  // 2. Clinic and health system websites
  const check = p.clinicCheck;
  const web = p.lookup?.websites;
  if (check) {
    const evidence = ctx.carrier ? check.carriers.find((c) => c.carrier === ctx.carrier) : undefined;
    const where = check.clinicName ? `found ${check.clinicName}` : "couldn't find a clinic page for this doctor";
    let text = `Searched the web on ${date(check.checkedAt)} and ${where}.`;
    if (ctx.carrier) {
      text +=
        !evidence || evidence.finding === 'not-mentioned'
          ? ` The pages found don't mention ${ctx.carrier}.`
          : ` ${evidence.finding === 'accepts' ? 'Lists' : 'Says it does not take'} ${ctx.carrier}.${evidence.detail ? ` ${evidence.detail}` : ''}`;
    }
    const mentioned = !ctx.carrier || (evidence && evidence.finding !== 'not-mentioned');
    steps.push({ title: 'Clinic and health system websites', text, state: mentioned ? 'done' : 'missing' });
  } else if (ctx.checking && doctor) {
    steps.push({ title: 'Clinic and health system websites', text: 'Searching now. This takes about a minute.', state: 'running' });
  } else if (web?.outcome === 'error' && web.npi === doctor?.npi) {
    steps.push({ title: 'Clinic and health system websites', text: `The search didn't finish: ${web.detail} Use "Check websites again" in Your household.`, state: 'failed' });
  } else {
    steps.push({ title: 'Clinic and health system websites', text: 'Waits for a registry match.', state: 'missing' });
  }

  // 3. Hospital employer
  if (check) {
    const hospital = check.hospitalId ? ctx.hospitalNames[check.hospitalId] : null;
    const tracked = Object.values(ctx.hospitalNames);
    steps.push(
      hospital
        ? {
            title: 'Hospital',
            text: `Works for ${hospital}${ctx.hospitalStatusText ? `, which is listed as "${ctx.hospitalStatusText}" for this plan` : ''}.`,
            state: 'done',
          }
        : {
            title: 'Hospital',
            text: tracked.length
              ? `Not found to work for ${tracked.join(' or ')}, so their networks don't settle it.`
              : "The app doesn't track this doctor's hospital.",
            state: 'missing',
          },
    );
  }

  // 4. Premera's public directory
  if (check && check.premeraListed !== null && (!ctx.carrier || ctx.carrier === PREMERA)) {
    steps.push({
      title: "Premera's public directory",
      text: check.premeraListed
        ? 'Lists this doctor, but it doesn\'t say which network, so it can\'t confirm your plan.'
        : "Doesn't list this doctor in any network.",
      state: check.premeraListed ? 'done' : 'failed',
    });
  }

  // 5. The user's answer
  if (ctx.carrier) {
    const mine = p.confirmed?.[ctx.carrier];
    const phone = phoneOf(doctor);
    steps.push(
      mine
        ? { title: 'Your answer', text: `You marked ${ctx.carrier} as ${mine === 'in' ? 'in network' : 'out of network'}.`, state: 'done' }
        : {
            title: 'Your answer',
            text: `Not confirmed yet. ${phone ? `Call the office at ${phone}` : "Call the doctor's office"} and ask whether they're in network for ${ctx.planName ? `"${ctx.planName}"` : `${ctx.carrier}'s individual plans`} in 2027, then mark it in Your household.`,
            state: 'missing',
          },
    );
  }
  return steps;
}
