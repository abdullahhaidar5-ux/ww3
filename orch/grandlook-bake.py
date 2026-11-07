#!/usr/bin/env python3
"""grandlook bake: Natural Earth HYP_HR_SR_OB_DR (public domain) -> grand/color.jpg (world 4096x2048) + grand/hi_me.jpg (Middle East tile).
Same lon/lat -> map projection as orch/look1-bake.py.   python3 -I orch/grandlook-bake.py HYP_HR_SR_OB_DR.tif OUTDIR"""
import sys, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1:3]
LX = [(-180,10),(-130,40),(-60,400),(-12,470),(70,1450),(90,1650),(120,1900),(145,2200),(180,2370)]
LY = [(75,40),(50,250),(10,700),(-10,820),(-45,1130),(-60,1180)]
def inv(tab, v):
    xs = np.array([t[1] for t in tab], float); ds = np.array([t[0] for t in tab], float)
    if xs[0] > xs[-1]: xs, ds = xs[::-1], ds[::-1]
    r = np.interp(v, xs, ds)
    r = np.where(v < xs[0], ds[0] + (v - xs[0]) * (ds[1]-ds[0])/(xs[1]-xs[0]), r)
    return np.where(v > xs[-1], ds[-1] + (v - xs[-1]) * (ds[-1]-ds[-2])/(xs[-1]-xs[-2]), r)
im = np.asarray(Image.open(src).convert('RGB'))
H0, W0 = im.shape[:2]
def tile(x0, x1, y0, y1, W, H, interp):
    x = x0 + (np.arange(W) + .5) / W * (x1 - x0); y = y0 + (np.arange(H) + .5) / H * (y1 - y0)
    lon = np.clip(inv(LX, x), -180, 180); lat = np.clip(inv(LY, y), -90, 90)
    LON, LAT = np.meshgrid(lon, lat)
    px = ((LON + 180) / 360 * W0 - .5).astype(np.float32); py = ((90 - LAT) / 180 * H0 - .5).astype(np.float32)
    return cv2.remap(im, px, py, interp, borderMode=cv2.BORDER_REPLICATE)
small = cv2.resize(im, (8192, 4096), interpolation=cv2.INTER_AREA)
im_full = im; im = small; H0, W0 = 4096, 8192
Image.fromarray(tile(0, 2400, 0, 1200, 4096, 2048, cv2.INTER_AREA)).save(f'{out}/color.jpg', quality=84, optimize=True, progressive=True)
im = im_full; H0, W0 = im.shape[:2]
ME = (860, 1420, 300, 700)   # map units x0,x1,y0,y1 (lon ~24-70E, lat ~44-10N)
Image.fromarray(tile(*ME, 4096, 2926, cv2.INTER_CUBIC)).save(f'{out}/hi_me.jpg', quality=86, optimize=True, progressive=True)
print('ok')
