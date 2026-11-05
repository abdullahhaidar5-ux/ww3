#!/usr/bin/env python3
"""Assemble the WORLD WAR 3 trailer from the frames captured by orch/trailer.mjs.
   python3 orch/trailer.py [--clips] [--audio] [--final]   (default: all)
Frames: orch/shots/tr/<scene>-<shot>/NNNNN.jpg (15 fps, 1280x720) + events.json. Work files: orch/shots/tr/work/.
Output: trailer/ww3-trailer.mp4 + trailer/poster.jpg"""
import json, os, random, subprocess, sys, wave
import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = f'{R}/orch/shots/tr'; W = f'{SH}/work'; os.makedirs(W, exist_ok=True)
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
FONTL = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
if not os.path.exists(FONTL): FONTL = FONT
CAP = 15
URL = 'https://abdullahhaidar5-ux.github.io/ww3/'
MUSIC = ('mus/st/combat-06.mp3', 'Act of War', 'Alexandr Zhelanov', 'CC-BY 3.0')

# (dir, titles [(text, t0, t1, size, y-from-centre)], beds)   duration comes from the number of frames
CLIPS = [
    ('horizon-wide',   [('18 NATIONS', 1.2, 4.6, 120, 0)], ['wind']),
    ('hud-online',     [('CHOOSE YOUR NATION', .3, 2.7, 70, -330)], ['wind']),
    ('horizon-base',   [], ['wind', 'truck']),
    ('horizon-parade', [('WEATHERED  ·  ARMED  ·  READY', .3, 2.4, 54, 300)], ['tank']),
    ('columns-track',  [('MASSIVE ARMIES', .4, 3.7, 120, 0)], ['march']),
    ('columns-clash',  [('FIGHT ONLINE WITH FRIENDS', .3, 3.3, 70, 0)], ['combat']),
    ('columns-air',    [('LAND  ·  SEA  ·  AIR', .2, 2.4, 96, 0)], ['heli', 'jet']),
    ('naval-fleet',    [], ['combat', 'wind']),
    ('naval-strike',   [], ['combat']),
    ('night-wide',     [('NIGHT AND STORM', .3, 3.3, 104, 0)], ['combat']),
    ('night-low',      [], ['combat']),
    ('storm-low',      [], ['wind', 'combat']),
    ('snow-low',       [], ['wind', 'tank']),
    ('fort-bb',        [('MOUNTAIN FORTRESS', .4, 3.4, 90, 0), ('BUNKER BUSTER STRIKE', 2.0, 6.4, 54, 150)], ['rumble']),
    ('camp-m1',        [('CAMPAIGN MISSIONS', .2, 2.4, 78, 0)], ['combat']),
    ('hud-supply',     [('SUPPLY  ·  AMMO  ·  TOWNS', .3, 2.7, 60, -330)], ['combat']),
    ('columns-finale', [('WORLD WAR 3', 1.0, 5.6, 150, 0)], ['combat', 'march']),
]
VOICES = {  # clip -> [(t, fac, kind 'c'|'l', cat, idx, gain)]   c = battle cries (Labbaik ya Hussein for the Shia nations)
    'columns-track': [(.9, 'RS', 'c', 2, 0, 1.0), (2.6, 'DW', 'c', 2, 0, .9)],
    'columns-clash': [(1.2, 'IR', 'c', 2, 0, .9)],
    'fort-bb': [(1.0, 'IR', 'c', 2, 0, .8)],
    'columns-finale': [(2.0, 'RS', 'c', 2, 1, .9), (3.2, 'DW', 'c', 2, 0, .9), (4.4, 'RU', 'c', 2, 0, .8), (5.4, 'US', 'c', 2, 0, .8)],
}

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); raise SystemExit(cmd[:200])
    return r.stdout

def capfps(d):
    p = f'{SH}/{d}/meta.json'
    return json.load(open(p))['fps'] if os.path.exists(p) else CAP

def nframes(d): return len([f for f in os.listdir(f'{SH}/{d}') if f.endswith('.jpg')])

def drawtext(items, dur):
    out = []
    for (txt, a, b, size, y) in items:
        b = min(b, dur - .1)
        al = f"if(lt(t\\,{a})\\,0\\,if(lt(t\\,{a+.35})\\,(t-{a})/.35\\,if(lt(t\\,{b-.35})\\,1\\,max(0\\,({b}-t)/.35))))"
        t = txt.replace("'", "").replace(':', '\\:')
        out.append(f"drawtext=fontfile={FONT}:text='{t}':fontsize={size}:fontcolor=white:alpha='{al}':x=(w-tw)/2:y=(h-th)/2+({y}):shadowcolor=black@0.8:shadowx=4:shadowy=4")
    return ','.join(out)

START = {'columns-finale': 1}  # first captured frame skipped (unit models pop in)
EXTRA = {'night-wide': 'eq=brightness=-0.07:gamma=0.88,', 'night-low': 'eq=brightness=-0.09:gamma=0.85,'}
CROPY = {'columns-air': 20, 'naval-fleet': 60, 'naval-strike': 60}  # letterbox crop offset (default centred = 138)

def clip(d, titles, interp=True):
    out = f'{W}/{d}.mp4'
    if os.path.exists(out) and '--force' not in sys.argv: return out
    if d.startswith('hud-'):  # still screenshot with a slow push-in
        src = f'{SH}/{d}.png'; dur = 3.0
        vf = f"scale=2880:1620,zoompan=z='1+0.0006*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=1920x1080:fps=30"
        pre = f'-loop 1 -i {src}'
    else:
        cf = capfps(d); n = nframes(d) - START.get(d, 0); dur = n / cf
        vf = ('minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,' if interp else 'fps=30,') + 'scale=1920:1080:flags=lanczos'
        pre = f'-framerate {cf} -start_number {START.get(d, 0)} -i {SH}/{d}/%05d.jpg'
    grade = (EXTRA.get(d, '') + "unsharp=5:5:0.45,eq=contrast=1.1:saturation=1.1:gamma=0.96,colorbalance=rs=-.04:bs=.05:rm=.0:bm=.02:rh=.05:bh=-.04,"
             f"vignette=PI/5,crop=1920:804:0:{CROPY.get(d,138)},pad=1920:1080:0:138:black")
    tx = drawtext(titles, dur); tx = (',' + tx) if tx else ''
    fade = f"fade=t=in:st=0:d=0.12,fade=t=out:st={dur-.14:.3f}:d=0.14"
    tmp = f'{W}/tmp_{d}.mp4'
    sh(f'ffmpeg -y -v error {pre} -t {dur} -vf "{vf},{grade}{tx},{fade},format=yuv420p" -r 30 -c:v libx264 -preset veryfast -crf 18 -an {tmp}')
    os.rename(tmp, out); return out

def endcard():
    out = f'{W}/endcard.mp4'
    if os.path.exists(out) and '--force' not in sys.argv: return out
    last = sorted(f for f in os.listdir(f'{SH}/columns-finale') if f.endswith('.jpg'))[-1]
    t = lambda s: s.replace(':', '\\:').replace("'", '')
    m = f"Music\\: {MUSIC[1]} by {MUSIC[2]}, {MUSIC[3]}"
    vf = (f"scale=1920:1080:flags=lanczos,boxblur=14:2,eq=brightness=-0.32:saturation=.8,"
          f"drawtext=fontfile={FONT}:text='WORLD WAR 3':fontsize=150:fontcolor=white:x=(w-tw)/2:y=250:shadowcolor=black@.8:shadowx=5:shadowy=5,"
          f"drawtext=fontfile={FONTL}:text='play free in your browser':fontsize=56:fontcolor=white:x=(w-tw)/2:y=470,"
          f"drawtext=fontfile={FONT}:text='{t(URL)}':fontsize=54:fontcolor=#ffcf5a:x=(w-tw)/2:y=580,"
          f"drawtext=fontfile={FONTL}:text='{m}':fontsize=28:fontcolor=white@0.8:x=(w-tw)/2:y=880,"
          f"drawtext=fontfile={FONTL}:text='Sounds and voices are in the game; full credits in the game menu':fontsize=24:fontcolor=white@0.6:x=(w-tw)/2:y=925,"
          f"fade=t=in:st=0:d=0.5,format=yuv420p")
    sh(f'ffmpeg -y -v error -loop 1 -framerate 30 -i {SH}/columns-finale/{last} -t 6 -vf "{vf}" -r 30 -c:v libx264 -preset veryfast -crf 18 -an {W}/tmp_end.mp4')
    os.rename(f'{W}/tmp_end.mp4', out); return out

# ---------------- audio ----------------
SR = 48000
def load(path):
    sh(f'ffmpeg -y -v error -i {R}/{path} -ar {SR} -ac 1 -f wav {W}/_x.wav')
    w = wave.open(f'{W}/_x.wav'); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; return a

def build_audio(starts, total):
    rnd = random.Random(11)
    mix = np.zeros(int(total * SR) + SR, dtype=np.float32)
    def put(a, t, g=1.0):
        i = int(t * SR); 
        if i < 0 or i >= len(mix): return
        a = a[:len(mix) - i]; mix[i:i + len(a)] += a * g
    sfx = load('sfx/sfx.mp3'); man = json.load(open(f'{R}/sfx/manifest.json')); sr0 = man['sr']
    # sfx.mp3 is resampled to 48k: offsets are in seconds
    def cut(name, k=None):
        c = man['clips'][name]; o, l = c[k if k is not None else rnd.randrange(len(c))]
        a = sfx[int(o * SR):int((o + l) * SR)].copy(); n = len(a); a[-min(n, 800):] *= np.linspace(1, 0, min(n, 800)); return a
    BED = {'wind': [('wind', .3)], 'truck': [('truck', .22)], 'tank': [('tank', .3)], 'heli': [('heli', .45)], 'jet': [('jet', .3)], 'rumble': [('rumble', .5)],
           'march': [('rumble', .3), ('tank', .14)], 'combat': [('rumble', .22)]}
    def bed(name, t0, dur, g):
        a = load(f'sfx/{name}.mp3'); n = int(dur * SR); a = np.tile(a, n // len(a) + 1)[:n].copy(); k = int(.3 * SR); a[:k] *= np.linspace(0, 1, k); a[-k:] *= np.linspace(1, 0, k); put(a, t0, g)
    # events from the capture
    for d, t0, dur, beds in starts:
        ev = []
        p = f'{SH}/{d}/events.json'
        if os.path.exists(p): ev = json.load(open(p))
        for bn in beds:
            for nm, g in BED.get(bn, []): bed(nm, t0, dur, g)
        last = -1
        for e in ev:
            t = t0 + e['f'] / capfps(d)
            if t - last < .22: continue
            last = t
            dist = e.get('d', 400); g = max(.18, 1 - dist / 1100)
            if e['big']: put(cut('boomL'), t, .95 * g)
            else: put(cut('boomS'), t, .7 * g)
        if 'combat' in beds or 'march' in beds:
            t = t0
            while t < t0 + dur:
                r = rnd.random(); nm = 'rifle' if r < .6 else ('mg' if r < .85 else ('cannon' if r < .95 else 'rocket'))
                put(cut(nm), t, rnd.uniform(.15, .4)); t += rnd.uniform(.08, .3)
            t = t0 + .5
            while t < t0 + dur: put(cut('cannon'), t, rnd.uniform(.25, .5)); t += rnd.uniform(.9, 2.2)
        # title stingers
    return mix

def audio(starts, total):
    mix = build_audio(starts, total)
    # beds from loops (tank / heli / jet / wind / rumble): tile the looped files
    vo = {}
    for d, t0, dur, beds in starts:
        for (t, fac, kind, cat, idx, gain) in VOICES.get(d, []):
            if fac not in vo:
                for l in open(f'{R}/src/09-audio.js'):
                    if l.startswith('const VO_MAP='): vo = vo or json.JSONDecoder().raw_decode(l[len('const VO_MAP='):])[0]; break
            o, ln = vo[fac][kind][cat][idx]
            sheet = load(f'vo/{fac}.mp3'); a = sheet[int(o * SR):int((o + ln) * SR)].copy()
            n = len(a); a[:200] *= np.linspace(0, 1, 200); a[-400:] *= np.linspace(1, 0, 400)
            i = int((t0 + t) * SR); mix[i:i + n] += a * gain * 1.6
    mus = load(MUSIC[0]); n = min(len(mus), len(mix)); m = mus[:n].copy()
    m[:int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))
    mix[:n] += m * 0.75
    mx = np.abs(mix).max(); mix = mix / max(mx, 1) * .9
    fo = int(2.5 * SR); end = int(total * SR); mix[end - fo:end] *= np.linspace(1, 0, fo); mix = mix[:end]
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    w = wave.open(f'{W}/mix.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()

if __name__ == '__main__':
    names = [c for c in CLIPS if os.path.isdir(f'{SH}/{c[0]}') or os.path.exists(f'{SH}/{c[0]}.png')]
    done = [clip(d, t) for d, t, b in names]
    endc = endcard()
    t = 0; starts = []
    for (d, tt, b), f in zip(names, done):
        dur = float(sh(f'ffprobe -v error -show_entries format=duration -of csv=p=0 {f}')); starts.append((d, t, dur, b)); t += dur
    total = t + 6
    open(f'{W}/list.txt', 'w').write(''.join(f"file '{f}'\n" for f in done + [endc]))
    sh(f'ffmpeg -y -v error -f concat -safe 0 -i {W}/list.txt -c copy {W}/video.mp4')
    audio(starts, total)
    print('video', total, 's;', len(names), 'clips')
