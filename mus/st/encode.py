#!/usr/bin/env python3
"""Encode the shared soundtrack (Abdullah's keeps from the listening page) for phones.

usage: python3 mus/st/encode.py DOWNLOAD_DIR

DOWNLOAD_DIR holds each kept track's original file from its `download_url` in mus/new/candidates.json, named
<id>.<ext> (combat-01 comes as a zip; its "Dream Raid Full Version (Mock Up).mp3" is unpacked to combat-01.mp3).
For every kept id this writes mus/st/<id>.mp3 and mus/st/manifest.json:
  * leading/trailing silence trimmed (below -50 dBFS), 20 ms fade-in, 1.5 s fade-out on the trimmed end
  * two-pass EBU R128 loudness normalisation to -16 LUFS, true peak -1.5 dBTP
  * 44.1 kHz joint-stereo MP3 at 96 kbps (CBR, so phones can seek and stream it)
The game (src/09-audio.js, ST_TRACKS) lists the same ids; orch/build.py --check checks that every file here is in the
manifest, is used by the game and is credited in the menu credits.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEEP = ['menu-02', 'menu-04', 'calm-01', 'calm-02', 'calm-03', 'calm-05', 'combat-01', 'combat-02', 'combat-05',
        'combat-06', 'combat-09', 'combat-11', 'victory-01', 'defeat-02']
OUT = os.path.join(ROOT, 'mus', 'st')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'failed: {" ".join(cmd)}\n{r.stderr[-1500:]}')
    return r.stderr


def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True).stdout.strip())


def main():
    src_dir = sys.argv[1]
    cands = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'mus', 'new', 'candidates.json'), encoding='utf-8'))}
    man = []
    for tid in KEEP:
        c = cands[tid]
        src = next(os.path.join(src_dir, f) for f in os.listdir(src_dir)
                   if re.fullmatch(re.escape(tid) + r'\.(mp3|ogg|wav|flac)', f))
        trim = os.path.join(src_dir, tid + '.trim.wav')
        # silence trim at both ends (reverse, trim, reverse), as 44.1 kHz stereo float
        sil = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
        run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', f'{sil},areverse,{sil},areverse',
             '-ar', '44100', '-ac', '2', '-c:a', 'pcm_f32le', trim])
        d = dur(trim)
        fades = f'afade=t=in:st=0:d=0.02,afade=t=out:st={max(0, d - 1.5):.3f}:d=1.5'
        # loudness: measure, then apply with the measured values (linear when possible)
        meas = run(['ffmpeg', '-v', 'info', '-hide_banner', '-i', trim, '-af',
                    f'{fades},loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
        m = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
        ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        out = os.path.join(OUT, tid + '.mp3')
        run(['ffmpeg', '-y', '-v', 'error', '-i', trim, '-af', f'{fades},{ln},aresample=44100', '-map_metadata', '-1',
             '-c:a', 'libmp3lame', '-b:a', '96k', '-joint_stereo', '1', '-ar', '44100', '-ac', '2', out])
        os.remove(trim)
        man.append({'id': tid, 'pool': c['pool'], 'file': 'mus/st/' + tid + '.mp3', 'title': c['title'],
                    'author': c['artist'], 'licence': c['licence'], 'licence_url': c['licence_url'],
                    'source_url': c['source_url'], 'duration_s': round(dur(out), 1),
                    'bytes': os.path.getsize(out), 'attribution': c['attribution']})
        print(f"{tid:11s} {man[-1]['duration_s']:6.1f}s {man[-1]['bytes'] / 1e6:5.2f} MB  {c['title']} — {c['artist']}")
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'{len(man)} tracks, {sum(t["bytes"] for t in man) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
