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

# French, German, British and Japanese voice references (FR, DE, GB, JP unit voices, voices3 2026-11-17)
XTTS-v2 cloning references (13-22 s, 24 kHz mono; the cleanest 3-5 phrases of one male speaker joined with short gaps, picked by DNSMOS P.808/BAK and pitch; renderer orch/vo/v3.py). Only free sources: LibriVox recordings are in the **public domain** (archive.org collection librivoxaudio; reader named in the recording's intro and on the LibriVox catalog page), the Thorsten-Voice dataset is **CC0** and Mozilla Common Voice is **CC0** (speakers are anonymous; per the dataset terms no attempt was made to identify them). British accent checked with the CommonAccent ECAPA classifier (Jzuluaga/accent-id-commonaccent_ecapa: all three "england").
- fr_bernard.flac: LibriVox reader Bernard, Balzac "Scènes de la vie de province, tome 3", section 2 (archive.org `scenesdelavieprovince3_bnd_1211_librivox`, ~114 Hz) - FR commander + soldier 3
- fr_zeckou.flac: LibriVox reader Zeckou, Jules Verne "L'île mystérieuse", section 2 (`lilemysterieuse_1410_librivox`, ~138 Hz) - FR soldier 1
- fr_lambert.flac: LibriVox reader Jean Lambert, La Fontaine "Fables", livre 1 (`fables_de_la_fontaine_01_jl_0809_librivox`, ~101 Hz) - FR soldier 2
- de_karlsson.flac: LibriVox reader Karlsson, K. F. Becker "Odysseus", Abschnitt 2 (`odysseus_1404_librivox`, ~110 Hz) - DE commander + soldier 3
- de_ungerer.flac: LibriVox reader Bernd Ungerer, Gustav Freytag "Die Ahnen 1: Ingraban", Abschnitt 2 (`ahnen1ingraban_2003_librivox`, ~136 Hz) - DE soldier 2
- de_thorsten.flac: Thorsten Müller, Thorsten-Voice dataset TV-2021.06-Emotional ("angry"/"surprised" sentences; huggingface.co/datasets/Thorsten-Voice/TV-44kHz-Full, CC0) - DE soldier 1
- gb_clarke.flac: LibriVox reader David Clarke, Conan Doyle "The Hound of the Baskervilles" (version 4), chapter 2 (`houndofthebaskervilles_1503_librivox`, ~119 Hz) - GB soldier 1
- gb_minter.flac: LibriVox reader Andy Minter (1934-2017), Arnold Bennett "The Matador of the Five Towns", section 2 (`matador_five_towns_am_librivox`, ~122 Hz) - GB soldier 2
- gb_yearsley.flac: LibriVox reader Peter Yearsley, Longfellow "The Song of Hiawatha", section 1 (`hiawatha_py_0909_librivox`, ~90 Hz) - GB commander + soldier 3
- ja_cv1.flac: Mozilla Common Voice 17.0 Japanese (CC0, via huggingface.co/datasets/fsicoli/common_voice_17_0), male, thirties, client 0db48cd4ed…, clips common_voice_ja_22467338/275/278/336/234 (~105 Hz) - JP commander + soldier 1
- ja_cv2.flac: same source, male, twenties, client 51e9ed3544…, clips 19779364/892/396/273 (~127 Hz) - JP soldier 2
- ja_cv3.flac: same source, male, thirties, client 7a33b5f087…, clips 23238225/232/275 (~116 Hz) - JP soldier 3

# Hebrew announcer (vo/ann_he.mp3, voices3 2026-11-17)
Not cloned: Phonikud (github.com/thewh1teagle/phonikud, MIT) adds Hebrew vowel marks and stress and turns them into phonemes; the voice is the Piper-format VITS model `shaul.onnx` from huggingface.co/Phonikud/phonikud-tts-checkpoints (trained on SASPEECH / Robo-Shaul, openslr.org/134 - non-commercial licence, the same data as the Piper "saspeech" Hebrew voice already credited). Renderer orch/vo/ann_he.py.
