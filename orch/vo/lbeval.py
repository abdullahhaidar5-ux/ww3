#!/usr/bin/env python3
"""Whisper read-back of an RS voice set (2026-11-17, voices-lb2): per-clip character error rate with Arabic normalisation
(hamza forms, ta marbuta, alef maqsura, diacritics, punctuation, spaces ignored).
usage: python3 orch/vo/lbeval.py DIR [model]   DIR holds RS.mp3 RS_r.mp3 RS_h.mp3 RS_s.mp3 + the map JSONs + lines/ (phrases.py,
roles_lines.py, radio_lines.py, shout_lines.py as used for that set). Writes DIR/eval-<model>.json and prints a summary."""
import sys, os, json, re, importlib.util, unicodedata
import numpy as np, librosa

def anorm(t):
    t = unicodedata.normalize('NFKC', t)
    t = re.sub('[ً-ْٰـ]', '', t)
    t = re.sub(r'(^|\s)(على\s+(ال)?|ع\s+ال)', r'\1عال', t)   # Lebanese 'عالـ' = 'على الـ' (Whisper writes it out, sometimes without the article)
    t = re.sub('[أإآٱ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي').replace('ء', '')
    t = re.sub(r'[اه](?=\s|$|[^\w])', 'ه', t)   # word-final ta marbuta is said -a/-e: Whisper spells it ه or ا
    return ''.join(ch for ch in t.lower() if not unicodedata.category(ch).startswith(('P', 'Z', 'S', 'M')))

def cer(a, b):
    a, b = anorm(a), anorm(b)
    if not a: return 1.0
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return min(1.0, d[len(b)] / len(a))

def load(path, name):
    s = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m

def clips(D):
    """[(sheet, label, text, t, d)] in sheet order"""
    L = os.path.join(D, 'lines'); out = []
    ph = load(os.path.join(L, 'phrases.py'), 'ph_' + str(abs(hash(D))))
    m = json.load(open(os.path.join(D, 'RS.json')))
    for name, src in (('l', ph.P['RS']), ('c', ph.C['RS'])):
        for k, ent in enumerate(m.get(name, [])):
            texts = src[k] if k < len(src) else []
            for i, (t, d) in enumerate(ent):
                out.append(('RS', f'{name}{k}.{i}', texts[i] if i < len(texts) else '?', t, d))
    for suf, mod in (('_r', 'roles_lines'), ('_h', 'radio_lines'), ('_s', 'shout_lines')):
        R = load(os.path.join(L, mod + '.py'), mod + str(abs(hash(D)))).R['RS']
        m = json.load(open(os.path.join(D, 'RS' + suf + '.json')))
        for role, kinds in m.items():
            for k, ent in enumerate(kinds):
                for i, (t, d) in enumerate(ent):
                    tx = R[role][k]; tx = tx[i] if i < len(tx) else '?'
                    out.append(('RS' + suf, f'{role}{k}.{i}', tx if isinstance(tx, str) else tx[1], t, d))
    return out

if __name__ == '__main__':
    D = sys.argv[1]; mn = sys.argv[2] if len(sys.argv) > 2 else 'large-v3'
    from faster_whisper import WhisperModel
    W = WhisperModel(mn, device='cpu', compute_type='int8', cpu_threads=2)
    aud = {}; res = []; part = os.path.join(D, f'eval-{mn}.part.jsonl')   # resumable: clips already read back are kept
    done = {(x['sheet'], x['id']): x for x in map(json.loads, open(part, encoding='utf-8'))} if os.path.exists(part) else {}
    pf = open(part, 'a', encoding='utf-8')
    for sh, lab, text, t, d in clips(D):
        if (sh, lab) in done: res.append(done[(sh, lab)]); continue
        if sh not in aud: aud[sh], _ = librosa.load(os.path.join(D, sh + '.mp3'), sr=16000)
        a = aud[sh][int(t * 16000):int((t + d) * 16000)]
        segs, _ = W.transcribe(a, language='ar', beam_size=int(os.environ.get('BEAM','1')), vad_filter=False, condition_on_previous_text=False)
        hyp = ''.join(s.text for s in segs).strip(); c = cer(text, hyp)
        res.append(dict(sheet=sh, id=lab, text=text, hyp=hyp, cer=round(c, 3), dur=d)); pf.write(json.dumps(res[-1], ensure_ascii=False) + '\n'); pf.flush()
        print(f'{sh:5} {lab:14} {c:.2f} | {text} -> {hyp}', flush=True)
    json.dump(res, open(os.path.join(D, f'eval-{mn}.json'), 'w'), ensure_ascii=False, indent=0)
    for sh in ('RS', 'RS_r', 'RS_h', 'RS_s', None):
        r = [x['cer'] for x in res if sh is None or x['sheet'] == sh]
        if r: print(f'{sh or "ALL":5} n={len(r):3} mean CER {np.mean(r):.3f} median {np.median(r):.3f} >15%: {sum(c > .15 for c in r)}')
