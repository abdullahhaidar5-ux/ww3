// Generates seamless 512x512 tileable PBR albedo + normal PNGs for WW3 Godot edition:
//   armor_camo / armor_nrm  (rolled steel + ERA seams + subtle military camo for fixed T-72s)
//   desert_alb / desert_nrm (CoH3-style fine arid sand, gravel grit, cracked clay micro-relief)
//   green_alb  / green_nrm  (Mediterranean meadow grass, soil flecks, natural vegetation turf)
//   snow_alb   / snow_nrm   (wind-packed snow powder, crystalline grain, subtle drift facets)
//   rock_alb   / rock_nrm   (stratified sedimentary cliff rock, fracture crevices)
//   road_alb   / road_nrm   (weathered sun-bleached military tarmac & aggregate gravel)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve('godot/tex');
fs.mkdirSync(OUT, { recursive: true });

// ---- minimal zero-dependency PNG encoder (RGBA8 / RGB8)
const crcTab = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTab[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTab[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0);
  b.write(type, 4, 4, 'ascii');
  data.copy(b, 8);
  b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
  return b;
}
function writePngRGB(file, w, h, rgb) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
}

// ---- fast periodic (seamlessly tileable!) value noise + fbm + cellular voronoi
function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pnoise(u, v, period, seed) {
  const x = ((u % 1) + 1) % 1 * period;
  const y = ((v % 1) + 1) % 1 * period;
  const x0 = Math.floor(x) % period, y0 = Math.floor(y) % period;
  const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}
function pfbm(u, v, basePeriod, octaves, seed, persistence = 0.5) {
  let sum = 0, amp = 1, norm = 0, p = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * pnoise(u, v, p, seed + o * 97);
    norm += amp; amp *= persistence; p *= 2;
  }
  return sum / norm;
}
function pworley(u, v, period, seed) {
  const x = ((u % 1) + 1) % 1 * period;
  const y = ((v % 1) + 1) % 1 * period;
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ((ix + dx) % period + period) % period;
      const cy = ((iy + dy) % period + period) % period;
      const px = ix + dx + hash2(cx, cy, seed);
      const py = iy + dy + hash2(cx, cy, seed + 53);
      const dist = Math.hypot(px - x, py - y);
      if (dist < d1) { d2 = d1; d1 = dist; } else if (dist < d2) { d2 = dist; }
    }
  }
  return [d1, d2 - d1]; // d1 = cell interior, d2-d1 = crack edge distance
}
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function heightToNormal(hbuf, w, h, strength) {
  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const ym = (y - 1 + h) % h, yp = (y + 1) % h;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const tl = hbuf[ym * w + xm], t = hbuf[ym * w + x], tr = hbuf[ym * w + xp];
      const l = hbuf[y * w + xm], r = hbuf[y * w + xp];
      const bl = hbuf[yp * w + xm], b = hbuf[yp * w + x], br = hbuf[yp * w + xp];
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dx * strength, ny = -dy * strength, nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv; ny *= inv; nz *= inv;
      const i = (y * w + x) * 3;
      rgb[i] = Math.round(clamp(nx * 0.5 + 0.5) * 255);
      rgb[i + 1] = Math.round(clamp(ny * 0.5 + 0.5) * 255);
      rgb[i + 2] = Math.round(clamp(nz * 0.5 + 0.5) * 255);
    }
  }
  return rgb;
}

const S = 512;

function buildSet(name, fn, nrmStrength) {
  const alb = Buffer.alloc(S * S * 3);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const [r, g, b, h] = fn(u, v, x, y);
      const i = (y * S + x) * 3;
      alb[i] = Math.round(clamp(r) * 255);
      alb[i + 1] = Math.round(clamp(g) * 255);
      alb[i + 2] = Math.round(clamp(b) * 255);
      hgt[y * S + x] = h;
    }
  }
  const nrm = heightToNormal(hgt, S, S, nrmStrength);
  writePngRGB(path.join(OUT, `${name}_alb.png`), S, S, alb);
  writePngRGB(path.join(OUT, `${name}_nrm.png`), S, S, nrm);
  console.log(`wrote ${name}_alb.png & ${name}_nrm.png`);
}

// 1. DESERT: sun-baked Levantine/North African hard-packed sand, subtle organic ripples, fine pebbles & dry clay
buildSet('desert', (u, v) => {
  const macro = pfbm(u, v, 4, 4, 11, 0.52);
  const med = pfbm(u, v, 16, 3, 29, 0.55);
  const grit = pfbm(u, v, 64, 2, 71, 0.55);
  const [cell, edge] = pworley(u + macro * 0.04, v + med * 0.04, 14, 103);
  const crack = 1 - smoothstep(0.015, 0.085, edge);
  const crackMask = smoothstep(0.55, 0.80, macro) * 0.55;
  // gentle diagonal wind micro-ripples ONLY in sandy zones (very subtle, broken by noise — never tiger stripes!)
  const ripWarp = pfbm(u, v, 6, 3, 41) * 0.22;
  const rip = Math.sin((u * 10 + v * 6 + ripWarp * 5) * Math.PI * 2) * 0.5 + 0.5;
  const sandZone = 1 - smoothstep(0.42, 0.72, macro);
  const pebble = smoothstep(0.76, 0.90, pnoise(u, v, 96, 131)) * 0.6 + smoothstep(0.80, 0.95, pnoise(u, v, 160, 149)) * 0.4;

  // neutral-warm desaturated real desert sand (works cleanly under warm sunlight without turning neon orange!)
  let r = mix(0.68, 0.80, macro * 0.6 + med * 0.4);
  let g = mix(0.61, 0.72, macro * 0.6 + med * 0.4);
  let b = mix(0.50, 0.59, macro * 0.6 + med * 0.4);
  const clay = smoothstep(0.52, 0.82, macro);
  r = mix(r, 0.64, clay * 0.35);
  g = mix(g, 0.55, clay * 0.35);
  b = mix(b, 0.44, clay * 0.35);

  const shade = 0.90 + 0.16 * grit + 0.04 * rip * sandZone - crack * crackMask * 0.22 - pebble * 0.14;
  r *= shade; g *= shade; b *= shade;
  const h = 0.5 + med * 0.22 + grit * 0.14 + rip * sandZone * 0.09 - crack * crackMask * 0.28 + pebble * 0.24 - cell * 0.04;
  return [r, g, b, h];
}, 2.4);

// 2. GREEN / MEDITERRANEAN: organic olive-emerald meadow blades, warm dry grass tufts, dark loam earth
buildSet('green', (u, v) => {
  const macro = pfbm(u, v, 4, 4, 211, 0.55);
  const turf = pfbm(u, v, 24, 3, 227, 0.6);
  const blades = pnoise(u, v, 128, 251) * 0.6 + pnoise(u + 0.13, v + 0.27, 192, 263) * 0.4;
  const dry = smoothstep(0.55, 0.82, pfbm(u, v, 8, 3, 281));
  const soil = smoothstep(0.65, 0.88, pfbm(u, v, 6, 3, 307));

  let r = mix(0.32, 0.46, turf);
  let g = mix(0.41, 0.56, turf);
  let b = mix(0.22, 0.31, turf);
  // golden dry hillside grass flecks
  r = mix(r, 0.56, dry * 0.48);
  g = mix(g, 0.52, dry * 0.48);
  b = mix(b, 0.32, dry * 0.48);
  // earthy loam patches
  r = mix(r, 0.36, soil * 0.45);
  g = mix(g, 0.31, soil * 0.45);
  b = mix(b, 0.23, soil * 0.45);

  const k = 0.84 + 0.28 * blades + (macro - 0.5) * 0.14;
  const h = turf * 0.35 + blades * 0.45 + dry * 0.1 - soil * 0.2;
  return [r * k, g * k, b * k, h];
}, 2.8);

// 3. SNOW: realistic wind-sculpted powder snow with soft sastrugi ridges & crunchy crystalline grain
buildSet('snow', (u, v) => {
  const macro = pfbm(u, v, 4, 4, 401, 0.5);
  const driftWarp = pfbm(u, v, 4, 3, 419) * 0.35;
  const drift = pfbm(u * 1.0 + driftWarp, v * 0.5, 8, 3, 431, 0.5);
  const grain = pnoise(u, v, 96, 449) * 0.55 + pnoise(u, v, 192, 461) * 0.45;
  const crust = smoothstep(0.65, 0.90, pfbm(u, v, 12, 3, 479));

  let r = mix(0.76, 0.88, drift * 0.65 + macro * 0.35);
  let g = mix(0.80, 0.91, drift * 0.65 + macro * 0.35);
  let b = mix(0.86, 0.95, drift * 0.65 + macro * 0.35);
  const k = 0.93 + 0.11 * grain - crust * 0.05;
  const h = drift * 0.45 + macro * 0.25 + grain * 0.12 - crust * 0.08;
  return [r * k, g * k, b * k, h];
}, 1.9);

// 4. ROCK: stratified sedimentary cliff rock with natural weathered bands and subtle fractures (no cartoon polygons)
buildSet('rock', (u, v) => {
  const warp = pfbm(u, v, 6, 3, 503) * 0.14;
  const strata = pfbm(u * 0.5, v * 3.0 + warp, 8, 4, 521, 0.55);
  const fineBand = Math.sin((v * 14 + warp * 8) * Math.PI * 2) * 0.5 + 0.5;
  const [cell, edge] = pworley(u + warp * 0.4, v + warp * 0.6, 12, 541);
  const fissure = (1 - smoothstep(0.008, 0.055, edge)) * 0.24;
  const grit = pfbm(u, v, 48, 3, 563, 0.58);

  const base = mix(0.46, 0.72, strata * 0.75 + fineBand * 0.25) * (0.88 + 0.22 * grit) * (1 - fissure);
  const r = base * 1.03;
  const g = base * 0.99;
  const b = base * 0.93;
  const h = strata * 0.42 + fineBand * 0.14 + grit * 0.22 + cell * 0.08 - fissure * 0.45;
  return [r, g, b, h];
}, 3.6);

// 5. ROAD: sun-bleached military tarmac / compacted gravel aggregate (clean fine grain, no giant polygon cracks!)
buildSet('road', (u, v) => {
  const patch = pfbm(u, v, 6, 4, 601, 0.52);
  const med = pfbm(u, v, 24, 3, 613, 0.55);
  const agg = pnoise(u, v, 96, 617) * 0.55 + pnoise(u, v, 192, 631) * 0.45;
  const [, edge] = pworley(u + patch * 0.04, v + patch * 0.04, 16, 647);
  const crack = (1 - smoothstep(0.004, 0.018, edge)) * smoothstep(0.55, 0.85, patch) * 0.16;

  const base = mix(0.54, 0.66, patch * 0.6 + med * 0.4) * (0.90 + 0.18 * agg) * (1 - crack);
  const h = agg * 0.24 + med * 0.14 - crack * 0.22;
  return [base * 1.01, base * 0.99, base * 0.95, h];
}, 1.8);

// 6. ARMOR: rolled military steel + authentic 3-tone tactical camo + subtle weld seams, scratches & dust grime
{
  const alb = Buffer.alloc(S * S * 3);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const warpX = pfbm(u, v, 4, 3, 691) * 0.08;
      const warpY = pfbm(u + 0.5, v + 0.5, 4, 3, 697) * 0.08;
      const c1 = pfbm(u + warpX, v + warpY, 3, 4, 701, 0.50);
      const c2 = pfbm(u + 0.37 - warpY, v + 0.61 + warpX, 4, 4, 719, 0.50);
      const blotchA = smoothstep(0.47, 0.54, c1);
      const blotchB = smoothstep(0.55, 0.62, c2);
      // subtle large rolled-steel plate seams (4x2 staggered, very faint — never a tile grid!)
      const gx = (u * 4 + (Math.floor(v * 2) % 2) * 0.5) % 1, gy = (v * 2) % 1;
      const seam = (gx < 0.008 || gx > 0.992 || gy < 0.006 || gy > 0.994) ? 1 : 0;
      // fine steel brushing, wear scratches & field dust
      const grain = pfbm(u, v, 32, 3, 739, 0.58);
      const fine = pnoise(u, v, 128, 743);
      const grime = smoothstep(0.40, 0.80, pfbm(u, v, 8, 3, 757));
      const scratch = smoothstep(0.84, 0.94, pnoise(u * 1.5, v * 0.35, 64, 769)) * 0.14;

      let r = 0.86, g = 0.84, b = 0.78;
      // olive-earth tactical camo blotch
      r = mix(r, 0.54, blotchA * 0.72); g = mix(g, 0.58, blotchA * 0.72); b = mix(b, 0.44, blotchA * 0.72);
      // dark charcoal-brown camo accent
      r = mix(r, 0.36, blotchB * 0.62); g = mix(g, 0.35, blotchB * 0.62); b = mix(b, 0.31, blotchB * 0.62);
      // subtle arid dust accumulation
      r = mix(r, 0.78, grime * 0.18); g = mix(g, 0.73, grime * 0.18); b = mix(b, 0.62, grime * 0.18);
      const panelShade = seam ? 0.74 : 1.0;
      const micro = 0.91 + 0.14 * grain + 0.05 * fine + scratch;
      const i = (y * S + x) * 3;
      alb[i] = Math.round(clamp(r * panelShade * micro) * 255);
      alb[i + 1] = Math.round(clamp(g * panelShade * micro) * 255);
      alb[i + 2] = Math.round(clamp(b * panelShade * micro) * 255);
      hgt[y * S + x] = (seam ? 0.32 : 0.62) + grain * 0.16 + fine * 0.08 + scratch * 0.5;
    }
  }
  const nrm = heightToNormal(hgt, S, S, 2.2);
  writePngRGB(path.join(OUT, 'armor_camo.png'), S, S, alb);
  writePngRGB(path.join(OUT, 'armor_nrm.png'), S, S, nrm);
  console.log('wrote armor_camo.png & armor_nrm.png');
}
