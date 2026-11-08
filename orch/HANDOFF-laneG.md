# HANDOFF laneG (2026-11-08 ~01:25Z)
Shipped to main this run: RG9 proxy wars ("Arm a proxy militia" act), RG18 volunteers (same-faction, monthly hook), RG15 cyber strike first cut ("Cyber strike on banks"); all in src/13zq-gproxy.js with hooks in 13m-gdiplo.js and 13o-gworld.js. Also merged the unmerged laneG 9a82454e event rows (RG40/39/41/42/29/28), RG10 nuclear stall, RG20 ceasefires that can break.
Gates on final code fbc3ade7: smoke PASS, proxytest PASS, grandtest PASS. cigate (GitHub) was not completed (run was cut off).
Open next, in order: fire own scheduled task was denied by the auto-mode classifier, so the next run must start manually or by its schedule. Then: B6 client states, RG64 defectors, RG20 follow-ons, B8 reforms/hegemonies, RG3 spies merge with RG15 cyber.
Known gap: proxytest's volunteer branch is not exercised (no same-faction pair found on the test map); add a test that sets fac on a volunteer nation.
