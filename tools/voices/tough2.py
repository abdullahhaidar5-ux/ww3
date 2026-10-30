"""'Tougher' unit-voice settings + field-radio chain (2026-10-30, after Abdullah heard the first tough pass: "Tougher.").
Used by orch/vo/render.py (all settings live here so the pass is reproducible).

Versus the first tough pass (render.py tough_radio):
  * deeper: formant-preserving WORLD pitch-down toward a ~90 Hz median (was ~105 Hz, max 2 st) - up to 3 semitones,
    kept only while DNSMOS P.808 stays within 0.25 of the dry take (still natural, not a monster filter)
  * barked: XTTS/Piper/MMS read combat lines faster and hotter (SYN below); take picking weighs toughness x2
  * grittier: harder two-stage compression, more drive with a touch of even harmonics
  * radio: combat lines (attack, base alarm, under fire, war cries) get a tighter 350-3200 Hz band and more 'bite' at
    2 kHz; select/move/ready lines keep a wider 330-3300 Hz band so words stay clear
"""
import numpy as np
from scipy.signal import butter, sosfilt, lfilter

TAG = 'tough2'
# synthesis per mood: XTTS temperature/speed, Piper length_scale, MMS speaking_rate
SYN = dict(
    xtts_temp={'sold': 0.82, 'cry': 0.9, 'grim': 0.74, 'cmd': 0.72},
    xtts_speed={'sold': 1.22, 'cry': 1.2, 'grim': 1.06, 'cmd': 1.14},
    piper_ls={'sold': 0.8, 'cry': 0.8, 'grim': 0.92, 'cmd': 0.88},
    mms_rate={'sold': 1.22, 'cry': 1.2, 'grim': 1.06, 'cmd': 1.12},
)
TOUGH_W = 1.2            # weight of score.tough in take picking (was 0.8; 1.6 picked mumbled takes)
F0_TARGET = {'cry': 88, 'sold': 92, 'cmd': 95, 'grim': 92}   # median Hz the pitch-down aims for
MAX_SEMIS = 3.0
P808_SLACK = 0.25        # max naturalness loss accepted for the pitch-down
CER_SLACK, CER_OK = 0.08, 0.12  # processed take must read back (Whisper) within +0.08 of the dry take, or <= 0.12
# (0.12 / 0.2 cost RS clarity: sheet CER 0.11 -> 0.20; tightened 2026-10-30)
CHAIN = {   # band (Hz), dry full-band share, EQ (Hz, dB, Q)..., compressor stages (thr dB, ratio, att s, rel s), drive, drive mix
    # cry: picked from 4 variants on RS lines (tough 0.97 for all; this one kept P.808 2.77 / CER 0.20 vs 2.64 / 0.30
    # for the hottest) - gritty but words stay clear
    'cry': dict(band=(350, 3200), full=0.08, eq=[(420, 4.0, .8), (2000, 5.0, 1.1)], comp=[(-28, 5, .002, .05), (-12, 3, .001, .02)], drive=2.4, mix=0.55),
    'std': dict(band=(330, 3300), full=0.15, eq=[(400, 4.0, .8), (1900, 3.5, 1.2)], comp=[(-28, 5, .003, .06), (-12, 3, .001, .03)], drive=2.0, mix=0.5),
}
LOUD = -15.5             # active RMS dBFS


def peak(w, f0, gain_db, q, sr):
    A = 10 ** (gain_db / 40); om = 2 * np.pi * f0 / sr; al = np.sin(om) / (2 * q)
    b = [1 + al * A, -2 * np.cos(om), 1 - al * A]; a = [1 + al / A, -2 * np.cos(om), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], w)


def comp(w, thr, ratio, att, rel, sr):
    env = np.zeros_like(w); e = 0.0
    aa, ar = np.exp(-1 / (att * sr)), np.exp(-1 / (rel * sr))
    x = np.abs(w)
    for i in range(len(w)):
        c = aa if x[i] > e else ar
        e = c * e + (1 - c) * x[i]; env[i] = e
    lvl = 20 * np.log10(env / (np.max(env) + 1e-9) + 1e-9)
    return w * 10 ** (np.where(lvl > thr, (thr + (lvl - thr) / ratio) - lvl, 0) / 20)


def semis_for(f0, mood):
    return float(np.clip(12 * np.log2(max(f0, 1) / F0_TARGET[mood]), 0, MAX_SEMIS))


def voice_chain(w, sr, mood):
    """band, EQ, compression, drive, loudness (no noise beds) -> float array"""
    C = CHAIN['cry' if mood == 'cry' else 'std']
    lo, hi = C['band']
    full = sosfilt(butter(2, 140, 'highpass', fs=sr, output='sos'), w)
    band = sosfilt(butter(4, hi, 'lowpass', fs=sr, output='sos'), sosfilt(butter(3, lo, 'highpass', fs=sr, output='sos'), w))
    w = (1 - C['full']) * band + C['full'] * full
    for f, g, q in C['eq']:
        w = peak(w, f, g, q, sr)
    for thr, ra, at, re_ in C['comp']:
        w = comp(w, thr, ra, at, re_, sr)
    w = w / (np.max(np.abs(w)) + 1e-9)
    d = C['drive']
    g = np.tanh(d * w + 0.12 * w * w) / np.tanh(d)
    w = C['mix'] * g + (1 - C['mix']) * w
    w = w - np.mean(w)
    act = w[np.abs(w) > 0.02 * np.max(np.abs(w))]
    rms = np.sqrt(np.mean(act ** 2)) if len(act) else 1
    return w * (10 ** (LOUD / 20) / rms)
