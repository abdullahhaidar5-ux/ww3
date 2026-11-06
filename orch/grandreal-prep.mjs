// Builds orch/grandreal-src.json: real state/province borders (Natural Earth 1:10m / 1:50m admin-1, public domain, naturalearthdata.com via
// github.com/nvkelso/natural-earth-vector) for the grand-campaign nations US, CA, GB, AU, grouped into game provinces.
//   node orch/grandreal-prep.mjs <dir with ne_50m_admin_1_states_provinces.geojson and ne_10m_admin_1_states_provinces.geojson>
// province line: owner|name|terrain|towns|flags|battle map|members (adm0:name1,name2 ... ; GB uses the NE "region" field)
import fs from 'node:fs';
const dir = process.argv[2];
const T = `
US|Maine|f|1|P||USA:Maine
US|Northern New England|m|1|||USA:New Hampshire,Vermont
US|Southern New England|u|3|P||USA:Massachusetts,Rhode Island,Connecticut
US|New York|u|3|P||USA:New York
US|New Jersey & Delaware|u|2|P||USA:New Jersey,Delaware
US|Pennsylvania|f|2|M||USA:Pennsylvania
US|Maryland (Washington)|u|3|CP|harbour|USA:Maryland,District of Columbia
US|Virginia|f|2|P||USA:Virginia
US|West Virginia|m|1|M||USA:West Virginia
US|North Carolina|f|2|P||USA:North Carolina
US|South Carolina|f|1|P||USA:South Carolina
US|Georgia|f|2|F||USA:Georgia
US|Florida|c|3|P||USA:Florida
US|Alabama|f|1|||USA:Alabama
US|Mississippi|f|1|F||USA:Mississippi
US|Tennessee|f|2|||USA:Tennessee
US|Kentucky|f|1|||USA:Kentucky
US|Ohio|u|3|||USA:Ohio
US|Indiana|f|2|||USA:Indiana
US|Michigan|u|2|||USA:Michigan
US|Illinois|u|3|F||USA:Illinois
US|Wisconsin|f|2|F||USA:Wisconsin
US|Minnesota|f|2|||USA:Minnesota
US|Iowa|f|1|F||USA:Iowa
US|Missouri|f|2|W|heartland|USA:Missouri
US|Arkansas|f|1|||USA:Arkansas
US|Louisiana|c|2|OP||USA:Louisiana
US|Texas|d|4|OP||USA:Texas
US|Oklahoma|f|1|O||USA:Oklahoma
US|Kansas|f|1|F||USA:Kansas
US|Nebraska|f|1|F||USA:Nebraska
US|South Dakota|f|1|||USA:South Dakota
US|North Dakota|f|1|O||USA:North Dakota
US|Montana|m|1|M||USA:Montana
US|Wyoming|m|1|M||USA:Wyoming
US|Colorado|m|2|M||USA:Colorado
US|New Mexico|d|1|||USA:New Mexico
US|Arizona|d|2|||USA:Arizona
US|Utah|d|1|M||USA:Utah
US|Nevada|d|1|M||USA:Nevada
US|Idaho|m|1|||USA:Idaho
US|Washington State|c|3|P||USA:Washington
US|Oregon|f|2|||USA:Oregon
US|California|c|4|P||USA:California
US|Alaska|s|1|O||USA:Alaska
US|Hawaii|c|1|P||USA:Hawaii
CA|Ontario|f|4|C||CAN:Ontario
CA|Quebec|s|3|P||CAN:Québec
CA|New Brunswick|f|1|P||CAN:New Brunswick
CA|Nova Scotia & PEI|c|2|P||CAN:Nova Scotia,Prince Edward Island
CA|Newfoundland and Labrador|c|1|P||CAN:Newfoundland and Labrador
CA|Manitoba|f|2|||CAN:Manitoba
CA|Saskatchewan|f|2|F||CAN:Saskatchewan
CA|Alberta|f|2|OW||CAN:Alberta
CA|British Columbia|m|3|P||CAN:British Columbia
CA|Yukon|s|1|M||CAN:Yukon
CA|Northwest Territories|s|1|O||CAN:Northwest Territories
CA|Nunavut|s|1|||CAN:Nunavut
GB|Greater London|u|4|CP||GBR:Greater London
GB|South East England|f|3|P||GBR:South East
GB|South West England|f|2|P||GBR:South West
GB|East of England|f|2|F||GBR:East
GB|East Midlands|f|2|||GBR:East Midlands
GB|West Midlands|u|3|M||GBR:West Midlands
GB|North West England|u|3|P||GBR:North West
GB|Yorkshire and the Humber|f|2|||GBR:Yorkshire and the Humber
GB|North East England|f|1|||GBR:North East
GB|Wales|m|2|M||GBR:East Wales,West Wales and the Valleys
GB|Scottish Lowlands|u|3|W||GBR:Eastern,South Western
GB|Scottish Highlands|m|2|||GBR:Highlands and Islands,North Eastern
GB|Northern Ireland|f|2|P||GBR:Northern Ireland
AU|New South Wales|u|4|CP||AUS:New South Wales,Australian Capital Territory,Jervis Bay Territory
AU|Victoria|f|3|P||AUS:Victoria
AU|Queensland|f|3|FP||AUS:Queensland
AU|South Australia|d|2|M||AUS:South Australia
AU|Western Australia|d|3|MOP||AUS:Western Australia
AU|Northern Territory|d|1|MW||AUS:Northern Territory
AU|Tasmania|f|1|P||AUS:Tasmania`.trim().split('\n').map(l => l.split('|'));
const a50 = JSON.parse(fs.readFileSync(dir + '/ne_50m_admin_1_states_provinces.geojson')).features;
const a10 = JSON.parse(fs.readFileSync(dir + '/ne_10m_admin_1_states_provinces.geojson')).features.filter(f => f.properties.adm0_a3 === 'GBR');
const rings = f => { const g = f.geometry; if (!g) return []; if (g.type === 'Polygon') return [g.coordinates[0]]; if (g.type === 'MultiPolygon') return g.coordinates.map(p => p[0]); return []; };
const simp = (r, e) => { const o = [r[0]]; for (let i = 1; i < r.length - 1; i++) { const p = o[o.length - 1]; if (Math.hypot(r[i][0] - p[0], r[i][1] - p[1]) >= e) o.push(r[i]); } o.push(r[r.length - 1]); return o; };
const out = [], used = new Set();
for (const [o, name, t, tw, f, m, mem] of T) {
  const [a3, list] = mem.split(':'), names = list.split(',');
  const src = a3 === 'GBR' ? a10.filter(x => names.includes(x.properties.region)) : a50.filter(x => x.properties.adm0_a3 === a3 && names.includes(x.properties.name));
  if (!src.length) { console.log('NO MATCH', name); continue; }
  src.forEach(x => used.add(a3 + ':' + (x.properties.name)));
  const rs = src.flatMap(rings).map(r => simp(r, a3 === 'GBR' ? .015 : .04).map(p => [+p[0].toFixed(3), +p[1].toFixed(3)])).filter(r => r.length > 3);
  out.push({ o, n: name, t, tw: +tw, f, m, rings: rs });
}
for (const a3 of ['USA', 'CAN', 'AUS']) for (const x of a50.filter(x => x.properties.adm0_a3 === a3)) if (!used.has(a3 + ':' + x.properties.name)) console.log('unused', a3, x.properties.name);
fs.writeFileSync(new URL('./grandreal-src.json', import.meta.url), JSON.stringify(out));
console.log('provinces', out.length, 'bytes', JSON.stringify(out).length);
