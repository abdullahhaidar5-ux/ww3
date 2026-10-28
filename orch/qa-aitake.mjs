// QA: does a side that the AI takes over after a slow start (a player who leaves, or the multiplayer "AI takes over a
// dropped player" path) still fight? Same seed and nations, slot 0 run by the AI from the start vs idle for --idle
// game-seconds and then handed to the AI (mkAI, as 07b-ckpt does for a dropped player). Rendering is stopped.
//   node orch/qa-aitake.mjs --facs IR,US --map strait --seeds 1,2,3 --idle 120 --minutes 15
import { startServer, launch, openPage, toMenu, waitLoaded } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FACS = A('facs', 'IR,US').split(','), MAP = A('map', 'strait'), SEEDS = A('seeds', '1,2,3').split(',').map(Number), IDLE = +A('idle', 120), MIN = +A('minutes', 15);
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [];
const { page } = await openPage(browser, origin, 'hd', errs);
await toMenu(page, url);
for (const seed of SEEDS) for (const idle of [0, IDLE]) {
  await page.evaluate(({ FACS, MAP, seed }) => { window.__stopLoop = false; setup.p = FACS[0]; setup.a = FACS[1]; setup.n = 1; setup.others = []; setup.map = MAP; setup.seed = seed; setup.tm = [0, 1]; startSingle(); }, { FACS, MAP, seed });
  await waitLoaded(page); await page.evaluate(() => { window.__stopLoop = true; });
  const r = await page.evaluate(async ({ idle, MIN }) => {
    G.teams[0].ai = null; let took = false;
    for (let i = 0; i < MIN * 3600 && !G.over; i++) { if (!took && G.t >= idle) { G.teams[0].ai = mkAI(1); took = true; } simUpdate(1 / 60); }
    return { t: G.t | 0, over: G.over, alive: G.teams.map(T => G.ents.filter(e => e.team === T.id && !e.dead).length), built: G.teams.map(T => T.built), kills: G.teams.map(T => T.kills), loading: !!window.LOADING };
  }, { idle, MIN });
  console.log(`seed ${seed} idle ${idle}s: ${JSON.stringify(r)}`);
  await page.evaluate(() => { try { $('end').hidden = true; $('menu').hidden = false; } catch (e) {} G = null; });
}
await browser.close(); server.close();
console.log('errors: ' + [...new Set(errs)].join('\n'));
