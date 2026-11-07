"""Painterly finishing: transparent render -> oil-paint look, warm grade, canvas, vignette, gilded frame. numpy/cv2/PIL only."""
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

def kuwahara(img, r=3):
    """generalised Kuwahara via 4 shifted box windows (fast approximation)"""
    f = img.astype(np.float32); out = np.zeros_like(f); best = np.full(f.shape[:2], 1e9, np.float32)
    k = r + 1
    for dy in (0, -r):
        for dx in (0, -r):
            M = np.float32([[1, 0, dx + r // 2 * 0], [0, 1, dy]]) if False else None
            sh = np.roll(np.roll(f, dy, 0), dx, 1)
            m = cv2.blur(sh, (k, k)); m2 = cv2.blur(sh * sh, (k, k)); v = (m2 - m * m).sum(2)
            sel = v < best; best = np.where(sel, v, best); out[sel] = m[sel]
    return out

def paint(rgba, bg_top, bg_bot, seed=0, size=(336, 420), rim=(1, .9, .75), frame=True, nation=(.5, .5, .5)):
    rng = np.random.default_rng(seed)
    h, w = rgba.shape[:2]
    a = rgba[..., 3:4].astype(np.float32) / 255; fg = rgba[..., :3].astype(np.float32) / 255
    # background: vertical gradient + brushy noise + soft glow behind the head
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); t = yy / h
    bg = np.array(bg_top)[None, None] * (1 - t[..., None]) + np.array(bg_bot)[None, None] * t[..., None]
    glow = np.exp(-(((xx - w * .55) / (w * .55)) ** 2 + ((yy - h * .38) / (h * .5)) ** 2))[..., None]
    bg = bg * (.55 + .75 * glow)
    n = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 14) - .5
    n2 = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 4) - .5
    bg = bg * (1 + (n * .5 + n2 * .35)[..., None])
    comp = fg * a + bg * (1 - a)
    # soften the subject: edge preserving + kuwahara for a painted feel
    c8 = np.clip(comp * 255, 0, 255).astype(np.uint8)
    kw = .35 * kuwahara(c8, 2) / 255.0 + .65 * c8 / 255.0
    det = comp - cv2.GaussianBlur(comp, (0, 0), 1.6)           # keep some fine detail (hair, pores)
    out = kw + det * .35
    # brush-stroke texture: directional noise modulating luminance
    st = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 1.2) - .5
    st = cv2.GaussianBlur(st, (0, 0), sigmaX=5, sigmaY=.9)
    out = out * (1 + (st * .55)[..., None])
    # warm grade: S curve, warm highlights, cool-brown shadows, slight saturation
    out = np.clip(out, 0, 1)
    out = out ** .92
    out = out * np.array([1.025, 1.0, .95])
    g = out.mean(2, keepdims=True); out = g + (out - g) * .98
    out = np.clip(out, 0, 1)
    out = out * out * (3 - 2 * out) * .55 + out * .45
    # vignette
    v = 1 - .55 * (((xx - w / 2) / (w * .62)) ** 2 + ((yy - h * .45) / (h * .66)) ** 2)
    out = out * np.clip(v, .25, 1)[..., None]
    # canvas weave
    wv = (np.sin(xx * 1.9) * np.sin(yy * 1.9)) * .5 + rng.random((h, w)) * .5
    out = out * (1 + (wv - .5)[..., None] * .045)
    im = Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    if frame: im = gild(im, nation)
    return im

def gild(im, nation):
    w, h = im.size; b = max(8, w // 22)
    big = Image.new('RGB', (w, h)); big.paste(im)
    d = ImageDraw.Draw(big)
    gold = [(94, 66, 18), (214, 172, 70), (250, 226, 140), (170, 126, 40), (80, 54, 14)]
    for i, col in enumerate(gold):
        t = b * i // len(gold); u = b * (i + 1) // len(gold)
        d.rectangle([t, t, w - 1 - t, h - 1 - t], outline=col, width=max(1, u - t))
    nc = tuple(int(x * 255) for x in nation)
    d.rectangle([b, b, w - 1 - b, h - 1 - b], outline=tuple(int(c * .55) for c in nc), width=2)
    d.rectangle([b + 2, b + 2, w - 3 - b, h - 3 - b], outline=(20, 14, 6), width=1)
    # inner shadow
    sh = Image.new('L', (w, h), 0); ds = ImageDraw.Draw(sh); ds.rectangle([b + 3, b + 3, w - 4 - b, h - 4 - b], outline=120, width=5)
    sh = sh.filter(ImageFilter.GaussianBlur(5)); dark = Image.new('RGB', (w, h), (10, 6, 2))
    inner = Image.new('L', (w, h), 0); ImageDraw.Draw(inner).rectangle([b + 3, b + 3, w - 4 - b, h - 4 - b], fill=255)
    big = Image.composite(Image.composite(dark, big, sh), big, inner)
    return big
