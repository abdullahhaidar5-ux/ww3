# HANDOFF fix-superfreeze (2026-11-20) - NOT finished, nothing landed on main
Branch orch/fix-superfreeze (diagnostic tooling only: orch/rangefreeze.mjs). Probe branch probe/sf/a holds `.github/workflows/sf-probe.yml` (push to probe/sf/** = OB rangefreeze x8 with TRACE+GLN+UPS, TRIES=1; note the job always ends green because of `true` - read the log tail).

## What was found (probe run 44659390455, OB, 2 of 8 jobs finished when this session stopped)
- Fail (job 136033576913): `wave drone worst 414ms`, JS in that frame tiny (simUpdate 3, renderFrame 39, texUp 1). Chrome trace: a 409 ms task on the GPU process main thread (`Scheduler::RunTask`) at the same time (drone wave start +~600 ms). No new programs, no new geometry.
- Pass (job 136033577099) had a 206 ms GPU main task right at the ew->drone wave switch, a 213 ms decodeAudioData worker task and a 215 ms V8 optimizing-compile worker task, i.e. on a 2-vCPU runner (renderer main throttled x2 + SwiftShader GPU process + audio decode + V8 compile workers) any burst of off-main-thread work stalls the frame. The failing frame is the GPU process (software GL) draining queued non-draw work (data-texture uploads: ~35 KB Float32Array texSubImage2D x 4-20 per frame, ~650 bindVertexArray + ~110 bindTexture per frame in the strike) not anything the JS does.
- Local sandbox (1 run each): per-frame GL call counts are ordinary in slow frames (no unusual call); stalls are not attributable to a single call.

## Added tooling (this branch)
- `GLN=1` (rangefreeze): per-frame graphics-call counts by name, printed as `GL=` on every frame >120 ms. TRACE=1 now also prints what ran inside long GPU-process tasks (decoder/angle categories).

## Next steps
1. Read probe runs on probe/sf/a (runs 44659390455 old code, 44660344657 + the newest with GLN; they were all still QUEUED: the runner pool was saturated by other helpers). Compare `GL=` of the 400+ ms drone-wave frame with a normal wave frame; look for texSubImage2D/clear/blitFramebuffer bursts and the `inside GPU task` line.
2. Candidates to test: (a) the per-frame Float32Array data-texture uploads (find the owner with UPS=1: strike 2231x, power 1347x, wave 1824x) - upload only when changed / smaller; (b) decode nation voice/sfx sheets during loading (09-audio.js voRLoad/vohLoad/vosLoad, annClip) so no decodeAudioData worker runs in the wave; (c) first-use drone/ew assets (OB drone model/trails/sounds); (d) 650 VAO binds per frame: merge/instance to cut GPU command volume.
3. Then: 5 green superfreeze runs in a row on the branch, one green orch/cigate.sh, guard, HISTORY line, land on main.

## Session 2 (2026-11-20, Sonnet 5.5)
- Evidence from probe run 44661076025 (OB x8): slow frames have 1800-6000 bindVertexArray/frame (about 1500 un-instanced unit meshes at 150 units), 4-5 bone-texture Float32 uploads per frame (975x20KB per wave, skinned units), plus decodeAudioData worker bursts at first use (6 per run: engine loops tank/truck/heli/jet, announcer sheet, radio/shout sheets).
- Change 1 (this commit): src/08-ui.js battle-start also decodes the radio (voRLoad) and shout (vosLoad) sheets, engine loops at zero volume (envLoop k,.001 once SFX is ready) and the announcer sheet (annWarm in 09d); local OB decodes in waves 6 -> 3. Guard in orch/decisions.mjs.
- Still open: the 3 remaining first-use decodes (enemy-team sheets?), bone-texture uploads for idle skinned units, draw-call volume. Needs GitHub gate runs (sandbox too slow: decisions/smoke time out here).
- Tried (a) skip bone-texture upload when matrices unchanged (Skeleton.update wrapper, version rollback): Float32 texSubImage2D counts did not drop (OB local: wave 827, power 1388 vs 975/912 before) - those uploads are real moving poses (waves attack-move) or not bone textures; reverted, not shipped. Next: identify the owner of the Float32Array textures by texture name/userData in the upload hook, or cut draw-call volume (merge per-unit meshes).
- Gate run 44671863012 on gate/68f25ca2d1 was still queued at 04:05 UTC.

## Session 3 (2026-11-20 07:00 UTC, Sonnet 5.5) - branch probe/sf/b
- Audio-decode fix (36b658f) is on main (db5bb4a). Gate b5fc70b5cb superfreeze still failed: US dsam wave 2991 ms and dtank 645 ms (OB itself passed at 264 ms, drone wave). Only 3-4 first-use decodes remain (wave aa/heli/jet/minel, power recon/barrage).
- Pattern across all logs: the huge stall always lands 1.5-4 s AFTER the `ew` wave spawns (ew -> drone / dtank / dsam), tiny JS in that frame, a 150-400 ms GPU-process Scheduler::RunTask. IR (ew -> bmt -> dtank) and RS (drone before ew) passed. Hypothesis: something the EW truck starts (jam/spoof view, minimap static, ghosts, sound loop) causes it.
- Probe: rangefreeze got KINDS=/SKIP= filters; workflow sf-probe.yml on probe/sf/b runs US,OB x6 with and without the ew wave. Compare `worst` per phase in the job logs. If the stall vanishes without ew: find what ew triggers (ewView, mmEW, spoof ghosts, ew engine loop) and pre-warm/cache it.
