// QA: a friend opens the invite link with #join=<code> (local game server): does the game join the host's lobby by itself?
//   node orch/qa-joinlink.mjs
import { startServer as startStatic, launch, openPage, toMenu, shot, sleep } from './qa-lib.mjs';
import { startServer as startGameServer, guardContext } from './serverdev.mjs';
const SRV = await startGameServer(); const { server, origin, url } = await startStatic(); const browser = await launch(); const errs = [];
async function mk(vp) { const { ctx, page } = await openPage(browser, origin, vp, errs, { allowHosts: [SRV.url], dpr: 1 }); await guardContext(ctx, SRV.url); await ctx.addInitScript((u) => { window.WW3_SERVER = u; }, SRV.url); return page; }
const H = await mk('sm'); await toMenu(H, url); await sleep(2000); await H.click('#host'); await sleep(4000);
const code = await H.evaluate(() => NET.code); console.log('host code', code);
const C = await mk('phoneP'); await toMenu(C, url + '#join=' + code); await sleep(15000);
const st = await C.evaluate(() => ({ status: $('mpstatus').innerText.slice(0, 200), box: $('jcode').value, code: NET.code }));
const hs = await H.evaluate(() => $('games').innerText.replace(/\s+/g, ' ').slice(0, 200) + ' | ' + (document.querySelector('#menu') || {}).innerText.match(/\d+ \/ 8 players/));
console.log('client via link:', JSON.stringify(st)); console.log('host sees:', hs);
await shot(C, 'joinlink-phoneP.png');
await browser.close(); server.close(); SRV.stop(); console.log('ERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n')); process.exit(0);
