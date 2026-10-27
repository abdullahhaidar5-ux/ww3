#!/usr/bin/env python3
"""Build mus/we.mp3 + its slice map: the instrument sheet for the Western, Slavic, Turkish, Israeli and Cuban scores,
and the short US Navy Band anthem excerpts mus/an_<CODE>.mp3.

we.mp3 is loaded by 09-audio.js only when US, Turkey, Israel, Europe, Ukraine, Russia or Cuba's music starts
(TR and IL also load the Middle Eastern sheet me.mp3 for darbuka, frame drum, ney, kanun and kemence). Each anthem
excerpt is loaded only for its own nation.

Sources (all free; credited in the menu credits):
  * Versilian Community Sample Library (VCSL) by Versilian Studios / Sam Gossner, CC0 1.0  https://github.com/sgossner/VCSL
      soprano recorder (staccato: our fife; sustained: the Ukrainian sopilka), folk harp (bandura), strumstick (a
      three-string fretted folk lute: balalaika / domra and the Cuban tres), plucked psaltery (gusli), Kawai grand piano
      (montuno), glockenspiel, tubular bells (church bells), rope-tension field snare (snares on and off, side-stick),
      concert bass drum (davul / band bass drum), clash cymbals (zil), timpani roll (kos), congas (conga, quinto,
      tumba), bongos, claves, guiro, cowbell (cencerro / campana), shaker (maracas), tambourine (bubon jingles).
  * United States Navy Band national-anthem recordings (works of the US federal government: public domain), via
    Wikimedia Commons. Compositions, all public domain: "The Star-Spangled Banner" (John Stafford Smith, d. 1836),
    "Hatikvah" (melody arr. Samuel Cohen, d. 1940), "Shche ne vmerla Ukrainy" (Mykhailo Verbytskyi, d. 1870), the
    Anthem of Europe (Beethoven, "Ode to Joy", 1823; the Navy Band's own arrangement), "La Bayamesa" (Perucho
    Figueredo, d. 1870). Skipped: Turkey's Istiklal Marsi (music by Osman Zeki Ungor, d. 1958: still in copyright in
    Turkey) and Russia's anthem (Alexandrov, 1944; public-domain status rests on a state-symbol exemption, not clear-cut).

usage: python3 mus/we_pack.py <download-dir>
  <download-dir>/vcsl/<VCSL path> and <download-dir>/an/<CODE>.(ogg|mp3) must exist (see SOURCES / ANTHEMS).
Writes mus/we.mp3 and mus/an_<CODE>.mp3 and prints the WE_META JSON to paste into src/09-audio.js.
"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from as_pack import SR, decode, pitch, trim, loopify  # same slicing tools as the Asian sheet

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
A = 'vcsl/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder/'
C = 'vcsl/Chordophones/'
I = 'vcsl/Idiophones/Struck Idiophones/'
M = 'vcsl/Membranophones/Struck Membranophones/'
RS = M + 'Snare Drum, Rope Tension/'

# key: list of (file, start s, length s, expected midi or 0 for unpitched, loop?)
SOURCES = {
    # --- pitched ---
    'fif': [(A + 'Staccato/SopRecorder_Stac_C5_rr1_Main.wav', 0, .4, 72, 0), (A + 'Staccato/SopRecorder_Stac_F#5_rr1_Main.wav', 0, .4, 78, 0),
            (A + 'Staccato/SopRecorder_Stac_A#5_rr1_Main.wav', 0, .4, 82, 0)],
    'sop': [(A + 'Sustain/SopRecorder_Sus_D5_rr1_Main.wav', .3, 1.9, 74, 1), (A + 'Sustain/SopRecorder_Sus_G5_rr1_Main.wav', .3, 1.9, 79, 1)],
    'bnd': [(C + 'Composite Chordophones/Folk Harp/EWHarp_Normal_A#2_v3_RR1.wav', 0, 1.6, 46, 0), (C + 'Composite Chordophones/Folk Harp/EWHarp_Normal_D3_v3_RR1.wav', 0, 1.6, 50, 0),
            (C + 'Composite Chordophones/Folk Harp/EWHarp_Normal_F#3_v3_RR1.wav', 0, 1.5, 54, 0), (C + 'Composite Chordophones/Folk Harp/EWHarp_Normal_A#3_v3_RR1.wav', 0, 1.4, 58, 0),
            (C + 'Composite Chordophones/Folk Harp/EWHarp_Normal_D4_v3_RR1.wav', 0, 1.3, 62, 0)],
    'blk': [(C + 'Composite Chordophones/Strumstick/Finger/Strumstick_Finger_Str2_Main_D3_vl3_rr1.wav', 0, 1.0, 50, 0),
            (C + 'Composite Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_G3_vl3_rr1.wav', 0, 1.0, 55, 0),
            (C + 'Composite Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_C#4_vl3_rr1.wav', 0, .9, 61, 0),
            (C + 'Composite Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_G4_vl3_rr1.wav', 0, .8, 67, 0)],
    'psl': [(C + 'Zithers/Psaltery, Bowed and Plucked/Pluck/BowedPsaltery_C4_Main_Pluck_rr1.wav', 0, 1.3, 60, 0),
            (C + 'Zithers/Psaltery, Bowed and Plucked/Pluck/BowedPsaltery_F#4_Main_Pluck_rr1.wav', 0, 1.2, 66, 0),
            (C + 'Zithers/Psaltery, Bowed and Plucked/Pluck/BowedPsaltery_C5_Main_Pluck_rr1.wav', 0, 1.1, 72, 0)],
    'pno': [(C + 'Zithers/Grand Piano, Kawai/Sustains/GPiano_sus_A#3_v4_rr1_Player.wav', 0, 1.3, 58, 0),
            (C + 'Zithers/Grand Piano, Kawai/Sustains/GPiano_sus_A#4_v3_rr1_Player.wav', 0, 1.2, 70, 0)],
    'glk': [(I + 'Glockenspiel/glock_soft_G5_01.wav', 0, 1.1, 79, 0), (I + 'Glockenspiel/glock_soft_C6_01.wav', 0, 1.0, 84, 0)],
    'bel': [(I + 'Tubular Bells 2/TB_hit_C4_v4_1.wav', 0, 2.8, 60, 0), (I + 'Tubular Bells 2/TB_hit_G4_v4_1.wav', 0, 2.5, 67, 0),
            (I + 'Tubular Bells 2/TB_hit_C5_v4_1.wav', 0, 2.3, 72, 0)],
    # --- field drum, band and mehter percussion ---
    'snr': [(RS + 'Hi/RopeSnare_hi_sn_Main_vl4_rr1.wav', 0, .4, 0, 0), (RS + 'Hi/RopeSnare_hi_sn_Main_vl3_rr1.wav', 0, .35, 0, 0),
            (RS + 'Hi/RopeSnare_hi_sn_Main_vl2_rr1.wav', 0, .3, 0, 0)],
    'rim': [(RS + 'RopeSnare_sidestick_Main_vl2_rr1.wav', 0, .22, 0, 0)],
    'sno': [(RS + 'Low/RopeSnare_low_ns_Main_vl3_rr1.wav', 0, .3, 0, 0)],
    'bdm': [(M + 'Bass Drum 2/bassdrum_hit_f.wav', 0, 1.0, 0, 0), (M + 'Bass Drum 2/bassdrum_hit_mf1.wav', 0, .9, 0, 0)],
    'cym': [(I + 'Clash Cymbals 1/cymbal_crash1_ff2.wav', 0, 1.4, 0, 0)],
    'tro': [(M + 'Timpani 1/Roll/Timpani1_Roll_v3_rr1_Sum.wav', 0, 2.2, 0, 0)],
    'tam': [(I + 'Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav', 0, .4, 0, 0)],
    # --- Afro-Cuban ---
    'cga': [(M + 'Conga/Conga_HitN_v2_rr1_Sum.wav', 0, .45, 0, 0), (M + 'Conga/Quinto_HitN_v2_rr1_Sum.wav', 0, .4, 0, 0),
            (M + 'Conga/Tumba_HitN_v3_rr1_Sum.wav', 0, .5, 0, 0)],
    'cgm': [(M + 'Conga/Conga_HitFM_v2_rr1_Sum.wav', 0, .3, 0, 0), (M + 'Conga/Quinto_HitFM1_v2_rr1_Sum.wav', 0, .3, 0, 0)],
    'bgo': [(M + 'Bongos/BongoH_Hit1_v2_rr1_Mid.wav', 0, .3, 0, 0), (M + 'Bongos/BongoL_Hit1_v2_rr1_Mid.wav', 0, .35, 0, 0),
            (M + 'Bongos/BongoH_HitMuted1_v2_rr1_Mid.wav', 0, .2, 0, 0)],
    'clv': [(I + 'Claves/Claves1_Hit_v2_rr1_Mid.wav', 0, .25, 0, 0)],
    'gui': [(I + 'Guiro/Guiro_Fast_rr1_Mid.wav', 0, .35, 0, 0), (I + 'Guiro/Guiro_Hit_rr1_Mid.wav', 0, .2, 0, 0)],
    'cow': [(I + 'Cowbells/Cowbell1_Hit_v3_rr1_Mid.wav', 0, .45, 0, 0), (I + 'Cowbells/Cowbell1_Muted_v3_rr1_Mid.wav', 0, .2, 0, 0)],
    'mar': [(I + 'Shaker, Small/Mid_ShakerDouble_Down_rr1.wav', 0, .2, 0, 0), (I + 'Shaker, Small/Mid_ShakerDouble_Up_rr1.wav', 0, .2, 0, 0)],
}
# anthem excerpts: nation -> (file, start s, length s)
ANTHEMS = {'US': ('an/US.ogg', 0, 26), 'IL': ('an/IL.ogg', 0, 26), 'UA': ('an/UA.mp3', 0, 26), 'EU': ('an/EU.ogg', 0, 26), 'CU': ('an/CU.ogg', 0, 26)}


def sheet():
    meta, chunks, pos = {}, [], 0.0
    gap = np.zeros(int(.18 * SR))
    cache = {}
    for key, items in SOURCES.items():
        meta[key] = []
        for f, st, n, m, loop in items:
            if f not in cache:
                cache[f] = decode(os.path.join(DL, f))
            y = trim(cache[f], st, n, onset=not loop, fade=.02 if loop else .05)
            if m:
                m = round(pitch(y, m), 2)
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
    out = os.path.join(ROOT, 'mus', 'we.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                    '-c:a', 'libmp3lame', '-b:a', '64k', out], input=pcm.tobytes(), check=True)
    print(f'// {out}: {os.path.getsize(out)} bytes, {pos:.1f} s', file=sys.stderr)
    print(json.dumps(meta, separators=(',', ':')))


def anthems():
    for code, (f, st, n) in ANTHEMS.items():
        src = os.path.join(DL, f)
        if not os.path.exists(src) or os.path.getsize(src) < 50000:
            print(f'// anthem {code}: source missing, skipped', file=sys.stderr)
            continue
        out = os.path.join(ROOT, 'mus', f'an_{code}.mp3')
        # loudness-matched, a short fade in and a long fade out so it can be cut off at any point of the score
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(st), '-t', str(n), '-i', src, '-ac', '1', '-ar', '32000',
                        '-af', f'loudnorm=I=-18:TP=-2:LRA=11,afade=t=in:d=0.05,afade=t=out:st={n - 4}:d=4',
                        '-c:a', 'libmp3lame', '-b:a', '56k', out], check=True)
        print(f'// {out}: {os.path.getsize(out)} bytes', file=sys.stderr)


if __name__ == '__main__':
    sheet()
    anthems()
