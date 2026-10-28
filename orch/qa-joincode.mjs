// QA: "Join by code" edge cases a friend hits: empty box, a wrong code, an invite link pasted whole, through the local
// game server (wrangler dev). Prints the status text the player sees for each, with a screenshot of the wrong-code case.
//   node orch/qa-joincode.mjs [--vp phoneP]
import { startServer as startStatic, launch, openPage, toMenu, shot, sleep } from './qa-lib.mjs';
import { startServer as startGameServer, guardContext } from './serverdev.mjs';
const VP = process.argv.includes('--vp') ? process.argv[process.argv.indexOf('--vp') + 1] : 'phoneP';
const SRV = await startGameServer();
const { server, origin, url } = await startStatic();
const browser = await launch();
const errs = [];
const { ctx, page } = await openPage(browser, origin, VP, errs, { allowHosts: [SRV.url], dpr: 1 });
await guardContext(ctx, SRV.url);
await ctx.addInitScript((u) => { window.WW3_SERVER = u; }, SRV.url);
await toMenu(page, url); await sleep(3000);
for (const [label, code] of [['empty', ''], ['wrong code', 'qqqqqq'], ['invite link', 'https://abdullahhaidar5-ux.github.io/ww3/#join=abc123'], ['spaces+caps', '  ABC 123 ']]) {
  await page.fill('#jcode', code);
  const b = await page.$('.joinrow button'); await b.scrollIntoViewIfNeeded(); VP.startsWith('phone') ? await b.tap() : await b.click();
  await sleep(9000);
  const st = await page.evaluate(() => ({ status: $('mpstatus').innerText.replace(/\s+/g, ' ').slice(0, 250), inBattle: !!(typeof G !== 'undefined' && G), hostBtn: $('host').innerText + ($('host').hidden ? '(hidden)' : '') + ($('host').disabled ? '(off)' : ''), cancel: !!document.querySelector('#menu button:not([hidden])') && [...document.querySelectorAll('#menu button')].filter(x => x.offsetParent && /cancel|leave/i.test(x.innerText)).map(x => x.innerText.trim()) }));
  console.log(`${label} "${code}": ${JSON.stringify(st)}`);
  if (label === 'wrong code') await shot(page, `joincode-wrong-${VP}.png`);
  const c = await page.evaluateHandle(() => [...document.querySelectorAll('#menu button')].find(x => x.offsetParent && /cancel|leave/i.test(x.innerText))); if (c.asElement()) { await c.asElement().click().catch(() => {}); await sleep(1000); }
}
await browser.close(); server.close(); SRV.stop();
console.log('ERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
process.exit(0);
