// QA: main menu + settings + multiplayer panel on desktop and phones. Screenshots + layout audit (off-screen,
// clipped, overlapping, too-small touch targets) + the labels a player reads.
//   node orch/qa-menu.mjs [--vp fhd,hd,phoneP,phoneL]
import { startServer, launch, openPage, toMenu, shot, layoutAudit, sleep } from './qa-lib.mjs';
const vpArg = (process.argv[process.argv.indexOf('--vp') + 1] || '');
const VPS = process.argv.includes('--vp') ? vpArg.split(',') : ['fhd', 'hd', 'phoneP', 'phoneL'];
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [];
for (const vp of VPS) {
  const { ctx, page } = await openPage(browser, origin, vp, errs);
  await toMenu(page, url);
  await shot(page, `menu-${vp}.png`);
  const info = await page.evaluate(() => {
    const t = id => { const e = document.getElementById(id); return e ? { text: (e.innerText || '').trim().slice(0, 120), hidden: e.hidden || getComputedStyle(e).display === 'none', disabled: e.disabled } : null; };
    return { start: t('start'), host: t('host'), sandbox: t('sandbox'), games: t('games'), mpstatus: t('mpstatus'),
      buttons: [...document.querySelectorAll('#menu button')].filter(b => b.offsetParent).map(b => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 80),
      headings: [...document.querySelectorAll('#menu .label, #menu h1, #menu h2')].map(e => e.innerText.trim()).slice(0, 30),
      scrollH: document.getElementById('menu').scrollHeight, H: innerHeight };
  });
  console.log(`\n=== ${vp} menu ===`); console.log(JSON.stringify(info, null, 1).slice(0, 3000));
  console.log('layout:', JSON.stringify(await layoutAudit(page, '#menu'), null, 1));
  // settings
  await page.click('#openSettings').catch(e => errs.push(`[${vp}] could not click Settings: ` + e.message.split('\n')[0]));
  await sleep(500);
  await shot(page, `settings-${vp}.png`);
  const sInfo = await page.evaluate(() => [...document.querySelectorAll('#settings .label')].map(e => e.innerText.trim()).filter(Boolean));
  console.log('settings labels:', JSON.stringify(sInfo));
  console.log('settings layout:', JSON.stringify(await layoutAudit(page, '#settings'), null, 1));
  await page.click('#sDone').catch(e => errs.push(`[${vp}] could not click Settings Done: ` + e.message.split('\n')[0]));
  await sleep(300);
  const backToMenu = await page.evaluate(() => document.getElementById('settings').hidden && !document.getElementById('menu').hidden);
  if (!backToMenu) errs.push(`[${vp}] Settings > Done did not return to the menu`);
  await ctx.close();
}
await browser.close(); server.close();
console.log('\nERRORS:\n' + [...new Set(errs)].join('\n'));
