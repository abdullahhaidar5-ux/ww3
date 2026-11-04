# polish-1103 (helper agent, 2026-11-03)

- End stats: max 3 awards per player in 1v1 (2 otherwise); player names (`p.n`, from lobby profiles where the game has them, else nation name); army graph halves its samples and doubles the interval at 720 points (`st.dt` per team, so it is checkpointed with T.st).
- EW: US, CN, IR, IL can build the EW Jamming Truck from the Factory (`F.extra`, same stats, max 2, rank-2 lock in UI; names per nation). RU unchanged (special). Not tuned further - AI builds at most one like RU.
- Kill-cam: effect timers (`fxLater`) started in a replay are dropped after it; cam `_xl/_yl/_dl` restored.
- News ticker: new host-only `hl` event (`pubNews` in 03-sim; sent to all players) for oil-derrick captures and superweapon launches; shown only to players not on either side (dedupes with existing messages).
- Play again restores NET.ownW Conditions. Martyr flag fade uses game time.
- Not done: Cloudflare server has no player names (falls back to nation); real-iPhone test pending.
- Sim/net changed (03-sim, 01-data): needs main -> servers-live PR.
