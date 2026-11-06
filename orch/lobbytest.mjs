// QA: friend invites + Ready lobby (local game server). Host opens a battle, a friend opens the invite link,
// sees the lobby overlay, picks a nation, presses Ready; the host's seat shows Ready and Start lights up.
//   node orch/lobbytest.mjs   -> prints LOBBY PASS / LOBBY FAIL
import { startServer as startStatic, launch, openPage, toMenu, sleep } from './qa-lib.mjs';
import { startServer as startGameServer, guardContext } from './serverdev.mjs';
const SRV = await startGameServer(); const { server, origin, url } = await startStatic(); const browser = await launch(); const errs = [];
const SH = new URL('./shots/fun-extras/', import.meta.url).pathname;
async function mk(vp) { const { ctx, page } = await openPage(browser, origin, vp, errs, { allowHosts: [SRV.url], dpr: 1 }); await guardContext(ctx, SRV.url); await ctx.addInitScript((u) => { window.WW3_SERVER = u; }, SRV.url); return page; }
const fails = []; const ck = (n, ok, x) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); if (!ok) fails.push(n); };
const H = await mk('sm'); await toMenu(H, url); await sleep(2000); await H.click('#host'); await sleep(4000);
const code = await H.evaluate(() => lobbyCode()); console.log('host code', code);
const link = await H.evaluate(() => inviteLink()); ck('invite link uses join.html + fragment', /join\.html#join=/.test(link) || !/^https?:/.test(link), link);
const C = await mk('sm'); await toMenu(C, url + '#join=' + code); await sleep(9000);
ck('friend sees lobby overlay', await C.evaluate(() => !!document.getElementById('glob') && /Battle lobby/.test(document.getElementById('glob').innerText)));
await sleep(1500);
let hs = await H.evaluate(() => ({ st: document.querySelector('.startbtn') && document.querySelector('.startbtn').disabled, txt: document.getElementById('mpstatus').innerText.replace(/\s+/g, ' ').slice(0, 3000) }));
ck('host sees friend Not ready', /not ready/i.test(hs.txt), hs.txt.slice(0, 160));
await H.evaluate(() => { const c = document.querySelectorAll('.seat select'); });
// the host picks a team for the friend so the battle can start, friend picks nation + ready
await C.selectOption('#glob select[aria-label="Your nation"]', 'RU'); await sleep(500);
await C.click('#glob .gbtn:not(.sec)'); await sleep(2500);
hs = await H.evaluate(() => ({ dis: document.querySelector('.startbtn').disabled, cls: document.querySelector('.startbtn').className, txt: document.getElementById('mpstatus').innerText.replace(/\s+/g, ' ') }));
ck('host sees Ready + RU', /✔ ready/i.test(hs.txt) && /RU/.test(hs.txt), '');
await C.selectOption('#glob select[aria-label="Your team"]', '1'); await sleep(2500);
hs = await H.evaluate(() => ({ dis: document.querySelector('.startbtn').disabled, cls: document.querySelector('.startbtn').className }));
ck('Start lit when all ready (team 2 picked by friend)', !hs.dis && /rdyok/.test(hs.cls), JSON.stringify(hs));
await H.screenshot({ path: SH + 'lobby-host-ready.png' }); await C.screenshot({ path: SH + 'lobby-friend.png' });
await C.click('#glob .gbtn:not(.sec)'); await sleep(2500); // un-ready
hs = await H.evaluate(() => document.querySelector('.startbtn').disabled); ck('Start dark again when friend un-readies', hs === true);
await H.screenshot({ path: SH + 'lobby-host-notready.png' });
await C.click('#glob .gbtn:not(.sec)'); await sleep(2000);
await H.evaluate(() => document.querySelector('.startbtn').click()); await sleep(9000);
ck('battle starts for both', await H.evaluate(() => typeof MODE !== 'undefined' && MODE !== 'single') && await C.evaluate(() => MODE !== 'single' && !document.getElementById('glob')));
await browser.close(); server.close(); SRV.stop();
const bad = [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed|p2p: no direct|WebGL|GPU stall|ReadPixels/.test(e)); if (bad.length) console.log('ERRORS:\n' + bad.join('\n'));
console.log(fails.length ? 'LOBBY FAIL ' + fails.join(', ') : 'LOBBY PASS'); process.exit(0);
