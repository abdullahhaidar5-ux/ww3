#!/usr/bin/env python3
"""realmap prep: Natural Earth 1:10m admin-0 + admin-1 (public domain, naturalearthdata.com) -> the province building blocks
for orch/grandmap-gen.mjs, in the ONE grand-map projection (Equal Earth, orch/grandproj.mjs), 2400x1200 raster.
  python3 -I orch/realmap-prep.py NE10_DIR(a0/ne_10m_admin_0_countries.shp, a1/ne_10m_admin_1_states_provinces.shp) NE50_LAND_SHP(ne_50m_land.shp)
Run AFTER orch/look1-bake.py (uses grand/elev.png + grand/color.jpg for per-unit terrain stats).
Writes orch/realmap/a1.bin.gz (uint16 LE unit index per pixel, 65535 = none), orch/realmap/a1.json (unit table) and
orch/realmap/land50.bin.gz (uint8 land mask from ne_50m_land: tells ocean from lakes/river gaps inside the admin polygons)."""
import sys, os, json, gzip, numpy as np, cv2, shapefile
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
ne = sys.argv[1]; ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OUT = os.path.join(ROOT, 'orch', 'realmap')
W, H, S, CX, CY = 2400, 1200, 441, 1200, 646
A1, A2, A3, A4, M = 1.340264, -0.081106, 0.000893, 0.003796, np.sqrt(3) / 2
def proj(lon, lat):
    lam = np.radians(lon); th = np.arcsin(M * np.sin(np.radians(lat))); t2 = th * th; t6 = t2 ** 3
    x = lam * np.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))); y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return CX + x * S, CY - y * S
SUB = 8   # fillPoly sub-pixel bits
def polys(shp):
    pts = np.asarray(shp.points, float); parts = list(shp.parts) + [len(pts)]; out = []
    if len(pts) == 0: return out
    X, Y = proj(pts[:, 0], np.clip(pts[:, 1], -89.9, 89.9))
    P = np.stack([X - .5, Y - .5], 1) * (1 << SUB)
    for a, b in zip(parts[:-1], parts[1:]):
        if b - a >= 3: out.append(np.round(P[a:b]).astype(np.int32))
    return out
idx = np.full((H, W), 65535, np.uint16); units = []
def paint(shp, k):
    ps = polys(shp)
    if not ps: return 0
    a = np.concatenate(ps) >> SUB; x0, y0 = max(0, a[:, 0].min() - 1), max(0, a[:, 1].min() - 1); x1, y1 = min(W, a[:, 0].max() + 2), min(H, a[:, 1].max() + 2)
    if x1 <= x0 or y1 <= y0: return 0
    m = np.zeros((y1 - y0, x1 - x0), np.uint8); off = np.array([x0, y0]) << SUB
    cv2.fillPoly(m, [q - off for q in ps], 1, lineType=cv2.LINE_8, shift=SUB)   # holes (lakes) stay empty
    v = idx[y0:y1, x0:x1]; v[m > 0] = k; return int(m.sum())
r0 = shapefile.Reader(f'{ne}/a0/ne_10m_admin_0_countries.shp', encoding='utf-8')
r1 = shapefile.Reader(f'{ne}/a1/ne_10m_admin_1_states_provinces.shp', encoding='utf-8')
# admin-0 first (fills slivers), then admin-1 on top, big before small so small units survive
for sr in r0.iterShapeRecords():
    rec = sr.record.as_dict()
    if rec['ADM0_A3'] == 'ATA': continue
    units.append({'a3': rec['ADM0_A3'], 'sov': rec['SOV_A3'], 'adm': rec['ADMIN'], 'n': rec['NAME'], 'lvl': 0, 'lon': None, 'lat': None, 'km2': 0, 'shp': sr.shape})
a1 = []
for sr in r1.iterShapeRecords():
    rec = sr.record.as_dict()
    if rec['adm0_a3'] == 'ATA': continue
    nm = rec['name_en'] or rec['name'] or rec['gn_name'] or rec['adm1_code']
    a1.append({'a3': rec['adm0_a3'], 'sov': rec['sov_a3'], 'adm': rec['admin'], 'n': nm, 'nm0': rec['name'] or '', 'lvl': 1, 'iso': rec['iso_3166_2'], 'reg': rec['region'] or '',
               'lon': rec['longitude'], 'lat': rec['latitude'], 'km2': rec['area_sqkm'] or 0, 'shp': sr.shape})
a1.sort(key=lambda u: -(u['km2'] or 0)); units += a1
for k, u in enumerate(units): u['px0'] = paint(u['shp'], k)
# units that vanished (smaller than a pixel): stamp their label point if it is not inside a smaller-or-equal unit already
for k, u in enumerate(units):
    if u['lvl'] == 1 and u['lon'] is not None and not (idx == k).any():
        x, y = proj(np.array([u['lon']]), np.array([u['lat']])); x, y = int(x[0]), int(y[0])
        if 0 <= x < W and 0 <= y < H: idx[y, x] = k
elev = np.asarray(Image.open(os.path.join(ROOT, 'grand', 'elev.png')).convert('RGB')).astype(np.float32); elev = elev[..., 0] * 256 + elev[..., 1] - 11000
col = np.asarray(Image.open(os.path.join(ROOT, 'grand', 'color.jpg')).convert('RGB').resize((W, H), Image.BILINEAR)).astype(np.float32)
flat = idx.ravel(); n = len(units); cnt = np.bincount(flat[flat < n], minlength=n)
def mean(v): return np.bincount(flat[flat < n], weights=v.ravel()[flat < n], minlength=n) / np.maximum(cnt, 1)
em = mean(elev); es = np.sqrt(np.maximum(0, mean(elev * elev) - em * em)); cr, cg, cb = (mean(col[..., i]) for i in range(3))
ys, xs = np.divmod(np.arange(W * H), W); mx = mean(xs.astype(np.float32).reshape(H, W)); my = mean(ys.astype(np.float32).reshape(H, W))
rows = []
for k, u in enumerate(units):
    rows.append([u['a3'], u['adm'], u['n'] if u['lvl'] == 0 else (u['n'] + '|' + (u.get('nm0') or '')), u['lvl'], u.get('iso', ''), u.get('reg', ''), round(u['lon'], 3) if u['lon'] is not None else None, round(u['lat'], 3) if u['lat'] is not None else None,
                 round(u['km2']), int(cnt[k]), round(float(em[k])), round(float(es[k])), [round(float(cr[k])), round(float(cg[k])), round(float(cb[k]))], round(float(mx[k]), 1), round(float(my[k]), 1), u['sov']])
os.makedirs(OUT, exist_ok=True)
with gzip.GzipFile(os.path.join(OUT, 'a1.bin.gz'), 'wb', 9, mtime=0) as f: f.write(idx.astype('<u2').tobytes())
json.dump({'w': W, 'h': H, 'cols': 'a3,admin,name|nameNE,level,iso,region,lon,lat,km2,px,elevMean,elevStd,rgb,cx,cy,sov_a3', 'u': rows}, open(os.path.join(OUT, 'a1.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
lm = np.zeros((H, W), np.uint8)
for sh in shapefile.Reader(sys.argv[2]).shapes():
    ps = polys(sh)
    if ps: cv2.fillPoly(lm, ps, 1, lineType=cv2.LINE_8, shift=SUB)
with gzip.GzipFile(os.path.join(OUT, 'land50.bin.gz'), 'wb', 9, mtime=0) as f: f.write(lm.tobytes())
print('units', n, 'land px', int((flat < n).sum()), 'empty a1', sum(1 for k, u in enumerate(units) if u['lvl'] == 1 and cnt[k] == 0))
