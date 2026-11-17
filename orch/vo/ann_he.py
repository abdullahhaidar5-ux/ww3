#!/usr/bin/env python3
"""Hebrew announcer clips (voices3, 2026-11-17): vo/ann_he.mp3 + ANN_OFF.he in src/09d-announcer.js.
Voice: Phonikud (MIT: Hebrew diacritics + stress, phonemes) driving a Piper-format VITS voice trained on SASPEECH ('shaul',
Phonikud TTS checkpoints, non-commercial licence like the SASPEECH data; CLAUDE.md allows Piper/MMS for Hebrew).
Several takes per line (VITS noise seeds / pace); the take Whisper medium reads back best wins; light radio chain like the units.
needs: pip phonikud (github thewh1teagle/phonikud), phonikud-onnx, onnxruntime; models in $PIPER_DIR (default /home/claude/piperv):
phonikud-1.0.int8.onnx (huggingface Phonikud/phonikud-onnx), shaul.onnx + model.config.json (Phonikud/phonikud-tts-checkpoints).
usage: python3 orch/vo/ann_he.py"""
import os, sys, re, json, subprocess, numpy as np, librosa, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import v3
D = os.environ.get('PIPER_DIR', '/home/claude/piperv') + '/'
VOICE = os.environ.get('HE_VOICE', 'shaul')
CFG = json.load(open(D + 'model.config.json'))
_P = None; _S = None
def tts(text, length, noise, noise_w, seed):
    global _P, _S
    import onnxruntime as ort
    from phonikud_onnx import Phonikud
    from phonikud import phonemize
    if _P is None: _P = Phonikud(D + 'phonikud-1.0.int8.onnx'); _S = ort.InferenceSession(D + VOICE + '.onnx', providers=['CPUExecutionProvider'])
    ph = phonemize(_P.add_diacritics(text)); m = CFG['phoneme_id_map']
    ids = m['^'] + m['_']
    for ch in ph:
        if ch in m: ids = ids + m[ch] + m['_']
    ids = ids + m['$']
    np.random.seed(seed)   # VITS noise comes from the onnx graph; seed only changes our pace/noise pick below
    x = np.array([ids], dtype=np.int64)
    o = _S.run(None, {'input': x, 'input_lengths': np.array([x.shape[1]], dtype=np.int64), 'scales': np.array([noise, length, noise_w], dtype=np.float32)})[0]
    w = librosa.resample(o.squeeze().astype(np.float32), orig_sr=22050, target_sr=v3.SR)
    return w, ph
def lines():
    s = open(os.path.join(ROOT, 'src', '09d-announcer.js'), encoding='utf-8').read()
    he = re.search(r"\n he:\{(.*?)\},?\n", s).group(1)
    return dict(re.findall(r"(\w+):'([^']*)'", he))
TAKES = [(1.0, .5, .6), (1.05, .4, .5), (0.95, .55, .7), (1.0, .3, .4), (1.1, .5, .6), (0.92, .4, .5), (1.0, .667, .8), (1.05, .6, .7)]
if __name__ == '__main__':
    L = lines(); off = {}; parts = []; t = 0.0; rep = {}
    for key, text in L.items():
        best = None
        for i, (ln, ns, nw) in enumerate(TAKES):
            w, ph = tts(text, ln, ns, nw, i); w = v3.trim(w)
            c, hyp = v3.readback(w, text, 'he')
            if best is None or c < best[0] - 1e-6 or (abs(c - best[0]) < 1e-6 and v3.p808(w) > best[4]):
                best = (c, hyp, w, i, v3.p808(w))
            if c <= 0.02 and i >= 1: break
        c, hyp, w, i, q = best
        rng = np.random.default_rng(abs(hash(key)) % 2**32)
        out, md, c2, h2 = v3.process(w, text, 'he', rng, 'cmd', c)
        rep[key] = dict(text=text, take=i, cer=round(c, 3), hyp=hyp, cer_radio=round(c2, 3), p808=round(q, 2), dur=round(len(out) / v3.SR, 2))
        print(key, text, '->', hyp, f'take{i} cer {c:.2f} radio {c2:.2f}', flush=True)
        off[key] = [round(t, 3), round(len(out) / v3.SR, 3)]; parts += [out, np.zeros(int(.12 * v3.SR), np.float32)]; t += (len(out) + int(.12 * v3.SR)) / v3.SR
    tmp = os.path.join(v3.CACHE, 'ann_he.wav'); sf.write(tmp, np.concatenate(parts), v3.SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(v3.SR), '-c:a', 'libmp3lame', '-b:a', '48k', os.path.join(ROOT, 'vo', 'ann_he.mp3')], check=True)
    json.dump(rep, open(os.path.join(v3.CACHE, 'report_ann_he.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    js = os.path.join(ROOT, 'src', '09d-announcer.js'); s = open(js, encoding='utf-8').read()
    m = re.search(r'const ANN_OFF=(\{.*?\}\});', s); cur = json.loads(m.group(1)); cur['he'] = off
    s = s[:m.start(1)] + json.dumps(cur, ensure_ascii=False, separators=(',', ':')) + s[m.end(1):]
    open(js, 'w', encoding='utf-8').write(s)
    cs = [r['cer_radio'] for r in rep.values()]
    print(f'ann_he: {len(rep)} lines, {t:.1f} s, mean CER {np.mean(cs):.3f}, >15 %: {sum(c > 0.15 for c in cs)}')
