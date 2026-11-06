// Generates src/13-grandmap.js: the stylised world map of the grand campaign (Abdullah 2026-11-05 19:41).
//   node orch/grandmap-gen.mjs        (deterministic; edit the tables below, rerun, rebuild)
// Provinces are Voronoi cells around seed points. Seeds are written in lon/lat and warped by a piecewise-linear
// projection that magnifies the five focus regions; a relaxation pass keeps every seed >= MIN px from its neighbours.
// Adjacency comes from the cell raster, so what you see is what connects. Output is baked (no runtime randomness).
import fs from 'node:fs';
const W = 2400, H = 1200;
const LX = [[-180,10],[-130,40],[-60,400],[-12,470],[70,1450],[90,1650],[120,1900],[145,2200],[180,2370]];
const LY = [[75,40],[50,250],[10,700],[-10,820],[-45,1130],[-60,1180]];
const pw = (k, v) => { for (let i = 1; i < k.length; i++) { const a = k[i-1], b = k[i]; const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]); if (v >= lo && v <= hi) return a[1] + (b[1]-a[1]) * (v-a[0]) / (b[0]-a[0]); } return v < k[0][0] ? k[0][1] : k[k.length-1][1]; };
const gx = lon => pw(LX, Math.max(-180, Math.min(180, lon))), gy = lat => pw(LY, Math.max(-60, Math.min(75, lat)));
// nation: code|name|region|colour (majors take their colour from FACTIONS at runtime)
const NAT = `US|United States|NA|CA|Canada|NA|MX|Mexico|NA|CU|Cuba|NA|GT|Central America|NA|DO|Caribbean Isles|NA|VE|Venezuela|SAM|CO|Colombia|SAM|BR|Brazil|SAM|PE|Peru|SAM|AR|Argentina|SAM|CL|Chile|SAM|
GB|Britain|EU|FR|France|EU|DE|Germany|EU|ES|Spain|EU|IT|Italy|EU|PL|Poland|EU|SE|Sweden|EU|NO|Norway|EU|FI|Finland|EU|GR|Greece|EU|RO|Romania|EU|BY|Belarus|EU|UA|Ukraine|EU|RU|Russia|EU|KZ|Kazakhstan|EU|UZ|Uzbekistan|EU|AZ|Azerbaijan|EU|
TR|Turkey|ME|SY|Syria|ME|RS|Mountain Shias|ME|IL|Israel|ME|JO|Jordan|ME|IQ|Iraq|ME|KD|Kurdistan|ME|IR|Iran|ME|SA|Saudi Arabia|ME|AE|UAE|ME|OM|Oman|ME|KW|Kuwait|ME|QA|Qatar|ME|DW|Coffee Shias (Yemen)|ME|EG|Egypt|ME|LY|Libya|ME|SD|Sudan|ME|ET|Ethiopia|AF|DZ|Algeria|AF|MA|Morocco|AF|TN|Tunisia|AF|NG|Nigeria|AF|ML|Sahel|AF|TD|Chad|AF|CD|Congo|AF|KE|Kenya|AF|TZ|Tanzania|AF|AO|Angola|AF|ZA|South Africa|AF|
PK|Pakistan|SA|IN|India|SA|AF|Afghanistan|SA|BD|Bangladesh|SA|NP|Nepal|SA|LK|Sri Lanka|SA|MM|Myanmar|SEA|TM|Turkmenistan|SA|
CN|China|EA|KP|North Korea|EA|KR|South Korea|EA|JP|Japan|EA|TW|Taiwan|EA|MN|Mongolia|EA|VN|Vietnam|SEA|TH|Thailand|SEA|MY|Malaysia|SEA|ID|Indonesia|SEA|PH|Philippines|SEA|AU|Australia|OC|NZ|New Zealand|OC`.replace(/\n/g, '').split('|');
const NATS = []; for (let i = 0; i < NAT.length; i += 3) NATS.push([NAT[i], NAT[i+1], NAT[i+2]]);
// province: owner|name|lon|lat|terrain|towns|flags|battle map     terrain d desert, m mountain, f farmland, u urban, j jungle, s snow, c coast
// flags: C capital, W war goal, O oil, F farm, M mine, P port
const PR = `
MX|Mexico City|-99|20|u|3|C|
MX|Sonora|-110|29|d|2|W|
MX|Yucatan|-89|19|j|2|P|
CU|Havana|-86|23.5|u|3|CP|caribbean
CU|Camaguey|-79|22|j|2|FW|caribbean
CU|Santiago de Cuba|-72|19.5|m|2|P|caribbean
DO|Hispaniola|-66|17|j|2|P|
GT|Central America|-90|13|j|2|P|
VE|Caracas|-67|9|u|3|COP|
CO|Bogota|-74|3.5|m|2|CM|
BR|Brasilia|-50|-15|f|3|CF|
BR|Amazonia|-63|-4|j|2|M|
BR|Sao Paulo|-47|-24|u|3|PW|
BR|Northeast|-38|-8|j|2|P|
PE|Andes|-77|-11|m|2|CM|
AR|Buenos Aires|-62|-35|f|3|CP|
CL|Santiago|-71|-32|m|2|CM|
FR|Paris|2.4|48.6|u|3|C|
FR|Provence|5|43.6|c|2|PW|
DE|Berlin|13|52.5|u|3|C|
DE|Rhine|7.5|50|f|3|FW|rhine
ES|Madrid|-4|40.3|f|2|C|
ES|Andalusia|-4.5|37.2|c|2|PW|
IT|Rome|12.5|42|u|3|CP|
IT|Po Valley|9.5|45.2|f|3|FW|
PL|Warsaw|21|52|f|3|C|
SE|Stockholm|17|59|f|2|CP|
NO|Norway|8|61.5|m|2|CPO|
FI|Finland|26|63|s|2|C|
GR|Athens|23.5|38|c|2|CP|aegean
RO|Romania|25|45.5|f|2|CO|
BY|Belarus|28|53.5|f|2|C|
UA|Kyiv|31|50.5|u|3|C|dnipro
UA|Donbas|37.5|48|f|3|W|
UA|Odesa|31|46.3|c|2|P|crimea
UA|Lviv|24|49.5|f|2||
RU|Moscow|37.5|55.8|u|4|C|volga
RU|Leningrad|30|60.3|s|2|P|arctic
RU|Volga|47|51.5|f|3|FW|volga
RU|Caucasus|44|44.5|m|2|O|caucasus
RU|Urals|60|56|m|3|M|ural
RU|Siberia|78|58|s|2|O|taiga
RU|Far East|130|56|s|2|P|
KZ|Kazakh Steppe|67|48.5|d|2|CO|
UZ|Uzbekistan|65|41|d|2|C|
AZ|Baku|49.5|40.3|c|2|COP|
TM|Turkmenistan|58.5|39|d|2|CO|
TR|Istanbul|29|41.3|u|4|CP|bosphorus
TR|Ankara|33.5|39.8|f|3|W|anatolia
TR|Izmir|27|38|c|2|P|aegean
TR|Cilicia|34|36.8|c|2|PF|
TR|East Anatolia|40.5|39|m|2|M|
SY|Damascus|39.5|32.9|u|3|C|
SY|Aleppo|38.8|36.2|u|3|W|aleppo
SY|Latakia|35.2|35.2|c|2|P|
SY|Deir ez-Zor|42.2|34.6|d|2|O|euphrates
RS|Beirut|34.2|33.8|c|3|CP|lebanon
RS|South Lebanon|35.2|32.2|m|2|W|lebanon
RS|Bekaa|36.8|33.7|m|2|F|lebanon
IL|Tel Aviv|33.8|31.2|u|3|CP|
IL|Galilee|34.8|32.8|m|2|W|golan
IL|Negev|35|29.6|d|2|M|
JO|Jordan|37.3|30.9|d|2|C|
IQ|Baghdad|44.4|33.3|u|3|C|mesopotamia
IQ|Basra|47.6|30.4|c|3|OPW|mesopotamia
IQ|Mosul|42.8|36.4|f|2|O|
IQ|Anbar|41.4|32.2|d|2||
KD|Kurdistan|45.8|36.2|m|2|CO|
IR|Tehran|51.4|35.7|u|4|C|persia
IR|Isfahan|52.2|32.4|d|3|F|persia
IR|Khuzestan|48.8|31.4|d|3|OW|hawizeh
IR|Zagros|47.4|34.4|m|2|M|zagros
IR|Hormozgan|56.6|27.6|c|2|P|hormuz
IR|Khorasan|59.2|35.8|d|2|F|
SA|Riyadh|46.7|24.7|d|3|C|rubalkhali
SA|Eastern Province|50.2|26.6|d|3|OPW|gulf
SA|Hejaz|40|21.7|m|3|P|
SA|Asir|42.7|18.6|m|2|F|
SA|Tabuk|37.2|28.2|d|2|M|najd
KW|Kuwait|47.9|29.3|c|2|COP|kuwait
QA|Qatar|51.4|25|c|2|COP|
AE|Abu Dhabi|53.6|23.9|c|3|COP|emirates
AE|Dubai|56|25.6|c|3|PW|emirates
AE|Al Ain|55.9|23|d|2|M|
OM|Oman|58|20.5|d|2|CP|
DW|Sanaa|44.2|15.5|m|3|C|yemen
DW|Aden|45.2|12.9|c|2|PW|babelmandeb
DW|Hadramawt|49.6|15.8|d|2|O|yemen
DW|Tihama|42.6|14.2|c|2|PF|yemen
EG|Cairo|30.5|30.2|u|4|C|nile
EG|Alexandria|27.4|31.2|c|3|PF|delta
EG|Sinai|35|28.3|d|2|W|plateau
EG|Upper Egypt|32.4|25.6|d|3|F|nile
EG|Western Desert|26.5|26.5|d|1|O|sahara
LY|Tripolitania|14.5|32.5|d|2|CO|
LY|Cyrenaica|22.5|31.5|d|2|O|
SD|Khartoum|32.6|15.7|d|2|C|
SD|Darfur|25|13|d|1|M|
ET|Addis Ababa|38.8|9|m|2|C|
DZ|Algeria|3|33|d|2|COF|sahara
MA|Morocco|-6|32|d|2|CPM|
TN|Tunisia|9.5|35.5|c|2|CP|
ML|Sahel|-2|17|d|1|CM|
TD|Chad|17.5|14|d|1|C|
NG|Lagos|4|7|j|3|COP|
NG|Northern Nigeria|9.5|11.5|f|2|F|
CD|Congo|22|-2.5|j|2|CM|
KE|Kenya|37|-1|f|2|CP|
TZ|Tanzania|34.5|-6.5|j|2|CP|
AO|Angola|17|-12|f|2|CO|
ZA|Johannesburg|28|-26|u|3|CM|
ZA|Cape|19|-33|c|2|P|
PK|Punjab|73|31.8|f|3|CF|punjab
PK|Karachi|67.2|24.8|c|3|PW|
PK|Balochistan|64.6|28.9|d|2|M|
PK|Khyber|70.6|34.6|m|2|W|khyber
AF|Kabul|68.5|34.4|m|2|CM|hindukush
AF|Kandahar|65.5|31.3|d|2|F|
IN|Delhi|77.2|28.6|u|4|C|
IN|Mumbai|73|19.2|u|4|PW|
IN|Bengal|88|23|f|3|PF|
IN|Chennai|79.5|12.8|c|3|P|
IN|Kashmir|76.2|34.5|m|2|W|kashmir
IN|Rajasthan|71.8|26.4|d|2||
BD|Bangladesh|90.5|24|f|2|CPF|
NP|Nepal|84.5|28.3|m|2|C|
LK|Sri Lanka|80.7|7.5|j|2|CP|
MM|Myanmar|96|21|j|2|COP|
CN|Beijing|116.4|40|u|4|C|
CN|Shanghai|121.2|31.2|u|4|PW|yangtze
CN|Guangzhou|113.3|23.1|c|3|PF|
CN|Wuhan|113.5|30.6|r|3|F|yangtze
CN|Sichuan|104|30.6|m|3|M|
CN|Xinjiang|86|42.5|d|2|O|
CN|Tibet|89|32|m|1||
CN|Inner Mongolia|110|42.5|d|2|M|
MN|Mongolia|104|47.5|d|2|C|
KP|Pyongyang|125.7|39.2|u|3|C|dmz
KP|Hamgyong|128.6|41.8|m|2|WM|
KP|Hwanghae|124.6|37.6|f|2|F|
KR|Seoul|127|37|u|4|C|dmz
KR|Busan|129.2|35|c|3|PW|
KR|Gangwon|128.8|37.9|m|2|M|
JP|Tokyo|139.7|35.7|u|4|CP|harbour
JP|Osaka|135.5|34.3|u|3|PF|
JP|Hokkaido|142.8|43.2|s|2|W|
JP|Kyushu|130.7|32.4|m|2|PM|
TW|Taipei|121|24.4|c|3|CP|taiwan
VN|Hanoi|105.8|21|u|3|CF|
VN|Saigon|106.7|10.8|u|3|PF|
TH|Bangkok|100.5|13.7|u|3|CPF|
MY|Malaysia|102|4|j|2|CPO|
ID|Jakarta|106.8|-6.2|u|3|CP|
ID|Sumatra|101|-1|j|2|OP|
ID|Borneo|114|0.5|j|2|OM|
PH|Manila|121|14.6|u|3|CP|
PH|Mindanao|125.5|7.5|j|2|P|
NZ|New Zealand|174|-40|f|2|CP|
`.trim().split('\n').map(l => l.split('|'));
// sea zones: name|lon|lat|cost (turns to cross)|flag (choke = chokepoint strait, oil = giant oil sea? no)|big
const SEAS = `
North Pacific East|-140|42|2|
Gulf of Mexico|-92|25.5|1|
Caribbean Sea|-75|14|1|
West Atlantic|-45|38|3|
East Atlantic|-20|48|2|
Norwegian Sea|2|66|1|
North Sea|5|57|1|
Biscay|-7|45|1|
West Mediterranean|2.5|38|1|
Central Mediterranean|15|35.2|1|
East Mediterranean|30.5|33.8|1|
Black Sea|34|43.6|1|
Caspian Sea|51.5|42.8|1|
Red Sea|37.2|23|1|
Suez|32.8|28.4|1|choke
Strait of Hormuz|57.4|26.2|1|choke
Persian Gulf|51.6|28|1|
Gulf of Oman|59|24.3|1|
Gulf of Aden|47.5|11.6|1|
Bab-el-Mandeb|42.8|12.5|1|choke
Turkish Straits|28.4|40.2|1|choke
Strait of Gibraltar|-5.4|35.6|1|choke
Arabian Sea|65|19|2|
Bay of Bengal|88|15|2|
Indian Ocean West|52|0|2|
Indian Ocean South|75|-18|3|
Malacca Strait|100.2|3.2|1|choke
South China Sea|112|13|2|
Taiwan Strait|119.4|26|1|choke
East China Sea|126|30|1|
Korea Strait|129.8|33.6|1|choke
Sea of Japan|134.5|40|1|
Philippine Sea|137|20|2|
West Pacific|162|30|3|
South Pacific West|165|-15|3|
Tasman Sea|160|-38|2|
Gulf of Guinea|3|2|1|
South Atlantic|-20|-22|3|
South Atlantic West|-30|-40|2|
Mozambique Channel|43|-18|2|
Cape Waters|12|-38|2|
South Pacific East|-100|-25|3|
Hudson Waters|-85|58|1|
Arctic Sea|55|70|2|
`.trim().split('\n').map(l => l.split('|'));
// real state/province borders (orch/grandreal-prep.mjs -> grandreal-src.json): US states, CA provinces, GB regions, AU states
const REAL = JSON.parse(fs.readFileSync(new URL('./grandreal-src.json', import.meta.url), 'utf8'));
const RWd = 1200, RHt = 600, NONE = 65535, real = new Uint16Array(RWd * RHt).fill(NONE);
REAL.forEach((q, k) => { const rows = Array.from({ length: RHt }, () => []);
  for (const r of q.rings) for (let i = 0; i < r.length - 1; i++) { let x0 = gx(r[i][0]) / 2, y0 = gy(r[i][1]) / 2, x1 = gx(r[i+1][0]) / 2, y1 = gy(r[i+1][1]) / 2; if (y0 === y1) continue; if (y0 > y1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
    for (let y = Math.max(0, Math.ceil(y0 - .5)); y < Math.min(RHt, Math.ceil(y1 - .5)); y++) rows[y].push(x0 + (x1 - x0) * ((y + .5 - y0) / (y1 - y0))); }
  rows.forEach((xs, y) => { xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - .5)); x <= Math.min(RWd - 1, Math.floor(xs[i+1] - .5)); x++) real[y * RWd + x] = k; }); });
const seeds = [];
for (const p of PR) seeds.push({ n: p[1], o: p[0], x: gx(+p[2]), y: gy(+p[3]), t: p[4], tw: +p[5], f: p[6] || '', m: p[7] || '', land: 1 });
const REALBASE = seeds.length;
REAL.forEach((q, k) => { let n = 0, sx = 0, sy = 0; for (let y = 0; y < RHt; y++) for (let x = 0; x < RWd; x++) if (real[y * RWd + x] === k) { n++; sx += x; sy += y; }
  if (!n) { console.log('EMPTY real province', q.n); return; } const cx = sx / n, cy = sy / n; let bx = 0, by = 0, bd = 1e18; for (let y = 0; y < RHt; y++) for (let x = 0; x < RWd; x++) if (real[y * RWd + x] === k) { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; bx = x; by = y; } }
  seeds.push({ n: q.n, o: q.o, x: bx * 2, y: by * 2, t: q.t, tw: q.tw, f: q.f, m: q.m, land: 1, fixed: 1 }); });
for (const s of SEAS) seeds.push({ n: s[0], x: gx(+s[1]), y: gy(+s[2]), c: +s[3], ck: s[4] === 'choke' ? 1 : 0, land: 0 });
// relaxation: push apart seeds closer than MIN (bounded drift), deterministic
const MIN = 27, x0 = seeds.map(s => s.x), y0 = seeds.map(s => s.y);
for (let it = 0; it < 140; it++) { let moved = 0;
  for (let i = 0; i < seeds.length; i++) for (let j = i + 1; j < seeds.length; j++) { const a = seeds[i], b = seeds[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); const mn = MIN * ((a.land && b.land) ? 1 : .8);
    if (d < mn) { if (a.fixed && b.fixed) continue; if (d < .01) { dx = 1; dy = 0; d = 1; } const k = (mn - d) / 2 / d, ka = a.fixed ? 0 : (b.fixed ? 2 * k : k), kb = b.fixed ? 0 : (a.fixed ? 2 * k : k); a.x -= dx * ka; a.y -= dy * ka; b.x += dx * kb; b.y += dy * kb; moved++; } }
  for (let i = 0; i < seeds.length; i++) { const s = seeds[i]; if (s.fixed) continue; const dx = s.x - x0[i], dy = s.y - y0[i], d = Math.hypot(dx, dy); if (d > 36) { s.x = x0[i] + dx * 36 / d; s.y = y0[i] + dy * 36 / d; } s.x = Math.max(8, Math.min(W - 8, s.x)); s.y = Math.max(8, Math.min(H - 8, s.y)); }
  if (!moved) break; }
for (const s of seeds) { s.x = Math.round(s.x); s.y = Math.round(s.y); }
// raster adjacency at 1/4 scale
const SC = 2, RW = W / SC, RH = H / SC, idx = new Uint16Array(RW * RH);
for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const px = x * SC + 2, py = y * SC + 2; const rv = real[Math.min(RHt - 1, y * SC / 2 | 0) * RWd + Math.min(RWd - 1, x * SC / 2 | 0)]; if (rv !== NONE) { idx[y * RW + x] = REALBASE + rv; continue; } let bi = 0, bd = 1e18; for (let i = 0; i < seeds.length; i++) { if (seeds[i].fixed) continue; const dx = seeds[i].x - px, dy = seeds[i].y - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } idx[y * RW + x] = bi; }
const adj = seeds.map(() => new Set());
for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const a = idx[y * RW + x]; if (x + 1 < RW) { const b = idx[y * RW + x + 1]; if (a !== b) { adj[a].add(b); adj[b].add(a); } } if (y + 1 < RH) { const b = idx[(y + 1) * RW + x]; if (a !== b) { adj[a].add(b); adj[b].add(a); } } }
const nl = PR.length + REAL.length;
// A province must not touch a sea-only world edge; land-land links stay, plus manual straits
const byName = n => seeds.findIndex(s => s.n === n);
const extra = [['Istanbul','Izmir'],['Istanbul','Ankara'],['Havana','Santiago de Cuba'],['Sinai','Cairo']].map(([a, b]) => [byName(a), byName(b)]);   // bridge / canal / island-hop links
for (const [a, b] of extra) if (a >= 0 && b >= 0) { adj[a].add(b); adj[b].add(a); }
// land<->land links across a sea cell are NOT adjacent (that is the point of sea zones)
const rivers = [['Kyiv','Donbas'],['Kyiv','Lviv'],['Baghdad','Anbar'],['Baghdad','Mosul'],['Wuhan','Shanghai'],['Berlin','Rhine'],['Paris','Rhine'],['Punjab','Karachi'],['Cairo','Upper Egypt'],['Moscow','Volga'],['Heartland','Washington'],['Deir ez-Zor','Aleppo'],['Seoul','Pyongyang'],['Seoul','Gangwon'],['Basra','Khuzestan']].map(([a, b]) => [byName(a), byName(b)]).filter(([a, b]) => a >= 0 && b >= 0 && adj[a].has(b));
const lines = [];
lines.push('// Generated by orch/grandmap-gen.mjs - do not edit by hand. The stylised grand-campaign world map (no real political claims).');
lines.push('const GM_W=' + W + ',GM_H=' + H + ';');
lines.push('const GM_NATS=' + JSON.stringify(NATS) + ';   // [code, name, region]');
const out = seeds.map((s, i) => s.land ? [s.n, s.o, s.x, s.y, s.t, s.tw, s.f, s.m, [...adj[i]].sort((a, b) => a - b)] : [s.n, null, s.x, s.y, 'w', s.c, s.ck ? 'K' : '', '', [...adj[i]].sort((a, b) => a - b)]);
lines.push('// [name, owner, x, y, terrain (w = sea zone), towns (sea: turns to cross), flags (sea: K = chokepoint), battle map, neighbours]');
lines.push('const GM_P=[\n' + out.map(r => JSON.stringify(r)).join(',\n') + '\n];');
lines.push('const GM_LAND=' + nl + ';   // provinces 0..GM_LAND-1 are land, the rest sea zones');
lines.push('const GM_RIVER=' + JSON.stringify(rivers.map(([a, b]) => [Math.min(a, b), Math.max(a, b)])) + ';   // major river crossings');
{ const by = []; const put = n => { while (n >= 128) { by.push((n & 127) | 128); n >>= 7; } by.push(n); }; let cur = real[0] === NONE ? NONE : REALBASE + real[0], run = 0;
  for (let i = 0; i < real.length; i++) { const v = real[i] === NONE ? NONE : REALBASE + real[i]; if (v === cur) run++; else { put(cur === NONE ? 0 : cur + 1); put(run); cur = v; run = 1; } } put(cur === NONE ? 0 : cur + 1); put(run);
  fs.writeFileSync(new URL('../src/13f-grandreal.js', import.meta.url), '// Generated by orch/grandmap-gen.mjs - do not edit by hand. Real state/province borders (Natural Earth, public domain) for US/CA/GB/AU, baked as a 1200x600 province-index raster: (index+1 or 0 = none, run) varint pairs, base64.\nconst GM_REAL_W=1200,GM_REAL_H=600;\nconst GM_REAL=\'' + Buffer.from(by).toString('base64') + '\';\n'); }
fs.writeFileSync(new URL('../src/13-grandmap.js', import.meta.url), lines.join('\n') + '\n');
// report
const near = []; for (let i = 0; i < nl; i++) for (let j = i + 1; j < nl; j++) { const d = Math.hypot(seeds[i].x - seeds[j].x, seeds[i].y - seeds[j].y); if (d < 24) near.push(seeds[i].n + '/' + seeds[j].n + ' ' + Math.round(d)); }
const isolated = seeds.slice(0, nl).filter((s, i) => ![...adj[i]].some(j => j < nl || seeds[j].land === 0)).map(s => s.n);
const landless = seeds.slice(0, nl).filter((s, i) => ![...adj[i]].some(j => j < nl)).map(s => s.n);
console.log('provinces', nl, 'seas', seeds.length - nl, 'rivers', rivers.length, 'close:', near.join(', ') || 'none', '| no land neighbour:', landless.join(', '));
