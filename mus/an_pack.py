#!/usr/bin/env python3
"""Cut the short national-anthem excerpts mus/an_<CODE>.mp3 that play at battle start and on victory.

09-audio.js (AN_FAC, anLoad/anPlay) fetches a nation's excerpt only when that nation is the player's, and ducks the
shared soundtrack under it. (These were cut by mus/we_pack.py until the shared soundtrack replaced the per-nation
scores and their sample sheets on 2026-10-27; the anthem part moved here unchanged.)

Sources (all free; credited in the menu credits):
  * United States Navy Band national-anthem recordings (works of the US federal government: public domain), via
    Wikimedia Commons (US, EU) and the Internet Archive's mirror of navyband.navy.mil/media/ceremonial
    (https://archive.org/details/us-navy-band-national-anthems-public-domain: IL, UA, CU, IN, CN, EG, PK, KR, RU). Compositions, all public domain: "The Star-Spangled Banner" (John Stafford Smith, d. 1836),
    "Hatikvah" (melody arr. Samuel Cohen, d. 1940), "Shche ne vmerla Ukrainy" (Mykhailo Verbytskyi, d. 1870), the
    Anthem of Europe (Beethoven, "Ode to Joy", 1823; the Navy Band's own arrangement), "La Bayamesa" (Perucho
    Figueredo, d. 1870), "Jana Gana Mana" (Rabindranath Tagore, d. 1941), "March of the Volunteers" (Nie Er, d. 1935),
    "Bilady, Bilady, Bilady" (Sayed Darwish, d. 1923), Pakistan's "Qaumi Taranah" (Ahmed G. Chagla, d. 1953; Pakistan: life + 50,
    so free since 2004), South Korea's "Aegukga" (Ahn Eak-tai, d. 1965; his family gave all rights to the Korean state in 2005,
    which leaves it free for anyone to use), Russia's anthem (Alexander Alexandrov, d. 1946; Russia: life + 70 + 4 war years, so
    free since 2021, and Russian law also exempts state symbols from copyright).
    Skipped (composition not clearly public domain): Turkey's Istiklal Marsi (Osman Zeki Ungor, d. 1958: in copyright in Turkey
    until 2029), Saudi Arabia (Abd al-Rahman al-Khatib, 1947, death date unknown; brass version by Siraj Umar), the UAE's "Ishy
    Bilady" (Saad Abdel Wahab, d. 2004), Iran's 1990 anthem (Hassan Riahi), North Korea (Kim Won-gyun, d. 2002; and no Navy Band
    recording).

usage: python3 mus/an_pack.py <download-dir>
  <download-dir>/an/<CODE>.(ogg|mp3) must exist (see ANTHEMS). Writes mus/an_<CODE>.mp3 for each one found.
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
# code: (file in the download dir, start s, length s)
ANTHEMS = {'US': ('an/US.ogg', 0, 26), 'IL': ('an/IL.mp3', 0, 26), 'UA': ('an/UA.mp3', 0, 26), 'EU': ('an/EU.ogg', 0, 26), 'CU': ('an/CU.mp3', 0, 26),
           'IN': ('an/IN.mp3', 0, 26), 'CN': ('an/CN.mp3', 0, 26), 'EG': ('an/EG.mp3', 0, 26),
           'PK': ('an/PK.mp3', 0, 26), 'KR': ('an/KR.mp3', 0, 26), 'RU': ('an/RU.mp3', 0, 26)}


def anthems():
    for code, (f, st, n) in ANTHEMS.items():
        src = os.path.join(DL, f)
        if not os.path.exists(src) or os.path.getsize(src) < 50000:
            print(f'// anthem {code}: source missing, skipped', file=sys.stderr)
            continue
        out = os.path.join(ROOT, 'mus', f'an_{code}.mp3')
        # loudness-matched, a short fade in and a long fade out
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(st), '-t', str(n), '-i', src, '-ac', '1', '-ar', '32000',
                        '-af', f'loudnorm=I=-18:TP=-2:LRA=11,afade=t=in:d=0.05,afade=t=out:st={n - 4}:d=4',
                        '-c:a', 'libmp3lame', '-b:a', '56k', out], check=True)
        print(f'// {out}: {os.path.getsize(out)} bytes', file=sys.stderr)


if __name__ == '__main__':
    anthems()
