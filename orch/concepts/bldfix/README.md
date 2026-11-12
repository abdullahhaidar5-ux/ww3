Buildings that floated (Abdullah's photo 2026-11-11 "Fix this"). Branch orch/bldfix.
Cause: roofKit measured the roof from the top of the model's box = the factory's chimney tops, so the roof frame and every roof prop hung up there.
Fix: the roof is found by ray-casting the model; props only on real flat roof (none on saw-tooth), Middle Eastern buildings keep one wall and one prop set.
before-/after-factory-US|IR.jpg = war factory; after-sheet-*.jpg = HQ, barracks, depot, airfield, radio, uplink after the fix (US set, Iran set).
Check: node orch/bldfix.mjs with CHECK=1 (also runs inside orch/smoke.mjs).
