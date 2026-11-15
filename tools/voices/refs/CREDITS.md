# American voice references (US unit voices)
Clips (about 11-15 s each, mono) used as XTTS-v2 cloning references for vo/US*.mp3. All are works of the US federal government (public domain), via the Internet Archive:
- us_ike.flac: Dwight D. Eisenhower, Farewell Address, 17 Jan 1961 (archive.org item `defarewell`), 0:18-0:29
- us_reagan.flac: Ronald Reagan, Address to the Nation on the economy, 5 Feb 1981 (ABC radio recording, archive.org item 7474087f-676e-4a9f-b1c1-9b4cc2a4e43c), 0:43-0:54 (the President's own voice, after the announcer)
- us_truman.flac: Harry S. Truman, first address to Congress as President, 16 Apr 1945 (archive.org item `TrumanFirstOfficialAppearance`), 4:02-4:17

# Lebanese voice references (RS unit voices, 2026-11-15)
XTTS-v2 cloning references for vo/RS*.mp3: about 13-18 s each, short clips of one speaker joined together (16 kHz mono). Source: MASC - Massive Arabic Speech Corpus, Mohammad Al-Fetyani, Muhammad Al-Barham, Gheith Abandah, Adham Alsharkawi, Maha Dawas (2021), IEEE DataPort, doi:10.21227/e1qb-jv46, licence CC BY 4.0 (via huggingface.co/datasets/pain/MASC, dev/test splits). Speakers were picked by Lebanese dialect markers in the transcripts (هيدا/هيدي، هلّق، -كن/-هن plurals), male pitch and DNSMOS quality; per the dataset terms no attempt was made to identify them.
- lb_narr.flac: MASC video c2grGSyfpmo (Lebanese narrator, deep voice, ~104 Hz) - RS commander + third soldier voice
- lb_vlog.flac: MASC video SZC2HW-31Yc (Lebanese vlogger, ~145 Hz) - first soldier voice
- lb_tech.flac: MASC video nl0DZ3eBKPQ (Lebanese presenter, ~118 Hz) - second soldier voice

# Palestinian / Levantine voice references (OB unit voices, 2026-11-15)
Same source and licence as above (MASC, CC BY 4.0, dev/test splits); speakers picked by southern-Levantine (Palestinian/Jordanian) transcript markers (عشان، بحكيلهم، رح، هيك), male pitch and DNSMOS.
- pal_host.flac: MASC video eLR5XvLcNWk (~107 Hz) - OB commander + third soldier voice
- pal_talk.flac: MASC video 8-rto97tYC0 (~125 Hz) - first soldier voice
- pal_story.flac: MASC video XshQZopat4A (~116 Hz) - second soldier voice
