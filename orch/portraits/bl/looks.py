"""Asset choice per person: skin texture from the MakeHuman packs + tint to the person's tone, hair proxy, etc. Build-time only."""
import os, numpy as np
from PIL import Image
Z = os.environ.get('PACKS', '/tmp/packs')
SK = Z + '/skins02/skins/'
MALE_SKINS = {
 'bronze': 'toigo_light_skin_male_bronze/young_lightskinned_male_diffuse_Bronze.png', 'ginger': 'toigo_light_skin_male_ginger/young_lightskinned_male_diffuse_Ginger.png',
 'freckles': 'toigo_light_skin_male_freckles/young_lightskinned_male_diffuse_Freckles.png', 'aksel': 'mindfront_aksel_skin/Aksel_Skin_diffuse.png',
 'plain': 'toigo_light_skin_male_with_eyeliner/young_lightskinned_male_diffuse_Eyeliner.png', 'old': 'onlytheghosts_old_eurasian_male/old_eurasian_male_diffuse.png',
 'african': 'mindfront_skin_male_african_middleage/skin_male_african_middleage.png'}
SK1 = Z + '/skins01/skins/'
FEM_SKINS = {'bronze': 'toigo_light_skin_female_bronze/young_lightskinned_female_diffuse_Bronze.png', 'natural': 'toigo_light_skin_with_natural_makeup/young_lightskinned_female_diffuse4.png',
 'mid': 'callharvey3d_midtoned_female/harvey_midtoned_female_diffuse.png', 'indian': 'cutoff3d_indian_female_skin/indian_skin2e.png',
 'eur_m': 'onlytheghosts_middle_aged_eurasian_female/middleage_eurasian_female_diffuse.png', 'eur_o': 'onlytheghosts_old_eurasian_female/old_eurasian_female_diffuse.png', 'eur_y': 'onlytheghosts_young_eurasian_female/young_eurasian_female_diffuse.png'}
_mean = {}
def face_mean(path):
    if path not in _mean:
        im = Image.open(path).convert('RGB'); w, h = im.size
        a = np.asarray(im.crop((int(.72 * w), int(.40 * h), int(.92 * w), int(.80 * h))).resize((64, 64))).astype(float) / 255
        _mean[path] = a.reshape(-1, 3).mean(0)
    return _mean[path]
def lin(c): return np.asarray(c, float) ** 2.2
def pick_skin(spec, target_rgb, rng):
    """returns (texture path, linear tint multiplier)"""
    age = spec['body']['age']; af = spec['body']['race'].get('african', 0)
    if spec['body']['gender'] < .5:
        r = spec['body']['race']
        k = 'eur_o' if age > 62 else 'eur_m' if r.get('asian', 0) > .5 else 'mid' if spec['tone'] > .4 else ['natural', 'bronze'][int(rng.integers(0, 2))]
        p = SK1 + FEM_SKINS[k]
        if not os.path.exists(p): return None, None
        m = lin(face_mean(p)); return p, tuple(float(x) for x in np.clip(lin(target_rgb) / np.maximum(m, .02), .35, 1.6))
    if af > .5: k = 'african'
    elif age > 52 and spec['tone'] < .38: k = ['old', 'old', 'freckles', 'bronze'][int(rng.integers(0, 4))]
    elif age > 52: k = ['plain', 'bronze'][int(rng.integers(0, 2))]
    else: k = ['bronze', 'freckles', 'plain', 'bronze', 'ginger'][int(rng.integers(0, 5))]
    if k == 'ginger' and spec['tone'] > .3: k = 'plain'
    p = SK + MALE_SKINS[k]
    if not os.path.exists(p): return None, None
    m = lin(face_mean(p)); t = np.clip(lin(target_rgb) / np.maximum(m, .02), .35, 1.6) * (1 + (rng.random(3) - .5) * np.array([.16, .12, .12]))
    return p, tuple(float(x) for x in t)

def face_mean_rgb(path):
    """mean linear colour of a garment texture (non-black part), used to retarget its colour"""
    im = Image.open(path).convert('RGB'); im.thumbnail((128, 128)); a = np.asarray(im).astype(float) / 255
    return (a ** 2.2).reshape(-1, 3).mean(0)

_tie = {}
def recolor_tie(path, rgb, out_dir):
    """saturated pixels of a suit texture (tie / pocket square / shirt stripes) -> a muted tie colour; others untouched. returns new png path"""
    key = (path, tuple(np.round(rgb, 2)))
    if key in _tie: return _tie[key]
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(float) / 255
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); sat = (mx - mn) / (mx + 1e-6)
    m = np.clip((sat - .28) / .15, 0, 1) * (mx > .12)
    lum = (a[..., :3] * [.3, .59, .11]).sum(-1)[..., None]
    tgt = np.array(rgb)[None, None, :] * (.5 + 1.1 * lum)
    a[..., :3] = a[..., :3] * (1 - m[..., None]) + np.clip(tgt, 0, 1) * m[..., None]
    os.makedirs(out_dir, exist_ok=True); o = os.path.join(out_dir, 'tie_%d.png' % len(_tie)); Image.fromarray((a * 255).astype(np.uint8)).save(o); _tie[key] = o; return o

def recolor_suit(path, jacket, shirt, tie, out_dir, key=None):
    """split a pack suit texture into jacket / shirt / tie islands by luminance+saturation and recolour each (fabric detail kept)"""
    k = (path, tuple(np.round(jacket, 2)), tuple(np.round(shirt, 2)), None if tie is None else tuple(np.round(tie, 2)))
    if k in _tie: return _tie[k]
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(float) / 255; rgb = a[..., :3]
    mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / (mx + 1e-6); lum = (rgb * [.3, .59, .11]).sum(-1)
    tiem = np.clip((sat - .30) / .12, 0, 1) * (mx > .15) * (lum < .85) if tie is not None else np.zeros_like(lum)
    shm = np.clip((lum - .55) / .12, 0, 1) * (1 - tiem)
    jm = np.clip((lum - .03) / .03, 0, 1) * (1 - shm) * (1 - tiem)
    jl = lum[jm > .5]; jmean = jl.mean() if len(jl) else .25
    out = rgb.copy()
    jc = np.array(jacket)[None, None, :] * np.clip(lum / jmean, .45, 1.8)[..., None]
    sc = np.array(shirt)[None, None, :] * np.clip(lum / .85, .6, 1.1)[..., None]
    tl = np.clip(lum / .4, .4, 1.6)[..., None]; tc = (np.array(tie)[None, None, :] if tie is not None else np.zeros(3)) * tl
    out = jc * jm[..., None] + sc * shm[..., None] + tc * tiem[..., None] + rgb * (1 - jm - shm - tiem).clip(0, 1)[..., None]
    a[..., :3] = np.clip(out, 0, 1)
    os.makedirs(out_dir, exist_ok=True); o = os.path.join(out_dir, 'suit_%d.png' % len(_tie)); Image.fromarray((a * 255).astype(np.uint8)).save(o); _tie[k] = o; return o

def skin_for(spec, rng):
    """(texture path, tint) for a spec; first draw of the portrait rng, so the manifest can recompute it"""
    tone = spec['tone']; pale = np.array([.74, .55, .46]); dark = np.array([.30, .19, .14]); mid = np.array([.55, .38, .29])
    tgt = pale + (mid - pale) * min(1, tone * 2) if tone < .5 else mid + (dark - mid) * (tone - .5) * 2
    y = spec.get('yellow', 0.); tgt = np.clip(tgt * (1 - y) + y * tgt * np.array([.98, 1.06, .86]), 0, 1)
    return pick_skin(spec, tgt, rng)
