# -*- coding: utf-8 -*-
"""Commander radio callouts + hero squad lines (2026-11-05). R[code][key] = (calm[], [], shout[]) - same shape as roles_lines.R so
orch/vo/roles.py renders them (VO_LINES=radio_lines VO_SUF=_h): variant 0 = calm command voice, variant 2 = shouted over gunfire.
Keys (event -> when the game plays it): base armL armR air town_taken town_lost msl lost hero | hero lines: hsel hmove hatk hab.
EN (below) are the subtitles' English lines, the same for every nation."""
KEYS = ['base', 'air', 'armL', 'armR', 'town_taken', 'town_lost', 'msl', 'lost', 'hero', 'hsel', 'hmove', 'hatk', 'hab']
EN = {'base': 'Base under attack!', 'air': 'Enemy aircraft inbound!', 'armL': 'Enemy armor on the left flank!', 'armR': 'Enemy armor on the right flank!',
      'town_taken': 'Town secured. It is ours.', 'town_lost': 'We lost the town!', 'msl': 'Missile launch! Take cover!', 'lost': 'Unit lost.',
      'hero': 'Hero squad ready.', 'hsel': 'Squad standing by.', 'hmove': 'Moving out.', 'hatk': 'Contact! Engaging!', 'hab': 'Executing! Go!'}
SHOUT = {'base', 'air', 'armL', 'armR', 'town_lost', 'msl', 'hatk', 'hab'}
R = {}
def _b(code, block):
    d = {}
    for ln in block.strip().split('\n'):
        k, t = ln.split(' ', 1); t = t.strip()
        t = ('fr', t) if code == 'EU' else t
        d[k] = ([], [], [t]) if k in SHOUT else ([t], [], [])
    R[code] = d
_b('US', '''
base Base under attack!
air Enemy aircraft inbound!
armL Enemy armor, left flank!
armR Enemy armor, right flank!
town_taken Town secured.
town_lost We lost the town!
msl Missile launch! Take cover!
lost We lost a unit.
hero Special operators ready, sir.
hsel Operators standing by.
hmove Moving out.
hatk Contact! Engaging!
hab Executing, go go go!''')
_b('TR', '''
base Üssümüz saldırı altında!
air Düşman uçakları geliyor!
armL Sol kanatta düşman zırhlısı!
armR Sağ kanatta düşman zırhlısı!
town_taken Kasaba ele geçirildi.
town_lost Kasabayı kaybettik!
msl Füze fırlatıldı! Siper alın!
lost Bir birlik kaybettik.
hero Komando timi hazır.
hsel Komandolar hazır.
hmove Harekete geçiyoruz.
hatk Temas! Ateş!
hab Şimdi, hücum!''')
_b('RU', '''
base База под атакой!
air Вражеская авиация!
armL Вражеские танки на левом фланге!
armR Вражеские танки на правом фланге!
town_taken Город взят.
town_lost Мы потеряли город!
msl Пуск ракеты! В укрытие!
lost Потеряли бойцов.
hero Спецназ готов.
hsel Группа на связи.
hmove Выдвигаемся.
hatk Контакт! Огонь!
hab Работаем, вперёд!''')
_b('UA', '''
base База під атакою!
air Ворожа авіація!
armL Ворожі танки на лівому фланзі!
armR Ворожі танки на правому фланзі!
town_taken Місто наше.
town_lost Ми втратили місто!
msl Пуск ракети! В укриття!
lost Втратили бійців.
hero Спецоперації готові.
hsel Група на зв’язку.
hmove Висуваємось.
hatk Контакт! Вогонь!
hab Працюємо, вперед!''')
_b('IL', '''
base הבסיס תחת מתקפה!
air מטוסי אויב מתקרבים!
armL שריון אויב בכנף שמאל!
armR שריון אויב בכנף ימין!
town_taken העיר בידינו.
town_lost איבדנו את העיר!
msl שיגור טילים! להיכנס למחסה!
lost איבדנו כוח.
hero הסיירת מוכנה.
hsel הסיירת על הקו.
hmove יוצאים לדרך.
hatk מגע! אש!
hab מבצעים, קדימה!''')
_b('EU', '''
base La base est attaquée !
air Avions ennemis en approche !
armL Blindés ennemis sur le flanc gauche !
armR Blindés ennemis sur le flanc droit !
town_taken Ville sécurisée.
town_lost Nous avons perdu la ville !
msl Tir de missile ! À couvert !
lost Unité perdue.
hero Forces spéciales prêtes.
hsel Le détachement est prêt.
hmove On se déplace.
hatk Contact ! Feu !
hab Exécution, allez !''')
_b('IR', '''
base پایگاه زیر حمله است!
air هواپیماهای دشمن نزدیک می‌شوند!
armL زرهی دشمن در جناح چپ!
armR زرهی دشمن در جناح راست!
town_taken شهر به دست ما افتاد.
town_lost شهر را از دست دادیم!
msl شلیک موشک! پناه بگیرید!
lost یک یگان را از دست دادیم.
hero نیروی ویژه آماده است.
hsel یا ابوالفضل، آماده‌ایم.
hmove در حرکتیم، یا علی.
hatk درگیری! یا حسین، آتش!
hab عملیات! یا زهرا!''')
_b('RS', '''
base القاعدة تحت الهجوم!
air طيران معادي عم يقترب!
armL دبابات العدو عالجناح الأيسر!
armR دبابات العدو عالجناح الأيمن!
town_taken البلدة صارت عنّا.
town_lost خسرنا البلدة!
msl إطلاق صاروخ! خدوا غطا!
lost خسرنا مجموعة.
hero فرقة الرضوان جاهزة.
hsel يا أبا الفضل، جاهزين.
hmove ماشيين، يا علي.
hatk اشتباك! يا حسين، نار!
hab نفّذوا! لبيك يا زهراء!''')
_b('DW', '''
base القاعدة تحت الهجوم!
air طيران العدو كاعد يقرب!
armL دروع العدو على الجناح الأيسر!
armR دروع العدو على الجناح الأيمن!
town_taken البلدة صارت إلنا.
town_lost خسرنا البلدة!
msl إطلاق صاروخ! احتموا!
lost خسرنا مجموعة.
hero قائد المقاومة جاهز.
hsel حاضرين يا قائد، يا أبو الفضل.
hmove ماشين، يا علي.
hatk اشتباك! لبيك يا حسين، اضرب!
hab نفّذوا! يا زهراء!''')
_b('SA', '''
base القاعدة تحت الهجوم!
air طائرات معادية قادمة!
armL دروع معادية على الجناح الأيسر!
armR دروع معادية على الجناح الأيمن!
town_taken تم تأمين البلدة.
town_lost خسرنا البلدة!
msl إطلاق صاروخ! احتموا!
lost فقدنا وحدة.
hero القوات الخاصة جاهزة.
hsel القوات الخاصة بانتظار الأمر.
hmove نتحرك الآن.
hatk اشتباك! أطلقوا النار!
hab نفّذوا، هيّا!''')
_b('AE', '''
base القاعدة تتعرض لهجوم!
air طائرات العدو قادمة!
armL دروع العدو على الجناح الأيسر!
armR دروع العدو على الجناح الأيمن!
town_taken البلدة صارت تحت سيطرتنا.
town_lost خسرنا البلدة!
msl إطلاق صاروخ! احتموا!
lost خسرنا وحدة.
hero الحرس الرئاسي جاهز.
hsel الحرس الرئاسي بانتظار الأمر.
hmove نتحرك الحين.
hatk اشتباك! نار!
hab نفّذوا، يلا!''')
_b('EG', '''
base القاعدة بتتهاجم!
air طيران العدو جاي!
armL دبابات العدو على الجناح الشمال!
armR دبابات العدو على الجناح اليمين!
town_taken البلد بقت بتاعتنا.
town_lost خسرنا البلد!
msl إطلاق صاروخ! خدوا ساتر!
lost خسرنا وحدة.
hero الصاعقة جاهزة.
hsel الصاعقة جاهزة يا فندم.
hmove ماشيين يا فندم.
hatk اشتباك! اضرب!
hab نفّذ! تحيا مصر!''')
_b('PK', '''
base बेस पर हमला हो रहा है!
air दुश्मन के जहाज़ आ रहे हैं!
armL बाएँ मोर्चे पर दुश्मन के टैंक!
armR दाएँ मोर्चे पर दुश्मन के टैंक!
town_taken क़स्बा हमारे क़ब्ज़े में है।
town_lost हमने क़स्बा खो दिया!
msl मिसाइल दाग़ी गई! पनाह लो!
lost एक टुकड़ी खो दी।
hero कमांडो दस्ता तैयार है।
hsel कमांडो तैयार हैं सर।
hmove आगे बढ़ रहे हैं।
hatk टकराव! फ़ायर!
hab अमल करो, चलो!''')
_b('IN', '''
base बेस पर हमला हो रहा है!
air दुश्मन के विमान आ रहे हैं!
armL बाएँ किनारे पर दुश्मन के टैंक!
armR दाएँ किनारे पर दुश्मन के टैंक!
town_taken कस्बे पर हमारा कब्ज़ा।
town_lost हमने कस्बा खो दिया!
msl मिसाइल दागी गई! आड़ लो!
lost एक यूनिट खो दी।
hero पैरा कमांडो तैयार हैं।
hsel कमांडो तैयार हैं सर।
hmove आगे बढ़ रहे हैं।
hatk संपर्क! फायर!
hab कार्रवाई करो, जय हिंद!''')
_b('CN', '''
base 基地遭到攻击！
air 敌机来袭！
armL 左翼发现敌军装甲！
armR 右翼发现敌军装甲！
town_taken 城镇已占领。
town_lost 我们失去了城镇！
msl 导弹发射！注意隐蔽！
lost 损失一支部队。
hero 特种部队就绪。
hsel 特战小队待命。
hmove 开始行动。
hatk 接敌！开火！
hab 执行！行动！''')
_b('KP', '''
base 기지가 공격받고 있습니다!
air 적 항공기가 접근 중입니다!
armL 좌측 측면에 적 전차!
armR 우측 측면에 적 전차!
town_taken 마을을 점령했습니다.
town_lost 마을을 빼앗겼습니다!
msl 미사일 발사! 엄폐하라!
lost 부대를 잃었습니다.
hero 돌격대 준비되었습니다.
hsel 돌격대 대기 중입니다.
hmove 앞으로!
hatk 교전! 사격!
hab 결사옹위! 돌격!''')
_b('KR', '''
base 기지가 공격받고 있습니다!
air 적 항공기가 접근 중입니다!
armL 좌측에 적 기갑!
armR 우측에 적 기갑!
town_taken 마을을 확보했습니다.
town_lost 마을을 잃었습니다!
msl 미사일 발사! 엄폐하라!
lost 병력 손실.
hero 특전사 준비 완료.
hsel 특전팀 대기 중입니다.
hmove 이동합니다.
hatk 접촉! 사격!
hab 실행! 간다!''')
_b('CU', '''
base ¡La base está bajo ataque!
air ¡Aviones enemigos!
armL ¡Blindados enemigos por el flanco izquierdo!
armR ¡Blindados enemigos por el flanco derecho!
town_taken Pueblo tomado.
town_lost ¡Perdimos el pueblo!
msl ¡Lanzamiento de misil! ¡A cubierto!
lost Perdimos una unidad.
hero Avispas Negras listas.
hsel Las Avispas esperan órdenes.
hmove En movimiento.
hatk ¡Contacto! ¡Fuego!
hab ¡Ejecuten! ¡Patria o muerte!''')
ROLES = KEYS
RV = {k: (('cmd', 'cmd', 0) if k in KEYS[:9] else (2, 'grim', 0)) for k in KEYS}
if __name__ == '__main__':
    assert len(R) == 18 and all(set(v) == set(KEYS) for v in R.values()); print('ok', len(R))
