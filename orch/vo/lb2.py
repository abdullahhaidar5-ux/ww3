#!/usr/bin/env python3
"""Lebanese (RS) re-record, voices-lb2 (2026-11-17, after Abdullah: "The Lebanese voices are really bad now" - robotic/garbled,
wrong accent or words). Renders vo/RS.mp3, RS_r, RS_h, RS_s + tools/voices/map/RS*.json in the same sheet/map format as
orch/vo/render.py and orch/vo/roles.py, but tuned for clarity instead of 'tough2' grit:
  * XTTS-v2 cloned from clean Lebanese male MASC speakers (tools/voices/refs/lb_story, lb_talk, lb_techc.flac, CC BY 4.0, see refs/CREDITS.md)
  * calm sampling (temperature 0.5-0.65, speed 1.0-1.06; tough2 used 0.82-0.9 / 1.2 which smeared the Arabic)
  * several seeds per line; the take Whisper reads back best wins; a line is re-rendered with more seeds while its
    character error rate (Arabic-normalised, orch/vo/lbeval.py) is above 15 %
  * no WORLD pitch-down (it made the clones sound robotic) and a light radio chain (wide band, one gentle compressor,
    almost no drive), checked again with Whisper after processing
Phased, because XTTS (~3 GB) and Whisper medium (~3 GB) do not fit in one process here:
  python3 orch/vo/lb2.py gen      # XTTS: the missing takes of every line (3 per line, +4 for lines that failed QC)
  python3 orch/vo/lb2.py score    # Whisper: read back every take, mark lines whose best take is above 15 % CER
  (repeat gen/score up to 3 rounds), then
  python3 orch/vo/lb2.py build    # Whisper: pick takes, radio chain + re-check, write the four sheets and their maps"""
import sys, os, json, re, subprocess, hashlib, time
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfilt, lfilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools', 'voices'))
from lbeval import cer
SR = 24000
CACHE = os.environ.get('LB2_CACHE', '/home/claude/vowork/lb2')
os.makedirs(CACHE, exist_ok=True)
SOLD = os.environ.get('LB2_SOLD', 'clone:lb_story,clone:lb_techc,clone:lb_talk').split(',')
CMD = os.environ.get('LB2_CMD', 'clone:lb_story')
MAXCER = 0.15
KBPS = '48k'   # sheets: 48 kbps (36-40 kbps mp3 blurred consonants in read-back)
# spoken form for XTTS where plain spelling keeps coming out wrong (vowel marks; the line text itself is unchanged)
SAY = {'هيهات منّا الذلّة!': 'هَيهات مِنّا الذِّلّة!'}
# lines that read back fine greedily but not in the final sheet check: scored with beam 5 + a dialect prompt (stricter, steadier)
STRICT = set(json.load(open(os.path.join(os.environ.get('LB2_CACHE', '/home/claude/vowork/lb2'), 'strict.json')))) if os.path.exists(os.path.join(os.environ.get('LB2_CACHE', '/home/claude/vowork/lb2'), 'strict.json')) else set()
LOG = open(os.path.join(CACHE, 'render.log'), 'a', encoding='utf-8')
REPORT = os.path.join(CACHE, 'report.json')
REP = json.load(open(REPORT)) if os.path.exists(REPORT) else {}

def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()

# ---- synthesis --------------------------------------------------------------------------------------------------
TEMPS = [0.55, 0.6, 0.5, 0.65, 0.55, 0.6, 0.5, 0.65, 0.7, 0.45]
SPEED = {'sold': 1.03, 'cmd': 1.0, 'grim': 0.98, 'cry': 1.06}

def raw(voice, text, take, mood):
    temp = TEMPS[take % len(TEMPS)]; sp = SPEED[mood]
    k = hashlib.sha1(json.dumps(['lb2v1', voice, text, take, temp, sp], ensure_ascii=False).encode()).hexdigest()[:16]
    f = os.path.join(CACHE, k + '.wav')
    if os.path.exists(f):
        return sf.read(f, dtype='float32')[0]
    from xt import model, clone_latents
    import torch
    m = model(); s = clone_latents(voice[6:])
    torch.manual_seed(take * 7919 + 101)
    with torch.inference_mode():
        o = m.inference(text, 'ar', s['gpt_cond_latent'], s['speaker_embedding'], temperature=temp, speed=sp,
                        repetition_penalty=7.0, length_penalty=1.0, top_p=0.8, top_k=30, enable_text_splitting=False)
    w = np.asarray(o['wav'], dtype=np.float32)
    sf.write(f, w, SR)
    return w

def has(voice, text, take, mood):
    temp = TEMPS[take % len(TEMPS)]; sp = SPEED[mood]
    k = hashlib.sha1(json.dumps(['lb2v1', voice, text, take, temp, sp], ensure_ascii=False).encode()).hexdigest()[:16]
    return os.path.exists(os.path.join(CACHE, k + '.wav'))

def trim(w):
    _, (a, b) = librosa.effects.trim(w, top_db=34, frame_length=512, hop_length=128)
    a = max(0, a - int(.03 * SR)); b = min(len(w), b + int(.07 * SR))
    w = w[a:b].copy(); f = int(.01 * SR)
    w[:f] *= np.linspace(0, 1, f); w[-f:] *= np.linspace(1, 0, f)
    return w

_W = None
def whisper():
    global _W
    if _W is None:
        from faster_whisper import WhisperModel
        _W = WhisperModel(os.environ.get('LB2_WHISPER', 'large-v3'), device='cpu', compute_type='int8', cpu_threads=2)
    return _W

_RB = None
def readback(w, text, strict=False):
    global _RB
    rbf = os.path.join(CACHE, 'readback.json')
    if _RB is None: _RB = json.load(open(rbf, encoding='utf-8')) if os.path.exists(rbf) else {}
    a = np.clip(librosa.resample(np.asarray(w, np.float32), orig_sr=SR, target_sr=16000), -1, 1)
    k = hashlib.md5(a.astype(np.float16).tobytes()).hexdigest() + ('s' if strict else '')
    if k not in _RB and strict:
        segs, _ = whisper().transcribe(a, language='ar', beam_size=5, temperature=0, condition_on_previous_text=False,
                                       initial_prompt='يلّا يا شباب، هلّق، شو بدّك، عالطريق.')
        _RB[k] = ''.join(s.text for s in segs).strip(); json.dump(_RB, open(rbf, 'w', encoding='utf-8'), ensure_ascii=False)
    if k not in _RB:
        segs, _ = whisper().transcribe(a, language='ar', beam_size=1, vad_filter=False, condition_on_previous_text=False)
        _RB[k] = ''.join(s.text for s in segs).strip(); json.dump(_RB, open(rbf, 'w', encoding='utf-8'), ensure_ascii=False)
    hyp = _RB[k]
    return cer(text, hyp), hyp

def p808(w):
    try:
        from speechmos import dnsmos
        x = np.clip(librosa.resample(np.asarray(w, np.float32), orig_sr=SR, target_sr=16000), -1, 1)
        return float(dnsmos.run(np.pad(x, (0, max(0, 16000 - len(x)))), 16000)['p808_mos'])
    except Exception:
        return 3.0

# ---- light radio chain ------------------------------------------------------------------------------------------
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

CH = {   # band, presence EQ, compressor, drive (mix): light - words first
    'std': dict(band=(170, 5200), eq=[(2400, 2.5, 1.0), (250, -2.0, 1.0)], comp=(-24, 3, .004, .08), drive=(1.3, .2)),
    'cry': dict(band=(220, 4600), eq=[(2000, 3.5, 1.0), (300, -2.0, 1.0)], comp=(-24, 3.5, .003, .06), drive=(1.6, .3)),
    'mild': dict(band=(150, 6000), eq=[(2400, 1.5, 1.0)], comp=(-22, 2, .005, .1), drive=(1.0, 0)),
}

def chain(w, mode):
    C = CH[mode]; lo, hi = C['band']
    w = sosfilt(butter(4, hi, 'lowpass', fs=SR, output='sos'), sosfilt(butter(3, lo, 'highpass', fs=SR, output='sos'), w))
    for f, g, q in C['eq']:
        w = peq(w, f, g, q)
    w = comp(w, *C['comp'])
    w = w / (np.max(np.abs(w)) + 1e-9)
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
    """mp3 round trip at the sheet bitrate: strict lines are checked as the game will play them"""
    a = '/tmp/lb2c.wav'; b = '/tmp/lb2c.mp3'; sf.write(a, y, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', KBPS, b], check=True)
    z, _ = librosa.load(b, sr=SR); return z[:len(y)]

def process(w, text, rng, mood, base_cer, gun=False, strict=False):
    modes = ['cry', 'std', 'mild'] if mood == 'cry' else ['std', 'mild']
    for md in modes:
        y = chain(w, md); c, hyp = readback(codec(y) if strict else y, text, strict)
        if c <= max(base_cer + 0.05, 0.10) or md == modes[-1]:
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


# ---- jobs ----------------------------------------------------------------------------------------------------------
RV0 = {'inf': (0, None), 'elite': (2, 'grim'), 'at': (1, None), 'tank': (1, None), 'veh': (2, None), 'pilot': ('cmd', 'cmd'),
       'navy': (0, 'cmd'), 'eng': (2, None), 'leader': ('cmd', 'cmd')}

def jobs():
    """every RS line in sheet order: dict(sheet, lab, grp, k, voice, text, say, mood, gun) - same speaker/mood rules as
    orch/vo/render.py (main sheet) and orch/vo/roles.py (role / radio / shout sheets)"""
    import importlib, phrases as ph
    J = []
    def add(sheet, lab, grp, k, v, text, mood, gun=False):
        say = SAY.get(text.strip(), text.strip())
        if mood == 'cry': say = re.sub(r'[.]\s*$', '!', say)
        J.append(dict(sheet=sheet, lab=lab, grp=grp, k=k, voice=v, text=text, say=say, mood=mood, gun=gun))
    for name, kinds in (('l', ph.P['RS']), ('c', ph.C['RS'])):
        for k, texts in enumerate(kinds):
            for i, text in enumerate(texts):
                cry = name == 'c'
                mood = 'cry' if cry or k in (2, 4, 5) else 'cmd' if k in (3, 7) else 'grim' if k == 6 else 'sold'
                v = CMD if (k in (3, 4, 7) and not cry) else SOLD[(i + (k if cry else 0)) % len(SOLD)]
                add('RS', f'{name}{k}.{i}', name, k, v, text, mood, gun=(k == 5 and not cry))
    for mod, suf in (('roles_lines', '_r'), ('radio_lines', '_h'), ('shout_lines', '_s')):
        L = importlib.import_module(mod); R = L.R['RS']
        roles = ['inf', 'elite', 'at', 'tank', 'veh', 'pilot', 'navy', 'eng', 'leader'] if suf == '_r' else L.KEYS
        for role in roles:
            slot, mo = RV0[role] if suf == '_r' else (L.RV[role][0], L.RV[role][1])
            for k, texts in enumerate(R[role]):
                for i, text in enumerate(texts):
                    mood = 'cry' if k == 2 else (mo or 'sold')
                    v = CMD if slot == 'cmd' else SOLD[(slot + i) % len(SOLD)]
                    add('RS' + suf, f'{role}{k}.{i}', role, k, v, text, mood)
    return J

STATE = os.path.join(CACHE, 'state.json')
def state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {'n': {}, 'sc': {}}
def save(S):
    json.dump(S, open(STATE, 'w'), ensure_ascii=False)
def jl(j): return j['sheet'] + ':' + j['lab']
def jid(j): return j['sheet'] + ':' + j['lab'] + ':' + j['say'] + ':' + j['voice']

def gen(J):
    S = state(); t0 = time.time(); n = 0
    for j in J:
        for take in range(S['n'].get(jid(j), 3)):
            raw(j['voice'], j['say'], take, j['mood']); n += 1
    log(f'gen: {n} takes ready, {int(time.time() - t0)} s')

def score(J):
    S = state(); bad = 0
    for j in J:
        id_ = jid(j); sc = S['sc'].setdefault(id_, {})
        exp = 0.4 + 0.08 * len(re.sub(r'\s', '', j['say']))
        for take in range(S['n'].get(id_, 3)):
            if any(x['cer'] <= 0.08 and not x['long'] for x in sc.values()): break   # a clear take is in hand: skip the rest (Whisper ~10 s a call here)
            if str(take) in sc: continue
            w = trim(raw(j['voice'], j['say'], take, j['mood'])); d = len(w) / SR
            c, hyp = readback(w, j['say'], jl(j) in STRICT)
            sc[str(take)] = dict(cer=round(c, 3), hyp=hyp, dur=round(d, 2), long=d > 2.0 * exp + 0.6 or d < 0.3, p808=round(p808(w), 2))
        save(S)
        b = min(x['cer'] + (1 if x['long'] else 0) for x in sc.values())
        if b > MAXCER:
            bad += 1
            if S['n'].get(id_, 3) < 12: S['n'][id_] = S['n'].get(id_, 3) + 4
            log(f'  QC fail {j["sheet"]} {j["lab"]} best {b:.2f} ({S["n"][id_]} takes next) | {j["say"]}')
    save(S); log(f'score: {bad} lines above {MAXCER:.0%} CER')
    return bad

def pick(sc):
    v = [(x['cer'] + (1 if x['long'] else 0), -x['p808'], int(t)) for t, x in sc.items()]
    m = min(a for a, _, _ in v)
    return min((b, a, t) for a, b, t in v if a <= m + 0.05)[2]   # among the clearest takes (+5 %), the most natural

def build(J):
    S = state(); maps = {}; sheets = {}
    for j in J:
        sh = j['sheet']; id_ = jid(j)
        sc = S['sc'][id_]; first = pick(sc)
        def order():
            yield first
            for t in range(S['n'].get(id_, 3)):   # takes skipped by score()'s early stop are read back now, when needed
                if str(t) not in sc and has(j['voice'], j['say'], t, j['mood']):
                    w = trim(raw(j['voice'], j['say'], t, j['mood'])); c, hyp = readback(w, j['say'], jl(j) in STRICT); d = len(w) / SR
                    exp = 0.4 + 0.08 * len(re.sub(r'\s', '', j['say']))
                    sc[str(t)] = dict(cer=round(c, 3), hyp=hyp, dur=round(d, 2), long=d > 2.0 * exp + 0.6 or d < 0.3, p808=round(p808(w), 2)); save(S)
            yield from sorted((int(t) for t in sc if int(t) != first), key=lambda t: sc[str(t)]['cer'] + (1 if sc[str(t)]['long'] else 0))
        for take in order():   # the radio chain can blur a word: then the next-clearest take gets the chain
            rng = np.random.default_rng(int(hashlib.md5(id_.encode()).hexdigest()[:8], 16))   # per-line noise: reruns hit the read-back cache
            w = trim(raw(j['voice'], j['say'], take, j['mood'])); c0 = sc[str(take)]['cer']
            if sc[str(take)]['long'] and take != first: continue
            r = process(w, j['say'], rng, j['mood'], c0, j['gun'], jl(j) in STRICT)
            if 'bestr' not in locals() or r[2] < bestr[0][2]: bestr = (r, take, c0)
            if r[2] <= MAXCER: break
        (out, md, c1, h1), take, c0 = bestr; del bestr
        st = sheets.setdefault(sh, [0.0, []])
        e = [round(st[0], 3), round(len(out) / SR, 3)]; st[1].append(out); st[0] += (len(out) + int(.12 * SR)) / SR
        mp = maps.setdefault(sh, {})
        if sh == 'RS':
            g = mp.setdefault(j['grp'], [])
            while len(g) <= j['k']: g.append([])
            g[j['k']].append(e)
        else:
            g = mp.setdefault(j['grp'], [[], [], []]); g[j['k']].append(e)
        REP.setdefault(sh, {})[j['lab']] = dict(text=j['text'], voice=j['voice'], take=take, takes=len(S['sc'][id_]), cer_raw=c0, cer=round(c1, 3), hyp=h1,
                                              p808=S['sc'][id_][str(take)]['p808'], chain=md, dur=round(len(out) / SR, 2))
        log(f'{sh:5} {j["lab"]:14} {j["voice"][6:]:6} take{take}/{len(S["sc"][id_])} cer {c0:.2f}->{c1:.2f} {md:4} {len(out)/SR:.2f}s | {j["text"]} -> {h1}')
    json.dump(REP, open(REPORT, 'w'), ensure_ascii=False, indent=0)
    for sh, (t, clips) in sheets.items():
        if sh == 'RS':
            for g in ('l', 'c'):
                while len(maps[sh].setdefault(g, [])) < 8: maps[sh][g].append([])
        gap = np.zeros(int(.12 * SR), np.float32); parts = []
        for c in clips: parts += [c, gap]
        tmp = os.path.join(CACHE, sh + '.sheet.wav'); sf.write(tmp, np.concatenate(parts), SR)
        dst = os.path.join(ROOT, 'vo', sh + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', KBPS, dst], check=True)
        json.dump(maps[sh], open(os.path.join(ROOT, 'tools', 'voices', 'map', sh + '.json'), 'w'), separators=(',', ':'))
        log(f'{sh}: {len(clips)} clips, {t:.1f} s, {os.path.getsize(dst) // 1024} KB')

if __name__ == '__main__':
    J = jobs(); cmd = sys.argv[1]
    if cmd == 'gen':
        from xt import model; model(); gen(J)
    elif cmd == 'score': score(J)
    elif cmd == 'build': build(J)
    elif cmd == 'list':
        for j in J: print(j['sheet'], j['lab'], j['voice'], j['mood'], j['say'])
