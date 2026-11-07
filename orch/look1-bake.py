#!/usr/bin/env python3
"""look1 bake: real geography for the grand map -> grand/*.png|jpg  (Abdullah 2026-11-06 "$60 studio game").
Sources (public domain / open data, credited in the menu credits):
  elevation + bathymetry: Mapzen/AWS "Terrarium" terrain tiles (ETOPO1, GEBCO, SRTM, NED...) https://registry.opendata.aws/terrain-tiles/
  colour:                 Natural Earth I with shaded relief & water (public domain) naturalearthdata.com
Both are warped with the SAME Equal Earth lon/lat -> map projection as orch/grandproj.mjs (realmap 2026-11-07) so they line up with the provinces.
  python3 orch/look1-bake.py TILES_DIR(zoom 5 terrarium, files Y_X.png as 'x_y') NE1.tif OUTDIR
Outputs: grand/elev.png (2400x1200 RGB, R=hi G=lo of metres+11000, B unused), grand/color.jpg (4096x2048)."""
import sys, os, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
tiles, ne, out = sys.argv[1:4]
S, CX, CY = 441, 1200, 646   # orch/grandproj.mjs
A1, A2, A3, A4, M = 1.340264, -0.081106, 0.000893, 0.003796, np.sqrt(3) / 2
def unproj(X, Y):  # map units -> lon/lat (deg) + valid mask (inside the Equal Earth outline)
    x = (X - CX) / S; y = (CY - Y) / S; th = y.copy()
    for _ in range(10):
        t2 = th * th; t6 = t2 ** 3; th = th - (th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y) / (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))
    ok = np.abs(th) <= np.arcsin(M); th = np.clip(th, -np.arcsin(M), np.arcsin(M)); t2 = th * th; t6 = t2 ** 3
    lam = M * x * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)) / np.cos(th); ok &= np.abs(lam) <= np.pi + 1e-9
    return np.degrees(np.clip(lam, -np.pi, np.pi)), np.degrees(np.arcsin(np.clip(np.sin(th) / M, -1, 1))), ok
def grid(W, H):
    x = (np.arange(W) + .5) / W * 2400; y = (np.arange(H) + .5) / H * 1200
    X, Y = np.meshgrid(x, y); lon, lat, ok = unproj(X, Y)
    return lon, np.clip(lat, -84.9, 84.9), ok
# ---- elevation (Terrarium z5, web mercator, rows 5..22)
Z = 5; N = 2 ** Z; T0, T1 = 0, 23
mos = np.zeros(((T1 - T0 + 1) * 256, N * 256), np.float32)
for ty in range(T0, T1 + 1):
    for tx in range(N):
        a = np.asarray(Image.open(f'{tiles}/{ty}_{tx}.png').convert('RGB'), np.float32)
        mos[(ty - T0) * 256:(ty - T0 + 1) * 256, tx * 256:(tx + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
LON, LAT, OK = grid(2400, 1200)
px = (LON + 180) / 360 * N * 256
merc = np.log(np.tan(np.pi / 4 + np.radians(LAT) / 2))
py = (0.5 - merc / (2 * np.pi)) * N * 256 - T0 * 256
el = cv2.remap(mos, px.astype(np.float32), py.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
el = np.where(OK & (LAT > -59.5), el, -4200.)   # outside the world outline / Antarctica (not on the map): open ocean
e16 = np.clip(el + 11000, 0, 65535).astype(np.uint16)
rgb = np.zeros((1200, 2400, 3), np.uint8); rgb[..., 0] = e16 >> 8; rgb[..., 1] = e16 & 255
os.makedirs(out, exist_ok=True)
Image.fromarray(rgb).save(f'{out}/elev.png', optimize=True)
print('elev range', el.min(), el.max())
# ---- colour (Natural Earth I, equirectangular 10800x5400)
im = np.asarray(Image.open(ne).convert('RGB'))
LON, LAT, OK = grid(4096, 2048)
mx = ((LON + 180) / 360 * im.shape[1] - .5).astype(np.float32); my = ((90 - LAT) / 180 * im.shape[0] - .5).astype(np.float32)
col = cv2.remap(im, mx, my, cv2.INTER_AREA if False else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
col[~OK | (LAT < -59.5)] = im[im.shape[0] // 2, int(im.shape[1] * 30 / 360)]   # outside the world outline / Antarctica: mid-Pacific water
Image.fromarray(col).save(f'{out}/color.jpg', quality=84, optimize=True, progressive=True)
print('done', os.path.getsize(f'{out}/elev.png'), os.path.getsize(f'{out}/color.jpg'))
