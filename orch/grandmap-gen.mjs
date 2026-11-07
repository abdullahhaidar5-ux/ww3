// Generates src/13-grandmap.js + src/13f-grandreal.js: the grand-campaign WORLD MAP (realmap, Abdullah 2026-11-07 06:55 "make the grand
// map size and countries proportional" / "Brazil is really off"; it's a world simulator, so the map is the real world).
//   python3 orch/look1-bake.py ... && python3 -I orch/realmap-prep.py NE10_DIR && node orch/grandmap-gen.mjs && node orch/grand3d-gen.mjs NE50_DIR
// Geography: Natural Earth 1:10m admin-0/admin-1 (public domain), ONE Equal Earth projection (orch/grandproj.mjs): real shapes and
// true relative sizes, no regional magnification. Provinces are real admin-1 regions (merged where small, split where huge and empty);
// detail comes from MORE provinces where the game happens, not from enlarging land. The old province rows below are anchors (their
// names, owners, towns, flags and battle maps are kept); orch/realmap/MAPPING.md lists where each now is. Deterministic, no randomness.
import fs from 'node:fs';
// nation: code|name|region|colour (majors take their colour from FACTIONS at runtime)
const NAT = `US|United States|NA|CA|Canada|NA|MX|Mexico|NA|CU|Cuba|NA|GT|Central America|NA|DO|Caribbean Isles|NA|VE|Venezuela|SAM|CO|Colombia|SAM|BR|Brazil|SAM|PE|Peru|SAM|AR|Argentina|SAM|CL|Chile|SAM|
GB|Britain|EU|FR|France|EU|DE|Germany|EU|ES|Spain|EU|IT|Italy|EU|PL|Poland|EU|SE|Sweden|EU|NO|Norway|EU|FI|Finland|EU|GR|Greece|EU|RO|Romania|EU|BY|Belarus|EU|UA|Ukraine|EU|RU|Russia|EU|KZ|Kazakhstan|EU|UZ|Uzbekistan|EU|AZ|Azerbaijan|EU|
TR|Turkey|ME|SY|Syria|ME|RS|Mountain Shias|ME|IL|Israel|ME|JO|Jordan|ME|IQ|Iraq|ME|KD|Kurdistan|ME|RV|River Shias|ME|OB|Olive Brigades|ME|BI|Black Desert Insurgency|ME|IR|Iran|ME|SA|Saudi Arabia|ME|AE|UAE|ME|OM|Oman|ME|KW|Kuwait|ME|QA|Qatar|ME|DW|Coffee Shias (Yemen)|ME|EG|Egypt|ME|LY|Libya|ME|SD|Sudan|ME|ET|Ethiopia|AF|DZ|Algeria|AF|MA|Morocco|AF|TN|Tunisia|AF|NG|Nigeria|AF|ML|Sahel|AF|TD|Chad|AF|CD|Congo|AF|KE|Kenya|AF|TZ|Tanzania|AF|AO|Angola|AF|ZA|South Africa|AF|
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
RV|Basra|47.6|30.4|c|3|OPW|mesopotamia
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
RV|Najaf|43.9|31.0|u|2|CW|mesopotamia
RV|Southern Marshes|46.3|32.2|f|2|FO|hawizeh
OB|Gaza|32.4|30.6|u|2|CPW|gaza
BI|Euphrates Badlands|43.4|34.9|d|1|CO|euphrates
BI|Syrian Badiya|40.4|33.8|d|1|W|
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
// ---------------- realmap (2026-11-07): real countries, real admin-1 provinces, one Equal Earth projection ----------------
// Old provinces above are ANCHORS: each keeps its name/owner/terrain/towns/flags/battle map and claims the real admin-1 units at
// its (corrected) position or the explicit members below; the rest of every country is grown into extra provinces from its
// own admin-1 units, finer where the game happens (Middle East, Europe, East/South Asia, North America), coarse where land is empty.
const FIX = {   // real positions for anchors whose old seed was placed for the old warped layout
  'Damascus':[36.3,33.5],'Aleppo':[37.2,36.2],'Latakia':[35.9,35.6],'Deir ez-Zor':[40.1,35.3],'Beirut':[35.5,33.89],'South Lebanon':[35.4,33.3],'Bekaa':[36.0,33.85],
  'Tel Aviv':[34.8,32.08],'Galilee':[35.4,32.9],'Negev':[34.9,30.8],'Jordan':[36.0,31.95],'Baghdad':[44.4,33.3],'Basra':[47.6,30.5],'Mosul':[43.1,36.3],'Anbar':[43.3,33.4],
  'Kurdistan':[44.0,36.2],'Tehran':[51.4,35.7],'Isfahan':[51.7,32.7],'Khuzestan':[48.7,31.3],'Zagros':[47.0,34.3],'Hormozgan':[56.3,27.2],'Khorasan':[59.6,36.3],
  'Riyadh':[46.7,24.7],'Eastern Province':[49.6,26.3],'Hejaz':[39.8,21.4],'Asir':[42.5,18.2],'Tabuk':[36.6,28.4],'Kuwait':[47.9,29.3],'Qatar':[51.4,25.3],
  'Abu Dhabi':[54.4,24.2],'Dubai':[55.3,25.2],'Al Ain':[55.7,24.2],'Oman':[58.4,23.6],'Sanaa':[44.2,15.35],'Aden':[45.03,12.8],'Hadramawt':[49.0,15.9],'Tihama':[43.0,14.8],
  'Cairo':[31.24,30.04],'Alexandria':[29.9,31.2],'Sinai':[33.8,30.0],'Upper Egypt':[32.6,25.7],'Western Desert':[27.5,27.0],'Gaza':[34.4,31.45],
  'Euphrates Badlands':[41.2,34.4],'Syrian Badiya':[38.6,34.5],'Najaf':[44.3,31.9],'Southern Marshes':[47.1,31.8],'Baku':[49.9,40.4],'Tripolitania':[13.2,32.9],
  'Cyrenaica':[20.1,32.1],'Khartoum':[32.5,15.6],'Darfur':[24.9,13.5],'Addis Ababa':[38.75,9.0],'Istanbul':[29.0,41.05],'Izmir':[27.2,38.4],'Cilicia':[35.0,37.0],
  'Ankara':[32.9,39.9],'East Anatolia':[41.2,39.9],'Havana':[-82.4,23.1],'Camaguey':[-77.9,21.4],'Santiago de Cuba':[-75.8,20.0],'Hispaniola':[-70.2,18.8],
  'Central America':[-86.3,13.0],'Caracas':[-66.9,10.4],'Bogota':[-74.1,4.7],'Andes':[-76.0,-10.0],'Lagos':[3.4,6.6],'Kenya':[36.8,-1.3],'Tanzania':[35.7,-6.2],
  'Cape':[19.5,-33.5],'Johannesburg':[28.0,-26.2],'Sao Paulo':[-47.0,-23.0],'Northeast':[-39.0,-8.0],'Amazonia':[-63.0,-4.0],'Brasilia':[-47.9,-15.8],
  'Buenos Aires':[-60.5,-35.5],'Santiago':[-70.7,-33.4],'Mexico City':[-99.1,19.4],'Sonora':[-110.9,29.1],'Yucatan':[-89.0,20.0],'Leningrad':[30.3,59.9],
  'Moscow':[37.6,55.75],'Volga':[45.0,51.5],'Caucasus':[43.5,43.5],'Urals':[60.6,56.8],'Siberia':[83.0,55.0],'Far East':[135.0,48.5],'Kyiv':[30.5,50.45],
  'Donbas':[37.8,48.0],'Odesa':[30.7,46.5],'Lviv':[24.0,49.8],'Taipei':[121.5,25.0],'Tokyo':[139.7,35.7],'Osaka':[135.5,34.7],'Hokkaido':[142.8,43.2],'Kyushu':[130.7,32.6],
  'Pyongyang':[125.75,39.0],'Hamgyong':[129.5,41.5],'Hwanghae':[125.5,38.3],'Seoul':[127.0,37.55],'Busan':[129.0,35.2],'Gangwon':[128.3,37.8],
  'Shanghai':[121.4,31.2],'Guangzhou':[113.3,23.1],'Beijing':[116.4,39.9],'Karachi':[67.0,24.9],'Mumbai':[72.9,19.1],'Chennai':[80.2,13.1],'Kashmir':[75.0,34.0],
  'Bengal':[88.3,22.6],'Delhi':[77.2,28.6],'Punjab':[74.3,31.5],'Khyber':[71.5,34.0],'Kabul':[69.2,34.5],'Kandahar':[65.7,31.6],'Balochistan':[66.0,28.5],
  'Saigon':[106.7,10.8],'Hanoi':[105.8,21.0],'Bangkok':[100.5,13.75],'Manila':[121.0,14.6],'Mindanao':[125.0,7.5],'Jakarta':[106.8,-6.2],'Sumatra':[101.0,0.0],
  'Borneo':[114.0,-1.0],'Malaysia':[101.7,3.1],'Sri Lanka':[80.7,7.5],'Paris':[2.35,48.85],'Provence':[5.4,43.5],'Berlin':[13.4,52.5],'Rhine':[7.0,51.0],
  'Madrid':[-3.7,40.4],'Andalusia':[-5.0,37.4],'Rome':[12.5,41.9],'Po Valley':[9.2,45.4],'Warsaw':[21.0,52.2],'Stockholm':[18.0,59.3],'Athens':[23.7,38.0],
  'New Zealand':[174.8,-41.0],'Morocco':[-6.8,33.0],'Tunisia':[10.2,36.4],'Algeria':[3.0,36.0],'Norway':[10.7,59.9],'Finland':[25.0,60.2],
};
const MEM = {   // explicit admin-1 members (A3:name, NE English or native name) for faction homes and holy places
  'Beirut':['LBN:Beirut','LBN:Mount Lebanon','LBN:North'],'South Lebanon':['LBN:South','LBN:Nabatieh'],'Bekaa':['LBN:Beqaa'],
  'Tel Aviv':['ISR:Tel Aviv','ISR:Central','ISR:Jerusalem'],'Galilee':['ISR:Northern','ISR:Haifa'],'Negev':['ISR:Southern'],'Gaza':['PSX:Gaza'],
  'Kurdistan':['IRQ:Erbil','IRQ:Duhok','IRQ:Sulaymaniyah'],'Basra':['IRQ:Basra','IRQ:Dhi Qar'],'Najaf':['IRQ:Najaf','IRQ:Karbala','IRQ:Al-Qādisiyyah'],
  'Southern Marshes':['IRQ:Maysan'],'Baghdad':['IRQ:Baghdad','IRQ:Babylon'],'Tehran':['IRN:Tehran','IRN:Qom','IRN:Alborz'],'Khorasan':['IRN:Razavi Khorasan'],
  'Hejaz':['SAU:Makkah','SAU:Al Madinah'],'Kuwait':['KWT:*'],'Qatar':['QAT:*'],'Dubai':['ARE:Emirate of Dubai','ARE:Emirate of Sharjah','ARE:Emirate of Ajman','ARE:Emirate of Umm Al Quwain','ARE:Emirate of Ras Al Khaimah','ARE:Emirate of Fujairah','ARE:Fujairah','ARE:Sayh Mudayrah'],
  'Sanaa':['YEM:Sanaa','YEM:\'Amran','YEM:Dhamar','YEM:Al Mahwit','YEM:Raymah'],'Aden':['YEM:\'Adan','YEM:Lahij','YEM:Ad Dali\'','YEM:Abyan'],'Tihama':['YEM:Al Hudaydah','YEM:Hajjah'],
  'Hadramawt':['YEM:Hadhramaut'],'Cairo':['EGY:Cairo','EGY:Giza','EGY:Qalyubia','EGY:Monufia'],'Sinai':['EGY:North Sinai','EGY:South Sinai'],
};
// country (NE adm0_a3) -> game nation. Grouped minors stay as the game already had them; every other real country becomes its own minor.
const A3C = { USA:'US',PRI:'US',CAN:'CA',MEX:'MX',CUB:'CU',USG:'CU',GTM:'GT',BLZ:'GT',HND:'GT',SLV:'GT',NIC:'GT',CRI:'GT',PAN:'GT',
  DOM:'DO',HTI:'DO',JAM:'DO',BHS:'DO',TTO:'DO',ATG:'DO',BRB:'DO',DMA:'DO',GRD:'DO',KNA:'DO',LCA:'DO',VCT:'DO',
  VEN:'VE',COL:'CO',BRA:'BR',PER:'PE',ARG:'AR',CHL:'CL',GBR:'GB',IMN:'GB',FLK:'GB',FRA:'FR',DEU:'DE',ESP:'ES',ITA:'IT',POL:'PL',SWE:'SE',NOR:'NO',FIN:'FI',ALD:'FI',
  GRC:'GR',ROU:'RO',BLR:'BY',UKR:'UA',RUS:'RU',KAZ:'KZ',KAB:'KZ',UZB:'UZ',AZE:'AZ',TUR:'TR',SYR:'SY',LBN:'RS',ISR:'IL',JOR:'JO',IRQ:'IQ',IRN:'IR',SAU:'SA',ARE:'AE',
  OMN:'OM',KWT:'KW',QAT:'QA',YEM:'DW',EGY:'EG',LBY:'LY',SDN:'SD',ETH:'ET',DZA:'DZ',MAR:'MA',SAH:'MA',TUN:'TN',NGA:'NG',MLI:'ML',NER:'ML',BFA:'ML',TCD:'TD',COD:'CD',
  KEN:'KE',TZA:'TZ',AGO:'AO',ZAF:'ZA',PAK:'PK',IND:'IN',AFG:'AF',BGD:'BD',NPL:'NP',LKA:'LK',MMR:'MM',TKM:'TM',CHN:'CN',HKG:'CN',MAC:'CN',PRK:'KP',KOR:'KR',JPN:'JP',
  TWN:'TW',MNG:'MN',VNM:'VN',THA:'TH',MYS:'MY',IDN:'ID',PHL:'PH',AUS:'AU',NZL:'NZ',
  GRL:'DK',FRO:'DK',DNK:'DK',SOL:'SO',CYN:'CY',NCL:'FR',PYF:'FR',GUF:'FR',SRB:'XS',BDI:'XB',PSX:'PS' };
const UOWN = { 'PSX:Gaza':'OB','IRQ:Duhok':'KD','IRQ:Erbil':'KD','IRQ:Sulaymaniyah':'KD','IRQ:Basra':'RV','IRQ:Najaf':'RV','IRQ:Karbala':'RV','IRQ:Al-Qādisiyyah':'RV',
  'IRQ:Dhi Qar':'RV','IRQ:Maysan':'RV','IRQ:Al Muthanna':'RV' };
const MINNAME = { PS:'Palestine', XS:'Serbia', XB:'Burundi', SO:'Somalia', CY:'Cyprus', DK:'Denmark' };
const KEEP = new Set(['SGP','BHR','MLT','LUX','CYP','BRN','MUS','SYC','COM','CPV','STP','FJI']), MINPX = 14;
const SEALINK = [['Suez','East Mediterranean'],['Turkish Straits','Black Sea'],['Turkish Straits','East Mediterranean'],['Strait of Gibraltar','West Mediterranean'],
  ['Strait of Gibraltar','East Atlantic'],['Bab-el-Mandeb','Red Sea'],['Bab-el-Mandeb','Gulf of Aden'],['Strait of Hormuz','Persian Gulf'],['Strait of Hormuz','Gulf of Oman'],
  ['West Pacific','North Pacific East'],['South Pacific West','South Pacific East']];   // + the date line: the Pacific wraps around
const LANDLINK = [['Eastern Province','Bahrain'],['Malaysia','Singapore']];   // causeways / bridges between land provinces
// ---- load the building blocks (orch/realmap-prep.py)
import zlib from 'node:zlib'; import { proj, unproj, W, H } from './grandproj.mjs';
const J = JSON.parse(fs.readFileSync(new URL('./realmap/a1.json', import.meta.url), 'utf8'));
const UB = zlib.gunzipSync(fs.readFileSync(new URL('./realmap/a1.bin.gz', import.meta.url))), N0 = W * H;
const U = new Int32Array(N0); for (let i = 0; i < N0; i++) { const v = UB[2 * i] | (UB[2 * i + 1] << 8); U[i] = v === 65535 ? -1 : v; }
const UN = J.u.map((r, k) => { const [en, ne] = String(r[2]).split('|'); const ll = r[6] != null ? [r[6], r[7]] : (unproj(r[13], r[14]) || [0, 0]);
  return { k, a3: r[0], adm: r[1], n: en, ne: ne || en, lvl: r[3], iso: r[4] || '', reg: r[5] || '', lon: ll[0], lat: ll[1], px: 0, el: r[10], es: r[11], rgb: r[12] }; });
for (let i = 0; i < N0; i++) if (U[i] >= 0) UN[U[i]].px++;
// admin-0 slivers -> the nearest admin-1 unit of the same country (or keep it when the country has no admin-1 at all)
{ const has = new Set(UN.filter(u => u.lvl === 1 && u.px).map(u => u.a3)); const q = []; const dist = new Int32Array(N0).fill(-1);
  for (let i = 0; i < N0; i++) if (U[i] >= 0 && UN[U[i]].lvl === 1) { dist[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) { if (j < 0 || j >= N0 || dist[j] >= 0 || U[j] < 0) continue; const u = UN[U[j]]; if (u.lvl !== 0 || !has.has(u.a3) || UN[U[i]].a3 !== u.a3) continue; dist[j] = 0; U[j] = U[i]; q.push(j); } } }
UN.forEach(u => u.px = 0); for (let i = 0; i < N0; i++) if (U[i] >= 0) UN[U[i]].px++;
// ---- owners
const OLDCODES = new Set(NATS.map(n => n[0])), cpx = {}; UN.forEach(u => { const c = A3C[u.a3] || u.a3; cpx[c] = (cpx[c] || 0) + u.px; });
const newMin = new Map();   // a3 -> [code, name, region]
const regOf = (lon, lat) => lon < -30 ? (lat > 13 ? 'NA' : 'SAM') : lat < -10 && lon > 110 ? 'OC' : lon < 60 && lat > 36 ? 'EU' : lon < 63 && lat > 12 && lon > 25 ? 'ME' : lon < 52 ? 'AF' : lon < 97 ? 'SA' : lat > 20 ? 'EA' : 'SEA';
function ownerOf(u) { const o = UOWN[u.a3 + ':' + u.n] || UOWN[u.a3 + ':' + u.ne]; if (o) return o; const c = A3C[u.a3]; if (c) return c;
  if (newMin.has(u.a3)) return newMin.get(u.a3)[0];
  if ((cpx[u.a3] || 0) < 20 && !KEEP.has(u.a3)) return null;
  let code = (u.iso.slice(0, 2) || u.a3.slice(0, 2)).toUpperCase(); const used = new Set([...OLDCODES, ...[...newMin.values()].map(v => v[0]), 'IM', 'EU', 'BI', 'RS', 'KD', 'DW', 'RV', 'OB']);
  if (used.has(code)) { for (const ch of 'XQZYJW') { const c2 = ch + u.a3[0]; if (!used.has(c2)) { code = c2; break; } } }
  newMin.set(u.a3, [code, MINNAME[code] || u.adm, regOf(u.lon, u.lat)]); return code; }
UN.forEach(u => { u.o = u.px ? ownerOf(u) : null; });
// far-flung specks (Bouvet, Chatham, Easter Island...) leave their owner: they would drag armies, labels and supply across an ocean
{ const big = {}; UN.forEach(u => { if (u.o && (!big[u.o] || u.px > big[u.o].px)) big[u.o] = u; });
  UN.forEach(u => { if (!u.o || u.px >= 40) return; const b = big[u.o], [x, y] = proj(u.lon, u.lat), [bx, by] = proj(b.lon, b.lat); if (Math.hypot(x - bx, y - by) > 350) u.o = null; }); }
for (const [a3, c] of Object.entries(A3C)) if (!OLDCODES.has(c) && ![...newMin.values()].some(v => v[0] === c)) { const u = UN.find(x => x.a3 === a3 && x.px); if (u) newMin.set('@' + c, [c, MINNAME[c] || u.adm, regOf(u.lon, u.lat)]); }
// ---- targets: province size (px, 1 px ~ 210 km2) by where the game happens; deserts / tundra / ice get far fewer provinces
function target(u) { const { lon, lat } = u; let t = 1600;
  if (lon > 33 && lon < 49 && lat > 29 && lat < 38.5) t = 110; else if (lon > 25 && lon < 63 && lat > 12 && lat < 43) t = 220;
  else if (lon > -11 && lon < 42 && lat > 35 && lat < 71) t = 380; else if (lon > 27 && lon < 62 && lat > 42 && lat < 70) t = 700;
  else if (lon > 97 && lon < 146 && lat > 18 && lat < 54) t = 480; else if (lon > 60 && lon < 97 && lat > 5 && lat < 37) t = 450;
  else if (lon < -52 && lon > -170 && lat > 14 && lat < 72) t = 900;
  const [r, g, b] = u.rgb, desert = r - b > 40 && r > g && r + g + b > 430, cold = Math.abs(lat) > 60 || u.el > 3500;
  return t * (desert || cold ? 2.5 : 1); }
// ---- split oversized single units into compass parts (k-means on pixel positions, deterministic init)
{ const pixOf = new Map(); for (let i = 0; i < N0; i++) if (U[i] >= 0) { const k = U[i]; if (!pixOf.has(k)) pixOf.set(k, []); pixOf.get(k).push(i); }
  const base = UN.length;
  for (let k = 0; k < base; k++) { const u = UN[k]; if (!u.o || u.lvl !== 1) continue; const T = target(u); if (u.px <= 2.6 * T) continue; const kk = Math.min(4, Math.round(u.px / T)); if (kk < 2) continue;
    const ps = pixOf.get(k), X = ps.map(i => i % W), Y = ps.map(i => (i / W) | 0); const mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length;
    let c = [[X[0], Y[0]]]; { let bi = 0, bd = -1; for (let i = 0; i < ps.length; i++) { const d = (X[i] - mx) ** 2 + (Y[i] - my) ** 2; if (d > bd) { bd = d; bi = i; } } c = [[X[bi], Y[bi]]]; }
    while (c.length < kk) { let bi = 0, bd = -1; for (let i = 0; i < ps.length; i++) { let d = 1e18; for (const q of c) d = Math.min(d, (X[i] - q[0]) ** 2 + (Y[i] - q[1]) ** 2); if (d > bd) { bd = d; bi = i; } } c.push([X[bi], Y[bi]]); }
    const lab = new Int32Array(ps.length);
    for (let it = 0; it < 10; it++) { const sx = c.map(() => 0), sy = c.map(() => 0), sn = c.map(() => 0);
      for (let i = 0; i < ps.length; i++) { let bj = 0, bd = 1e18; c.forEach((q, j) => { const d = (X[i] - q[0]) ** 2 + (Y[i] - q[1]) ** 2; if (d < bd) { bd = d; bj = j; } }); lab[i] = bj; sx[bj] += X[i]; sy[bj] += Y[i]; sn[bj]++; }
      c = c.map((q, j) => sn[j] ? [sx[j] / sn[j], sy[j] / sn[j]] : q); }
    const dirs = c.map(q => { const dx = q[0] - mx, dy = q[1] - my; return Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'East' : 'West') : Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy > 0 ? 'South' : 'North') : (dy > 0 ? 'South' : 'North') + (dx > 0 ? 'east' : 'west'); });
    const orig = [u.n, u.ne], names = dirs.map(d => d + ' ' + u.n), ids = c.map((q, j) => j === 0 ? k : UN.push(Object.assign({}, u, { k: UN.length, px: 0 })) - 1);
    ids.forEach((id, j) => { UN[id].n = names[j]; UN[id].ne = names[j]; const ll = unproj(c[j][0], c[j][1]); if (ll) { UN[id].lon = ll[0]; UN[id].lat = ll[1]; } UN[id].px = 0; UN[id].part = orig; });
    for (let i = 0; i < ps.length; i++) { U[ps[i]] = ids[lab[i]]; UN[ids[lab[i]]].px++; } } }
const NU = UN.length;
// ---- unit adjacency (raster, 4-neighbour)
const uadj = UN.map(() => new Set());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, a = U[i]; if (a < 0) continue; if (x + 1 < W) { const b = U[i + 1]; if (b >= 0 && b !== a) { uadj[a].add(b); uadj[b].add(a); } } if (y + 1 < H) { const b = U[i + W]; if (b >= 0 && b !== a) { uadj[a].add(b); uadj[b].add(a); } } }
// ---- provinces: anchors first
const PV = [];   // {n,o,t,tw,f,m,units:Set,pt:[x,y]|null,auto}
const uprov = new Int32Array(NU).fill(-1), shared = new Map();   // unit -> [province ids] when several anchors sit in one unit
const findUnits = key => { const [a3, nm] = key.split(':'); return UN.filter(u => u.a3 === a3 && u.o && (nm === '*' || u.n === nm || u.ne === nm || (u.part && u.part.includes(nm)))).map(u => u.k); };
const claim = (pi, k) => { if (uprov[k] === -1) { uprov[k] = pi; return; } if (uprov[k] === pi) return; const s = shared.get(k) || [uprov[k]]; if (!s.includes(pi)) s.push(pi); shared.set(k, s); };
const SNAPO = { BI: { 'Euphrates Badlands': 'IQ', 'Syrian Badiya': 'SY' } };   // fictional factions carve their home out of a real country's land
function snap(o, lon, lat, n) { if (SNAPO[o]) o = SNAPO[o][n] || o; const [px, py] = proj(lon, lat); const x0 = Math.round(px), y0 = Math.round(py);
  for (let r = 0; r < 140; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = U[y * W + x]; if (k < 0 || UN[k].o !== o) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; } } if (best) return best; }
  return null; }
const REALT = fs.readFileSync(new URL('./grandreal-prep.mjs', import.meta.url), 'utf8').match(/const T = `([\s\S]*?)`/)[1].trim().split('\n').map(l => l.split('|'));
for (const p of PR) { const [o, n, lon0, lat0, t, tw, f, m] = p; const [lon, lat] = FIX[n] || [+lon0, +lat0]; const pi = PV.length;
  const pv = { n, o, t, tw: +tw, f: f || '', m: m || '', units: new Set(), pt: null, auto: 0 }; PV.push(pv);
  if (MEM[n]) { for (const key of MEM[n]) for (const k of findUnits(key)) claim(pi, k); const k0 = [...findUnits(MEM[n][0])][0]; if (k0 !== undefined) pv.pt = proj(UN[k0].lon, UN[k0].lat).map(Math.round); continue; }
  const s = snap(o, lon, lat, n); if (!s) { console.log('anchor has no land of its owner', n, o); continue; } pv.pt = s; claim(pi, U[s[1] * W + s[0]]); }
for (const [o, n, t, tw, f, m, mem] of REALT) { const [a3, list] = mem.split(':'), names = list.split(','), pi = PV.length;
  const ks = UN.filter(u => u.a3 === a3 && u.o && (a3 === 'GBR' ? names.includes(u.reg) : (names.includes(u.ne) || names.includes(u.n) || (u.part && u.part.some(x => names.includes(x)))))).map(u => u.k);
  if (!ks.length) { console.log('NO MATCH', n); continue; } PV.push({ n, o, t, tw: +tw, f: f || '', m: m || '', units: new Set(), pt: null, auto: 0 }); ks.forEach(k => claim(pi, k)); }
// ---- grow every owner's free units into its provinces, opening new provinces where a province would get too big
const upx = k => UN[k].px;
PV.forEach((p, i) => p.px = 0); for (let k = 0; k < NU; k++) if (uprov[k] >= 0) { const s = shared.get(k); if (s) s.forEach(pi => PV[pi].px += upx(k) / s.length); else PV[uprov[k]].px += upx(k); }
const owners = [...new Set(UN.filter(u => u.o && u.px).map(u => u.o))].sort();
for (const o of owners) { const free = new Set(UN.filter(u => u.o === o && u.px && uprov[u.k] < 0).map(u => u.k));
  while (free.size) { let best = null, bv = 1e18;
    for (const k of free) { const T = target(UN[k]); for (const j of uadj[k]) { const pi = uprov[j]; if (pi < 0 || PV[pi].o !== o) continue; const v = PV[pi].px + upx(k); if (v <= T * 1.15 && v < bv) { bv = v; best = [k, pi]; } } }
    if (best) { const [k, pi] = best; uprov[k] = pi; PV[pi].px += upx(k); free.delete(k); continue; }
    let sk = -1, sv = -1; for (const k of free) { const adjP = [...uadj[k]].some(j => uprov[j] >= 0 && PV[uprov[j]].o === o); const v = upx(k) + (adjP ? 1e6 : 0); if (v > sv) { sv = v; sk = k; } }
    const u = UN[sk]; uprov[sk] = PV.length; PV.push({ n: u.n, o, t: '', tw: 1, f: '', m: '', units: new Set(), pt: null, auto: 1, px: upx(sk) }); free.delete(sk); } }
// merge auto provinces that stayed small into a same-owner neighbour (or the nearest one for islands)
const pcen = pi => { let sx = 0, sy = 0, n = 0; for (let k = 0; k < NU; k++) if (uprov[k] === pi) { const [x, y] = proj(UN[k].lon, UN[k].lat); sx += x * upx(k); sy += y * upx(k); n += upx(k); } return n ? [sx / n, sy / n] : [0, 0]; };
for (let pass = 0; pass < 6; pass++) for (let pi = 0; pi < PV.length; pi++) { const p = PV[pi]; if (!p.auto || p.dead) continue; const ks = []; for (let k = 0; k < NU; k++) if (uprov[k] === pi) ks.push(k);
  if (!ks.length) { p.dead = 1; continue; } const T = Math.min(...ks.map(k => target(UN[k]))); if (p.px >= T * .3) continue;
  let to = -1, tv = 1e18; for (const k of ks) for (const j of uadj[k]) { const q = uprov[j]; if (q >= 0 && q !== pi && PV[q].o === p.o && !PV[q].dead && PV[q].px < tv) { tv = PV[q].px; to = q; } }
  if (to < 0) { const c = pcen(pi); for (let q = 0; q < PV.length; q++) if (q !== pi && PV[q].o === p.o && !PV[q].dead && (PV[q].px > 0)) { const d = Math.hypot(...pcen(q).map((v, i) => v - c[i])); if (d < tv && d < 160) { tv = d; to = q; } } }
  if (to < 0) continue; for (const k of ks) uprov[k] = to; PV[to].px += p.px; p.px = 0; p.dead = 1; }
// ---- province raster
const NONE = -1, PIX = new Int32Array(N0).fill(NONE);
const sharedPts = new Map(); for (const [k, s] of shared) sharedPts.set(k, s.map(pi => PV[pi].pt ? [pi, PV[pi].pt] : null).filter(Boolean));
for (let i = 0; i < N0; i++) { const k = U[i]; if (k < 0 || !UN[k].o) continue; const sp = sharedPts.get(k);
  if (sp && sp.length > 1) { const x = i % W, y = (i / W) | 0; let bp = sp[0][0], bd = 1e18; for (const [pi, q] of sp) { const d = (x - q[0]) ** 2 + (y - q[1]) ** 2; if (d < bd) { bd = d; bp = pi; } } PIX[i] = bp; }
  else if (uprov[k] >= 0) PIX[i] = uprov[k]; }
// drop dead/empty provinces, renumber land 0..L-1 (anchors keep their order first)
const alive = PV.map((p, i) => i).filter(i => !PV[i].dead); const cnt = new Int32Array(PV.length); for (let i = 0; i < N0; i++) if (PIX[i] >= 0) cnt[PIX[i]]++;
const live = alive.filter(i => cnt[i] > 0); PV.filter((p, i) => !p.auto && !live.includes(i)).forEach(p => console.log('LOST anchor', p.n));
const remap = new Int32Array(PV.length).fill(-1); live.forEach((pi, j) => remap[pi] = j); for (let i = 0; i < N0; i++) if (PIX[i] >= 0) PIX[i] = remap[PIX[i]];
const LP = live.map(pi => PV[pi]), NL = LP.length;
// ---- sea zones: flood the water from the sea seeds (contiguous zones); enclosed lakes and dropped specks go to the nearest land
const L50 = zlib.gunzipSync(fs.readFileSync(new URL('./realmap/land50.bin.gz', import.meta.url)));   // ocean vs lakes / river gaps inside the land
for (let i = 0; i < N0; i++) if (L50[i] && PIX[i] === NONE) { const ll = unproj(i % W + .5, ((i / W) | 0) + .5); if (!ll || ll[1] < -59.5) L50[i] = 0; }   // Antarctica is not on the map: open ocean
const seaSeeds = SEAS.map(s => { const [x, y] = proj(+s[1], +s[2]).map(Math.round); let best = null, bd = 1e9; for (let r = 0; r < 120 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || PIX[yy * W + xx] !== NONE || L50[yy * W + xx]) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = yy * W + xx; } } if (best === null) console.log('sea seed on land', s[0]); return best; });
const OUT = new Uint8Array(N0); for (let i = 0; i < N0; i++) OUT[i] = unproj(i % W + .5, ((i / W) | 0) + .5) ? 0 : 1;   // outside the Equal Earth outline
{ const q = []; seaSeeds.forEach((i, s) => { if (i !== null && PIX[i] === NONE) { PIX[i] = NL + s; q.push(i); } });
  for (let pass = 0; pass < 2; pass++) { for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N0 && PIX[j] === NONE && !L50[j] && (pass || !OUT[j])) { PIX[j] = PIX[i]; q.push(j); } }
    if (!pass) { const q0 = q.splice(0); for (const i of q0) { const x = i % W; if ([x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W].some(j => j >= 0 && j < N0 && OUT[j] && PIX[j] === NONE)) q.push(i); } } }   // ocean inside the world first, then the margins
  const q2 = []; for (let i = 0; i < N0; i++) if (PIX[i] >= 0 && PIX[i] < NL) q2.push(i);
  for (let h = 0; h < q2.length; h++) { const i = q2[h], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N0 && PIX[j] === NONE) { PIX[j] = PIX[i]; q2.push(j); } }
  const q3 = []; for (let i = 0; i < N0; i++) if (PIX[i] >= NL) q3.push(i);   // leftovers (Antarctica, dropped specks): the nearest sea zone
  for (let h = 0; h < q3.length; h++) { const i = q3[h], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N0 && PIX[j] === NONE) { PIX[j] = PIX[i]; q3.push(j); } }
  for (let i = 0; i < N0; i++) if (PIX[i] === NONE) PIX[i] = NL; }
// tiny provinces (Gaza, Bahrain, Singapore...) grow into their own coastal water so they can be clicked
{ const pc = new Int32Array(NL); for (let i = 0; i < N0; i++) if (PIX[i] < NL) pc[PIX[i]]++;
  for (let pi = 0; pi < NL; pi++) for (let it = 0; it < 4 && pc[pi] < MINPX; it++) { const add = []; for (let i = 0; i < N0; i++) { if (PIX[i] !== pi) continue; const x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (j >= 0 && j < N0 && PIX[j] >= NL) add.push(j); }
    for (const j of add) if (PIX[j] >= NL && pc[pi] < MINPX + 4) { PIX[j] = pi; pc[pi]++; } } }
// ---- adjacency
const adj = Array.from({ length: NL + SEAS.length }, () => new Set());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, a = PIX[i]; if (OUT[i]) continue; if (x + 1 < W && !OUT[i + 1]) { const b = PIX[i + 1]; if (a !== b) { adj[a].add(b); adj[b].add(a); } } if (y + 1 < H && !OUT[i + W]) { const b = PIX[i + W]; if (a !== b) { adj[a].add(b); adj[b].add(a); } } }
// same-owner land across a strait of <= 3 px (Messina, Danish belts, Japanese straits...): a ferry/bridge link
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = PIX[y * W + x]; if (a >= NL) continue;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let sea = 0; for (let s = 1; s <= 4; s++) { const xx = x + dx * s, yy = y + dy * s; if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const b = PIX[yy * W + xx]; if (b >= NL) { sea++; continue; } if (b !== a && sea && LP[b].o === LP[a].o) { adj[a].add(b); adj[b].add(a); } break; } } }
const pidx = n => { const i = LP.findIndex(p => p.n === n); if (i >= 0) return i; const s = SEAS.findIndex(q => q[0] === n); return s >= 0 ? NL + s : -1; };
for (const [a, b] of [...SEALINK, ...LANDLINK, ['Istanbul', 'Izmir'], ['Sinai', 'Cairo']]) { const i = pidx(a), j = pidx(b); if (i >= 0 && j >= 0) { adj[i].add(j); adj[j].add(i); } }
// ---- names: unique, readable
{ const seen = new Map(); LP.forEach(p => seen.set(p.n, (seen.get(p.n) || 0) + 1)); const anchorN = new Set(LP.filter(p => !p.auto).map(p => p.n));
  for (const p of LP) if (p.auto && (seen.get(p.n) > 1 || anchorN.has(p.n) || SEAS.some(s => s[0] === p.n))) { const nm = (NATS.find(n => n[0] === p.o) || [...newMin.values()].find(v => v[0] === p.o) || [0, p.o])[1]; p.n = p.n + ' (' + nm + ')'; }
  const s2 = new Map(); for (const p of LP) { const c = s2.get(p.n) || 0; s2.set(p.n, c + 1); if (c) p.n += ' ' + (c + 1); } }
// ---- label point = the pixel deepest inside the province (distance to its border); terrain from the real land
const dist = new Int32Array(N0).fill(-1); { const q = []; for (let i = 0; i < N0; i++) { const x = i % W, a = PIX[i]; if ((x > 0 && PIX[i - 1] !== a) || (x < W - 1 && PIX[i + 1] !== a) || (i >= W && PIX[i - W] !== a) || (i + W < N0 && PIX[i + W] !== a)) { dist[i] = 0; q.push(i); } }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N0 && dist[j] < 0 && PIX[j] === PIX[i]) { dist[j] = dist[i] + 1; q.push(j); } } }
const lab = new Int32Array(NL + SEAS.length).fill(-1), labD = new Float64Array(NL + SEAS.length).fill(-1);
for (let i = 0; i < N0; i++) { const a = PIX[i]; const d = dist[i] + (a < NL && LP[a].pt ? -0.02 * Math.hypot(i % W - LP[a].pt[0], ((i / W) | 0) - LP[a].pt[1]) : 0); if (d > labD[a]) { labD[a] = d; lab[a] = i; } }
const st = Array.from({ length: NL }, () => ({ n: 0, el: 0, es: 0, r: 0, g: 0, b: 0, lat: 0 }));
for (let i = 0; i < N0; i++) { const a = PIX[i]; if (a >= NL || U[i] < 0) continue; const u = UN[U[i]], s = st[a]; s.n++; s.el += u.el; s.es += u.es; s.r += u.rgb[0]; s.g += u.rgb[1]; s.b += u.rgb[2]; s.lat += u.lat; }
for (let a = 0; a < NL; a++) { const p = LP[a]; if (p.t) continue; const s = st[a], n = Math.max(1, s.n), el = s.el / n, es = s.es / n, r = s.r / n, g = s.g / n, b = s.b / n, lat = s.lat / n;
  const coast = [...adj[a]].some(j => j >= NL); p.t = Math.abs(lat) > 60 || el > 3600 ? 's' : el > 1300 || es > 520 ? 'm' : (r - b > 40 && r > g && r + g + b > 430) ? 'd' : (Math.abs(lat) < 14 && g >= r && r + g + b < 420) ? 'j' : coast ? 'c' : 'f'; }
// nations: old table + every new real-country minor that owns land
const ownersLive = new Set(LP.map(p => p.o)); const NATS2 = NATS.filter(n => ownersLive.has(n[0])).concat([...newMin.values()].filter(v => ownersLive.has(v[0])).sort((a, b) => a[0] < b[0] ? -1 : 1));
NATS.filter(n => !ownersLive.has(n[0])).forEach(n => console.log('nation lost all land', n[0]));
seaSeeds.forEach((i, j) => { if (i !== null && PIX[i] === NL + j) lab[NL + j] = i; });   // a sea zone sits where its seed is (not in a far corner of the ocean)
const seeds = [...LP.map((p, a) => ({ n: p.n, o: p.o, x: lab[a] % W, y: (lab[a] / W) | 0, t: p.t, tw: p.tw, f: p.f, m: p.m, land: 1 })),
  ...SEAS.map((s, j) => ({ n: s[0], x: lab[NL + j] % W, y: (lab[NL + j] / W) | 0, c: +s[3], ck: s[4] === 'choke' ? 1 : 0, land: 0 }))];
const nl = NL, byName = n => seeds.findIndex(s => s.n === n);
const rivers = [['Kyiv','Donbas'],['Kyiv','Lviv'],['Baghdad','Anbar'],['Baghdad','Mosul'],['Wuhan','Shanghai'],['Berlin','Rhine'],['Paris','Rhine'],['Punjab','Karachi'],['Cairo','Upper Egypt'],['Moscow','Volga'],['Deir ez-Zor','Aleppo'],['Seoul','Pyongyang'],['Seoul','Gangwon'],['Basra','Khuzestan'],['Baghdad','Najaf'],['Basra','Southern Marshes']].map(([a, b]) => [byName(a), byName(b)]).filter(([a, b]) => a >= 0 && b >= 0 && adj[a].has(b));
// quick-jump regions (lon/lat boxes, projected)
const box = (l0, b0, l1, b1) => { const pts = []; for (let i = 0; i <= 8; i++) for (const lat of [b0, b1, b0 + (b1 - b0) * i / 8]) for (const lon of [l0, l1, l0 + (l1 - l0) * i / 8]) pts.push(proj(lon, lat)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), y0 = Math.min(...ys); return [Math.round(x0), Math.round(y0), Math.round(Math.max(...xs) - x0), Math.round(Math.max(...ys) - y0)]; };
const REGIONS = [['World', null], ['North America', box(-130, 14, -55, 62)], ['South America', box(-82, -56, -34, 13)], ['Europe & Russia', box(-12, 36, 60, 70)], ['Middle East & N. Africa', box(-8, 12, 63, 42)], ['South Asia', box(60, 5, 97, 37)], ['East Asia', box(97, 18, 146, 54)], ['Africa', box(-18, -35, 52, 20)], ['SE Asia & Oceania', box(92, -47, 179, 22)], ['Levant & Iraq', box(33, 29, 49, 38)]];
// ---- output
const lines = [];
lines.push('// Generated by orch/grandmap-gen.mjs - do not edit by hand. The grand-campaign world map: real countries and admin-1 provinces (Natural Earth, public domain), Equal Earth projection (no political claims beyond the game factions; borders as in Natural Earth).');
lines.push('const GM_W=' + W + ',GM_H=' + H + ';');
lines.push('const GM_NATS=' + JSON.stringify(NATS2) + ';   // [code, name, region]');
const out = seeds.map((s, i) => s.land ? [s.n, s.o, s.x, s.y, s.t, s.tw, s.f, s.m, [...adj[i]].sort((a, b) => a - b)] : [s.n, null, s.x, s.y, 'w', s.c, s.ck ? 'K' : '', '', [...adj[i]].sort((a, b) => a - b)]);
lines.push('// [name, owner, x, y, terrain (w = sea zone), towns (sea: turns to cross), flags (sea: K = chokepoint), battle map, neighbours]');
lines.push('const GM_P=[\n' + out.map(r => JSON.stringify(r)).join(',\n') + '\n];');
lines.push('const GM_LAND=' + nl + ';   // provinces 0..GM_LAND-1 are land, the rest sea zones');
lines.push('const GM_RIVER=' + JSON.stringify(rivers.map(([a, b]) => [Math.min(a, b), Math.max(a, b)])) + ';   // major river crossings');
lines.push('const GM_REGIONS=' + JSON.stringify(REGIONS) + ';   // quick-jump views [name, [x, y, w, h]]\nGR_REGIONS.splice(0,GR_REGIONS.length,...GM_REGIONS);   // 13-grand.js loads first: swap in the real-map views');
{ const by = []; const put = n => { while (n >= 128) { by.push((n & 127) | 128); n >>= 7; } by.push(n); }; let cur = PIX[0], run = 0;
  for (let i = 0; i < N0; i++) { if (PIX[i] === cur) run++; else { put(cur + 1); put(run); cur = PIX[i]; run = 1; } } put(cur + 1); put(run);
  lines.push('// the whole map as a province-index raster ' + W + 'x' + H + ' (1 px = 1 map unit): (index+1, run) varint pairs, base64');
  lines.push('const GM_REAL_W=' + W + ',GM_REAL_H=' + H + ',GM_REAL_FULL=1;\nconst GM_REAL=\'' + Buffer.from(by).toString('base64') + '\';');
  fs.writeFileSync(new URL('../src/13f-grandreal.js', import.meta.url), '// Generated by orch/grandmap-gen.mjs. realmap (2026-11-07): the province raster now lives in 13-grandmap.js (GM_REAL, the whole real-world map).\n');
  console.log('raster b64 KB', Math.round(Buffer.from(by).length * 4 / 3 / 1024)); }
{ const b = Buffer.alloc(N0 * 2); for (let i = 0; i < N0; i++) b.writeUInt16LE(PIX[i], 2 * i); fs.writeFileSync(new URL('./realmap/prov.bin.gz', import.meta.url), zlib.gzipSync(b, { level: 9 })); }
fs.writeFileSync(new URL('../src/13-grandmap.js', import.meta.url), lines.join('\n') + '\n');
// old -> new mapping table (every old province name is kept; this lists where it now is)
{ const old = PR.map(p => p[1]).concat(REALT.map(r => r[1])); const rows = old.map(n => { const i = byName(n); return '| ' + n + ' | ' + (i >= 0 ? i + ' | ' + seeds[i].o + ' | ' + seeds[i].x + ',' + seeds[i].y : '— | — | lost') + ' |'; });
  fs.writeFileSync(new URL('./realmap/MAPPING.md', import.meta.url), '# realmap: old province -> new province index (generated by orch/grandmap-gen.mjs)\nNames are unchanged; indexes changed (saves made before realmap are refused with a message by grSaveOk/grMapSig).\n\n| old name | new index | owner | x,y |\n|---|---|---|---|\n' + rows.join('\n') + '\n'); }
const pc = new Int32Array(nl); for (let i = 0; i < N0; i++) if (PIX[i] < nl) pc[PIX[i]]++;
const small = seeds.slice(0, nl).map((s, i) => [s.n, pc[i]]).filter(r => r[1] < MINPX).map(r => r.join(':'));
const landless = seeds.slice(0, nl).filter((s, i) => ![...adj[i]].some(j => j < nl)).length, iso = seeds.slice(0, nl).filter((s, i) => !adj[i].size).map(s => s.n);
console.log('provinces', nl, 'seas', seeds.length - nl, 'nations', NATS2.length, '(new minors ' + (NATS2.length - NATS.filter(n => ownersLive.has(n[0])).length) + ')', 'rivers', rivers.length, '| island provinces', landless, '| isolated:', iso.join(', ') || 'none', '| tiny:', small.join(', ') || 'none');
