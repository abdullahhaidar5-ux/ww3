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
