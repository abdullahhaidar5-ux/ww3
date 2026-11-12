// Floating-dressing guard for production buildings (bldfix, 2026-11-12). PAGE_CHECK runs inside the game page: for every nation and building
// kind it builds the model + dressing and records, per roof prop (meshes sharing userData.pid) or per ground mesh, the lowest point
// before the kit is merged. judge() turns that into failures. Used by orch/smoke.mjs and orch/bldfix.mjs. View only.
export const PAGE_CHECK = () => {
  const out = [], KINDS = ['hq', 'barracks', 'factory', 'depot', 'airfield', 'shipyard', 'radio', 'uplink'], FACS = ['US', 'IR', 'RS', 'IL', 'SA', 'RU', 'CN', 'DE'];
  const T = G.teams[G.teams.length > 1 ? 1 : 0], keep = T.fac, orig = window.mergeKit, rec = [], ti = G.teams.indexOf(T);
  window.mergeKit = function (P) { try { P.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(P.matrixWorld).invert(); P.traverse(c => { if (c.isMesh && c.geometry) { const b = new THREE.Box3().setFromObject(c).applyMatrix4(inv); if (isFinite(b.min.y)) rec.push([b.min.y, b.max.y, c.userData && c.userData.pid != null && c.userData.pid >= 0 ? c.userData.pid : 'm' + rec.length]); } }); } catch (e) {} return orig.apply(this, arguments); };
  try {
    for (const f of FACS) for (const k of KINDS) { if (!STRUCT[k]) continue; T.fac = f; rec.length = 0;
      let o; try { o = makeObj({ isB: true, kind: k, team: ti, size: STRUCT[k].size, x: 100, y: 100, hp: 1, maxhp: 1 }); } catch (e) { out.push(f + ' ' + k + ' makeObj threw ' + e.message); continue; }
      const pm = {}; for (const r of rec) pm[r[2]] = Math.min(pm[r[2]] ?? 1e9, r[0]);
      const maxMin = Object.values(pm).reduce((a, v) => Math.max(a, v), -1e9), roofY = o.userData.roofY;
      out.push({ f, k, roofY: roofY == null ? null : +roofY.toFixed(1), flat: o.userData.roofFlat, rings: o.userData.rings || 0, maxMin: +maxMin.toFixed(1) }); }
  } finally { window.mergeKit = orig; T.fac = keep; }
  return out;
};
export function judge(res) {
  const bads = [];
  for (const r of res) { if (typeof r === 'string') { bads.push(r); continue; }
    if (r.roofY != null && r.maxMin > r.roofY + 2) bads.push(`${r.f} ${r.k}: roof prop floats (lowest point ${r.maxMin} above roof ${r.roofY})`);
    if (r.roofY != null && r.flat === false && r.maxMin > 10) bads.push(`${r.f} ${r.k}: no flat roof but dressing hangs at ${r.maxMin}`);
    if (r.roofY == null && r.maxMin > 6) bads.push(`${r.f} ${r.k}: dressing floats at ${r.maxMin}`);
    if (r.rings > 1) bads.push(`${r.f} ${r.k}: ${r.rings} perimeter rings`); }
  return bads;
}
