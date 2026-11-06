// Politics & intel probe: world opinion, spies, decoys, refugees, radio station + leaflets, local militias.  node orch/politics-test.mjs [map]
import { makeSim } from './headless.mjs';
const { W } = makeSim();
let bad = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); if (!c) bad++; };
W.start({ seed: 5, facs: ['IR', 'US'], map: process.argv[2] || 'zagros' });
W.ev('(()=>{for(const T of G.teams)T.ai=null;})()');
W.step(95);
const J = s => JSON.parse(W.ev(`JSON.stringify(${s})`));
// --- opinion
ok('opinion starts', J('opOf(G.teams[0])') >= 62);
W.ev(`(()=>{const t=G.towns.find(t=>!t.ham)||G.towns[0];for(const c of t.cells)if(c.key)c.ow=1;G.pt=t.i;})()`); W.step(3);
const o0 = J('opOf(G.teams[0])');
W.ev(`(()=>{const t=G.towns[G.pt];for(let i=0;i<40;i++)explode(t.x,t.y,60,90,0,'shell','shell');})()`); W.step(1);
const o1 = J('opOf(G.teams[0])'); ok('shelling a town lowers opinion', o1 < o0 - 1, o0 + ' -> ' + o1);
W.ev(`G.teams[0].op=20`); const m = J('polMul(G.teams[0])'); ok('sanctions at op 20', m < .9 && m >= .75, m);
W.ev(`G.teams[0].op=95;G.teams[0].aidT=1;G.teams[0].credits=0`); W.step(2); ok('foreign aid at 95', J('G.teams[0].credits') > 50, J('G.teams[0].credits'));
W.ev(`G.teams[0].op=62;G.teams[0].opT=-999`); W.step(60); ok('clean war rebuilds', J('opOf(G.teams[0])') > 62.5, J('opOf(G.teams[0])'));
// --- spy: steal money from enemy HQ
W.ev(`(()=>{const h=G.ents.find(e=>e.kind==='hq'&&e.team===1);const u=addUnit(0,'spy',h.x-50,h.y-50);G.spyId=u.id;G.hqId=h.id;G.teams[1].credits=5000;G.teams[0].credits=100;u.detT=0;})()`);
ok('spy hidden from enemy', J('hiddenNow(G.byId.get(G.spyId))') === true);
W.ev(`polSpyCmd(0,{ids:[G.spyId],k:'steal',tid:G.hqId})`); W.step(1);
ok('spy has a job', J('!!G.byId.get(G.spyId).sj') || J('G.byId.get(G.spyId).spCd>0'));
W.step(25); const c0 = J('G.teams[0].credits'); ok('spy stole money', c0 > 400, c0 + ' enemy ' + J('G.teams[1].credits|0'));
// --- sabotage + bribe + upgrade theft
W.ev(`(()=>{const h=G.ents.find(e=>e.kind==='hq'&&e.team===0);const u=addUnit(0,'spy',h.x+60,h.y+60);G.spyId=u.id;})()`);
W.ev(`(()=>{const o=G.oil.findIndex(q=>q.pw&&q.owner===1);G.pwi=o;if(o>=0){const q=G.oil[o],u=G.byId.get(G.spyId);u.x=q.x+60;u.y=q.y+60;}})()`);
console.log('power plant idx', W.ev('G.pwi'));
if (J('G.pwi') >= 0) { W.ev(`polSpyCmd(0,{ids:[G.spyId],k:'sabo',fi:G.pwi})`); W.step(30); ok('power plant sabotaged', J('G.oil[G.pwi].sab>G.t')); }
W.ev(`(()=>{const h=G.ents.find(e=>e.kind==='hq'&&e.team===0);const t=G.towns[G.pt];const u=addUnit(0,'spy',t.x+80,t.y+80);G.spyId=u.id;t.un=10;G.teams[0].credits=2000;t.ow=1;polSpyCmd(0,{ids:[G.spyId],k:'bribe',ti:t.i});})()`); W.step(6);
ok('bribe raises unrest', J('G.towns[G.pt].un') > 30 || J('G.towns[G.pt].ow') < 0, J('G.towns[G.pt].un'));
// spotted by infantry
W.ev(`(()=>{const u=G.byId.get(G.spyId);const e=addUnit(1,'inf',u.x+20,u.y);})()`); W.step(2);
ok('spy spotted by close infantry', J('hiddenNow(G.byId.get(G.spyId))') === false);
// --- decoys
W.ev(`(()=>{const h=G.ents.find(e=>e.kind==='hq'&&e.team===0);const d=addUnit(0,'dtank',h.x+300,h.y);G.decId=d.id;const e=addUnit(1,'inf',d.x+30,d.y);polDecoys();})()`);
ok('decoy looks real (name)', J('G.byId.get(G.decId).s.name') !== 'Decoy Tank', J('G.byId.get(G.decId).s.name'));
ok('decoy exposed by close enemy', J('(G.byId.get(G.decId).exp||[]).includes(1)'));
ok('decoy has 1 hp', J('G.byId.get(G.decId).hp') <= 1);
// --- radio station
W.ev(`(()=>{const T=G.teams[0];T.credits=9000;const h=G.ents.find(e=>e.kind==='hq'&&e.team===0);const p=aiFindSpot(0,'radio',h);G.rp=p;if(p)placeBld(0,'radio',p[0],p[1]);})()`);
ok('radio placeable', J('!!G.rp'));
W.ev(`(()=>{const b=G.ents.find(e=>e.kind==='radio');b.built=1;})()`); W.step(2);
ok('radio on the air', J('G.radios.length') === 1);
W.ev(`(()=>{const l=G.towns.filter(t=>t.i!==G.pt)[0];G.lt=l.i;for(const c of l.cells)if(c.key)c.ow=1;})()`); W.step(3);
W.ev(`(()=>{const t=G.towns[G.lt];t.un=10;t.shock=0;G.teams[0].credits=2000;G.teams[0].leafT=0;G.lun0=t.un;const b=G.ents.find(e=>e.kind==='radio');b.x=t.x+200;b.y=t.y;polRadios();polLeaf(0,{ti:t.i});})()`);
W.step(10); ok('leaflet drop raises unrest', J('G.leaf.length')>0&&J('G.towns[G.lt].un')>J('G.lun0'), J('G.towns[G.lt].un'));
// --- refugees + militias (a town of ours, held long, with enemy troops at its gates)
W.ev(`(()=>{const t=G.towns.find(q=>q.i!==G.pt&&q.i!==G.lt&&!q.ham)||G.towns[G.towns.length-1];G.pt=t.i;for(const c of t.cells)if(c.key)c.ow=0;t.reb=0;t.rebU=[];})()`); W.step(3);
W.ev(`(()=>{const t=G.towns[G.pt];t.hold=G.t-300;t.un=5;t.fresh=0;t.rate=0;})()`); W.step(2);
W.ev(`(()=>{const t=G.towns[G.pt];t.cwT=G.t;t.refT=0;t.autoT=0;t.mil=[];for(let i=0;i<4;i++)addUnit(1,'tank',t.x+380+i*20,t.y);})()`); W.step(3);
ok('refugees leave a shelled town', J('(G.refs||[]).length') > 0, J('(G.refs||[]).length'));
if (J('(G.refs||[]).length') > 0) { const before = J('opOf(G.teams[1])'); W.ev(`(()=>{const r=G.refs[0],p=refPos(r);explode(p[0],p[1],40,80,1,'shell','shell');})()`); W.step(1); ok('hitting refugees costs opinion', J('opOf(G.teams[1])') < before, before + ' -> ' + J('opOf(G.teams[1])')); }
ok('free militia when attacked', J('G.towns[G.pt].mil.filter(u=>!u.dead).length') >= 1, 'loy ' + J('G.towns[G.pt].loy') + ' fr ' + J('G.towns[G.pt].fr') + ' mil ' + J('G.towns[G.pt].mil.length'));
W.ev(`(()=>{const t=G.towns[G.pt];t.un=90;t.insT=0;t.rebU=[];})()`); W.step(2);
ok('angry town arms rebels', J('G.towns[G.pt].rebU.length') >= 1, J('G.towns[G.pt].rebU.length'));
W.step(120);
console.log(bad ? 'POLITICS FAIL ' + bad : 'POLITICS PASS');
process.exit(bad ? 1 : 0);
