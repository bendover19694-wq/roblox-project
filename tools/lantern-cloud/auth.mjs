// Password hashing, sessions and login lockout. Everything in memory; secrets come from the caller.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SESSION_MS = 12 * 3600_000;
const WINDOW_MS = 15 * 60_000;
const IP_LIMIT = 5;
const GLOBAL_LIMIT = 30;
export const COOKIE = 'lantern_sid';

const maxmem = (n, r) => 256 * n * r;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: maxmem(N, R) });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [n, r, p] = parts.slice(1, 4).map(Number);
    if (![n, r, p].every(Number.isInteger) || n < 2 || n > 2 ** 16 || r < 1 || r > 16 || p < 1 || p > 4) return false;
    const salt = Buffer.from(parts[4], 'base64');
    const want = Buffer.from(parts[5], 'base64');
    if (!salt.length || want.length < 16 || want.length > 64) return false;
    const got = await scryptAsync(String(password), salt, want.length, { N: n, r, p, maxmem: maxmem(n, r) });
    return timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function sessionCookie(sid, maxAgeSec = SESSION_MS / 1000) {
  return `${COOKIE}=${sid}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;
}

export function createAuth({ hash, secret, now = Date.now } = {}) {
  const key = secret || randomBytes(32).toString('hex');
  const sessions = new Map(); // hmac(sid) -> expiry
  const ipFails = new Map(); // ip -> [timestamps]
  let globalFails = [];
  const fp = (sid) => createHmac('sha256', key).update(String(sid)).digest('hex');
  const recent = (list) => list.filter((t) => now() - t < WINDOW_MS);

  function prune() {
    const t = now();
    for (const [k, exp] of sessions) if (exp <= t) sessions.delete(k);
  }

  function locked(ip) {
    globalFails = recent(globalFails);
    const mine = recent(ipFails.get(ip) || []);
    if (mine.length) ipFails.set(ip, mine);
    else ipFails.delete(ip);
    return mine.length >= IP_LIMIT || globalFails.length >= GLOBAL_LIMIT;
  }

  /** Returns {status: 200|401|429|503, sid?}. */
  async function login(password, ip) {
    if (!hash) return { status: 503 };
    if (locked(ip)) return { status: 429 };
    const ok = typeof password === 'string' && password.length > 0 && password.length <= 256 && (await verifyPassword(password, hash));
    if (!ok) {
      const t = now();
      ipFails.set(ip, [...recent(ipFails.get(ip) || []), t]);
      globalFails.push(t);
      return { status: 401 };
    }
    prune();
    const sid = randomBytes(32).toString('hex');
    sessions.set(fp(sid), now() + SESSION_MS);
    ipFails.delete(ip);
    return { status: 200, sid };
  }

  function check(cookieHeader) {
    const sid = parseCookies(cookieHeader)[COOKIE];
    if (!sid) return false;
    const k = fp(sid);
    const exp = sessions.get(k);
    if (!exp) return false;
    if (exp <= now()) {
      sessions.delete(k);
      return false;
    }
    return true;
  }

  function destroy(cookieHeader) {
    const sid = parseCookies(cookieHeader)[COOKIE];
    if (sid) sessions.delete(fp(sid));
  }

  return { login, check, destroy, hasPassword: Boolean(hash) };
}
