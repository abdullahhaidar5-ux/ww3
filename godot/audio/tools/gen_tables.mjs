// Builds godot/audio/audio_tables.json from the browser game's own audio tables (src/09*.js, sfx/manifest.json),
// so the Godot edition plays the same clips. Run: node godot/audio/tools/gen_tables.mjs   (re-run when voices are re-recorded)
import fs from 'fs';
const R = f => fs.readFileSync(new URL('../../../' + f, import.meta.url), 'utf8');
const grab = (src, name) => { const m = src.match(new RegExp('^const ' + name + '=(\\{.*?\\});', 'm')); if (!m) throw new Error('missing ' + name); return (new Function('return ' + m[1]))(); };
const A = R('src/09-audio.js'), S = R('src/09c-shouts.js'), N = R('src/09d-announcer.js'), B = R('src/09b-radio.js');
const PLAY = ['IR','RS','DW','RV','OB','US','GB','FR','DE','IL','UA','RU','CN','KP','IN','JP','KR','PK','SA','AE','TR','EG'];
const pick = T => Object.fromEntries(PLAY.map(k => { if (!T[k]) throw new Error('no table row for ' + k); return [k, T[k]]; }));
const man = JSON.parse(R('sfx/manifest.json')), stm = JSON.parse(R('mus/st/manifest.json'));
const ANN_LANG = { IR: 'fa', RS: 'ar', DW: 'ar', RV: 'ar', OB: 'ar', SA: 'ar', AE: 'ar', EG: 'ar', RU: 'ru', CN: 'zh', IL: 'he' };
const out = {
  playable: PLAY,
  vo: pick(grab(A, 'VO_MAP')), vor: pick(grab(A, 'VOR')), voh: pick(grab(A, 'VOH')), vos: pick(grab(S, 'VOS')),
  role: grab(A, 'VO_ROLE'), radgap: grab(B, 'RADGAP'),
  ann: grab(N, 'ANN_OFF'), ann_lang: ANN_LANG,
  sfx: { clips: man.clips, loops: man.loops, credits: man.credits },
  tracks: stm.map(t => ({ id: t.id, pool: t.pool, title: t.title, author: t.author, lic: t.licence, sec: t.duration_s })),
};
for (const k of PLAY) for (const s of ['', '_r', '_h', '_s']) if (!fs.existsSync(new URL('../../../vo/' + k + s + '.mp3', import.meta.url))) throw new Error('missing vo/' + k + s + '.mp3');
fs.writeFileSync(new URL('../audio_tables.json', import.meta.url), JSON.stringify(out));
console.log('audio_tables.json', JSON.stringify(out).length, 'bytes;', PLAY.length, 'nations; vo keys', Object.keys(out.vo.IR), 'kinds', out.vo.IR.l.length, 'cries', out.vo.IR.c && out.vo.IR.c.map(x => x ? x.length : 0), '; shout keys', Object.keys(out.vos.IR), '; voh keys', Object.keys(out.voh.IR).join(','));
