#!/usr/bin/env python3
"""Build sfx/: the recorded battlefield sounds (guns, cannons, rockets, explosions, engines, aircraft, ambience).

Writes sfx/sfx.mp3 (one sprite sheet of all one-shot sounds, mono 32 kHz, 80 kbps), sfx/<loop>.mp3 (loops: tank, truck,
helicopter, jet, wind, rain, distant rumble; loaded only when needed) and sfx/manifest.json (clip offsets, sizes, authors,
licences). 09-audio.js fetches sfx.mp3 at the first battle sound; each loop the first time something needs it.
Every clip is cut at its first loud hit, faded out, and peak-normalised; loops are cross-faded so they repeat seamlessly.

Sources (all credited in the menu credits; licences CC0 / CC-BY 3.0, all from opengameart.org):
  * The Free Firearm Sound Library (AK-47, AR-15, SKS, Mosin Nagant, Arisaka, PPSh, Carl Gustav) by Bart (bart), CC0
  * Chaingun, pistol, rifle, shotgun shots and 4 projectile launches by Michel Baradari (apollo-music.de), CC-BY 3.0
  * Cannon fire and Battle at sea by Thimras, CC0
  * Explosions by EZduzziteh, CC0; 2 High Quality Explosions by Michel Baradari, CC-BY 3.0; Big Explosion by Lamoot, CC-BY 3.0
  * Rocket Engine by theMinesAreShakin, CC0
  * Engine-loop heavy vehicle/tank by Nayckron, CC-BY 3.0; Engine Sound by kurt, CC-BY 3.0; Jet Engine Takeoff by dklon, CC-BY 3.0
  * Helicopter SFX by WuxiaScrub, CC0
  * Mild Wind Background Noise by Bashar3A, CC0; AMB Rain Loop 1 by Kresiek The Furry, CC0; Background Rumble Noise by gryc, CC-BY 3.0

usage: python3 sfx/sfx_pack.py <download-dir>   (the extracted downloads; see SRC below for the file names)
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sfx')
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
SR = 32000
B = 'x_bart/Prepared SFX Library/'
# category: [(file, seconds)]   (one-shots: cut at the first loud hit)
SHOTS = {
    'rifle': [(B + 'AK-47/C_27P.wav', 1.1), (B + 'AK-47/C_28P.wav', 1.1), (B + 'AR-15/D_24P.wav', 1.1),
              (B + 'SKS/U_14P.wav', 1.1), (B + 'Mosin Nagant/M_21P.wav', 1.2), (B + 'Arisaka/E_18P.wav', 1.1)],
    'mg': [(B + 'PPSh/P_22P.wav', .9), (B + 'AK-47/C_34P.wav', .9), (B + 'AR-15/D_32P.wav', .9), ('x_shots/shots/cg1.wav', .6)],
    'cannon': [('cannon_fire_0.ogg', 2.2), (B + 'Carl Gustav M45/G_20P.wav', 1.8), (B + 'Carl Gustav M45/G_31P.wav', 1.8)],
    'rocket': [('x_launches/launches/rlaunch.wav', 2.2), ('x_launch/launch/launch.wav', 2.4), ('rocket_engine.001.wav', 2.2)],
    'boomS': [('explosion2.ogg', .65), ('explosions4.ogg', .6), ('x_expq/explosions/explodemini.wav', 1.4), ('explosion3.ogg', 1.6)],
    'boomL': [('explosion1_0.ogg', 3.2), ('x_expq/explosions/explode.wav', 1.7), ('DeathFlash.flac', 3.0)],
}
# loop: (file, start s, length s, peak dB)
LOOPS = {
    'tank': ('x_eng/engine-loop-heavy-pack/OGG/engine_heavy_loop.ogg', 0, 3.9, -6),
    'truck': ('enginehum3.ogg', 2, 8, -9),
    'heli': ('heli_0.ogg', 1, 8, -3),
    'jet': ('engine_takeoff.wav', 0.2, 3.3, -3),
    'wind': ('wind_background_noise_2.wav', 3, 16, -10),
    'rain': ('amb_rain_loop_1.ogg', 2, 14, -10),
    'rumble': ('background_ambience.ogg', 1, 16, -10),
}

def load(f, a=0.0, n=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(a)] + (['-t', str(n)] if n else []) + ['-i', os.path.join(DL, f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, check=True, capture_output=True).stdout, dtype=np.float32).copy()

def enc(x, path, kbps):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', path],
                   input=x.astype(np.float32).tobytes(), check=True)

def shot(f, sec):
    x = load(f, 0, 40)
    pk = np.abs(x).max()
    i = int(np.argmax(np.abs(x) > pk * .4))      # first loud hit (skips handling clicks)
    i = max(0, i - int(.008 * SR))
    y = x[i:i + int(sec * SR)].copy()
    n = len(y); fo = min(n // 2, int(min(.5, sec * .35) * SR))
    y[n - fo:] *= np.linspace(1, 0, fo) ** 2
    y -= y.mean()
    return y * (10 ** (-1 / 20) / max(1e-6, np.abs(y).max()))

def loop(f, a, n, db):
    x = load(f, a, n + 3)
    L = int(n * SR); x = x[:L + int(1.0 * SR)]
    X = int(min(1.0, n / 4) * SR)
    y = x[:L].copy()
    y[:X] = x[:X] * np.linspace(0, 1, X) + x[L:L + X] * np.linspace(1, 0, X) if len(x) >= L + X else y[:X]   # tail fades into the head
    y -= y.mean()
    return y * (10 ** (db / 20) / max(1e-6, np.abs(y).max()))

os.makedirs(OUT, exist_ok=True)
man = {'sr': SR, 'clips': {}, 'loops': {}}
parts, pos, gap = [], 0.0, int(.12 * SR)
for cat, lst in SHOTS.items():
    man['clips'][cat] = []
    for f, sec in lst:
        y = shot(f, sec)
        man['clips'][cat].append([round(pos, 3), round(len(y) / SR, 3)])
        parts += [y, np.zeros(gap, np.float32)]; pos += (len(y) + gap) / SR
enc(np.concatenate(parts), os.path.join(OUT, 'sfx.mp3'), 80)
man['bytes'] = {'sfx.mp3': os.path.getsize(os.path.join(OUT, 'sfx.mp3'))}
for k, (f, a, n, db) in LOOPS.items():
    enc(loop(f, a, n, db), os.path.join(OUT, k + '.mp3'), 64 if k in ('wind', 'rain', 'rumble') else 80)
    man['loops'][k] = round(n, 2); man['bytes'][k + '.mp3'] = os.path.getsize(os.path.join(OUT, k + '.mp3'))
man['credits'] = [
    {'who': 'Bart (bart)', 'what': 'The Free Firearm Sound Library', 'lic': 'CC0'},
    {'who': 'Michel Baradari (apollo-music.de)', 'what': 'Chaingun/rifle shots, 4 projectile launches, 2 High Quality Explosions', 'lic': 'CC-BY 3.0'},
    {'who': 'Thimras', 'what': 'Cannon fire', 'lic': 'CC0'},
    {'who': 'EZduzziteh', 'what': 'Explosions', 'lic': 'CC0'},
    {'who': 'Lamoot', 'what': 'Big Explosion', 'lic': 'CC-BY 3.0'},
    {'who': 'theMinesAreShakin', 'what': 'Rocket Engine', 'lic': 'CC0'},
    {'who': 'Nayckron', 'what': 'Engine-loop heavy vehicle/tank', 'lic': 'CC-BY 3.0'},
    {'who': 'kurt', 'what': 'Engine Sound', 'lic': 'CC-BY 3.0'},
    {'who': 'dklon', 'what': 'Jet Engine Takeoff', 'lic': 'CC-BY 3.0'},
    {'who': 'WuxiaScrub', 'what': 'Helicopter SFX', 'lic': 'CC0'},
    {'who': 'Bashar3A', 'what': 'Mild Wind Background Noise', 'lic': 'CC0'},
    {'who': 'Kresiek The Furry', 'what': 'AMB Rain Loop 1', 'lic': 'CC0'},
    {'who': 'gryc', 'what': 'Background Rumble Noise', 'lic': 'CC-BY 3.0'}]
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print(man['bytes'], sum(man['bytes'].values()))
