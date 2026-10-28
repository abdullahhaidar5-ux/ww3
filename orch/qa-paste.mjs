// QA: what "Join by code" reads from the host's copied invite message (inviteText) pasted into the box.
//   node orch/qa-paste.mjs
import { startServer, launch, openPage, toMenu } from './qa-lib.mjs';
const { server, origin, url } = await startServer(); const b = await launch(); const errs = [];
const { page } = await openPage(b, origin, 'hd', errs); await toMenu(page, url);
const inv = await page.evaluate(() => { NET.code = 'k7p2xq'; const t = inviteText(); NET.code = null; return t; });
await page.fill('#jcode', inv);
console.log(JSON.stringify({ inv, boxValue: await page.inputValue('#jcode'), parsed: await page.evaluate(() => codeFrom($('jcode').value)), fullParsed: await page.evaluate((s) => codeFrom(s), inv) }));
await page.evaluate(()=>{ $('jcode').value=''; }); await page.focus('#jcode');
await page.evaluate((t) => navigator.clipboard ? 0 : 0, inv);
// real paste event
await page.evaluate((t)=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); $('jcode').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); }, inv);
console.log('after paste event, box:', await page.inputValue('#jcode'));
await b.close(); server.close();
