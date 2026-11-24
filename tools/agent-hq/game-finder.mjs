// Roblox game finder for the UI Lab: type a game's name, pick it, and HQ pulls its public UI art (game icon, store
// screenshots, game-pass icons, badge icons) from Roblox's public APIs into a kit agents study. No login is used; a
// place's own GUI files cannot be downloaded (Roblox keeps them on its servers), so "Join and capture" can add screenshots.
// Another game's art is study material only: every kit from here is marked "reference only, never ship".
import crypto from 'node:crypto';

const J = async (fetchImpl, url) => {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`Roblox answered ${r.status} for ${new URL(url).host}`);
  return r.json();
};
const ID = /^\d{1,20}$/;

/** Up to 8 games for a search, best match first: [{ universeId, placeId, name, players }]. */
export async function findGames(query, fetchImpl = globalThis.fetch) {
  const q = String(query ?? '').trim().slice(0, 80);
  if (!q) return [];
  const d = await J(fetchImpl, `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(q)}&sessionId=${crypto.randomUUID()}&pageType=all`);
  const out = [];
  for (const g of d?.searchResults ?? []) {
    if (g.contentGroupType !== 'Game') continue;
    for (const c of g.contents ?? []) {
      if (ID.test(String(c.universeId)) && ID.test(String(c.rootPlaceId))) out.push({ universeId: String(c.universeId), placeId: String(c.rootPlaceId), name: String(c.name ?? '').slice(0, 100), players: Number(c.playerCount) || 0 });
    }
  }
  return out.slice(0, 8);
}

/** Public media of one game: screenshot URLs from Roblox's CDN and image asset ids for its icon, passes and badges. */
export async function gameMedia(universeId, fetchImpl = globalThis.fetch) {
  if (!ID.test(String(universeId))) throw new Error('universeId must be a number');
  const u = String(universeId);
  const safe = (p) => p.catch(() => null);
  const [icon, shots, passes, badges] = await Promise.all([
    safe(J(fetchImpl, `https://thumbnails.roblox.com/v1/games/icons?universeIds=${u}&size=512x512&format=Png`)),
    safe(J(fetchImpl, `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${u}&countPerUniverse=10&size=768x432&format=Png`)),
    safe(J(fetchImpl, `https://apis.roblox.com/game-passes/v1/universes/${u}/game-passes?passView=Full&pageSize=100`)),
    safe(J(fetchImpl, `https://badges.roblox.com/v1/universes/${u}/badges?limit=100&sortOrder=Asc`)),
  ]);
  const cdn = (x) => (typeof x === 'string' && /^https:\/\/t[r0-9]\.rbxcdn\.com\//.test(x) ? x : null);
  const screens = [cdn(icon?.data?.[0]?.imageUrl), ...(shots?.data?.[0]?.thumbnails ?? []).map((t) => cdn(t.imageUrl))].filter(Boolean);
  const items = [
    ...(passes?.gamePasses ?? []).map((p) => ({ id: String(p.displayIconImageAssetId ?? ''), name: `Pass: ${p.displayName ?? p.name ?? ''}`.slice(0, 80), class: 'GamePass' })),
    ...(badges?.data ?? []).map((b) => ({ id: String(b.iconImageId ?? ''), name: `Badge: ${b.name ?? ''}`.slice(0, 80), class: 'Badge' })),
  ].filter((i) => ID.test(i.id));
  return { screens, items, counts: { passes: passes?.gamePasses?.length ?? 0, badges: badges?.data?.length ?? 0 } };
}
