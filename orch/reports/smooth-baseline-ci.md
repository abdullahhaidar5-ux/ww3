# Smooth baseline measured on GitHub runners (2026-11-10)

Abdullah 2026-11-10 "Go": the 2026-11-04 marks came from a faster machine; the gate failed on every commit on GitHub runners. 5 runs each (workflow `smoothbase.yml`, run 42870153750, commit 00d2a09 = main), median per metric = new baseline `ci` in `orch/smooth-baseline.json` (used when GITHUB_ACTIONS is set; elsewhere the old top-level numbers still apply). Budget ratios/slack unchanged.


## pc: 5 raw runs, median, old (11-04) baseline

| metric | run1 | run2 | run3 | run4 | run5 | median | old |
|---|---|---|---|---|---|---|---|
| bench | 20.1 | 11 | 16.8 | 11 | 14.7 | **14.7** | 12.7 |
| loadS | 131.87 | 74.91 | 123.61 | 75.63 | 98.49 | **98.49** | 61.38 |
| units | 446 | 432 | 417 | 454 | 438 | **438** | 317 |
| gameMin | 0 | 0 | 0 | 0 | 0 | **0** | 0 |
| quality | 0 | 0 | 0 | 0 | 0 | **0** | 0 |
| frameMed | 282.9 | 190.1 | 217.3 | 197.6 | 197.6 | **197.6** | 143.2 |
| frameP95 | 339.7 | 222.9 | 307.5 | 226.6 | 246.7 | **246.7** | 329.1 |
| frameP99 | 395 | 258.9 | 452.7 | 245.6 | 277 | **277** | 636.1 |
| worst1Fps | 2.46 | 3.44 | 2.17 | 3.75 | 3.4 | **3.4** | 1.35 |
| longFrames | 150 | 150 | 150 | 150 | 150 | **150** | 150 |
| cpuMed | 282.9 | 190.1 | 217.3 | 197.6 | 197.6 | **197.6** | 143.2 |
| cpuP95 | 339.7 | 222.9 | 307.5 | 226.6 | 246.7 | **246.7** | 329.1 |
| cpuMax | 405.7 | 290.5 | 461.3 | 266.5 | 293.8 | **293.8** | 738.7 |
| simP95 | 18.1 | 9.4 | 19.7 | 10.9 | 10.8 | **10.9** | 9.5 |
| drawCalls | 1586 | 1741 | 1661 | 1631 | 1725 | **1661** | 1110 |
| kTris | 8237 | 8633 | 8426 | 8635 | 8424 | **8426** | 6255 |
| newShaders | 0 | 0 | 0 | 1 | 0 | **0** | 3 |
| hitchBoomX | 1.2 | 1 | 1.7 | 1.02 | 1.44 | **1.2** | - |
| hitchBoom2X | 1 | 0.99 | 1.34 | 1.2 | 1.17 | **1.17** | - |
| hitchWeatherX | 1.36 | 1.32 | 1.61 | 1.07 | 1.41 | **1.36** | - |
| hitchWorstMs | 360 | 260.1 | 285.7 | 232.9 | 238.1 | **260.1** | - |
| heapMB | -52.63 | -75.89 | -64.27 | -52.17 | -66.83 | **-64.27** | -17.15 |
| heapMBperMin | -68.91 | -147.71 | -105.68 | -99.04 | -124.75 | **-105.68** | -32.71 |
| frames | 150 | 150 | 150 | 150 | 150 | **150** | 150 |

## mp: 5 raw runs, median, old (11-04) baseline

| metric | run1 | run2 | run3 | run4 | run5 | median | old |
|---|---|---|---|---|---|---|---|
| bench | 14.7 | 16.8 | 16.8 | 14.9 | 16.8 | **16.8** | 13 |
| snapIntervalMed | 101 | 103 | 101 | 102 | 103 | **102** | 100 |
| snapIntervalP95 | 158 | 153 | 156 | 157 | 157 | **157** | 154 |
| snapJitterSd | 68.35 | 72.21 | 57.18 | 69.36 | 74.59 | **69.36** | 65.92 |
| snapGapMax | 1188 | 1478 | 384 | 1250 | 1486 | **1250** | 1143 |
| snaps | 884 | 884 | 880 | 884 | 884 | **884** | 884 |
| cmdLatP50 | 89 | 88 | 90 | 87 | 85 | **88** | 84 |
| cmdLatP95 | 111 | 114 | 304 | 107 | 109 | **111** | 116 |
| cmds | 38 | 38 | 38 | 38 | 38 | **38** | 38 |
| hostTickP95 | 1.8 | 1.9 | 1.9 | 2.1 | 2 | **1.9** | 2.9 |
| clientTickP95 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | **0.1** | 0.1 |
| clientFrameMed | 40.3 | 44.8 | 37.3 | 50.6 | 45.1 | **44.8** | 30.2 |
| clientFrameP95 | 520.9 | 851.2 | 660.6 | 283.3 | 853.8 | **660.6** | 124.8 |
| clientSnaps | 5 | 0 | 5 | 0 | 0 | **0** | - |
| clientSnapMax | 16.2 | 0 | 20.26 | 0 | 0 | **0** | - |
| lostPackets | 10 | 8 | 10 | 10 | 11 | **10** | 8 |
| msgs | 1186 | 1154 | 1188 | 1177 | 1186 | **1186** | 1144 |
| desync | 0 | 0 | 0 | 0 | 0 | **0** | 0 |
