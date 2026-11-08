#!/usr/bin/env python3
"""grandlook bake (Equal Earth map, realmap 2026-11-07): Natural Earth HYP_HR_SR_OB_DR (public domain) -> grand/color.jpg (world 4096x2048) + grand/hi_me.jpg (Middle East tile).
Same lon/lat -> map projection as orch/look1-bake.py.   python3 -I orch/grandlook-bake.py HYP_HR_SR_OB_DR.tif OUTDIR"""
import sys, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1:3]
S, CX, CY = 441, 1200, 646   # orch/grandproj.mjs (Equal Earth)
A1, A2, A3, A4, M = 1.340264, -0.081106, 0.000893, 0.003796, np.sqrt(3) / 2
def unproj(X, Y):
    x = (X - CX) / S; y = (CY - Y) / S; th = y.copy()
    for _ in range(10):
        t2 = th * th; t6 = t2 ** 3; th = th - (th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y) / (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))
    ok = np.abs(th) <= np.arcsin(M); th = np.clip(th, -np.arcsin(M), np.arcsin(M)); t2 = th * th; t6 = t2 ** 3
    lam = M * x * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)) / np.cos(th); ok &= np.abs(lam) <= np.pi + 1e-9
    return np.degrees(np.clip(lam, -np.pi, np.pi)), np.degrees(np.arcsin(np.clip(np.sin(th) / M, -1, 1))), ok
im = np.asarray(Image.open(src).convert('RGB'))
H0, W0 = im.shape[:2]
def tile(x0, x1, y0, y1, W, H, interp):
    X, Y = np.meshgrid(x0 + (np.arange(W) + .5) / W * (x1 - x0), y0 + (np.arange(H) + .5) / H * (y1 - y0))
    LON, LAT, ok = unproj(X, Y); LAT = np.clip(LAT, -84.9, 84.9)
    px = ((LON + 180) / 360 * W0 - .5).astype(np.float32); py = ((90 - LAT) / 180 * H0 - .5).astype(np.float32)
    r = cv2.remap(im, px, py, interp, borderMode=cv2.BORDER_REPLICATE)
    r[~ok | (LAT < -59.5)] = im[H0 // 2, int(W0 * 30 / 360)]
    return r
full = im; im = cv2.resize(full, (8192, 4096), interpolation=cv2.INTER_AREA); H0, W0 = 4096, 8192
Image.fromarray(tile(0, 2400, 0, 1200, 4096, 2048, cv2.INTER_AREA)).save(f'{out}/color.jpg', quality=84, optimize=True, progressive=True)
im = full; H0, W0 = im.shape[:2]
gx, gy = np.meshgrid(np.arange(0, 2400, 4.), np.arange(0, 1200, 4.)); lo, la, ok = unproj(gx, gy)
sel = ok & (lo > 23) & (lo < 71) & (la > 9) & (la < 45)
x0, x1, y0, y1 = gx[sel].min(), gx[sel].max() + 4, gy[sel].min(), gy[sel].max() + 4
W = 4096; H = int(round(W * (y1 - y0) / (x1 - x0))); H = min(H, 4096)
Image.fromarray(tile(x0, x1, y0, y1, W, H, cv2.INTER_CUBIC)).save(f'{out}/hi_me.jpg', quality=86, optimize=True, progressive=True)
print('ME rect uv', x0 / 2400, y0 / 1200, (x1 - x0) / 2400, (y1 - y0) / 1200, 'size', W, H)
