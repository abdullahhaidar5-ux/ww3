#!/usr/bin/env python3
"""look1 bake: real geography for the grand map -> grand/*.png|jpg  (Abdullah 2026-11-06 "$60 studio game").
Sources (public domain / open data, credited in the menu credits):
  elevation + bathymetry: Mapzen/AWS "Terrarium" terrain tiles (ETOPO1, GEBCO, SRTM, NED...) https://registry.opendata.aws/terrain-tiles/
  colour:                 Natural Earth I with shaded relief & water (public domain) naturalearthdata.com
Both are warped with the SAME lon/lat -> map projection as orch/grand3d-gen.mjs (LX/LY tables) so they line up with the land mask.
  python3 orch/look1-bake.py TILES_DIR(zoom 5 terrarium, files Y_X.png as 'x_y') NE1.tif OUTDIR
Outputs: grand/elev.png (2400x1200 RGB, R=hi G=lo of metres+11000, B unused), grand/color.jpg (4096x2048)."""
import sys, os, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
tiles, ne, out = sys.argv[1:4]
LX = [(-180,10),(-130,40),(-60,400),(-12,470),(70,1450),(90,1650),(120,1900),(145,2200),(180,2370)]
LY = [(75,40),(50,250),(10,700),(-10,820),(-45,1130),(-60,1180)]
def inv(tab, v):  # map unit -> degrees (piecewise linear, extrapolating with the end slopes)
    xs = np.array([t[1] for t in tab], float); ds = np.array([t[0] for t in tab], float)
    if xs[0] > xs[-1]: xs, ds = xs[::-1], ds[::-1]
    r = np.interp(v, xs, ds)
    lo = v < xs[0]; hi = v > xs[-1]
    r = np.where(lo, ds[0] + (v - xs[0]) * (ds[1]-ds[0])/(xs[1]-xs[0]), r)
    r = np.where(hi, ds[-1] + (v - xs[-1]) * (ds[-1]-ds[-2])/(xs[-1]-xs[-2]), r)
    return r
def grid(W, H):
    x = (np.arange(W) + .5) / W * 2400; y = (np.arange(H) + .5) / H * 1200
    lon = np.clip(inv(LX, x), -180, 180); lat = np.clip(inv(LY, y), -60, 75)
    return np.meshgrid(lon, lat)
# ---- elevation (Terrarium z5, web mercator, rows 5..22)
Z = 5; N = 2 ** Z; T0, T1 = 5, 22
mos = np.zeros(((T1 - T0 + 1) * 256, N * 256), np.float32)
for ty in range(T0, T1 + 1):
    for tx in range(N):
        a = np.asarray(Image.open(f'{tiles}/{ty}_{tx}.png').convert('RGB'), np.float32)
        mos[(ty - T0) * 256:(ty - T0 + 1) * 256, tx * 256:(tx + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
LON, LAT = grid(2400, 1200)
px = (LON + 180) / 360 * N * 256
merc = np.log(np.tan(np.pi / 4 + np.radians(LAT) / 2))
py = (0.5 - merc / (2 * np.pi)) * N * 256 - T0 * 256
el = cv2.remap(mos, px.astype(np.float32), py.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
e16 = np.clip(el + 11000, 0, 65535).astype(np.uint16)
rgb = np.zeros((1200, 2400, 3), np.uint8); rgb[..., 0] = e16 >> 8; rgb[..., 1] = e16 & 255
os.makedirs(out, exist_ok=True)
Image.fromarray(rgb).save(f'{out}/elev.png', optimize=True)
print('elev range', el.min(), el.max())
# ---- colour (Natural Earth I, equirectangular 10800x5400)
im = np.asarray(Image.open(ne).convert('RGB'))
LON, LAT = grid(4096, 2048)
mx = ((LON + 180) / 360 * im.shape[1] - .5).astype(np.float32); my = ((90 - LAT) / 180 * im.shape[0] - .5).astype(np.float32)
col = cv2.remap(im, mx, my, cv2.INTER_AREA if False else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
Image.fromarray(col).save(f'{out}/color.jpg', quality=84, optimize=True, progressive=True)
print('done', os.path.getsize(f'{out}/elev.png'), os.path.getsize(f'{out}/color.jpg'))
