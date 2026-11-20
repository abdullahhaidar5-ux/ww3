#!/usr/bin/env python3
"""Trailer v2 edit. usage: python3 orch/trailer2.py <clips-dir> <work-dir> [out.mp4]
Clips: <scene>-<shot>.mp4 from the capture workflow (1920x1080, 30 fps). Cuts land on the beat of mus/st/combat-06.mp3
("Act of War", 80 BPM -> beat 0.75 s). One encoded file per scene (same size/fps/encoder), concat -c copy, audio muxed with -c:v copy."""
import os, subprocess, sys, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CL, WK = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(WK, 'ww3-trailer-v2.mp4')
os.makedirs(WK, exist_ok=True)
ANTON = os.path.join(ROOT, 'orch/trailer/fonts/Anton_400Regular.ttf'); OSW = os.path.join(ROOT, 'orch/trailer/fonts/Oswald_500Medium.ttf')
B = 0.75  # one beat
# (clip, start in clip [s], beats, title or None, flash-in?, zoom end scale, sfx [(time-in-shot, clip name)])
SHOTS = [
 ('base-flags',    0.0, 4, '22 NATIONS',            0, 1.05, []),
 ('dunesA-track',  0.0, 4, '500 UNITS PER SIDE',    1, 1.04, []),
 ('dunesA-crane',  0.3, 4, None,                    1, 1.00, [(0.0, 'boomS')]),
 ('dunesB-push',   0.3, 3, None,                    1, 1.06, [(1.0, 'cannon')]),
 ('dunesB-arty',   0.0, 4, 'SUPPLY LINES WIN WARS', 1, 1.04, [(0.4, 'boomS'), (1.5, 'boomS')]),
 ('dunesA-clash',  0.0, 3, None,                    1, 1.05, []),
 ('dunesB-air',    0.0, 4, 'LAND. AIR. FIRE.',      1, 1.04, []),
 ('night-low',     0.0, 4, 'DAY. NIGHT. STORMS.',   1, 1.04, []),
 ('night-wide',    0.0, 3, None,                    1, 1.04, []),
 ('storm-low',     0.0, 4, None,                    1, 1.04, []),
 ('fort-bb',       1.0, 6, None,                    1, 1.03, [(1.2, 'boomL')]),
 ('base-parade',   0.0, 2, None,                    1, 1.05, []),
]
FIN = ('dunesA-clash', 1.0, 4, 'WORLD WAR 3', 1, 1.08, [(0.0, 'boomL')])   # title shot
SFX = json.load(open(os.path.join(ROOT, 'sfx/manifest.json')))['clips']
def run(c):
    r = subprocess.run(c, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.returncode: print(' '.join(c)[:600]); print(r.stderr[-1500:]); sys.exit(1)
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '30', '-an']
def esc(t): return t.replace(':', '\\:').replace("'", '')
def shot(i, spec):
    name, ss, beats, title, flash, zoom, _ = spec; d = beats * B; f = os.path.join(CL, name + '.mp4')
    if not os.path.exists(f): print('MISSING', f); return None
    n = int(round(d * 30)); out = os.path.join(WK, f's{i:02d}.mp4')
    vf = [f'scale=1920:1080,zoompan=z=\'1+{zoom-1}*on/{n}\':d=1:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=1920x1080:fps=30' if zoom != 1 else 'scale=1920:1080',
          'eq=contrast=1.12:saturation=1.18:gamma=0.95', 'colorbalance=rs=.05:gs=.01:bs=-.06:rm=.04:bm=-.04:rh=.05:bh=-.05',
          'vignette=PI/5', 'noise=alls=7:allf=t', 'crop=1920:804:0:138', 'pad=1920:1080:0:138:black']
    if flash: vf.append('fade=t=in:st=0:d=0.13:color=white')
    if title:
        big = title == 'WORLD WAR 3'; fs = 190 if big else 92
        y = '(h-text_h)/2' if big else 'h-330'
        vf.append(f"drawtext=fontfile={ANTON}:text='{esc(title)}':fontsize={fs}:fontcolor=white:borderw=3:bordercolor=black@0.6:shadowx=4:shadowy=4:x=(w-text_w)/2:y={y}:alpha='if(lt(t,0.15),t/0.15,if(gt(t,{d-0.2}),({d}-t)/0.2,1))'")
    vf.append('fade=t=out:st=%.2f:d=0.08:color=black' % (d - .08) if False else 'null')
    run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-ss', str(ss), '-i', f, '-t', str(d), '-vf', ','.join(vf)] + ENC + [out]); return out
def endcard(out, d=6.0):
    cm = 'Music: "Act of War" by Alexandr Zhelanov (opengameart.org) - CC-BY 3.0'
    vf = (f"drawtext=fontfile={ANTON}:text='WORLD WAR 3':fontsize=170:fontcolor=white:x=(w-text_w)/2:y=330,"
          f"drawtext=fontfile={OSW}:text='FREE IN YOUR BROWSER':fontsize=54:fontcolor=0xd8b25a:x=(w-text_w)/2:y=560,"
          f"drawtext=fontfile={OSW}:text='abdullahhaidar5-ux.github.io/ww3':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=650,"
          f"drawtext=fontfile={OSW}:text='{esc(cm)}':fontsize=28:fontcolor=0xaaaaaa:x=(w-text_w)/2:y=960,fade=t=in:st=0:d=0.4,fade=t=out:st={d-.5}:d=.5,noise=alls=5:allf=t")
    run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x0b0d0c:s=1920x1080:r=30:d={d}', '-vf', vf] + ENC + [out])
parts, sfx, t = [], [], 0.0
for i, s in enumerate(SHOTS + [FIN]):
    o = shot(i, s)
    if not o: continue
    parts.append(o)
    for (dt, nm) in s[6]: sfx.append((t + dt, nm))
    t += s[2] * B
e = os.path.join(WK, 'end.mp4'); endcard(e); parts.append(e); total = t + 6.0
open(os.path.join(WK, 'list.txt'), 'w').write(''.join(f"file '{p}'\n" for p in parts))
vid = os.path.join(WK, 'video.mp4')
run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(WK, 'list.txt'), '-c', 'copy', vid])
# audio: music + sfx hits from sfx/sfx.mp3
ins = ['-i', os.path.join(ROOT, 'mus/st/combat-06.mp3')]; fc = [f'[0:a]atrim=start=0.02:duration={total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st={total-2.5}:d=2.5,volume=1.0[m]']
mix = ['[m]']
for k, (at, nm) in enumerate(sfx):
    c = SFX[nm][0]; ins += ['-i', os.path.join(ROOT, 'sfx/sfx.mp3')]
    fc.append(f'[{k+1}:a]atrim=start={c[0]}:duration={min(c[1],2.2)},asetpts=PTS-STARTPTS,volume=1.6,adelay={int(at*1000)}|{int(at*1000)}[x{k}]'); mix.append(f'[x{k}]')
fc.append(''.join(mix) + f'amix=inputs={len(mix)}:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]')
run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[a]', '-t', str(total), '-c:a', 'aac', '-b:a', '192k', os.path.join(WK, 'mix.m4a')])
run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', vid, '-i', os.path.join(WK, 'mix.m4a'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', OUT])
print('wrote', OUT, round(total, 1), 's', round(os.path.getsize(OUT) / 1e6, 1), 'MB')
