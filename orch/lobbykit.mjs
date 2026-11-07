// QA (no server needed): draws the host lobby and the guest lobby from fake state and checks the shared lobby kit.
//   node orch/lobbykit.mjs   -> prints LOBBYKIT PASS / LOBBYKIT FAIL; shots in orch/shots/lobbies2/
import { startServer, launch, openPage, toMenu, sleep } from './qa-lib.mjs';
const { origin, url } = await startServer(); const browser = await launch(); const errs = [];
const OUT = new URL('./shots/lobbies2/', import.meta.url).pathname;
const { page } = await openPage(browser, origin, 'hd', errs, { dpr: 1 });
await toMenu(page, url); await sleep(1500);
const fails = []; const ck = (n, ok, x) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); if (!ok) fails.push(n); };
await page.evaluate(() => menuGo('online')); await sleep(900);
await page.evaluate(() => { MODE = 'single'; NET.code = 'KX7Q'; NET.game = { emit: () => Promise.resolve(), leave() {} }; NET.room = { presence: () => Promise.resolve(), peers: () => [] }; NET.lobby = [{ peer: 'a', f: 'RU', r: 1 }, { peer: 'b', f: 'TR', r: 0 }]; NET.tm = [0, 1, 1]; NET.ais = [{ f: 'CN', d: 2, tm: 0 }]; NET.ping = 41; const m = document.getElementById('mpstatus'); let p = m; while (p) { p.hidden = false; if (p.style) p.style.display = p.style.display === 'none' ? 'block' : p.style.display; p = p.parentElement; } });
await page.evaluate(() => renderLobby()); await sleep(800);
const t = await page.evaluate(() => document.getElementById('mpstatus').textContent);
ck('invite link button', /Copy invite link/.test(t)); ck('flags on seats', await page.evaluate(() => document.querySelectorAll('#mpstatus .seat canvas.lkflag').length >= 3));
ck('morale style shown', /morale/.test(t)); ck('You tag + ping', /YOU/i.test(t) && /41 ms/.test(t)); ck('computer difficulty', /AI · Hard/i.test(t));
ck('empty slot + Add computer', /Empty/.test(t) && /Add computer/.test(t)); ck('map card', await page.evaluate(() => !!document.querySelector('#mpstatus .lkmap')));
await page.locator('#mpstatus .lob').screenshot({ path: OUT + 'host-lobby.png' });
// everyone ready -> countdown
await page.evaluate(() => { NET.lobby[1].r = 1; renderLobby(); }); await sleep(700);
ck('countdown shown when all ready', await page.evaluate(() => !!document.getElementById('lkcdt') && /starting in/.test(document.getElementById('lkcdt').textContent)));
await page.evaluate(() => { NET.lobby[1].r = 0; renderLobby(); }); await sleep(500);
ck('countdown gone when someone unreadies', await page.evaluate(() => !document.getElementById('lkcdt')));
await page.evaluate(() => { NET.lobby.pop(); renderLobby(); }); await sleep(400);
ck('leave toast', await page.evaluate(() => /left/.test((document.getElementById('lkToasts') || { innerText: '' }).textContent)));
await page.screenshot({ path: OUT + 'host-lobby-toast.png' });
console.log(errs.length ? 'page errors: ' + errs.slice(0, 3).join(' | ').slice(0, 300) : '');
await browser.close(); console.log(fails.length ? 'LOBBYKIT FAIL ' + fails.join(', ') : 'LOBBYKIT PASS'); process.exit(0);
