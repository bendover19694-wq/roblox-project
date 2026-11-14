// Picks the Claude model for one task: the role's model, one tier down for light Lead turns, one tier up after failed attempts.
// An owner override (task.model or Settings > roleEngines) always wins; the runner only calls this when there is none.
const TIERS = ['haiku', 'sonnet', 'opus'];
const HEAVY = /\b(plan|design|architect|build|create|new game|refactor|rework|pitch|strategy|roadmap|decide|why)\b/i;
export const LIGHT_MAX = 280; // characters of title and body under which a Lead turn counts as a quick reply

/** Returns {model, why}. `smart` false (Settings > smartModels off) keeps the role's model. */
export function pickModel({ task = {}, roleModel, smart = true }) {
  const base = TIERS.includes(roleModel) ? roleModel : 'sonnet';
  if (!smart) return { model: base, why: 'role model' };
  const attempt = Number(task.attempt) || 1;
  // the same model already failed this work: attempt 2 on the cheapest tier, attempt 3 on any tier, moves one tier up
  if (attempt >= 3 || (attempt === 2 && base === 'haiku')) {
    const model = TIERS[Math.min(TIERS.indexOf(base) + 1, TIERS.length - 1)];
    if (model !== base) return { model, why: `attempt ${attempt}: one tier up from ${base}` };
  }
  if (task.role === 'lead' && base === 'opus' && attempt === 1) {
    const text = `${task.title ?? ''}\n${task.body ?? ''}`;
    if (/^Results in\b/i.test(task.title ?? '')) return { model: 'sonnet', why: 'Lead results follow-up' };
    if (text.length <= LIGHT_MAX && !HEAVY.test(text)) return { model: 'sonnet', why: 'short Lead reply' };
  }
  return { model: base, why: 'role model' };
}
