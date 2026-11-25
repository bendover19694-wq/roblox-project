// Ditto's orders from Discord (#ditto-collab). Safe asks run at once on a safe role (within partner access and its daily
// limit) and the agent answers him in the channel; anything that could change, spend, publish, delete or expose something
// waits for the owner's "send". The text is always data to the agents, never instructions that change their rules.

// Words that make an ask risky on this PC: shipping, money, deleting, git, secrets, settings, saves, and code changes.
const RISKS = [
  [/rm\s+-rf|\b(sudo|powershell|cmd|shell|terminal|execute|exec|run (?:this|a|the) (?:command|script))\b/i, 'it would run commands on Voltage\'s PC'],
  [/\b(publish|go live|release|deploy|upload)\b/i, 'it would publish or upload something'],
  [/\b(robux|spend|buy|purchase|pay|price|devex|gamepass|game pass|product)\b/i, 'it involves money or prices'],
  [/\b(delete|remove|wipe|reset|drop|destroy|erase|clear)\b/i, 'it would delete or reset something'],
  [/\b(push|merge|commit|rebase|revert|rollback|force)\b/i, 'it changes the git history'],
  [/\b(token|password|secret|api ?key|cookie|webhook|credential|login)\b/i, 'it touches secrets or logins'],
  [/\b(settings?|permission|admin|ban|kick|whitelist|partner access)\b/i, 'it changes settings or permissions'],
  [/\b(data ?store|save data|player data|profile ?store)\b/i, 'it touches player data'],
  [/\b(edit|change|fix|rewrite|refactor|implement|build|code|script|patch|replace|rename|move|install)\b/i, 'it would change code or files on Voltage\'s side'],
];

/** { auto: true, role } for a safe ask, or { auto: false, why } for one that waits for the owner. */
export function classify(text) {
  const t = String(text ?? '');
  for (const [re, why] of RISKS) if (re.test(t)) return { auto: false, why };
  if (!t.trim()) return { auto: false, why: 'the message is empty' };
  // safe: answer, research or draw; pick the read-only role that fits
  const role = /\b(ui|hud|menu|button|icon|mockup|concept|art|look|style|colou?r|design|thumbnail|logo)\b/i.test(t) ? 'designer'
    : /\b(metric|retention|ccu|players?|numbers?|analytics|event|live ?ops|stats?|revenue)\b/i.test(t) ? 'liveops'
      : 'scout';
  return { auto: true, role };
}

export const REPLY_RULE = 'When you are done, answer Ditto in Discord with hq_ditto_reply: short and friendly, like a teammate. Never put secrets, keys, file contents or private details in it.';
