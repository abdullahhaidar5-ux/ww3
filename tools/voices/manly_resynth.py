#!/usr/bin/env python3
"""Re-synthesize the still-weak voice clips (2026-11-05, Abdullah: "all manly"). For each clip flagged by manly_measure.py
(median F0 > 115 Hz or centroid > 2400 Hz) in vo/CODE.mp3 / CODE_r.mp3 / CODE_h.mp3: find its line (lines modules; Whisper
match when variants were dropped), render a fresh take with the deepest natural male voice of that language (XTTS-v2 studio
speakers; Piper/MMS for uk/he, ranked by an audition: lowest median F0 that still reads back), max 2 takes with Whisper
read-back QC, then the tough2 radio chain (render.tough_radio: formant-kept pitch-down, bite EQ, compression, static) and
manly_fix.fix if still high, loudness matched to the old clip. The sheet is rebuilt (other clips untouched, gaps kept) and the
map JSON gets the new offsets -> run patch_map.py afterwards.
usage: manly_resynth.py MEAS.json CODE        (logs to stdout; audition cache /home/claude/vowork/aud.json)"""
import sys, os, json, re, types, subprocess
import numpy as np, librosa, soundfile as sf, parselmouth, pyloudnorm as pl
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'orch', 'vo')); sys.path.insert(0, HERE)
import render as RN, score as SC, tough2 as T2, manly_fix as MF
import phrases as PH, roles_lines as RLN, radio_lines as RAD
SR = RN.SR; WORK = '/home/claude/vowork'; AUD = WORK + '/aud.json'
XS = ['Damien Black', 'Baldur Sanjin', 'Dionisio Schuyler', 'Viktor Eka', 'Damjan Chapman']
NAT = {'uk': ['piper:uk_UA-mykyta-high', 'piper:uk_UA-oleksa-high', 'mms:ukr'], 'he': ['mms:heb', 'piper:he_IL-saspeech-medium']}
TEST = {'ru': 'Огонь по противнику!', 'es': '¡Fuego a discreción!', 'fr': 'Feu à volonté !', 'de': 'Feuer frei!', 'en': 'Open fire!',
        'ko': '사격 개시!', 'ar': 'افتحوا النار!', 'uk': 'Вогонь по ворогу!', 'he': 'אש על האויב!'}
meter = pl.Meter(SR)

def f0med(w):
    if len(w) < SR * 0.15: return None
    f = parselmouth.Sound(w.astype(np.float64), SR).to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=300).selected_array['frequency']
    f = f[f > 0]; return float(np.median(f)) if len(f) >= 5 else None

def ev(v):  # 'piper:x' -> ('piper','x'); xtts speaker -> ('xtts', name)
    return tuple(v.split(':', 1)) if ':' in v else ('xtts', v)

def readback(w, lang, say):
    w16 = np.clip(librosa.resample(w, orig_sr=SR, target_sr=16000), -1, 1)
    segs, _ = SC._w().transcribe(w16, language={'zh-cn': 'zh'}.get(lang, lang), beam_size=1)
    return SC.cer(say, ''.join(x.text for x in segs))

def audition(lang):
    a = json.load(open(AUD)) if os.path.exists(AUD) else {}
    if lang in a: return a[lang]
    res = []
    for v in NAT.get(lang, XS):
        e, n = ev(v); fs = []; cs = []
        for take, mood in ((0, 'cry'), (1, 'sold')):
            w = RN.trim(RN.synth(e, n, lang, TEST[lang], take, mood)); fs.append(f0med(w) or 300); cs.append(readback(w, lang, TEST[lang]))
        res.append((float(np.mean(fs)) + 150 * max(0, float(np.mean(cs)) - 0.25), v, float(np.mean(fs)), float(np.mean(cs))))
        print('aud', lang, v, round(res[-1][2]), round(res[-1][3], 2), flush=True)
    res.sort(); a[lang] = [r[1] for r in res]
    json.dump(a, open(AUD, 'w'), ensure_ascii=False); return a[lang]

def load(p): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout, dtype=np.float32).copy()

def cues(m):
    def walk(x, path):
        if isinstance(x, list) and len(x) == 2 and all(isinstance(v, (int, float)) for v in x): yield path, x
        elif isinstance(x, list):
            for i, v in enumerate(x): yield from walk(v, path + [i])
        elif isinstance(x, dict):
            for k, v in x.items(): yield from walk(v, path + [k])
    return list(walk(m, []))

def line_for(code, suf, path, m, old):
    """(lang, text, mood, k) of the cue at path; Whisper picks among the variants when the map has fewer cues than lines"""
    lang0 = RN.CAST[code]['lang']
    if suf == '':
        name, k, i = path; src = (PH.P if name == 'l' else PH.C)[code][k]
        mood = 'cry' if name == 'c' or k in (2, 4, 5) else 'cmd' if k in (3, 7) else 'grim' if k == 6 else 'sold'
        kk = -1 if name == 'c' else k
    elif suf == '_r':
        role, k, i = path; src = RLN.R[code][role][k]; mo = RN_RV0[role][1]
        mood = 'cry' if k == 2 else (mo or 'sold'); kk = -1
    else:
        key, k, i = path; src = RAD.R[code][key][k]; mood = 'cry' if k == 2 else 'cmd'; kk = -1
    items = [(it[0], it[1]) if isinstance(it, (tuple, list)) else (lang0, it) for it in src]
    n = len(m[path[0]][path[1]])
    if n == len(items): return items[i] + (mood, kk)
    w16 = np.clip(librosa.resample(old, orig_sr=SR, target_sr=16000), -1, 1)
    hyp = ''.join(x.text for x in SC._w().transcribe(w16, beam_size=1)[0])
    best = min(range(len(items)), key=lambda j: (SC.cer(items[j][1], hyp), abs(j - i)))
    return items[best] + (mood, kk)

RN_RV0 = {'inf': (0, None, 0), 'elite': (2, 'grim', 0), 'at': (1, None, 0), 'tank': (1, None, -4), 'veh': (2, None, 0),
          'pilot': ('cmd', 'cmd', 3), 'navy': (0, 'cmd', 0), 'eng': (2, None, 4), 'leader': ('cmd', 'cmd', 2)}

def render_clip(lang, text, mood, kk, old_lufs, rng):
    say = RN.TRANSLIT.get(text, text)
    if mood == 'cry': say = re.sub(r'[.。]\s*$', '!', say.strip())
    vs = audition(lang)
    exp = 0.35 + 0.075 * len(re.sub(r'\s', '', say)) * (2.2 if lang in ('zh-cn', 'ko') else 1)
    lim = 0.6 if lang == 'ko' else 0.34; takes = []
    for t, v in enumerate(vs[:2]):          # max 2 takes: deepest voice, then the runner-up
        e, n = ev(v); w = RN.trim(RN.synth(e, n, lang, say, t, mood)); d = len(w) / SR
        c = readback(w, lang, say); f = f0med(w) or 200
        ok = c <= lim and d <= max(2.6, 2.0 * exp + .6) and d >= 0.3
        takes.append(((not ok, f + 60 * c), w, v, c, f))
        if ok and f <= 108: break
    takes.sort(key=lambda x: x[0]); _, w, v, c, f = takes[0]
    e = ev(v)[0]; semis = float(np.clip(12 * np.log2(max(f, 1) / T2.F0_TARGET[mood]), 0, 3.0 if e == 'xtts' else 4.0))
    wl = {'zh-cn': 'zh'}.get(lang, lang)
    y = RN.tough_radio(w, rng, k=kk, semis=semis, mood=mood,
                       clear=lambda x: SC.cer(say, ''.join(s.text for s in SC._w().transcribe(np.clip(librosa.resample(np.clip(x.astype(np.float32) / (np.max(np.abs(x)) + 1e-9) * .9, -1, 1), orig_sr=SR, target_sr=16000), -1, 1), language=wl, beam_size=1)[0])))
    f2 = f0med(y); cent = float(np.median(librosa.feature.spectral_centroid(y=y, sr=SR)))
    if (f2 and f2 > MF.F0_MAX) or cent > MF.CENT_MAX:   # still high: the manly_fix post chain
        y, _ = MF.fix(y, f2, cent); y = y.astype(np.float32)
    if old_lufs and old_lufs > -50:
        try: y = y * 10 ** ((old_lufs - meter.integrated_loudness(y)) / 20)
        except Exception: pass
    return np.clip(y, -0.98, 0.98).astype(np.float32), v, c, f, f0med(y)

def main():
    meas = json.load(open(sys.argv[1])); code = sys.argv[2]
    rng = np.random.default_rng(sum(map(ord, code)) + 11)
    for suf in ['', '_r', '_h']:
        name = code + suf; mp = f'{ROOT}/tools/voices/map/{name}.json'; ap = f'{ROOT}/vo/{name}.mp3'
        keys = [k for k in meas if k.split(':')[0] == name and ((meas[k]['f0'] and meas[k]['f0'] > MF.F0_MAX) or meas[k]['cent'] > MF.CENT_MAX)]
        if not keys: continue
        if RN.CAST[code]['eng'] == 'xtts' or code == 'EU':
            from xt import model; model()
        y = load(ap); m = json.load(open(mp)); cl = cues(m); new = {}
        for k in keys:
            path = [int(p) if p.isdigit() else p for p in k.split(':')[1].split('/')]
            o, d = next(x for pth, x in cl if pth == path); old = y[int(o * SR):int((o + d) * SR)]
            lang, text, mood, kk = line_for(code, suf, path, m, old)
            z, v, c, f, f2 = render_clip(lang, text, mood, kk, meas[k].get('lufs'), rng)
            new[(round(o, 3), round(d, 3))] = z
            print(f'{k} {lang} {mood} {v[:16]:16} cer {c:.2f} f0 {meas[k]["f0"] or 0:.0f} -> raw {f:.0f} -> {f2 or 0:.0f} | {text}', flush=True)
        # rebuild the sheet: same order, same gaps, replaced clips may change length
        uniq = sorted({(round(o, 3), round(d, 3)) for _, (o, d) in cl}); out = []; t = 0.0; prev = 0.0; pos = {}
        for o, d in uniq:
            g = max(0.0, o - prev); out.append(np.zeros(int(round(g * SR)), np.float32)); t += len(out[-1]) / SR
            seg = new.get((o, d), y[int(o * SR):int((o + d) * SR)]); pos[(o, d)] = [round(t, 3), round(len(seg) / SR, 3)]
            out.append(seg); t += len(seg) / SR; prev = o + d
        out.append(y[int(prev * SR):])
        def remap(x):
            if isinstance(x, list) and len(x) == 2 and all(isinstance(v, (int, float)) for v in x): return pos[(round(x[0], 3), round(x[1], 3))]
            if isinstance(x, list): return [remap(v) for v in x]
            if isinstance(x, dict): return {kk: remap(v) for kk, v in x.items()}
            return x
        tmp = f'{WORK}/{name}.sheet.wav'; sf.write(tmp, np.concatenate(out), SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '40k' if suf == '' else '36k', ap], check=True)
        json.dump(remap(m), open(mp, 'w'), separators=(',', ':'))
        print(name, 'resynth', len(new), 'of', len(keys), flush=True)
    print('NATION DONE', code, flush=True)

if __name__ == '__main__':
    main()
