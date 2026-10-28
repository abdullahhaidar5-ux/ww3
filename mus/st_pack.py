#!/usr/bin/env python3
"""Build mus/st/<ID>.mp3: the shared soundtrack (one set of real recorded tracks for all 18 nations).

Abdullah picked these 14 from the shortlist in mus/new/candidates.json (2026-10-27). 09-audio.js streams one file at
a time (menu / calm / combat / victory / defeat pools); nothing is fetched until it is about to play.
Each track is encoded full length: leading and trailing silence trimmed, two-pass EBU R128 loudness normalised
(-18 LUFS, calm tracks -20 LUFS, true peak -1.5 dBTP), 44.1 kHz stereo MP3 at 112 kbps.

Sources (all credited in the menu credits; licences CC-BY 3.0 / 4.0):
  * The Fall of Arcana by Matthew Pablo (www.matthewpablo.com), CC-BY 3.0 - opengameart.org
  * Epic Orchestral Fantasy Theme by Markus Lindner, CC-BY 4.0 - opengameart.org
  * Conflict by Alexandr Zhelanov, CC-BY 4.0 - opengameart.org
  * Enemy Spotted by Alexandr Zhelanov, CC-BY 3.0 - opengameart.org
  * Tabuk by Kevin MacLeod (incompetech.com), CC-BY 4.0
  * Impending Boom by Kevin MacLeod (incompetech.com), CC-BY 4.0
  * Dream Raid by Matthew Pablo (www.matthewpablo.com), CC-BY 3.0 - opengameart.org
  * Tactical Pursuit by Matthew Pablo (www.matthewpablo.com), CC-BY 3.0 - opengameart.org
  * Howitzer by joeBaxterWebb, CC-BY 4.0 - opengameart.org
  * Act of War by Alexandr Zhelanov, CC-BY 3.0 - opengameart.org
  * Black Vortex by Kevin MacLeod (incompetech.com), CC-BY 4.0
  * Curse of the Scarab by Kevin MacLeod (incompetech.com), CC-BY 4.0
  * Egmont Overture Finale by Kevin MacLeod (incompetech.com), CC-BY 4.0
  * Death of Kings by Kevin MacLeod (incompetech.com), CC-BY 4.0

usage: python3 mus/st_pack.py <download-dir>
  <download-dir>/<file> must exist for every track below (the full-length downloads; download_url in
  mus/new/candidates.json). Writes mus/st/<ID>.mp3 and prints each file's size and the total.
  Titles, authors, licences, sizes and loudness per track are listed in mus/st/manifest.json (orch/build.py --check
  checks it against the game's track list and the menu credits).
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'mus', 'st')
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
TP, KBPS = -1.5, 112
# id: (downloaded file, target loudness in LUFS)
TRACKS = {
    'menu-02': ('pablo-fall-of-arcana.mp3', -18),
    'menu-04': ('lindner-epic-orchestral-fantasy.mp3', -18),
    'calm-01': ('zhelanov-conflict.ogg', -20),
    'calm-02': ('zhelanov-enemy-spotted.mp3', -20),
    'calm-03': ('kmacleod-tabuk.mp3', -20),
    'calm-05': ('kmacleod-impending-boom.mp3', -20),
    'combat-01': ('pablo-dream-raid.mp3', -18),
    'combat-02': ('pablo-tactical-pursuit.mp3', -18),
    'combat-05': ('joebaxterwebb-howitzer.mp3', -18),
    'combat-06': ('zhelanov-act-of-war.mp3', -18),
    'combat-09': ('kmacleod-black-vortex.mp3', -18),
    'combat-11': ('kmacleod-curse-of-the-scarab.mp3', -18),
    'victory-01': ('kmacleod-egmont-overture-finale.mp3', -18),
    'defeat-02': ('kmacleod-death-of-kings.mp3', -18),
}
# trim silence (below -55 dB) at the start and at the end, keeping a short natural tail
TRIM = ('silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.05,'
        'areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.4,areverse')


def measure(src, lufs):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af',
                        f'{TRIM},loudnorm=I={lufs}:TP={TP}:LRA=14:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr)
    if not m:
        sys.exit(f'loudnorm measure failed for {src}:\n{r.stderr[-1500:]}')
    return json.loads(m[-1])


def encode(tid, src, lufs):
    j = measure(src, lufs)
    ln = (f'loudnorm=I={lufs}:TP={TP}:LRA=14:measured_I={j["input_i"]}:measured_TP={j["input_tp"]}:'
          f'measured_LRA={j["input_lra"]}:measured_thresh={j["input_thresh"]}:offset={j["target_offset"]}:linear=true')
    dst = os.path.join(OUT, tid + '.mp3')
    r = subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-y', '-i', src, '-map', '0:a:0', '-map_metadata', '-1',
                        '-af', f'{TRIM},{ln}', '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', f'{KBPS}k',
                        dst], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'encode failed for {tid}:\n{r.stderr[-1500:]}')
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst],
                             capture_output=True, text=True).stdout or 0)
    return dst, d, j


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for tid, (fn, lufs) in TRACKS.items():
        src = os.path.join(DL, fn)
        if not os.path.isfile(src):
            sys.exit(f'missing download {src}')
        dst, d, j = encode(tid, src, lufs)
        n = os.path.getsize(dst)
        total += n
        print(f'{tid:11s} {d:6.1f} s  {n / 1e6:5.2f} MB  (source {float(j["input_i"]):6.1f} LUFS -> {lufs})')
    print(f'total {total / 1e6:.1f} MB in mus/st/')


if __name__ == '__main__':
    main()
