#!/usr/bin/env python3
"""voices3 (2026-11-17): FR, DE, GB and JP unit voices re-recorded with XTTS-v2 cloned from native male speakers under free
licences (LibriVox public domain, Thorsten-Voice CC0, Mozilla Common Voice CC0 - tools/voices/refs/CREDITS.md), tuned for clarity
(Abdullah rejected the hot/fast 'tough2' Lebanese re-record as robotic/garbled, see orch/HANDOFF-voices-lb2.md):
  * calm sampling: temperature 0.5-0.65, speed ~1.0-1.08, repetition penalty 7, top_p 0.8, top_k 30; no WORLD pitch-down
  * at least 2 seeds per line; more while the best take reads back above 5 % CER, up to 10 seeds while above 15 %;
    a line whose best take is still above 15 % CER is reported as a reject
  * Whisper read-back (faster-whisper int8: medium for ja/he, small for fr/de/en) of every take; character error rate with per-language normalisation
    (Latin: case/punctuation/accents-insensitive; Japanese: both sides turned into UniDic pronunciations with fugashi)
  * light radio chain (wide band, one 3:1 compressor, little drive), read back again after processing (+ the mp3 codec)
Same sheet/map format as orch/vo/render.py (main sheet CODE.mp3, kinds l/c) and orch/vo/roles.py (CODE_r / _h / _s).
usage: python3 orch/vo/v3.py FR [DE GB JP]          (XTTS + Whisper in one process: ~4.5 GB RSS - run alone)
       V3_MED=1 python3 orch/vo/v3.py GB             (recheck: lines Whisper small could not read are read again with medium,
                                                      no new takes; then the sheets are written again)
       python3 orch/vo/v3.py list FR                 (print the jobs)"""
import sys, os, json, re, subprocess, hashlib, time, unicodedata, importlib
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfilt, lfilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools', 'voices'))
SR = 24000
CACHE = os.environ.get('V3_CACHE', '/home/claude/vowork/v3'); os.makedirs(CACHE, exist_ok=True)
REFS = os.path.join(ROOT, 'tools', 'voices', 'refs')
KBPS = '48k'
MAXCER = 0.15
# cast: soldiers (variant i -> SOLD[i % n]) and the commander (unit ready / base attacked / building ready, pilots, leaders, radio)
CAST = json.load(open(os.path.join(HERE, 'cast.json'), encoding='utf-8'))   # FR DE GB JP: clone:fr_/de_/gb_/ja_* (guard v3voice in orch/decisions.mjs)
LANG = {'FR': 'fr', 'DE': 'de', 'GB': 'en', 'JP': 'ja'}
SAYFIX = {   # spoken form for XTTS only (the line text itself is unchanged)
    'GB': [(r"\bSunray\b", 'Sun ray')],
}
# lines a clone kept saying wrong (Whisper medium, every seed above 15 % CER) go to another voice of the same cast
VOICE_OVR = {'FR:l2.0': 'clone:fr_bernard', 'FR_r:inf2.0': 'clone:fr_bernard', 'FR_s:tank2.0': 'clone:fr_lambert',
             'FR_r:navy1.1': 'clone:fr_bernard', 'GB_s:reload2.0': 'clone:gb_clarke',
             'DE_r:tank1.1': 'clone:de_ungerer', 'DE_r:pilot0.1': 'clone:de_ungerer',
             'JP:l6.1': 'clone:ja_cv3', 'JP_r:tank2.0': 'clone:ja_cv1', 'JP_s:rpg2.0': 'clone:ja_cv3'}
LOG = open(os.path.join(CACHE, 'render.log'), 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()

# ---- text normalisation + CER -------------------------------------------------------------------------------------
_KK = None
def norm(t, lang):
    global _KK
    t = unicodedata.normalize('NFKC', t).replace('’', "'")
    if lang == 'ja':   # compare pronunciations (UniDic via fugashi): kanji/kana spelling, particles (へ = e) and long vowels stop counting as errors
        if _KK is None:
            import fugashi; _KK = fugashi.Tagger()
        t = ''.join((w.feature.pron if getattr(w.feature, 'pron', None) not in (None, '*') else w.surface) for w in _KK(t))
        return ''.join(ch for ch in t if not unicodedata.category(ch).startswith(('P', 'Z', 'S')))
    t = t.lower()
    if lang == 'en':
        for a, b in (('armour', 'armor'), ('take-off', 'takeoff'), ("'s", 's'), ('ok', 'okay')):
            t = t.replace(a, b)
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(ch for ch in t if not unicodedata.category(ch).startswith(('M',)))
    return ''.join(ch for ch in t if ch.isalnum())

def cer(ref, hyp, lang):
    a, b = norm(ref, lang), norm(hyp, lang)
    if not a: return 1.0
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return min(1.0, d[len(b)] / len(a))

# ---- synthesis ----------------------------------------------------------------------------------------------------
TEMPS = [0.6, 0.55, 0.65, 0.5, 0.6, 0.55, 0.65, 0.5, 0.7, 0.45]
SPEED = {'sold': 1.06, 'cmd': 1.02, 'grim': 1.0, 'cry': 1.08}
_M = None; _LAT = {}
def model():
    global _M
    if _M is None:
        from xt import model as xm
        _M = xm()
    return _M

def latents(key):
    if key not in _LAT:
        g, e = model().get_conditioning_latents(audio_path=[os.path.join(REFS, key + '.flac')], gpt_cond_len=24, gpt_cond_chunk_len=6, max_ref_length=30)
        _LAT[key] = (g, e)
    return _LAT[key]

def rkey(voice, text, take, mood, lang):
    temp = TEMPS[take % len(TEMPS)]; sp = SPEED[mood]
    return hashlib.sha1(json.dumps(['v3a', voice, lang, text, take, temp, sp], ensure_ascii=False).encode()).hexdigest()[:16], temp, sp

def raw(voice, text, take, mood, lang):
    k, temp, sp = rkey(voice, text, take, mood, lang)
    f = os.path.join(CACHE, k + '.wav')
    if os.path.exists(f):
        return sf.read(f, dtype='float32')[0]
    import torch
    g, e = latents(voice[6:])
    torch.manual_seed(take * 7919 + 101)
    with torch.inference_mode():
        o = model().inference(text, lang, g, e, temperature=temp, speed=sp, repetition_penalty=7.0, length_penalty=1.0,
                              top_p=0.8, top_k=30, enable_text_splitting=False)
    w = np.asarray(o['wav'], dtype=np.float32)
    sf.write(f, w, SR)
    return w

def trim(w):
    _, (a, b) = librosa.effects.trim(w, top_db=34, frame_length=512, hop_length=128)
    a = max(0, a - int(.03 * SR)); b = min(len(w), b + int(.07 * SR))
    w = w[a:b].copy(); f = int(.01 * SR)
    w[:f] *= np.linspace(0, 1, f); w[-f:] *= np.linspace(1, 0, f)
    return w

_W = {}
FORCE = None   # 'medium' while a line that small could not read is checked again (small mishears rare words: Wilco -> We'll go)
MEDOK = os.environ.get('V3_MED') == '1'   # recheck pass (no XTTS in memory): XTTS + two Whisper models do not fit the sandbox's 6.2 GB cap
def wname(lang):   # medium for Japanese and Hebrew; small reads clear French/German/English reliably and ~3x faster here
    return FORCE or os.environ.get('V3_WHISPER') or ('medium' if lang in ('ja', 'he') else 'small')
def whisper(lang):
    n = wname(lang)
    if n not in _W:
        from faster_whisper import WhisperModel
        _W.clear(); _W[n] = WhisperModel(n, device='cpu', compute_type='int8', cpu_threads=2)
    return _W[n]

_RB = None
def readback(w, text, lang):
    global _RB
    rbf = os.path.join(CACHE, 'readback.json')
    if _RB is None: _RB = json.load(open(rbf, encoding='utf-8')) if os.path.exists(rbf) else {}
    a = np.clip(librosa.resample(np.asarray(w, np.float32), orig_sr=SR, target_sr=16000), -1, 1)
    k = hashlib.md5(a.astype(np.float16).tobytes()).hexdigest() + lang + ('' if wname(lang) == 'medium' else wname(lang))
    if k not in _RB:
        segs, _ = whisper(lang).transcribe(np.pad(a, (4000, 4000)), language=lang, beam_size=1, vad_filter=False, condition_on_previous_text=False)
        _RB[k] = ''.join(s.text for s in segs).strip()
        json.dump(_RB, open(rbf, 'w', encoding='utf-8'), ensure_ascii=False)
    return cer(text, _RB[k], lang), _RB[k]

def p808(w):
    try:
        from speechmos import dnsmos
        x = np.clip(librosa.resample(np.asarray(w, np.float32), orig_sr=SR, target_sr=16000), -1, 1)
        return float(dnsmos.run(np.pad(x, (0, max(0, 16000 - len(x)))), 16000)['p808_mos'])
    except Exception:
        return 3.0

# ---- light radio chain (same as voices-lb2) ------------------------------------------------------------------------
def peq(w, f0, g, q):
    A = 10 ** (g / 40); om = 2 * np.pi * f0 / SR; al = np.sin(om) / (2 * q)
    b = [1 + al * A, -2 * np.cos(om), 1 - al * A]; a = [1 + al / A, -2 * np.cos(om), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], w)

def comp(w, thr, ratio, att, rel):
    env = np.zeros_like(w); e = 0.0; aa, ar = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); x = np.abs(w)
    for i in range(len(w)):
        c = aa if x[i] > e else ar; e = c * e + (1 - c) * x[i]; env[i] = e
    lvl = 20 * np.log10(env / (np.max(env) + 1e-9) + 1e-9)
    return w * 10 ** (np.where(lvl > thr, (thr + (lvl - thr) / ratio) - lvl, 0) / 20)

CH = {
    'std': dict(band=(170, 5200), eq=[(2400, 2.5, 1.0), (250, -2.0, 1.0)], comp=(-24, 3, .004, .08), drive=(1.3, .22)),
    'cry': dict(band=(200, 4800), eq=[(2000, 3.0, 1.0), (300, -2.0, 1.0)], comp=(-24, 3.5, .003, .06), drive=(1.6, .3)),
    'mild': dict(band=(150, 6000), eq=[(2400, 1.5, 1.0)], comp=(-22, 2, .005, .1), drive=(1.0, 0)),
}
def chain(w, mode):
    C = CH[mode]; lo, hi = C['band']
    w = sosfilt(butter(4, hi, 'lowpass', fs=SR, output='sos'), sosfilt(butter(3, lo, 'highpass', fs=SR, output='sos'), w))
    for f, g, q in C['eq']:
        w = peq(w, f, g, q)
    w = comp(w, *C['comp']); w = w / (np.max(np.abs(w)) + 1e-9)
    d, mx = C['drive']
    if mx:
        w = mx * np.tanh(d * w) / np.tanh(d) + (1 - mx) * w
    act = w[np.abs(w) > 0.02 * np.max(np.abs(w))]
    rms = np.sqrt(np.mean(act ** 2)) if len(act) else 1
    return (w * (10 ** (-16.5 / 20) / rms)).astype(np.float32)

_GUN = None
def gunbed(n, rng):
    global _GUN
    if _GUN is None:
        man = json.load(open(os.path.join(ROOT, 'sfx', 'manifest.json')))
        g, _ = librosa.load(os.path.join(ROOT, 'sfx', 'sfx.mp3'), sr=SR)
        _GUN = [g[int(a * SR):int((a + d) * SR)] for nm in ('rifle', 'mg') for a, d in man['clips'][nm]]
    bed = np.zeros(n, np.float32); p = int(rng.integers(0, int(.15 * SR)))
    while p < n:
        c = _GUN[int(rng.integers(len(_GUN)))]; c = c[:n - p] * rng.uniform(.5, 1.0)
        bed[p:p + len(c)] += c; p += len(c) + int(rng.uniform(.08, .4) * SR)
    bed = sosfilt(butter(2, [250, 1800], 'bandpass', fs=SR, output='sos'), bed)
    return bed / (np.sqrt(np.mean(bed ** 2)) + 1e-9) * 10 ** (-16.5 / 20) * 10 ** (-24 / 20)

def codec(y):
    a = os.path.join(CACHE, '_c.wav'); b = os.path.join(CACHE, '_c.mp3'); sf.write(a, y, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', KBPS, b], check=True)
    z, _ = librosa.load(b, sr=SR); return z[:len(y)]

def process(w, text, lang, rng, mood, base_cer, gun=False):
    modes = ['cry', 'std', 'mild'] if mood == 'cry' else ['std', 'mild']
    for md in modes:
        y = chain(w, md); c, hyp = readback(codec(y), text, lang)
        if c <= max(base_cer + 0.05, 0.08) or md == modes[-1]:
            break
    nb = lambda n: sosfilt(butter(2, [450, 3500], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))
    pre = int(.06 * SR) if rng.random() < .3 else 0; post = int(.08 * SR)
    out = np.zeros(pre + len(y) + post, np.float32); out[pre:pre + len(y)] = y
    if pre:
        n = nb(pre); n /= np.max(np.abs(n)) + 1e-9; out[:pre] += n * 10 ** (-28 / 20) * np.exp(-np.linspace(0, 5, pre))
    n = nb(len(out)); n /= np.max(np.abs(n)) + 1e-9; out += n * 10 ** (-58 / 20)
    tl = nb(post); tl /= np.max(np.abs(tl)) + 1e-9; out[-post:] += tl * 10 ** (-30 / 20) * np.exp(-np.linspace(0, 6, post))
    if gun:
        out += gunbed(len(out), rng)
    pk = np.max(np.abs(out)); lim = 10 ** (-1 / 20)
    if pk > lim:
        out = np.where(np.abs(out) > lim * .8, np.sign(out) * (lim * .8 + lim * .2 * np.tanh((np.abs(out) - lim * .8) / (lim * .2))), out)
    out[-int(.004 * SR):] *= np.linspace(1, 0, int(.004 * SR))
    return out.astype(np.float32), md, c, hyp

# ---- jobs (same speaker/mood rules as orch/vo/render.py and orch/vo/roles.py) ------------------------------------------
RV0 = {'inf': (0, None), 'elite': (2, 'grim'), 'at': (1, None), 'tank': (1, None), 'veh': (2, None), 'pilot': ('cmd', 'cmd'),
       'navy': (0, 'cmd'), 'eng': (2, None), 'leader': ('cmd', 'cmd')}
def jobs(fac):
    import phrases as ph
    SOLD, CMD = CAST[fac]['sold'], CAST[fac]['cmd']; J = []
    def add(sheet, lab, grp, k, v, text, mood, gun=False):
        say = text.strip().replace('’', "'")
        for a, b in SAYFIX.get(fac, []): say = re.sub(a, b, say)
        if mood == 'cry': say = re.sub(r'[.。]\s*$', '!' if fac != 'JP' else '！', say)
        v = VOICE_OVR.get(sheet + ':' + lab, v)
        J.append(dict(sheet=sheet, lab=lab, grp=grp, k=k, voice=v, text=text, say=say, mood=mood, gun=gun))
    for name, kinds in (('l', ph.P[fac]), ('c', ph.C[fac])):
        for k, texts in enumerate(kinds):
            for i, text in enumerate(texts):
                cry = name == 'c'
                mood = 'cry' if cry or k in (2, 4, 5) else 'cmd' if k in (3, 7) else 'grim' if k == 6 else 'sold'
                v = CMD if (k in (3, 4, 7) and not cry) else SOLD[(i + (k if cry else 0)) % len(SOLD)]
                add(fac, f'{name}{k}.{i}', name, k, v, text, mood, gun=(k == 5 and not cry))
    for mod, suf in (('roles_lines', '_r'), ('radio_lines', '_h'), ('shout_lines', '_s')):
        L = importlib.import_module(mod); R = L.R[fac]
        roles = list(RV0) if suf == '_r' else L.KEYS
        for role in roles:
            slot, mo = RV0[role] if suf == '_r' else (L.RV[role][0], L.RV[role][1])
            for k, texts in enumerate(R[role]):
                for i, text in enumerate(texts):
                    mood = 'cry' if k == 2 else (mo or 'sold')
                    v = CMD if slot == 'cmd' else SOLD[(slot + i) % len(SOLD)]
                    add(fac + suf, f'{role}{k}.{i}', role, k, v, text, mood)
    return J

def expected(say, lang):
    n = len(re.sub(r'[\s\W]', '', say))
    return 0.35 + (0.13 if lang == 'ja' else 0.062) * n

def cuts(w, e):
    """XTTS often babbles after a short line (word, pause, nonsense): the end points of the speech before each pause >= 0.18 s
    that comes after at least 60 % of the expected length are cut candidates"""
    iv = librosa.effects.split(w, top_db=34, frame_length=512, hop_length=128); out = []
    for (a, b), (c, _) in zip(iv[:-1], iv[1:]):
        if (c - b) / SR >= 0.18 and b / SR >= 0.6 * e: out.append(int(b))
    return out[:3]

def clip(j, take, lang, cut=None):
    w = trim(raw(j['voice'], j['say'], take, j['mood'], lang))
    if cut:
        w = w[:cut + int(.07 * SR)].copy(); f = int(.01 * SR); w[-f:] *= np.linspace(1, 0, f)
    return w

def score_take(j, take, lang):
    w = clip(j, take, lang); d = len(w) / SR; e = expected(j['say'], lang)
    c, hyp = readback(w, j['say'], lang); best = (c, hyp, d, 0)
    if d > 1.4 * e + 0.3:   # long take: try cutting the tail babble off
        for k in cuts(w, e):
            wk = clip(j, take, lang, k); ck, hk = readback(wk, j['say'], lang)
            if ck < best[0] - 1e-6 or (ck <= best[0] + 1e-6 and len(wk) / SR < best[2]): best = (ck, hk, len(wk) / SR, k)
    c, hyp, d, k = best
    w = clip(j, take, lang, k)
    bad_len = d > 2.2 * e + 0.6 or d < 0.4 * e
    return dict(cer=round(c, 3), hyp=hyp, dur=round(d, 2), long=bad_len, p808=round(p808(w), 2), cut=k)

def eff(x): return x['cer'] + (1 if x['long'] else 0)

def nation(fac):
    lang = LANG[fac]; J = jobs(fac); t0 = time.time()
    stf = os.path.join(CACHE, f'state_{fac}.json')
    S = json.load(open(stf, encoding='utf-8')) if os.path.exists(stf) else {}
    rep = {}; sheets = {}; maps = {}
    global FORCE
    for n, j in enumerate(J):
        id_ = j['sheet'] + ':' + j['lab'] + ':' + j['say'] + ':' + j['voice']
        sc = S.setdefault(id_, {})
        take = 0; FORCE = S.get('_med', {}).get(id_) if MEDOK else None
        while True:
            if str(take) in sc and sc[str(take)]['long'] and 'cut' not in sc[str(take)]:
                sc[str(take)] = score_take(j, take, lang)   # scored before tail cutting existed
            if str(take) not in sc:
                if MEDOK and not os.path.exists(os.path.join(CACHE, rkey(j['voice'], j['say'], take, j['mood'], lang)[0] + '.wav')): break   # recheck: no new takes
                sc[str(take)] = score_take(j, take, lang)
            best = min(eff(x) for x in sc.values()); take += 1
            if MEDOK and take >= 4 and best > MAXCER and wname(lang) != 'medium':   # small may be mishearing a rare word: medium scores this line
                FORCE = 'medium'; S.setdefault('_med', {})[id_] = 'medium'
                for t in list(sc): sc[t] = score_take(j, int(t), lang)
                best = min(eff(x) for x in sc.values())
            if take < 2 and not (j['sheet'] != fac and best == 0): continue   # main sheet: always 2 seeds; role/radio/shout lines: 1 if it reads back perfectly
            if best <= 0.05: break
            if best <= MAXCER and take >= 4: break
            if take >= 10: break
        json.dump(S, open(stf, 'w', encoding='utf-8'), ensure_ascii=False)
        # among the clearest takes (+3 %), the most natural; then the radio chain (+ codec) is read back, falling back to the next take
        order = sorted(sc, key=lambda t: (eff(sc[t]), -sc[t]['p808']))
        m = eff(sc[order[0]]); first = max((t for t in order if eff(sc[t]) <= m + 0.03), key=lambda t: sc[t]['p808'])
        order = [first] + [t for t in order if t != first]
        rng0 = int(hashlib.md5(id_.encode()).hexdigest()[:8], 16)
        for FORCE in ([FORCE, 'medium'] if MEDOK and wname(lang) != 'medium' else [FORCE]):
            bestr = None
            for t in order[:4]:
                if sc[t]['long'] and t != first: continue
                w = clip(j, int(t), lang, sc[t].get('cut'))
                r = process(w, j['say'], lang, np.random.default_rng(rng0), j['mood'], readback(w, j['say'], lang)[0] if FORCE else sc[t]['cer'], j['gun'])
                if bestr is None or r[2] < bestr[0][2]: bestr = (r, t)
                if r[2] <= MAXCER: break
            if bestr[0][2] <= MAXCER: break
        wm = wname(lang); FORCE = None
        (out, md, c1, h1), t = bestr
        sh = j['sheet']; st = sheets.setdefault(sh, [0.0, []])
        e = [round(st[0], 3), round(len(out) / SR, 3)]; st[1].append(out); st[0] += (len(out) + int(.12 * SR)) / SR
        mp = maps.setdefault(sh, {})
        if sh == fac:
            g = mp.setdefault(j['grp'], [])
            while len(g) <= j['k']: g.append([])
            g[j['k']].append(e)
        else:
            g = mp.setdefault(j['grp'], [[], [], []]); g[j['k']].append(e)
        rep.setdefault(sh, {})[j['lab']] = dict(text=j['text'], say=j['say'], voice=j['voice'], take=int(t), takes=len(sc), cer_raw=sc[t]['cer'],
                                               cer=round(c1, 3), hyp=h1, whisper=wm, p808=sc[t]['p808'], chain=md, dur=round(len(out) / SR, 2))
        log(f'{sh:5} {j["lab"]:13} {j["voice"][6:]:12} take{t}/{len(sc)} cer {sc[t]["cer"]:.2f}->{c1:.2f} {md:4} {len(out)/SR:.2f}s {wm[:3]} | {j["say"]} -> {h1}'
            + ('  <<< REJECT' if c1 > MAXCER else ''))
        if n % 20 == 19: log(f'  {fac}: {n + 1}/{len(J)} lines, {int(time.time() - t0)} s')
    json.dump(rep, open(os.path.join(CACHE, f'report_{fac}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    for sh, (tt, clips) in sheets.items():
        if sh == fac:
            for g in ('l', 'c'):
                while len(maps[sh].setdefault(g, [])) < 8: maps[sh][g].append([])
        gap = np.zeros(int(.12 * SR), np.float32); parts = []
        for c in clips: parts += [c, gap]
        tmp = os.path.join(CACHE, sh + '.sheet.wav'); sf.write(tmp, np.concatenate(parts), SR)
        dst = os.path.join(ROOT, 'vo', sh + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', KBPS, dst], check=True)
        json.dump(maps[sh], open(os.path.join(ROOT, 'tools', 'voices', 'map', sh + '.json'), 'w'), separators=(',', ':'))
        cs = [x['cer'] for x in rep[sh].values()]
        log(f'{sh}: {len(clips)} clips, {tt:.1f} s, {os.path.getsize(dst) // 1024} KB, mean CER {np.mean(cs):.3f}, >15 %: {sum(c > MAXCER for c in cs)}')

if __name__ == '__main__':
    if sys.argv[1] == 'gen':   # XTTS only (no Whisper): 3 seeds per line, +4 for lines whose best take is above 15 % (Japanese:
        # XTTS + Whisper medium do not fit the 6.2 GB cap together, so JP runs gen -> V3_MED=1 score/build -> gen -> ...)
        import gc, ctypes; model(); gc.collect(); ctypes.CDLL('libc.so.6').malloc_trim(0)
        for fac in sys.argv[2:]:
            stf = os.path.join(CACHE, f'state_{fac}.json'); S = json.load(open(stf, encoding='utf-8')) if os.path.exists(stf) else {}
            for j in jobs(fac):
                id_ = j['sheet'] + ':' + j['lab'] + ':' + j['say'] + ':' + j['voice']; sc = S.get(id_, {})
                n = 3 if not sc else (min(10, len(sc) + 4) if min(eff(x) for x in sc.values()) > MAXCER else 0)
                for t in range(n): raw(j['voice'], j['say'], t, j['mood'], LANG[fac])
            log(f'gen {fac} done')
    elif sys.argv[1] == 'list':
        for j in jobs(sys.argv[2]): print(j['sheet'], j['lab'], j['voice'], j['mood'], j['say'])
    else:
        if not MEDOK: model()
        import gc, ctypes; gc.collect(); ctypes.CDLL('libc.so.6').malloc_trim(0)   # XTTS first and give back the checkpoint-load heap: the sandbox's 6.2 GB memory cap OOM-killed XTTS + Whisper otherwise
        for fac in sys.argv[1:]:
            nation(fac)
