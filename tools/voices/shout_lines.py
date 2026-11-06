# -*- coding: utf-8 -*-
"""Soldier combat shouts (battlefeel, 2026-11-06). R[code][key] = ([], [], [variant1, variant2]) in the nation's language - the shape
orch/vo/roles.py renders with  VO_LINES=shout_lines VO_SUF=_s  -> vo/CODE_s.mp3 + tools/voices/map/CODE_s.json (the shouted variant 2 list is the one used).
Keys = the sim events of src/03g-battlefeel.js BF_SHOUT: rpg manDown reload grenade contact tank medic. Short, barked, native.
EU lines are (language, text) pairs like roles_lines.py."""
KEYS = ['rpg', 'manDown', 'reload', 'grenade', 'contact', 'tank', 'medic']
ROLES = KEYS
RV = {'rpg': (0, None, 0), 'manDown': (1, None, 0), 'reload': (2, None, 0), 'grenade': (0, None, 0), 'contact': (1, None, 0), 'tank': (2, None, 0), 'medic': (1, None, 3)}
EN = {'rpg': 'RPG!', 'manDown': 'Man down!', 'reload': 'Reloading!', 'grenade': 'Grenade!', 'contact': 'Contact front!', 'tank': 'Tank!', 'medic': 'Medic!'}
R = {}
def _s(code, block):
    d = {}
    for ln in block.strip().split('\n'):
        k, rest = ln.split(' ', 1)
        v = [x.strip() for x in rest.split('|')]
        if code == 'EU': v = [(x[:2], x[3:]) for x in v]
        d[k] = ([], [], v)
    R[code] = d
_s('US', '''
rpg RPG! RPG!|Rocket, incoming!
manDown Man down!|Medic, man down!
reload Reloading!|Cover me, reloading!
grenade Grenade!|Frag out!
contact Contact front!|Contact, contact!
tank Tank!|Armor, armor!
medic Medic!|I need a medic!
''')
_s('TR', '''
rpg RPG! Roketatar!|Roket geliyor!
manDown Yaralı var!|Adam vuruldu!
reload Şarjör değiştiriyorum!|Ateş verin, doldurmam lazım!
grenade El bombası!|Yatın, bomba!
contact Temas! Önde düşman!|Düşman önde!
tank Tank!|Zırhlı araç!
medic Sıhhiye!|Sıhhiye, çabuk!
''')
_s('RU', '''
rpg РПГ!|Гранатомёт!
manDown Раненый!|Боец ранен!
reload Перезаряжаю!|Прикройте, перезаряжаю!
grenade Граната!|Ложись, граната!
contact Контакт спереди!|Противник впереди!
tank Танк!|Танки!
medic Санитар!|Санитар, сюда!
''')
_s('UA', '''
rpg РПГ!|Гранатомет!
manDown Поранений!|Боєць поранений!
reload Перезаряджаю!|Прикрийте, перезаряджаю!
grenade Граната!|Лягай, граната!
contact Контакт попереду!|Ворог попереду!
tank Танк!|Танки!
medic Медик!|Потрібен медик!
''')
_s('IL', '''
rpg ר.פ.ג'י!|טיל!
manDown נפגע!|יש פצוע!
reload מטעין!|תכסו אותי, מטעין!
grenade רימון!|רימון, למטה!
contact מגע! מגע קדימה!|מגע בחזית!
tank טנק!|שריון!
medic חובש!|דרוש חובש!
''')
_s('SA', '''
rpg آر بي جي!|صاروخ!
manDown جندي مصاب!|إصابة، إصابة!
reload أعيد التعبئة!|غطّوني، أعبّئ!
grenade قنبلة!|انبطحوا، قنبلة!
contact اشتباك أمامي!|عدو أمامنا!
tank دبابة!|مدرعات!
medic مسعف!|نحتاج مسعفاً!
''')
_s('AE', '''
rpg آر بي جي!|صاروخ!
manDown واحد منا انصاب!|إصابة، إصابة!
reload أعبّي!|غطّوني، أعبّي!
grenade قنبلة!|انبطحوا، قنبلة!
contact اشتباك قدامنا!|العدو قدامنا!
tank دبابة!|مدرعات!
medic مسعف!|نبي مسعف!
''')
_s('EG', '''
rpg آر بي جي!|صاروخ جاي!
manDown إصابة!|واحد وقع!
reload بعبّي!|غطّوني، بعبّي!
grenade قنبلة!|ارقدوا، قنبلة!
contact اشتباك قدامنا!|العدو قدامنا!
tank دبابة!|دبابة قدامنا!
medic مسعف!|عايزين مسعف!
''')
_s('IR', '''
rpg آر پی جی!|موشک! یا علی!
manDown مجروح داریم!|یا زهرا! تیر خورد!
reload خشاب عوض می‌کنم!|پوشش بدید، پر می‌کنم!
grenade نارنجک!|بخوابید، نارنجک!
contact درگیری از جلو!|دشمن روبروست!
tank تانک!|زره‌پوش!
medic امدادگر!|امدادگر بیاد!
''')
_s('RS', '''
rpg آر بي جي!|صاروخ!
manDown يا حسين! إصابة!|جريح!
reload عم عبّي!|غطّولي، عم عبّي!
grenade قنبلة!|انبطحوا، قنبلة!
contact اشتباك قدّام!|العدو قدّامنا!
tank دبابة!|دبابة، دبابة!
medic مسعف!|بدنا مسعف!
''')
_s('DW', '''
rpg آر بي جي!|صاروخ!
manDown إصابة!|واحد منا انصاب!
reload أعبّي!|غطّوني، أعبّي!
grenade قنبلة!|انبطحوا، قنبلة!
contact اشتباك قدامنا!|العدو قدامنا!
tank دبابة!|دبابة، دبابة!
medic مسعف!|نبغى مسعف!
''')
_s('PK', '''
rpg आर पी जी!|राकेट!
manDown ज़ख़्मी साथी!|जवान ज़ख़्मी!
reload रीलोड कर रहा हूँ!|कवर दो, रीलोड!
grenade ग्रेनेड!|लेट जाओ, ग्रेनेड!
contact सामने दुश्मन!|दुश्मन सामने है!
tank टैंक!|बख़्तरबंद!
medic मेडिक!|मेडिक बुलाओ!
''')
_s('IN', '''
rpg आरपीजी!|रॉकेट!
manDown जवान घायल!|साथी गिर गया!
reload रीलोड कर रहा हूँ!|कवर दो, रीलोड!
grenade ग्रेनेड!|लेट जाओ, ग्रेनेड!
contact सामने दुश्मन!|सामने कॉन्टैक्ट!
tank टैंक!|बख़्तरबंद गाड़ी!
medic मेडिक!|मेडिक बुलाओ!
''')
_s('CN', '''
rpg 火箭筒！|火箭弹！
manDown 有人中弹！|战友倒下了！
reload 换弹！|掩护我，换弹！
grenade 手榴弹！|卧倒，手雷！
contact 正前方接敌！|发现敌人！
tank 坦克！|装甲车！
medic 卫生员！|需要卫生员！
''')
_s('KP', '''
rpg 대전차 로케트!|로케트 발사!
manDown 동무가 쓰러졌다!|부상자 발생!
reload 재장전!|엄호하라, 재장전!
grenade 수류탄!|엎드려, 수류탄!
contact 전방에 적!|적과 접촉!
tank 땅크!|땅크다!
medic 위생병!|위생병 불러라!
''')
_s('KR', '''
rpg 대전차 로켓!|로켓 발사!
manDown 부상자 발생!|아군 피격!
reload 재장전!|엄호 바람, 재장전!
grenade 수류탄!|엎드려, 수류탄!
contact 전방 접촉!|적 발견, 전방!
tank 전차!|적 전차 출현!
medic 의무병!|의무병 불러!
''')
_s('CU', '''
rpg ¡RPG!|¡Cohete!
manDown ¡Hombre herido!|¡Compañero caído!
reload ¡Recargando!|¡Cúbranme, recargando!
grenade ¡Granada!|¡Al suelo, granada!
contact ¡Contacto al frente!|¡Enemigo al frente!
tank ¡Tanque!|¡Blindado!
medic ¡Médico!|¡Necesito un médico!
''')
_s('EU', '''
rpg fr:RPG !|de:Panzerfaust!
manDown fr:Homme à terre !|de:Verwundeter!
reload fr:Je recharge !|de:Ich lade nach!
grenade fr:Grenade !|de:Granate!
contact fr:Contact devant !|de:Feindkontakt!
tank fr:Char !|de:Panzer!
medic fr:Médic !|de:Sanitäter!
''')
