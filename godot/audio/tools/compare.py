#!/usr/bin/env python3
"""Ear-proxy comparison of two captures: python3 compare.py godot.wav godot.log js.webm js.log [godot_t0]
Loudness (EBU R128 integrated, range, true peak) of each recording, and which clip families fired (per minute of game)."""
import subprocess, sys, re, collections
def loud(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = o[o.rfind('Summary:'):]
    g = lambda k: float(re.search(k + r':\s+(-?[\d.]+)', s).group(1))
    d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip()
    return dict(I=g('I'), LRA=g('LRA'), peak=g('Peak'), sec=float(d) if d and d != 'N/A' else 0)
def fam(log, t0=0.0):
    c = collections.Counter(); ts = []
    for l in open(log):
        p = l.split()
        if len(p) < 3 or float(p[0]) < t0: continue
        ts.append(float(p[0]))
        ev, clip = p[1], p[2]
        if ev == 'sfx': c['sfx ' + clip] += 1
        elif ev in ('vo', 'vor', 'voh', 'ann', 'shout'): c[ev] += 1
        elif ev == 'music': c['music ' + clip] += 1
    return c, (max(ts) - min(ts) if ts else 0)
gw, gl, jw, jl = sys.argv[1:5]; t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0
G, J = loud(gw), loud(jw); (gc, gs), (jc, js_) = fam(gl, t0), fam(jl)
print('| | Godot | Browser game |\n|---|---|---|')
print(f"| recording | {G['sec']:.0f} s | {J['sec']:.0f} s |")
print(f"| loudness (integrated) | {G['I']:.1f} LUFS | {J['I']:.1f} LUFS |")
print(f"| loudness range | {G['LRA']:.1f} LU | {J['LRA']:.1f} LU |")
print(f"| true peak | {G['peak']:.1f} dBFS | {J['peak']:.1f} dBFS |")
print(f"| game time covered by the clip log | {gs:.0f} s | {js_:.0f} s |")
for k in sorted(set(gc) | set(jc)): print(f"| {k} | {gc.get(k, 0)} | {jc.get(k, 0)} |")
