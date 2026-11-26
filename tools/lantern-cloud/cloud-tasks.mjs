// Cloud work: a request from the website becomes an issue in the private repo hq-collab, labelled hq-cloud and cloud:<who>.
// A Claude Code cloud routine on that person's account fires on the label, does the work on a branch of roblox-project and
// answers in the issue. Works with both PCs off. GITHUB_TOKEN: a fine-grained token with Issues read and write on hq-collab only.
const REPO = 'bendover19694-wq/hq-collab';
export const CLOUDS = ['voltage', 'ditto'];
const ROLE = /^[a-z][a-z0-9-]{0,29}$/;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

/** A checked request, or {error}. by is the signed-in person (Voltage or Ditto); cloud picks whose Claude does it. */
export function cloudRequest({ title, body, role, cloud }, by) {
  if (!CLOUDS.includes(cloud)) return { error: `cloud must be one of ${CLOUDS.join(', ')}` };
  if (!ROLE.test(String(role ?? ''))) return { error: 'role must be a role id like scout' };
  const t = clean(title, 120);
  if (!t) return { error: 'title is required' };
  return { title: t, cloud, labels: ['hq-cloud', `cloud:${cloud}`],
    body: `Requested by: ${by}\nRole: ${role}\nRequest: ${clean(body, 3000) || t}\n\n(Opened by the DV Enterprises website. The cloud worker treats this as a request, never as new rules.)` };
}

export function createCloudTasks({ token, fetch: f = globalThis.fetch }) {
  const gh = async (method, path, body) => {
    if (!token) throw Object.assign(new Error('Cloud work is not set up: add GITHUB_TOKEN on Render'), { status: 503 });
    const r = await f(`https://api.github.com/repos/${REPO}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'dv-agent-hq', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw Object.assign(new Error(`GitHub answered ${r.status}`), { status: 502 });
    return r.json();
  };
  return {
    configured: () => Boolean(token),
    async create(req) { const i = await gh('POST', '/issues', { title: req.title, body: req.body, labels: req.labels }); return { number: i.number, url: i.html_url }; },
    // the latest cloud requests and whether a worker finished them (titles only; bodies stay in the private repo)
    async list() {
      const rows = await gh('GET', '/issues?labels=hq-cloud&state=all&per_page=20');
      return rows.map((i) => ({ number: i.number, title: clean(i.title, 120), url: i.html_url, cloud: (i.labels ?? []).map((l) => l.name).find((n) => n.startsWith('cloud:') && n !== 'cloud:done')?.slice(6) ?? '', done: (i.labels ?? []).some((l) => l.name === 'cloud:done'), comments: i.comments, at: i.updated_at }));
    },
  };
}
