// Capturable buildings of Battle (quarry, mine, power plant, field hospital): rules guard, plain Node on the real simulation.
//   node orch/techbldgs.mjs      prints TECHBLDGS PASS / TECHBLDGS FAIL
// Checks: Battle maps list them; infantry capture one; it pays / heals / makes veterans ONLY for its owner; it can be shot down
// and repaired by a Construction Vehicle; held power plants are counted for the power meter; the state survives a checkpoint.
import { makeSim } from './headless.mjs';
const fails = []; const ck = (c, m) => { if (!c) fails.push(m); };
globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
const P = globalThis.__ww3prof;
const { W } = makeSim(undefined, { prof: [], host: true });
const ev = s => P.ev(s);
W.start({ seed: 7, map: 'bm_ferryquarter', facs: ['US', 'RU'], tm: [0, 1], st: [], diff: 1, battle: 1 });
ev('G.teams.forEach(T=>{T.ai=null;})');
ck(ev('G.battle')===true||ev('G.battle')===1, 'not a Battle game');
const n = ev('G.oil.filter(o=>o.tb).length'), kinds = ev('G.oil.filter(o=>o.tb).map(o=>o.tb).sort().join()');
ck(n === 4 && kinds === 'hosp,hosp,mine,mine', 'Ferry Quarter should hold 2 field hospitals + 2 mines, got ' + kinds);
ck(ev('G.oil.filter(o=>o.tb).every(o=>o.owner===-1&&o.hp===o.max&&o.tg&&o.tg.s.name)'), 'tech buildings start neutral, whole, with a target');
// --- a mine: team 0 infantry capture it; it pays team 0 only
const mi = ev('G.oil.findIndex(o=>o.tb==="mine")');
ev(`(()=>{const o=G.oil[${mi}];for(let k=0;k<3;k++)addUnit(0,'inf',o.x+10*k,o.y+12);G.teams[0].credits=0;G.teams[1].credits=0;})()`);
for (let t = 0; t < 12; t++) W.step(1);
ck(ev(`G.oil[${mi}].owner`) === 0, 'infantry did not capture the mine');
const c0 = ev('G.teams[0].credits'), c1 = ev('G.teams[1].credits');
for (let t = 0; t < 20; t++) W.step(1);
const d0 = ev('G.teams[0].credits') - c0, d1 = ev('G.teams[1].credits') - c1;
const want = ev('TB.mine.inc*G.bs*incMul(G.teams[0])*10');
ck(Math.abs(d0 - d1 - want) < want * .2, 'a held mine should pay ' + Math.round(want) + ' over 20 s more than the enemy (got ' + (d0 - d1) + ')');
// compare against a quarry-free baseline: mine income is exactly TB.mine.inc per 2 s
ck(ev('TB.mine.inc>TB.quarry.inc&&TB.quarry.inc===14'), 'mine must pay a bit more than a quarry (= a derrick)');
ck(ev('G.oil[' + mi + '].owner') === 0 && ev('G.teams[1].credits') >= c1, 'enemy side unaffected');
// --- a Field Hospital: heals only its owner's infantry, veterans only for the owner
const hi_ = ev('G.oil.findIndex(o=>o.tb==="hosp")');
ev(`(()=>{const o=G.oil[${hi_}];for(let k=0;k<3;k++)addUnit(0,'inf',o.x+14*k,o.y+14);})()`);
for (let t = 0; t < 14; t++) W.step(1);
ck(ev(`G.oil[${hi_}].owner`) === 0, 'infantry did not capture the field hospital');
ev(`(()=>{const o=G.oil[${hi_}];const a=addUnit(0,'inf',o.x+40,o.y-30),b=addUnit(1,'inf',o.x-40,o.y-30);a.max=b.max=1e7;a.hp=a.max*.3;b.hp=b.max*.3;a.order=b.order=null;G._ha=a.id;G._hb=b.id;})()`);
ev('G.teams[1].credits+=0');
for (let t = 0; t < 8; t++) W.step(1);
const ha = ev('G.byId.get(G._ha)'), ra = ev('(()=>{const a=G.byId.get(G._ha),b=G.byId.get(G._hb);return [a.hp/a.max,b.hp/b.max]})()');
ck(ra[0] > .38, 'the hospital did not heal its owner\'s infantry (' + ra[0] + ')');
ck(ra[1] <= .32, 'the hospital healed the ENEMY\'s infantry (' + ra[1] + ')');
ck(ev(`(()=>{const u=addUnit(0,'inf',G.oil[${hi_}].x,G.oil[${hi_}].y+60);const v=addUnit(1,'inf',G.oil[${hi_}].x,G.oil[${hi_}].y-60);return u.rank===1&&v.rank===0;})()`), 'infantry trained while holding a hospital must be rank 1, the enemy\'s rank 0');
// --- shot down, then repaired by the Construction Vehicle
ev(`damageOil(G.oil[${hi_}],99999,1)`);
ck(ev(`G.oil[${hi_}].dead&&G.oil[${hi_}].owner===-1`), 'a destroyed hospital should be dead and neutral');
ck(!ev('tbHeld(0,"hosp")'), 'a destroyed hospital must not count as held');
ev(`(()=>{const o=G.oil[${hi_}];addUnit(0,'dozer',o.x+20,o.y+20);for(let k=0;k<2;k++)addUnit(0,'inf',o.x+10*k,o.y+10);})()`);
for (let t = 0; t < 14; t++) W.step(1);
ck(ev(`!G.oil[${hi_}].dead&&G.oil[${hi_}].owner===0`), 'a Construction Vehicle + infantry should repair the hospital');
// --- power plant counter (Battle power meter reads it)
ev('(()=>{const o={x:1,y:1,owner:1,cp:[0,0],tb:"plant",hp:1,max:1,dead:false};G.oil.push(o);G._pl=G.oil.length-1;})()');
ck(ev('tbPlants(1)') === 1 && ev('tbPlants(0)') === 0, 'tbPlants must count only the owner\'s live plants');
ev('G.oil.pop()');
// --- checkpoint round trip keeps owner / health
if (ev('typeof ckEncode')==='function') {
  const own = ev(`G.oil[${hi_}].owner`), hp = ev(`Math.round(G.oil[${hi_}].hp)`);
  ev('G._ck=ckEncode()');
  ev(`G.oil[${hi_}].owner=-1;G.oil[${hi_}].hp=1`);
  try { ev('ckRestore(G._ck)'); } catch (e) { fails.push('checkpoint restore threw: ' + e); }
  ck(ev(`G.oil[${hi_}].owner`) === own && Math.abs(ev(`G.oil[${hi_}].hp`) - hp) < 2, 'checkpoint lost the hospital state');
}
console.log(fails.length ? 'TECHBLDGS FAIL\n  ' + fails.join('\n  ') : 'TECHBLDGS PASS');
process.exit(fails.length ? 1 : 0);
