/** General questions every plan's contract can answer, used to fill the suggestions. */
const GENERAL = ['What do I pay for a specialist visit?', 'What needs prior approval?', "What isn't covered?"];
const MAX_SUGGESTIONS = 4;

/**
 * Starter questions for asking about a plan: the household's first medication and first must-have hospital, then
 * general ones. Only shown on screen; nothing is sent until one is picked.
 */
export function suggestedQuestions({ drugNames, hospitalNames }: { drugNames: string[]; hospitalNames: string[] }): string[] {
  const out: string[] = [];
  const drug = drugNames.map((n) => n.trim()).find(Boolean);
  const hospital = hospitalNames.map((n) => n.trim()).find(Boolean);
  if (drug) out.push(`Is ${drug} covered, and what will it cost?`);
  if (hospital) out.push(`Is ${hospital} in network?`);
  for (const q of GENERAL) if (out.length < MAX_SUGGESTIONS) out.push(q);
  return out;
}
