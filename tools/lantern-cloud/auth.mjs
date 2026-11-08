// Password hashing, optional TOTP codes, sessions and login lockout. Everything in memory; secrets come from the caller.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SESSION_MS = 12 * 3600_000; // absolute limit
const IDLE_MS = 30 * 60_000;
const PENDING_MS = 5 * 60_000; // time allowed between the password and the code // signed out after 30 minutes without activity
const WINDOW_MS = 15 * 60_000;
const IP_LIMIT = 5;
const GLOBAL_LIMIT = 30;
export const COOKIE = '__Host-dv_sid'; // __Host-: Secure, Path=/, no Domain, so no other site can set it

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

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0; let value = 0; const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export function base32Encode(buf) {
  let bits = 0; let value = 0; let out = '';
  for (const b of buf) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  return bits ? out + B32[(value << (5 - bits)) & 31] : out;
}
/** RFC 6238 code (SHA-1, 6 digits, 30 s) for a time step. */
export function totpAt(secret, step) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', secret).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export const PENDING_COOKIE = '__Host-dv_step';
export const pendingCookie = (tok, maxAgeSec = PENDING_MS / 1000) => `${PENDING_COOKIE}=${tok}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;

export function sessionCookie(sid, maxAgeSec = SESSION_MS / 1000) {
  return `${COOKIE}=${sid}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;
}

export function createAuth({ hash, secret, totpSecret, now = Date.now } = {}) {
  const key = secret || randomBytes(32).toString('hex');
  let totpKey = null;
  try { if (totpSecret) totpKey = base32Decode(totpSecret); } catch { totpKey = null; }
  if (totpSecret && (!totpKey || totpKey.length < 10)) throw new Error('TOTP_SECRET is not valid base32 (20 bytes or more)');
  let lastStep = -1; // a code works once, so a seen code cannot be replayed
  const sessions = new Map(); // hmac(sid) -> { exp, seen }
  const pendings = new Map(); // hmac(pending token) -> { exp, tries }: password passed, code still needed
  const ipFails = new Map(); // ip -> [timestamps]
  let globalFails = [];
  const fp = (sid) => createHmac('sha256', key).update(String(sid)).digest('hex');
  const recent = (list) => list.filter((t) => now() - t < WINDOW_MS);

  function prune() {
    const t = now();
    for (const [k, v] of sessions) if (v.exp <= t || t - v.seen > IDLE_MS) sessions.delete(k);
  }

  function locked(ip) {
    globalFails = recent(globalFails);
    const mine = recent(ipFails.get(ip) || []);
    if (mine.length) ipFails.set(ip, mine);
    else ipFails.delete(ip);
    return mine.length >= IP_LIMIT || globalFails.length >= GLOBAL_LIMIT;
  }

  function codeOk(code) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
    const step = Math.floor(now() / 30_000);
    for (const s of [step - 1, step, step + 1]) {
      if (s > lastStep && timingSafeEqual(Buffer.from(totpAt(totpKey, s)), Buffer.from(code))) { lastStep = s; return true; }
    }
    return false;
  }
  const fail = (ip) => {
    const t = now();
    ipFails.set(ip, [...recent(ipFails.get(ip) || []), t]);
    globalFails.push(t);
  };
  function newSession(ip) {
    prune();
    const sid = randomBytes(32).toString('hex');
    sessions.set(fp(sid), { exp: now() + SESSION_MS, seen: now() });
    ipFails.delete(ip);
    return { status: 200, sid };
  }

  /** Step 1. Returns {status: 200, sid} without TOTP, {status: 202, pending} when a code is needed, or 401|429|503. */
  async function login(password, ip) {
    if (!hash) return { status: 503 };
    if (locked(ip)) return { status: 429 };
    const pwOk = typeof password === 'string' && password.length > 0 && password.length <= 256 && (await verifyPassword(password, hash));
    if (!pwOk) { fail(ip); return { status: 401 }; }
    if (!totpKey) return newSession(ip);
    for (const [k, v] of pendings) if (v.exp <= now()) pendings.delete(k);
    const pending = randomBytes(32).toString('hex');
    pendings.set(fp(pending), { exp: now() + PENDING_MS, tries: 0 });
    return { status: 202, pending };
  }

  const pendingOf = (cookieHeader) => {
    const tok = parseCookies(cookieHeader)[PENDING_COOKIE];
    const v = tok && pendings.get(fp(tok));
    if (!v || v.exp <= now()) return null;
    return { key: fp(tok), v };
  };

  /** Step 2. Returns 200 {sid}, 401 wrong code, 410 no or expired step 1, 429 locked. */
  function verifyCode(cookieHeader, code, ip) {
    if (locked(ip)) return { status: 429 };
    const p = pendingOf(cookieHeader);
    if (!p) return { status: 410 };
    if (!codeOk(String(code || '').replace(/\s/g, ''))) {
      fail(ip);
      if (++p.v.tries >= 5) pendings.delete(p.key); // five wrong codes: start again from the password
      return { status: p.v.tries >= 5 ? 410 : 401 };
    }
    pendings.delete(p.key);
    return newSession(ip);
  }

  function check(cookieHeader) {
    const sid = parseCookies(cookieHeader)[COOKIE];
    if (!sid) return false;
    const k = fp(sid);
    const v = sessions.get(k);
    if (!v) return false;
    if (v.exp <= now() || now() - v.seen > IDLE_MS) {
      sessions.delete(k);
      return false;
    }
    v.seen = now();
    return true;
  }

  function destroy(cookieHeader) {
    const sid = parseCookies(cookieHeader)[COOKIE];
    if (sid) sessions.delete(fp(sid));
  }

  return { login, verifyCode, hasPending: (c) => Boolean(pendingOf(c)), check, destroy, hasPassword: Boolean(hash), hasTotp: Boolean(totpKey) };
}
