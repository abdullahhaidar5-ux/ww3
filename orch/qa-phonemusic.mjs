// QA: on an iPhone-sized touch screen with normal autoplay rules, does music start after the first tap, and does the
// battle soundtrack / anthem play after tapping Deploy? Prints sndStatus() at each step.
//   node orch/qa-phonemusic.mjs [--nat EG]
import { startServer, launch, openPage, toMenu, waitLoaded, sleep } from './qa-lib.mjs';
import { createRequire } from 'node:module';
const NAT = process.argv.includes('--nat') ? process.argv[process.argv.indexOf('--nat') + 1] : 'EG';
const { server, origin, url } = await startServer();
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('/opt/npm-tools/node_modules/playwright'));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); // normal autoplay rules
const errs = [];
const { page, ctx } = await openPage(b, origin, 'phoneP', errs, { dpr: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
await toMenu(page, url);
const st = () => page.evaluate(() => { try { return sndStatus(); } catch (e) { return 'sndStatus error ' + e.message; } });
console.log('before tap:', await st());
await page.touchscreen.tap(200, 300); await sleep(4000);
console.log('after first tap:', await st());
await page.evaluate((n) => { setup.p = n; setup.n = 1; }, NAT);
const d = await page.$('#start'); await d.scrollIntoViewIfNeeded(); await d.tap();
await waitLoaded(page); await sleep(8000);
console.log('in battle:', await st());
await sleep(20000); console.log('20 s later:', await st());
await b.close(); server.close();
console.log('ERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
