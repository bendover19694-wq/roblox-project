// Sample telemetry records in the shape the game writes (see src/shared/LiveStats.luau). Used by tests and to
// generate test/fixtures/live-view.sample.json for the Games page.
export const NOW = Date.parse('2026-10-24T18:20:00Z');
export const nowHour = Math.floor(NOW / 3600000);
const nowSec = Math.floor(NOW / 1000);

const hist = (...h) => h;
function day(date, o) {
  const newCount = o.uniqueNew ?? 0;
  const retCount = o.uniqueReturning ?? 0;
  return {
    date,
    stats: {
      v: 1,
      joins: newCount + retCount + 10, leaves: newCount + retCount, newJoins: newCount, returningJoins: retCount + 10,
      uniqueNew: newCount, uniqueReturning: retCount, payers: o.payers ?? 0, bounces: Math.round(newCount * 0.3),
      sessions: {
        new: { count: newCount, seconds: newCount * 100, hist: hist(Math.round(newCount * 0.3), Math.round(newCount * 0.25), Math.round(newCount * 0.25), Math.round(newCount * 0.15), Math.round(newCount * 0.04), Math.round(newCount * 0.01)) },
        returning: { count: retCount, seconds: retCount * 600, hist: hist(2, 4, 6, 5, 2, 1) },
      },
      sources: o.sources ?? { direct: { joins: newCount, newJoins: newCount, d1: 0, d7: 0 } },
      returningByAge: o.returningByAge ?? {},
      devices: { phone: Math.round((newCount + retCount) * 0.7), pc: Math.round((newCount + retCount) * 0.3) },
      countries: { US: Math.round((newCount + retCount) * 0.6), CA: Math.round((newCount + retCount) * 0.1), GB: Math.round((newCount + retCount) * 0.05) },
      languages: { 'en-us': newCount + retCount },
      versions: { 12: newCount + retCount },
      lastPlaces: { Hangar: Math.round(newCount * 0.5), Shop: Math.round(newCount * 0.2), Map: Math.round(newCount * 0.1) },
      tutorialSteps: { 1: Math.round(newCount * 0.2), 3: Math.round(newCount * 0.1), 5: Math.round(newCount * 0.05) },
      lastLeave: { lastPlace: 'Shop', tutorialStep: 4, seconds: 95, at: Math.floor(Date.parse(`${date}T12:00:00Z`) / 1000) },
      robux: { total: o.robux ?? 0, count: o.payers ?? 0, byProduct: {} },
      errors: { count: 2, samples: [{ message: 'attempt to index nil', count: 2 }] },
      perf: { samples: 24, fpsSum: 24 * (o.fps ?? 58), fpsHist: [0, 0, 1, 3, 20], crashes: 0, pingMax: 140 },
      hours: o.hours ?? {},
    },
  };
}

export const days = [
  day('2026-10-17', { uniqueNew: 200, sources: { direct: { joins: 200, newJoins: 200, d1: 0, d7: 0 } } }),
  day('2026-10-20', { uniqueNew: 100, uniqueReturning: 20, payers: 2, robux: 400, fps: 57, sources: { direct: { joins: 80, newJoins: 70, d1: 0, d7: 0 }, friend: { joins: 40, newJoins: 30, d1: 0, d7: 0 } } }),
  day('2026-10-21', { uniqueNew: 120, uniqueReturning: 40, payers: 3, robux: 650, fps: 58, returningByAge: { 1: 25 }, sources: { direct: { joins: 100, newJoins: 80, d1: 17, d7: 0 }, friend: { joins: 60, newJoins: 40, d1: 8, d7: 0 } } }),
  day('2026-10-22', { uniqueNew: 150, uniqueReturning: 60, payers: 4, robux: 900, fps: 56, returningByAge: { 1: 30 }, sources: { direct: { joins: 130, newJoins: 100, d1: 20, d7: 0 }, friend: { joins: 80, newJoins: 50, d1: 10, d7: 0 } } }),
  day('2026-10-23', { uniqueNew: 130, uniqueReturning: 70, payers: 4, robux: 800, fps: 59, returningByAge: { 1: 28 }, sources: { direct: { joins: 110, newJoins: 90, d1: 19, d7: 0 }, friend: { joins: 90, newJoins: 40, d1: 9, d7: 0 } } }),
  day('2026-10-24', {
    uniqueNew: 140, uniqueReturning: 80, payers: 5, robux: 1100, fps: 58, returningByAge: { 1: 31, 7: 14 },
    sources: { direct: { joins: 120, newJoins: 100, d1: 22, d7: 14 }, friend: { joins: 100, newJoins: 40, d1: 9, d7: 0 } },
    hours: {
      [nowHour - 2]: { joins: 30, leaves: 28, robux: 100, errors: 0, peaks: { a: 22, b: 15 }, products: { 'Starter Pack': 100 } },
      [nowHour - 1]: { joins: 40, leaves: 50, robux: 600, errors: 4, peaks: { a: 41, b: 25 }, products: { 'Starter Pack': 400, 'Cosmetic Livery': 200 } },
      [nowHour]: { joins: 20, leaves: 10, robux: 300, errors: 1, peaks: { a: 30, b: 20 }, products: { 'Starter Pack': 200, '2x Cash': 100 } },
    },
  }),
];

export const live = {
  at: nowSec - 30,
  servers: {
    a1b2: { at: nowSec - 30, playing: 20, peak: 30, fps: 58, ping: 90, version: 12 },
    c3d4: { at: nowSec - 10, playing: 15, peak: 20, fps: 41.2, ping: 212, version: 12 },
    e5f6: { at: nowSec - 600, playing: 99, peak: 99, fps: 10, ping: 900, version: 11 }, // gone: not reported for 10 minutes
    g7h8: { at: nowSec - 20, playing: 6, peak: 8, fps: 59, ping: 120, version: 11 },
  },
};
