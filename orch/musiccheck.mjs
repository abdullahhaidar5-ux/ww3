// The soundtrack check now lives in orch/audio.mjs (the gate's "audio" job runs orch/audio*.mjs); this name still works.
//   node orch/musiccheck.mjs [--no-lock]   ==   node orch/audio.mjs [--no-lock]
await import('./audio.mjs');
