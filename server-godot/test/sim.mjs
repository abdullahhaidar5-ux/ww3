// Toy deterministic battle used by the soak test. MUST stay bit-identical to godot/net/test/toy_sim.gd
// (and its Rng/fnv/isqrt to godot/net/det.gd): the soak test runs JavaScript and Godot clients in one game and
// requires every client's state hash to match on every turn.
export const FNV_START = 2166136261;
export function fnv(h, v) {
  v = v >>> 0;
  for (let i = 0; i < 4; i++) h = Math.imul(h ^ ((v >>> (i * 8)) & 0xff), 16777619) >>> 0;
  return h;
}
export class Rng {
  constructor(seed) { this.s = seed >>> 0; if (this.s === 0) this.s = 0x9E3779B9; }
  next() { let x = this.s; x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0; this.s = x; return x; }
  below(n) { return this.next() % n; }
}
export function isqrt(n) {
  if (n <= 0) return 0;
  let x = n, y = Math.floor((x + 1) / 2);
  while (y < x) { x = y; y = Math.floor((x + Math.floor(n / x)) / 2); }
  return x;
}

const FP = 256, W = 2048 * FP, SPEED = 3 * FP, R2 = (40 * FP) * (40 * FP), START_UNITS = 12, MAX_UNITS = 24;
const isInt = Number.isInteger;

export class ToySim {
  constructor(seed, slots) {
    this.rng = new Rng(seed); this.t = 0; this.sys = 0; this.u = [];  // unit: [owner, x, y, tx, ty, hp, cd]
    for (const s of [...slots].sort((a, b) => a - b)) for (let i = 0; i < START_UNITS; i++) this.spawn(s);
  }
  spawn(s) { const x = this.rng.below(W), y = this.rng.below(W); this.u.push([s, x, y, x, y, 100, 0]); }
  apply(slot, o) {
    if (o.sys !== undefined) { this.sys++; return; }
    if (o.k === 'mv' && Array.isArray(o.u) && isInt(o.x) && isInt(o.y)) {
      const x = Math.min(Math.max(o.x, 0), W - 1), y = Math.min(Math.max(o.y, 0), W - 1);
      for (const i of o.u) { if (!isInt(i) || i < 0 || i >= this.u.length) continue; const a = this.u[i]; if (a[0] === slot && a[5] > 0) { a[3] = x; a[4] = y; } }
    } else if (o.k === 'sp') {
      let n = 0; for (const a of this.u) if (a[0] === slot && a[5] > 0) n++;
      if (n < MAX_UNITS) this.spawn(slot);
    }
  }
  step(orders) {
    for (const e of orders) this.apply(e.s, e.o);
    this.t++;
    for (const a of this.u) {
      if (a[5] <= 0) continue;
      const dx = a[3] - a[1], dy = a[4] - a[2], d2 = dx * dx + dy * dy;
      if (d2 === 0) continue;
      const d = isqrt(d2);
      if (d <= SPEED) { a[1] = a[3]; a[2] = a[4]; } else { a[1] += Math.trunc(dx * SPEED / d); a[2] += Math.trunc(dy * SPEED / d); }
    }
    if (this.t % 3 === 0) {
      const u = this.u;
      for (let i = 0; i < u.length; i++) {
        const a = u[i]; if (a[5] <= 0) continue;
        if (a[6] > 0) { a[6]--; continue; }
        for (let j = 0; j < u.length; j++) {
          const b = u[j]; if (j === i || b[0] === a[0] || b[5] <= 0) continue;
          const dx = b[1] - a[1], dy = b[2] - a[2];
          if (dx * dx + dy * dy < R2) { b[5] -= 5 + this.rng.below(6); a[6] = 3; break; }
        }
      }
    }
    if (this.t % 300 === 0) for (const a of this.u) if (a[5] <= 0) { a[1] = a[3] = this.rng.below(W); a[2] = a[4] = this.rng.below(W); a[5] = 100; a[6] = 0; }
  }
  hash() {
    let h = FNV_START; h = fnv(h, this.t); h = fnv(h, this.rng.s); h = fnv(h, this.sys); h = fnv(h, this.u.length);
    for (const a of this.u) for (const v of a) h = fnv(h, v);
    return h;
  }
  snapshot() { return Buffer.from(JSON.stringify({ t: this.t, r: this.rng.s, y: this.sys, u: this.u.flat() })); }
  restore(buf) {
    const d = JSON.parse(Buffer.from(buf).toString());
    this.t = d.t; this.rng.s = d.r >>> 0; this.sys = d.y; this.u = [];
    for (let i = 0; i < d.u.length; i += 7) this.u.push(d.u.slice(i, i + 7));
  }
  owned(slot) { const r = []; this.u.forEach((a, i) => { if (a[0] === slot && a[5] > 0) r.push(i); }); return r; }
}
export const WORLD = W;
