// Password-protected games (Abdullah, 2026-10-27 19:30: "make it so games can be password protected").
//
// How a password travels: the page offers two WebSocket subprotocols when it opens /room/<code> or /battle/<code>:
// "ww3" and "pw.<base64url of the UTF-8 password>". It is never in the URL (so never in request logs or the address bar),
// and the server answers with "ww3" (index.js, withProto). Unprotected games offer nothing and work exactly as before.
//
// What the server keeps: only a salted PBKDF2-SHA256 hash ({s: salt, h: hash, i: iterations}, base64), in memory and,
// for a battle hosted on Cloudflare, inside its kept checkpoint (so a battle picked up after a restart stays locked).
// Guesses are compared in constant time and rate-limited per address (PwGuard): a wrong guess costs a token, five in
// a row lock that address out for a while ("!e pwlimit"); every connection gets exactly one guess.
//
// Refusals ("!e <why>", then the socket closes): needpw (protected, no password given), badpw (wrong password),
// pwlimit (too many wrong guesses from this address, or for this game, lately).

export const PW_ITER = 4000;        // PBKDF2 rounds: ~1-2 ms of CPU per check, so a guess is cheap for the server but
                                    // a stolen hash is not a free lookup (the rate limit is the real guard online)
export const PW_MAX = 64;           // characters
const enc = new TextEncoder();
const b64 = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// the password offered with a WebSocket request, or null (none offered), or '' (offered but unusable: counts as wrong)
export function pwOf(req) {
  const h = (req && req.headers && req.headers.get('Sec-WebSocket-Protocol')) || '';
  for (const t of h.split(',')) {
    const p = t.trim();
    if (!p.startsWith('pw.')) continue;
    try {
      const s = p.slice(3).replace(/-/g, '+').replace(/_/g, '/');
      const pw = new TextDecoder('utf-8', { fatal: true }).decode(unb64(s + '==='.slice((s.length + 3) % 4)));
      return pw && [...pw].length <= PW_MAX ? pw : '';
    } catch (e) { return ''; }
  }
  return null;
}
// did the page offer the "ww3" subprotocol (it then needs it echoed back, or the browser drops the connection)
export const offersProto = req => ((req && req.headers && req.headers.get('Sec-WebSocket-Protocol')) || '').split(',').some(t => t.trim() === 'ww3');

async function derive(pw, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
// a new salted hash of a password: {s, h, i}
export async function pwHash(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { s: b64(salt), h: b64(await derive(pw, salt, PW_ITER)), i: PW_ITER };
}
// does a guess match a stored hash (constant time over the hash bytes)
export async function pwCheck(pw, rec) {
  if (typeof pw !== 'string' || !pw || !rec || typeof rec.s !== 'string' || typeof rec.h !== 'string') return false;
  let want, got;
  try { want = unb64(rec.h); got = await derive(pw, unb64(rec.s), Math.max(1, Math.min(100000, rec.i | 0 || PW_ITER))); } catch (e) { return false; }
  let d = want.length ^ got.length;
  for (let k = 0; k < want.length; k++) d |= want[k] ^ (got[k] | 0);
  return d === 0;
}

// Wrong guesses: per address, 5 in a burst then one every 20 s; per game, 30 then one every 2 s (many addresses).
// In memory: it resets only if the object sleeps, which needs everyone to stop connecting.
const PER_IP = [1 / 20, 5], PER_GAME = [1 / 2, 30];
export class PwGuard {
  constructor(now = () => Date.now()) { this.now = now; this.ips = new Map(); this.game = null; this.good = new Set(); }
  fill(b, [rate, burst]) { const t = this.now(); b.t = Math.min(burst, b.t + (t - b.at) * rate / 1000); b.at = t; return b; }
  get(ip) { let b = this.ips.get(ip); if (!b) { if (this.ips.size > 5000) this.ips.clear(); b = { t: PER_IP[1], at: this.now() }; this.ips.set(ip, b); } return this.fill(b, PER_IP); }
  g() { if (!this.game) this.game = { t: PER_GAME[1], at: this.now() }; return this.fill(this.game, PER_GAME); }
  // may this address guess now?
  ok(ip) { return this.get(ip).t >= 1 && this.g().t >= 1; }
  // a wrong guess
  miss(ip) { this.get(ip).t -= 1; this.g().t -= 1; }
}

// The check for one connection to a protected game: null = let it in, else the refusal reason.
export async function pwGate(guard, rec, req, ip) {
  if (!rec) return null;
  const given = pwOf(req);
  if (given === null) return 'needpw';
  // an address that already got in with the right password (friends on one Wi-Fi / carrier NAT) is held only by the
  // per-game limit, so someone else there mistyping it can't lock them out (review R7)
  const known = guard.good.has(ip);
  if (known ? guard.g().t < 1 : !guard.ok(ip)) return 'pwlimit';
  if (await pwCheck(given, rec)) { if (guard.good.size < 5000) guard.good.add(ip); return null; }
  guard.miss(ip);
  return 'badpw';
}
