// local diagnosis: what the AT-team hover card shows in a real IR battle
import { boot } from './savelib.mjs';
const B = await boot(); const P = await B.open();
await P.evaluate(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; startSingle(); });
await P.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 900000, polling: 250 });
const r = await P.evaluate(() => { const f = G.teams[ME].fac, foe = foeFac(); const m = matchUp(f, 'at', foe), g = matchUp(f, 'at', f); const el = UK.match(f, 'at', foe);
  const st = stats(f, 'at'); return { f, foe, teams: G.teams.map(t => t.fac + (t.F ? 'F' : '') + (t.out ? 'out' : '')), m: { b: m.beats.map(x => x.k), w: m.weak.map(x => x.k), a: m.armed }, g: { b: g.beats.map(x => x.k), w: g.weak.map(x => x.k) }, html: el ? el.textContent : null, st: { dmg: st.dmg, wpn: st.wpn, rng: st.rng, cost: st.cost, hp: st.hp, aa: st.aa } }; });
console.log(JSON.stringify(r)); console.log(B.errs.slice(0, 3)); await B.close();
