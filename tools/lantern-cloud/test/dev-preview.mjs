// Local preview of the site with fake Discord, fake HQ state and the fake test password from helpers.mjs.
// Only the Roblox game lookup reaches the real network. Run: node tools/lantern-cloud/test/dev-preview.mjs, then open http://localhost:4410
import { createApp } from '../server.mjs';
import { hashPassword } from '../auth.mjs';
import { FAKE_PASSWORD, fakeFetch, testEnv, snapshot } from './helpers.mjs';

const snap = snapshot({
  roles: ['lead', 'scout', 'builder', 'ui', 'designer'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) })),
  spend: { totalUsd: 32.12, dayUsd: 2.4, byRole: { lead: 14.2, builder: 8.1, scout: 5.6, ui: 3.02, designer: 1.2 } },
  paused: false,
});
const fake = fakeFetch({ snap });
const f = (url, init) => (/^https:\/\/(apis|games)\.roblox\.com\//.test(String(url)) ? fetch(url, init) : fake(url, init));
const app = createApp({ env: testEnv(await hashPassword(FAKE_PASSWORD)), fetch: f });
app.server.listen(4410, '127.0.0.1', () => console.log('preview on http://localhost:4410 (password: FAKE_PASSWORD in test/helpers.mjs)'));
