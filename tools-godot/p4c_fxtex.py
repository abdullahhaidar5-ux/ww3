# Lane P4c: bakes the browser game's procedural effect textures (src/05-fx3d.js canvas recipes) into godot/tex/fx_*.png
#   python3 tools-godot/p4c_fxtex.py
import numpy as np, math, random
from PIL import Image, ImageDraw
rng = np.random.default_rng(7); random.seed(7)
def vnoise(n, S):
    g = rng.random((S + 1, S + 1)); x = np.linspace(0, S, n, endpoint=False); i = x.astype(int); f = x - i; f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
# particle atlas: 4 cells of 128, 5-octave value noise shaped into a soft puff
at = np.zeros((256, 256))
for cell in range(4):
    f = sum(vnoise(128, S) * (.5 / 2 ** k) for k, S in enumerate([4, 8, 16, 32, 64]))
    yy, xx = np.mgrid[0:128, 0:128]; r = 2 * np.hypot(xx - 63.5, yy - 63.5) / 128
    m = np.maximum(0, 1 - r * r * (1.1 - f * .6)) * np.clip((.92 - r) / .25, 0, 1)
    v = np.clip(f * 1.35 - .18, 0, 1) * m
    at[(cell // 2) * 128:(cell // 2) * 128 + 128, (cell % 2) * 128:(cell % 2) * 128 + 128] = v
Image.fromarray((at * 255).astype(np.uint8), 'L').save('godot/tex/fx_noise.png')
def radial(n, cx, cy, R, stops):
    yy, xx = np.mgrid[0:n, 0:n]; r = np.clip(np.hypot(xx - cx, yy - cy) / R, 0, 1); out = np.zeros((n, n, 4))
    for ch in range(4): out[..., ch] = np.interp(r, [s[0] for s in stops], [s[1][ch] for s in stops])
    return out
def over(dst, src):   # straight-alpha "source over"
    a = src[..., 3:4]; b = dst[..., 3:4]; oa = a + b * (1 - a)
    rgb = np.where(oa > 1e-6, (src[..., :3] * a + dst[..., :3] * b * (1 - a)) / np.maximum(oa, 1e-6), 0)
    return np.concatenate([rgb, oa], -1)
def strokes(n, items):
    im = Image.new('RGBA', (n * 2, n * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im, 'RGBA')
    for it in items: it(d)
    return np.asarray(im.resize((n, n), Image.LANCZOS)).astype(float) / 255
def to_img(a): b = a.copy(); b[..., :3] /= 255; return Image.fromarray((np.clip(b, 0, 1) * 255).astype(np.uint8), 'RGBA')
# scorch
sc = radial(128, 64, 64, 60, [(0, (10, 8, 6, .92)), (.35, (18, 14, 10, .8)), (.7, (30, 24, 16, .35)), (1, (30, 24, 16, 0))])
it = []
for i in range(34):
    a = random.random() * math.tau; r1 = random.uniform(30, 60); w = random.uniform(1, 4); al = random.uniform(.25, .6)
    it.append(lambda d, a=a, r1=r1, w=w, al=al: d.line([(128 + math.cos(a) * 20, 128 + math.sin(a) * 20), (128 + math.cos(a) * r1 * 2, 128 + math.sin(a) * r1 * 2)], fill=(16, 12, 8, int(al * 255)), width=int(w * 2)))
for i in range(40):
    x = random.uniform(20, 236); y = random.uniform(20, 236); s = random.uniform(1, 4) * 2; al = random.uniform(0, .6)
    it.append(lambda d, x=x, y=y, s=s, al=al: d.ellipse([x, y, x + s, y + s], fill=(12, 10, 8, int(al * 255))))
st = strokes(128, it); st[..., :3] *= 255
yy, xx = np.mgrid[0:128, 0:128]; fade = np.clip((62 - np.hypot(xx - 64, yy - 64)) / 10, 0, 1)[..., None]
st[..., 3:4] *= fade
to_img(over(sc, st)).save('godot/tex/fx_scorch.png')
# crater
cr = radial(128, 64, 64, 62, [(0, (34, 26, 18, .95)), (.32, (52, 40, 27, .9)), (.5, (92, 74, 52, .55)), (.62, (150, 126, 92, .6)), (.72, (120, 98, 70, .42)), (1, (120, 98, 70, 0))])
it = []
for i in range(60):
    a = random.random() * math.tau; r0 = random.uniform(36, 44); r1 = r0 + random.uniform(6, 26); col = (70, 55, 38) if random.random() < .5 else (140, 118, 86)
    it.append(lambda d, a=a, r0=r0, r1=r1, col=col: d.line([(128 + math.cos(a) * r0 * 2, 128 + math.sin(a) * r0 * 2), (128 + math.cos(a) * r1 * 2, 128 + math.sin(a) * r1 * 2)], fill=col + (int(random.uniform(.25, .6) * 255),), width=random.choice([2, 3, 4])))
for i in range(70):
    a = random.random() * math.tau; r = random.uniform(10, 60) * 2; s = random.uniform(1, 3) * 2
    it.append(lambda d, a=a, r=r, s=s: d.ellipse([128 + math.cos(a) * r, 128 + math.sin(a) * r, 128 + math.cos(a) * r + s, 128 + math.sin(a) * r + s], fill=(60, 48, 34, int(random.uniform(.2, .7) * 255))))
st = strokes(128, it); st[..., :3] *= 255; st[..., 3:4] *= fade
cr = over(cr, st)
sh = radial(128, 54, 54, 40, [(0, (0, 0, 0, .35)), (1, (0, 0, 0, 0))]); sh[..., 3:4] *= (cr[..., 3:4] > .05)
to_img(over(cr, sh)).save('godot/tex/fx_crater.png')
print('wrote godot/tex/fx_noise.png fx_scorch.png fx_crater.png')
