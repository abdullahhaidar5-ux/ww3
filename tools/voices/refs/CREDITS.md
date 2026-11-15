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

# Iraqi voice references (RV unit voices, 2026-11-15 voices2)
Same source and licence as above (MASC, CC BY 4.0), train split (transcript csv scanned for Iraqi markers: جان/جانت, هيجي, علمود, اهوايه, شكو, ماكو, اكو, هسه, يكدر/يكول; only the matching clips were kept while streaming shards train_03, train_05, train_07). Per the dataset terms no attempt was made to identify the speakers.
- iq_narr.flac: one Baghdadi-dialect narrator (MASC videos wB0xAwXYpxI, yARgV0Aou_0, 0cAbIxbSim4, 1JBXSAib85U; ~150 Hz, DNSMOS P.808 3.6-3.95) - RV commander + second soldier voice
- iq_rap.flac: one Baghdadi-dialect male rapper (MASC video F0TqulOsxGA, six clips, ~100 Hz); his vocal was separated from the backing music with Demucs (htdemucs, MIT) before cloning - first soldier voice
Checked and not used: Mozilla Common Voice (no adult Iraqi male), MASC dev/test (no Iraqi-labelled speakers), other Iraqi MASC videos (songs/poems or music beds, a female speaker, noisy field reports).
