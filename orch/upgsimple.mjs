// upgsimple guard (Abdullah 2026-11-14 "simplify the list of upgrades and powers"): every upgrade is researched at a building (`at`),
// at most 4 upgrades per building per nation, at most 6 active powers per nation (+ passive Cash Bounty), every power-using building
// is marked on its Build button (data-pw + lightning mark), and upgrade buttons carry data-from. Static + vm of src/01-data.js.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const fails = []; const ck = (c, m) => { if (!c) fails.push(m); };
const src = fs.readFileSync(path.join(ROOT, 'src/01-data.js'), 'utf8');
const ctx = { console, window: {}, document: undefined, G: null, Math, JSON, Object, Array, Set, Map, Date, Number, String };
vm.createContext(ctx);
try { vm.runInContext(src + '\n' + fs.readFileSync(path.join(ROOT, 'src/01c-jp.js'), 'utf8') + '\n;globalThis.__X={PLAYABLE,UPG,UPGL,POWERS,POW_KEEP,sigBan,pwNeed,POWER,BB_NAT,upgList,FACTIONS};', ctx); } catch (e) { fails.push('01-data.js does not load in vm: ' + e.message); }
const X = ctx.__X;
if (X) {
  for (const f of X.PLAYABLE.filter(f => X.FACTIONS[f])) {
    const L = X.upgList(f), per = {};
    for (const k of L) { const U = X.UPG[k]; if (!U) { fails.push(`${f}: upgrade ${k} has no row`); continue; } ck(!!U.at && !!X.UPG[k].name, `${f}/${k}: upgrade without a building`); per[U.at] = (per[U.at] || 0) + 1; }
    for (const b in per) ck(per[b] <= 4, `${f}: ${per[b]} upgrades at ${b} (max 4)`);
    const act = Object.keys(X.POWERS).filter(k => !X.sigBan(f, k) && !X.POWERS[k].passive);
    ck(act.length <= 6, `${f}: ${act.length} active powers (${act}) - max 6`);
  }
  ck(!X.upgList('US').includes('smug'), 'Smuggling Routes must not be offered in Conquest/Battle');
  ck(X.pwNeed('sam') === 8 && X.pwNeed('gen') < 0 && X.pwNeed('barracks') === 0, 'pwNeed must follow the POWER table');
}
const ui = fs.readFileSync(path.join(ROOT, 'src/08-ui.js'), 'utf8');
ck(ui.includes('dataset.from=U.at'), 'upgrade buttons need data-from');
ck(ui.includes('dataset.pw=') && ui.includes("className='pw'"), 'power buildings need data-pw + the lightning mark on the Build button');
ck(ui.includes('Needs power: ') && ui.includes('Gives power: '), 'Build hover text must say Needs power / Gives power');
ck(ui.includes('function pwPlaceTip'), 'placement must show whether power would go red');
console.log(fails.length ? 'UPGSIMPLE FAIL\n' + fails.join('\n') : 'UPGSIMPLE PASS'); process.exit(fails.length ? 1 : 0);
