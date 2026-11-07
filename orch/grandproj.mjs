// The ONE grand-map projection (realmap, Abdullah 2026-11-07 06:55 "make the grand map size and countries proportional").
// Equal Earth (Savric, Patterson & Jenny 2018): equal-area, so every country keeps its true relative size; no regional
// magnification. World = GM_W x GM_H map units (2400 x 1200), 1 unit = 1 province-raster pixel (~210 km2).
// Used by orch/grandmap-gen.mjs, orch/grand3d-gen.mjs; orch/realmap-prep.py and orch/look1-bake.py carry the same constants.
export const W = 2400, H = 1200, S = 441, CX = 1200, CY = 646;
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
export function proj(lon, lat) {
  const lam = lon * Math.PI / 180, th = Math.asin(M * Math.sin(lat * Math.PI / 180)), t2 = th * th, t6 = t2 * t2 * t2;
  const x = lam * Math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))), y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [CX + x * S, CY - y * S];
}
export function unproj(X, Y) {   // map units -> [lon, lat] or null outside the world outline
  const x = (X - CX) / S, y = (CY - Y) / S; let th = y;
  for (let i = 0; i < 10; i++) { const t2 = th * th, t6 = t2 * t2 * t2, f = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y, d = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2); th -= f / d; }
  if (Math.abs(th) > Math.asin(M)) return null; const t2 = th * th, t6 = t2 * t2 * t2, d = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
  const lam = M * x * d / Math.cos(th); if (Math.abs(lam) > Math.PI + 1e-9) return null;
  return [lam * 180 / Math.PI, Math.asin(Math.sin(th) / M) * 180 / Math.PI];
}
