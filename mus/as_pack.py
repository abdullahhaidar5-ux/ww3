#!/usr/bin/env python3
"""Build mus/as.mp3 + its slice map: the South and East Asian instrument sheet.

Loaded by 09-audio.js only when Pakistan, India, China, North Korea or South Korea's music starts (PK, IN, CN, KP, KR),
so other nations and phones that never pick these factions don't download it.

Sources (all free licences; credited in the menu credits):
  * Versilian Community Sample Library (VCSL) by Versilian Studios / Sam Gossner, CC0 1.0  https://github.com/sgossner/VCSL
      Dan Tranh (Vietnamese 16-string zither, plucked and with left-hand vibrato: our guzheng / gayageum), large gong
      (jing / Chinese tam-tam), small gong, clash cymbals, rope-tension snare (plain, snares off, stick), bass drums,
      low tom (janggu kung side), claps, finger cymbals (manjira), woodblock.
  * Freesound (https://freesound.org), recordings of the real instruments:
      sankalp - "Tabla individual bols 1" (#153268, CC BY 4.0): dayan na / tin, bayan ge
      afleetingspeck - "Tabla Rhythm Bayan Tala Kherwa" (#151176, CC0): bayan ka (closed slap)
      subodh3012 - "Da_Test01/02" (#345576, #345575, CC0): tabla dha
      Johnnydhol (Johnny Kalsi, The Dhol Foundation) - "DHOL BEAT" (#160426, CC BY 3.0): Punjabi dhol dagga / tilli
      iluppai - "Tanpura in E" (#148850, CC0): tanpura drone
      tarane468 - "#1 Erhu D3" / "009-Erhu-D6" (#569841, #467484, CC0): erhu
      jiemojiemo - "suona" (#514114, CC0): suona
      ajaysm (Ajay Srinivasamurthy, Beijing Opera percussion) - daluo_50, xiaoluo_65, naobo_62, bangu_59, bangu_15
        (#222237, #222361, #222298, #222189, #222145, CC BY 4.0): opera big gong, small gong, cymbals, clapper drum
      sazanami12 - "Temple Blocks (5pcs)" (#863784, CC0): muyu / temple blocks
      cdrk - "gong_0001_[korean]_1_shot_mono" (#18660, CC BY 4.0): small Korean gong (kkwaenggwari)
  * Wikimedia Commons:
      Gorgoroth6669 - "DiZi Chinese Flute Sample" (CC0): dizi
      "Bansuri sample E bass" (public domain, own work): bass bansuri

usage: python3 mus/as_pack.py <download-dir>
  <download-dir>/vcsl/<VCSL path>, <download-dir>/fs/<name>.mp3 and <download-dir>/cm2/<name> must exist (see SOURCES).
Writes mus/as.mp3 and prints the AS_META JSON to paste into src/09-audio.js.
"""
import json, os, subprocess, sys
import numpy as np

SR = 32000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
VZ = 'vcsl/Chordophones/Zithers/Dan Tranh/'
VI = 'vcsl/Idiophones/Struck Idiophones/'
VM = 'vcsl/Membranophones/Struck Membranophones/'
RS = VM + 'Snare Drum, Rope Tension/'

# key: list of (file, start s, length s, expected midi or 0 for unpitched, loop?)
# Dan tranh files are named an octave low (C#3 sounds at MIDI 61); pitched slices are re-measured below.
SOURCES = {
    # --- pitched ---
    'zth': [(VZ + 'Normal/C#3_mf_1.wav', 0, 1.5, 61, 0), (VZ + 'Normal/F#3_mf_1.wav', 0, 1.5, 66, 0), (VZ + 'Normal/B3_mf_1.wav', 0, 1.5, 71, 0),
            (VZ + 'Normal/D#4_mf_1.wav', 0, 1.4, 75, 0), (VZ + 'Normal/G#4_mf_1.wav', 0, 1.3, 80, 0)],
    'zvb': [(VZ + 'Vibrato/C#3_vib_mf_1.wav', 0, 1.9, 61, 0), (VZ + 'Vibrato/B3_vib_mf_1.wav', 0, 1.8, 71, 0)],
    'erh': [('fs/erhu_d3.mp3', 1.25, 2.4, 62, 1), ('fs/erhu_d6.mp3', 0.6, 2.0, 86, 1)],
    'diz': [('cm2/dizi.ogg', 13.30, 1.6, 81, 1), ('cm2/dizi.ogg', 8.26, 1.15, 86, 1)],
    'bns': [('cm2/bansuri.ogg', 19.35, 2.4, 64, 1), ('cm2/bansuri.ogg', 30.10, 2.1, 69, 1), ('cm2/bansuri.ogg', 47.93, 1.3, 71, 1)],
    'sna': [('fs/suona.mp3', 1.2, 1.8, 88, 1)],
    'tnp': [('fs/tanpura_e.mp3', 2.0, 4.6, 39.71, 1)],
    # --- tabla (dayan = right, bayan = left) ---
    'tna': [('fs/tabla_bols_sankalp.mp3', 1.025, .5, 0, 0), ('fs/tabla_bols_sankalp.mp3', 3.105, .5, 0, 0)],
    'ttn': [('fs/tabla_bols_sankalp.mp3', 5.38, .42, 0, 0), ('fs/tabla_bols_sankalp.mp3', 7.94, .42, 0, 0)],
    'tge': [('fs/tabla_bols_sankalp.mp3', 9.45, 1.0, 0, 0)],
    'tka': [('fs/kherwa_bayan.mp3', 2.165, .14, 0, 0), ('fs/kherwa_bayan.mp3', 6.64, .14, 0, 0)],
    'tdh': [('fs/da01.mp3', 0, .5, 0, 0), ('fs/da02.mp3', 0, .5, 0, 0)],
    # --- dhol ---
    'dhb': [('fs/dhol_beat_jk.mp3', 1.025, .23, 0, 0), ('fs/dhol_beat_jk.mp3', 9.21, .23, 0, 0)],
    'dht': [('fs/dhol_beat_jk.mp3', 10.795, .2, 0, 0), ('fs/dhol_beat_jk.mp3', 0.57, .12, 0, 0)],
    'dhh': [('fs/dhol_beat_jk.mp3', 3.755, .23, 0, 0), ('fs/dhol_beat_jk.mp3', 2.39, .22, 0, 0)],
    # --- Chinese opera / war percussion ---
    'dlu': [('fs/daluo.mp3', 0, 1.5, 0, 0)],
    'xlu': [('fs/xiaoluo.mp3', 0, 1.1, 0, 0)],
    'nao': [('fs/naobo.mp3', 0, 1.2, 0, 0)],
    'bgu': [('fs/bangu59.mp3', 0, .2, 0, 0), ('fs/bangu15.mp3', 0, .22, 0, 0)],
    'muy': [('fs/templeblocks.mp3', 3.79, .22, 0, 0), ('fs/templeblocks.mp3', 1.44, .22, 0, 0)],
    'gng': [(VI + 'Gong 1/gong_f.wav', 0, 2.2, 0, 0)],
    # --- Korean (samul) ---
    'kkw': [('fs/korean_gong.mp3', 0, .9, 0, 0)],
    'kng': [(VM + 'Tom 2/Mallet/TomL_HitM_v3_rr1_Mid.wav', 0, .6, 0, 0), (VM + 'Tom 2/Mallet/TomL_HitM_v4_rr2_Mid.wav', 0, .6, 0, 0)],
    'dok': [(RS + 'Low/RopeSnare_low_ns_Main_vl3_rr1.wav', 0, .3, 0, 0), (RS + 'RopeSnare_stick_Main_vl1_rr1.wav', 0, .25, 0, 0)],
    # --- marching band / shared ---
    'snr': [(RS + 'Hi/RopeSnare_hi_sn_Main_vl4_rr1.wav', 0, .45, 0, 0), (RS + 'Hi/RopeSnare_hi_sn_Main_vl2_rr1.wav', 0, .4, 0, 0),
            (RS + 'Hi/RopeSnare_hi_sn_Main_vl1_rr2.wav', 0, .35, 0, 0)],
    'bdm': [(VM + 'Bass Drum 2/bassdrum_hit_f.wav', 0, 1.0, 0, 0), (VM + 'Bass Drum 1/BDrumNew_hit_v5_rr1_Sum.wav', 0, .9, 0, 0)],
    'cym': [(VI + 'Clash Cymbals 2/cymbal_crash2_f1.wav', 0, 1.2, 0, 0)],
    'clp': [(VI + 'Claps/Clap_rr1.wav', 0, .25, 0, 0), (VI + 'Claps/Clap_rr3.wav', 0, .25, 0, 0)],
    'mnj': [(VI + 'Finger Cymbals/Fing_Cymb.wav', 0, .9, 0, 0)],
}


def decode(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', 'pipe:1'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def pitch(y, exp):
    """median f0 (as MIDI) of a slice, searched within +-4 semitones of the expected note (YIN difference function)."""
    lo, hi = 440 * 2 ** ((exp - 4 - 69) / 12), 440 * 2 ** ((exp + 4 - 69) / 12)
    tmin, tmax = int(SR / hi), int(SR / lo) + 1
    W = 2048
    out = []
    for s in range(int(.15 * SR), len(y) - W - tmax, 1024):
        a = y[s:s + W]
        d = np.array([np.sum((a - y[s + t:s + t + W]) ** 2) for t in range(tmin, tmax + 1)])
        k = int(np.argmin(d))
        if 0 < k < len(d) - 1:  # parabolic refinement
            den = d[k - 1] - 2 * d[k] + d[k + 1]
            k = k + (.5 * (d[k - 1] - d[k + 1]) / den if den else 0)
        out.append(69 + 12 * np.log2(SR / (tmin + k) / 440))
    return float(np.median(out)) if out else float(exp)


def trim(x, start, n, onset, fade=.04):
    s = int(start * SR)
    x = x[s:]
    if onset:
        pk = np.abs(x[:int(.3 * SR)]).max() or 1
        on = int(np.argmax(np.abs(x) > pk * .05))
        x = x[max(0, on - int(.002 * SR)):]
    y = x[:int(n * SR)].copy()
    if len(y) < int(n * SR):
        y = np.concatenate([y, np.zeros(int(n * SR) - len(y))])
    f = int(fade * SR)
    y[-f:] *= np.linspace(1, 0, f) ** 2
    if not onset:
        g = int(.01 * SR)
        y[:g] *= np.linspace(0, 1, g)
    return y


def loopify(y, a, b, xf=.25):
    A, B, C = int(a * SR), int(b * SR), int(xf * SR)
    z = y[:B].copy()
    w = np.linspace(0, 1, C)
    z[B - C:B] = y[B - C:B] * np.sqrt(1 - w) + y[A - C:A] * np.sqrt(w)
    return z


def main():
    meta, chunks, pos = {}, [], 0.0
    gap = np.zeros(int(.18 * SR))
    cache = {}
    for key, items in SOURCES.items():
        meta[key] = []
        for f, st, n, m, loop in items:
            if f not in cache:
                cache[f] = decode(os.path.join(DL, f))
            x = cache[f]
            # sustained notes cut from the middle of a phrase start soft (they loop); hits are cut at their attack
            y = trim(x, st, n, onset=not loop, fade=.02 if loop else .05)
            if m:
                m = round(pitch(y, m), 2) if key != 'tnp' else m
            if loop:
                y = loopify(y, min(.8, n * .4), n - .02)
            y = y / (np.abs(y).max() or 1) * .9
            r = float(np.sqrt(np.mean(y[:int(min(.5, n) * SR)] ** 2)))
            e = {'m': m, 'o': round(pos + len(gap) / SR, 4), 'n': round(len(y) / SR, 3), 'r': round(r, 3)}
            if loop:
                e['l'] = [round(min(.8, n * .4), 3), round(len(y) / SR, 3)]
            meta[key].append(e)
            chunks += [gap, y]
            pos += (len(gap) + len(y)) / SR
    chunks.append(gap)
    pcm = np.concatenate(chunks).astype(np.float32)
    out = os.path.join(ROOT, 'mus', 'as.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                    '-c:a', 'libmp3lame', '-b:a', '72k', out], input=pcm.tobytes(), check=True)
    print(f'// {out}: {os.path.getsize(out)} bytes, {pos:.1f} s', file=sys.stderr)
    print(json.dumps(meta, separators=(',', ':')))


if __name__ == '__main__':
    main()
