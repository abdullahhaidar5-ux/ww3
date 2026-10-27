#!/usr/bin/env python3
"""Build mus/me.mp3 + its slice map: the Middle Eastern instrument sheet.

Loaded by 09-audio.js only when an Iranian, Arab or Shia faction's music starts (IR, SA, AE, EG, RS, DW), so other
nations and phones that never pick these factions don't download it.

Sources (all free licences; credited in the menu credits):
  * Versilian Community Sample Library (VCSL) by Versilian Studios / Sam Gossner, CC0 1.0
    https://github.com/sgossner/VCSL  - darbuka (doum / tek / ka / slap), frame drums (open, muted, hand), claps,
    tambourine (riq jingles), finger cymbals (sagat / zills), clash cymbals (sanj), bass drum (tabl / dammam).
  * FluidR3 GM soundfont by Frank Wen (MIT), rendered by Benjamin Gleitzman's midi-js-soundfonts
    https://github.com/gleitz/midi-js-soundfonts  - hammered dulcimer (santur), shakuhachi (end-blown ney),
    fiddle (kamancheh / rebab), shamisen (Yemeni qanbus: a skin-topped lute).

usage: python3 mus/me_pack.py <download-dir>
  <download-dir>/vcsl/<VCSL path>   and   <download-dir>/gm/<name>-mp3.js   must exist (see SOURCES below).
Writes mus/me.mp3 and prints the ME_META JSON to paste into src/09-audio.js.
"""
import base64, json, os, re, subprocess, sys
import numpy as np

SR = 32000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
V = 'vcsl/'
VD = V + 'Membranophones/Struck Membranophones/'
VI = V + 'Idiophones/Struck Idiophones/'
NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

# key: (kind, source(s), length s, loop?)  kind 'gm' = pitched, one slice per MIDI note; 'hit' = unpitched variants
SOURCES = {
    'san': ('gm', 'dulcimer', [52, 58, 64, 70, 76, 82], 2.0, False),
    'kam': ('gm', 'fiddle', [55, 61, 67, 73, 79], 2.4, True),
    'ney': ('gm', 'shakuhachi', [60, 66, 72, 78], 2.4, True),
    'qnb': ('gm', 'shamisen', [48, 54, 60, 66, 72], 1.5, False),
    'dum': ('hit', [VD + 'Darbuka/Darbuka_1_hit_vl2_rr1.wav', VD + 'Darbuka/Darbuka_1_hit_vl1_rr1.wav'], .8),
    'tek': ('hit', [VD + 'Darbuka/Darbuka_2_hit_vl2_rr1.wav', VD + 'Darbuka/Darbuka_2_hit_vl1_rr2.wav'], .4),
    'ka': ('hit', [VD + 'Darbuka/Darbuka_3_hit_vl2_rr1.wav', VD + 'Darbuka/Darbuka_3_hit_vl1_rr1.wav'], .35),
    'slp': ('hit', [VD + 'Darbuka/Darbuka_4_hit_vl2_rr1.wav'], .45),
    'fdl': ('hit', [VD + 'Frame Drum/HDrumL_Hit_v3_rr1_Sum.wav', VD + 'Frame Drum/HDrumL_Hit_v2_rr1_Sum.wav'], 1.2),
    'fdm': ('hit', [VD + 'Frame Drum/HDrumL_HitMuted_v3_rr1_Sum.wav', VD + 'Frame Drum/HDrumL_HitMuted_v3_rr2_Sum.wav', VD + 'Frame Drum/HDrumL_HitMuted_v2_rr1_Sum.wav'], .5),
    'fds': ('hit', [VD + 'Frame Drum/HDrumS_Hit_v3_rr1_Sum.wav', VD + 'Frame Drum/HDrumS_HitMuted_v3_rr1_Sum.wav'], .7),
    'hnd': ('hit', [VD + 'Frame Drum/HDrumL_Hand_rr1_Sum.wav', VD + 'Frame Drum/HDrumS_Hand_v1_rr1_Sum.wav'], .4),
    'clp': ('hit', [VI + 'Claps/Clap_rr1.wav', VI + 'Claps/Clap_rr3.wav', VI + 'Claps/Clap_rr5.wav', VI + 'Claps/SoloClap_vl3.wav', VI + 'Claps/SoloClap_vl4.wav'], .28),
    'tmb': ('hit', [VI + 'Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav', VI + 'Tambourine 1/Tamb1_Shake_rr2_Mid.wav'], .5),
    'zil': ('hit', [VI + 'Finger Cymbals/Fing_Cymb.wav'], 1.2),
    'snj': ('hit', [VI + 'Clash Cymbals 1/cymbal_crash1_short1.wav', VI + 'Clash Cymbals 1/cymbal_crash1_mf1.wav'], 1.1),
    'bdr': ('hit', [VD + 'Bass Drum 1/BDrumNew_hit_v5_rr1_Sum.wav', VD + 'Bass Drum 1/BDrumNew_hit_v7_rr1_Sum.wav'], 1.2),
}


def decode(data_or_path):
    args = ['ffmpeg', '-v', 'error']
    if isinstance(data_or_path, bytes):
        args += ['-i', 'pipe:0']
    else:
        args += ['-i', data_or_path]
    args += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', 'pipe:1']
    r = subprocess.run(args, input=data_or_path if isinstance(data_or_path, bytes) else None, capture_output=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def gm_note(name, m):
    s = open(os.path.join(DL, 'gm', name + '-mp3.js'), encoding='utf-8').read()
    k = NOTES[m % 12] + str(m // 12 - 1)
    b64 = re.search(r'"' + k + r'":\s*"data:audio/mp3;base64,([^"]+)"', s).group(1)
    return decode(base64.b64decode(b64))


def trim(x, n, fade=.04):
    pk = np.abs(x).max() or 1
    on = int(np.argmax(np.abs(x) > pk * .02))
    on = max(0, on - int(.002 * SR))
    y = x[on:on + int(n * SR)].copy()
    if len(y) < int(n * SR):
        y = np.concatenate([y, np.zeros(int(n * SR) - len(y))])
    f = int(fade * SR)
    y[-f:] *= np.linspace(1, 0, f) ** 2
    return y


def loopify(y, a, b, xf=.25):
    """Make y[a:b] loop seamlessly: crossfade the end of the loop into the audio just before its start."""
    A, B, C = int(a * SR), int(b * SR), int(xf * SR)
    z = y[:B].copy()
    w = np.linspace(0, 1, C)
    z[B - C:B] = y[B - C:B] * np.sqrt(1 - w) + y[A - C:A] * np.sqrt(w)
    return z


def main():
    meta, chunks, pos = {}, [], 0.0
    gap = np.zeros(int(.25 * SR))
    for key, spec in SOURCES.items():
        meta[key] = []
        if spec[0] == 'gm':
            _, name, notes, n, loop = spec
            items = [(m, gm_note(name, m)) for m in notes]
        else:
            _, files, n = spec
            items = [(0, decode(os.path.join(DL, f))) for f in files]
            loop = False
        for m, x in items:
            y = trim(x, n, .02 if loop else .05)
            if loop:
                y = loopify(y, 1.0, n - .02)
            y = y / (np.abs(y).max() or 1) * .9
            r = float(np.sqrt(np.mean(y[:int(min(.5, n) * SR)] ** 2)))
            e = {'m': m, 'o': round(pos + len(gap) / SR, 4), 'n': round(len(y) / SR, 3), 'r': round(r, 3)}
            if loop:
                e['l'] = [1.0, round(len(y) / SR, 3)]
            meta[key].append(e)
            chunks += [gap, y]
            pos += (len(gap) + len(y)) / SR
    chunks.append(gap)
    pcm = np.concatenate(chunks).astype(np.float32)
    out = os.path.join(ROOT, 'mus', 'me.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                    '-c:a', 'libmp3lame', '-b:a', '72k', out], input=pcm.tobytes(), check=True)
    print(f'// {out}: {os.path.getsize(out)} bytes, {pos:.1f} s', file=sys.stderr)
    print(json.dumps(meta, separators=(',', ':')))


if __name__ == '__main__':
    main()
