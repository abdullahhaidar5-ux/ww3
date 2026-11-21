// Extracts the rules tables of the browser game (src/, read-only) for the Godot port into godot/data/*.json.
// Values are taken from the RUNNING sim (stats()/bstats() resolve every per-nation modifier: FACTIONS.mods, XL, XLB, BAL,
// SPEC, NEWNAT...), so the Godot side reads final numbers and never re-implements the resolution chain.
//   node tools-godot/extract.mjs [--facs IR,RS,US,IL] [--maps strait,bm_splitridge]
import fs from 'node:fs';
import path from 'node:path';
import { makeSim } from '../orch/headless.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FACS = arg('facs', 'IR,RS,US,IL').split(','), MAPS = arg('maps', 'strait').split(',');
const OUT = path.resolve('godot/data'); fs.mkdirSync(OUT, { recursive: true });
const { W } = makeSim();
// a Battle has to be running for battle-only rules (gen allowed, light economy, uplink in battle mode)
W.start({ seed: 1, facs: [FACS[0], FACS[1]], map: MAPS[0], battle: 1 });
const J = s => W.ev(`JSON.stringify(${s})`);
const rules = JSON.parse(J(`(()=>{
  const clean=o=>JSON.parse(JSON.stringify(o));
  const facs=${JSON.stringify(FACS)},out={};
  for(const f of facs){const F=FACTIONS[f],r=roster(f),units={},blds={};
    const kinds=new Set(['harv','dozer',...allUnits(f)]);
    for(const k of kinds){try{const s=clean(stats(f,k));s.kind=k;s.ammoCap=ammoCap(s);s.pop=popOf(s);s.prodTime=prodTime({fac:f,upg:{},_uk:null,gdoc:null,F},Object.assign({},s,{kind:k}));units[k]=s;}catch(e){units[k]={err:String(e)};}}
    for(const k of Object.keys(STRUCT)){if(!bldAllowed(f,k))continue;try{const s=clean(bstats(f,k));s.kind=k;s.req=STRUCT[k].req||null;s.shore=!!STRUCT[k].shore;blds[k]=s;}catch(e){}}
    const upg={};for(const k of upgList(f))if(UPG[k])upg[k]=clean(UPG[k]);
    out[f]={name:F.name,mods:clean(F.mods||{}),special:F.special,extra:F.extra||[],tunnels:!!F.tunnels,post:!!F.post,noAir:!!F.noAir,noShip:!!F.noShip,
      morale:MORALE_STYLE[f]||'home',nobreak:!!(typeof NOBREAK!=='undefined'&&NOBREAK[f]),econLight:ECON_LIGHT[f]||[1,1],genName:GENN[f]||null,
      roster:r,units,blds,upgList:upgList(f),upg,doctrineAI:GDOC_AI[f]||'arm',doct:DOCT[f]||{},natpow:NATPOW[f]||null,gpow:GPOW[f]||null,sup:clean(swSup(f))};}
  return {
    version:1,source:'src/ (browser game) via tools-godot/extract.mjs',
    CELL,BATTLE,POP_CAP,POP_CAP_SMALL,HC,OIL_HP,TB_HP,PW_R,PW_FIX,SELL_T,SELL_PCT,REP_T,REP_COST,ZONE_R,ENEMY_R,FRONT_R,ONSITE_R,
    AMMOT:{R:AMMOT_R,CAP:AMMOT_CAP,FILL:AMMOT_FILL,RATE:AMMOT_RATE,N:AMMOT_N},SUP_R,SUP_NOB,
    PF:{RATE:PF_RATE,BURST:PF_BURST,MS:PF_MS,N:PF_N},
    VS:clean(VS),MOVE:clean(MOVE),DIFF:clean(DIFF),AIORDER,BUILD_ORDER,CATS,POWER:clean(POWER),
    MSTYLES:clean(MSTYLES),RANKS,TB:clean(TB),ECON_RATE,FL_MAX,WEATHER_CLEAR:clean(WEATHER.clear),
    FROW:clean(FROW),WHEELED:[...WHEELED],ROAD_W,ROAD_T,
    factions:out};})()`));
fs.writeFileSync(path.join(OUT, 'rules.json'), JSON.stringify(rules, null, 1));
console.log('rules.json:', Object.keys(rules.factions).map(f => `${f} ${Object.keys(rules.factions[f].units).length}u/${Object.keys(rules.factions[f].blds).length}b/${Object.keys(rules.factions[f].upg).length}upg`).join(' '));
// maps: everything the battle reads from the map after newGame (grid, cover, roads, heights, bases, fields, derricks, tech buildings)
for (const mk of MAPS) {
  W.start({ seed: 1, facs: [FACS[0], FACS[1]], map: mk, battle: 1 });
  const m = JSON.parse(J(`(()=>{const rm=G.roadMask,h=G.hgrid;return {key:G.mapKey,name:(MAPS[G.mapKey]||{}).name,MAPW,MAPH,GW,GH,CELL,
    bases:BASES.map(b=>[b[0],b[1]]),grid:Array.from(G.grid),cover:Array.from(G.cover),wood:Array.from(G.wood||[]),
    road:rm?{C:rm.C,w:rm.w,d:Array.from(rm.d)}:null,hgrid:h?{R:h.R,w:h.w,h:h.h,a:Array.from(h.a,v=>Math.round(v*100)/100)}:null,
    fields:G.fields.map(f=>({x:f.x,y:f.y,r:f.r,amt:f.amt})),
    oil:G.oil.map(o=>({x:o.x,y:o.y,tb:o.tb||null,pw:o.pw||0,sea:o.sea||0,max:o.max}))};})()`));
  fs.writeFileSync(path.join(OUT, 'map_' + m.key + '.json'), JSON.stringify(m));
  console.log(`map_${m.key}.json (asked ${mk}): ${m.MAPW}x${m.MAPH} grid ${m.GW}x${m.GH}, ${m.fields.length} fields, ${m.oil.length} derricks/tech`);
}
