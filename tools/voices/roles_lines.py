# -*- coding: utf-8 -*-
"""Per-ROLE unit lines (2026-11-03). R[code][role] = (select[], move[], attack[]), 2-3 lines each, native language.
Roles: inf elite at tank veh pilot navy eng leader  (kind->role table: ROLE_OF in orch/vo/roles.py).
Shia factions (IR RS DW) mix their slogans (Labbaik ya Hussein, Ya Ali, Ya Zahra, Ya Sahib al-Zaman, Ya Abal-Fadl, Haihat minna al-dhilla) into every role."""
R = {}
R['IR'] = {
 'inf': (['آماده‌ام فرمانده.', 'لبیک یا حسین، در خدمتم.', 'منتظر فرمانم.'], ['چشم، حرکت می‌کنیم.', 'یا علی، به پیش!', 'در حال پیشروی.'], ['آتش!', 'حمله! یا زهرا!', 'لبیک یا حسین، آتش!']),
 'elite': (['در سکوت آماده‌ایم.', 'کماندوها آماده‌اند.', 'یا ابوالفضل، در خدمتم.'], ['بی‌صدا حرکت می‌کنیم.', 'از پشت می‌رویم.', 'یا علی، می‌رویم.'], ['هدف را می‌زنم.', 'ضربه دقیق!', 'یا حسین، شلیک!']),
 'at': (['موشک‌انداز آماده است.', 'تیم ضد زره آماده.', 'یا علی، آماده‌ایم.'], ['تیم ضد زره در حرکت.', 'موشک‌ها را می‌بریم.', 'یا علی مدد، حرکت.'], ['تانک دیده شد، شلیک!', 'موشک رها شد!', 'لبیک یا حسین، بزن!']),
 'tank': (['خدمه زرهی آماده.', 'تانک روشن است.', 'یا علی، توپ آماده.'], ['زنجیرها حرکت می‌کنند.', 'پیش به سوی دشمن.', 'یا حیدر، حرکت.'], ['توپ آماده، آتش!', 'گلوله زره‌پیش، شلیک!', 'لبیک یا حسین، آتش!']),
 'veh': (['خدمه آماده است.', 'وسیله آماده، فرمانده.', 'یا زهرا، در خدمتیم.'], ['حرکت می‌کنیم.', 'راننده، گاز بده!', 'یا علی، در راهیم.'], ['آتش پشتیبانی!', 'توپخانه، شلیک!', 'یا حسین، آتش!']),
 'pilot': (['خلبان آماده پرواز.', 'پرواز آماده است.', 'یا علی، آسمان با ماست.'], ['اوج می‌گیرم.', 'در مسیر هدف.', 'یا حسین، پرواز.'], ['هدف در دید، شلیک!', 'بمب رها شد!', 'لبیک یا حسین، حمله هوایی!']),
 'navy': (['ناوچه آماده است.', 'دریادلان آماده‌اند.', 'یا علی، در خدمتیم.'], ['به سوی دریا.', 'سرعت کامل!', 'یا حسین، حرکت.'], ['آتش به دشمن دریایی!', 'موشک دریایی رها شد!', 'لبیک یا حسین، آتش!']),
 'eng': (['مهندسان آماده‌اند.', 'آماده ساختن، فرمانده.', 'یا علی، در خدمتم.'], ['به محل کار می‌رویم.', 'حرکت به سوی کارگاه.', 'یا علی مدد.'], ['مین را فعال کن!', 'ما هم می‌جنگیم!', 'یا زهرا، آتش!']),
 'leader': (['خدا با ماست.', 'فرمان شما، یاران.', 'یا صاحب‌الزمان، با من بیایید.'], ['به نام خدا، حرکت.', 'با توکل بر خدا.', 'یا علی، همراه من.'], ['به نام خدا، حمله!', 'خدا با ماست!', 'لبیک یا حسین، به پیش!']),
}
R['RS'] = {   # south-Lebanese spoken military Arabic, short (2026-11-17 voices-lb2)
 'inf': (['حاضر يا حجّ.', 'لبّيك يا حسين، جاهزين.', 'أمُرني خيّي.'], ['يلّا يا شباب.', 'يا علي، رايحين.', 'تكرم، ماشيين.'], ['يلّا عليهن!', 'يا زهرا! نار!', 'لبّيك يا حسين! ضربوهن!']),
 'elite': (['القنّاص جاهز.', 'جاهزين، بهدوء.', 'يا أبو الفضل، أمُرني.'], ['منمشي بهدوء.', 'منلفّ عليهن من ورا.', 'يا علي، منتسلّل.'], ['شايفو. نار.', 'طلقة وحدة وخلص.', 'هيهات منّا الذلّة!']),
 'at': (['الصواريخ جاهزة يا حجّ.', 'فريق الصواريخ حاضر.', 'يا علي، جاهزين.'], ['منحمل الصواريخ ومنمشي.', 'عالنقطة يا شباب.', 'يا علي، رايحين.'], ['الدبّابة قدّامنا! ضربها!', 'الصاروخ طالع!', 'لبّيك يا حسين! ولّعها!']),
 'tank': (['الطاقم جاهز يا حجّ.', 'المدفع معبّى.', 'يا علي، المحرّك شغّال.'], ['لقدّام يا شوفير!', 'منمشي هلّق.', 'يا حيدر، رايحين.'], ['المدفع جاهز! نار!', 'القذيفة طالعة!', 'لبّيك يا حسين! نار!']),
 'veh': (['الشباب بالسيّارة، جاهزين.', 'حاضر يا حجّ.', 'يا زهرا، تكرم عينك.'], ['دعوس يا شوفير!', 'عالطريق، بسرعة!', 'يا علي، ماشيين.'], ['نار عليهن!', 'المدفعية، نار!', 'يا حسين! ولّعها!']),
 'pilot': (['المسيّرة جاهزة يا حجّ.', 'جاهزين نطلع.', 'يا علي، السما إلنا.'], ['طالعين هلّق.', 'رايحين عالهدف.', 'يا حسين، طالعين.'], ['الهدف قدّامي! ضرب!', 'نزلت القنبلة!', 'لبّيك يا حسين! غارة!']),
 'navy': (['الزورق جاهز.', 'البحّارة حاضرين.', 'يا علي، أمُرني.'], ['عالبحر، بسرعة!', 'على آخر سرعة!', 'يا حسين، ماشيين.'], ['نار عالمركب!', 'الصاروخ طالع!', 'لبّيك يا حسين! نار!']),
 'eng': (['الهندسة جاهزين.', 'شو بدّك نعمّر؟', 'يا علي، أمُرني.'], ['رايحين عالورشة.', 'طالعين عالشغل.', 'يا علي، يلّا.'], ['فجّر الألغام!', 'نحنا كمان منقاتل!', 'يا زهرا! نار!']),
 'leader': (['الله معنا يا شباب.', 'أمركن يا شباب.', 'يا صاحب الزمان، تعوا معي.'], ['بسم الله، يلّا.', 'توكّلنا على الله.', 'يا علي، لحقوني.'], ['بسم الله! هجوم!', 'الله معنا! لقدّام!', 'لبّيك يا حسين! عليهن!']),
}

R['DW'] = {
 'inf': (['حاضرين يا قائد.', 'لبيك يا حسين، تحت أمرك.', 'جاهزين هسّه.'], ['ماشين على بركة الله.', 'يا علي مدد، نتحرك.', 'يلّا شباب، نتقدم.'], ['اضرب!', 'يا زهراء، هجوم!', 'لبيك يا حسين، عليهم!']),
 'elite': (['القناص جاهز.', 'بهدوء، حاضرين.', 'يا أبو الفضل، تحت أمرك.'], ['نمشي بصمت.', 'نلف عليهم من الجنب.', 'يا علي، نتسلل.'], ['شايفه، أضرب.', 'طلقة وحدة.', 'هيهات منا الذلة!']),
 'at': (['فريق الصواريخ جاهز.', 'ضد الدروع حاضرين.', 'يا علي، جاهزين.'], ['نشيل الصواريخ، ماشين.', 'للموقع يا رجال.', 'يا علي مدد، نتحرك.'], ['شفنا الدبابة، اضرب!', 'صاروخ طالع!', 'لبيك يا حسين، اضرب!']),
 'tank': (['طاقم الدبابة جاهز.', 'المدفع جاهز يا قائد.', 'يا علي، المكينة شغالة.'], ['السلاسل تدور.', 'قدّام يا سايق!', 'يا حيدر، ماشين.'], ['المدفع جاهز، اضرب!', 'قذيفة طالعة!', 'لبيك يا حسين، نار!']),
 'veh': (['الطاقم جاهز.', 'العربانة جاهزة يا قائد.', 'يا زهراء، تحت أمرك.'], ['ماشين يا سايق.', 'للطريق، بسرعة.', 'يا علي مدد.'], ['نار الإسناد!', 'المدفعية، اضرب!', 'يا حسين، نار!']),
 'pilot': (['الطيار جاهز.', 'جاهزين للإقلاع.', 'يا علي، السماء لنا.'], ['نطلع للجو.', 'للهدف، ماشين.', 'يا حسين، طيران.'], ['الهدف بالمنظار، اضرب!', 'القنبلة نزلت!', 'لبيك يا حسين، غارة!']),
 'navy': (['الزورق جاهز.', 'البحارة حاضرين.', 'يا علي، تحت أمرك.'], ['للبحر، بسرعة!', 'المكينة على الآخر.', 'يا حسين، ماشين.'], ['نار على البحرية!', 'صاروخ بحري طالع!', 'لبيك يا حسين، نار!']),
 'eng': (['المهندسين جاهزين.', 'جاهزين للبناء.', 'يا علي، تحت أمرك.'], ['للورشة يا شباب.', 'نروح للموقع.', 'يا علي مدد.'], ['فعّل الألغام!', 'نقاتل بعد!', 'يا زهراء، نار!']),
 'leader': (['الله وياكم.', 'أمركم يا أحبة.', 'يا صاحب الزمان، تعالوا وياي.'], ['بسم الله، تحركوا.', 'متوكلين على الله.', 'يا علي، وياي.'], ['بسم الله، هجوم!', 'الله وياكم!', 'لبيك يا حسين، كدّام!']),
}

# ---- compact form for the other 15 nations: one line per role "select1|select2 / move1|move2 / attack1|attack2"
# EU lines carry their language as "fr:" / "de:" / "en:".
def _p(code, block, dflt=None):
    d = {}
    for ln in block.strip().split('\n'):
        role, rest = ln.split(' ', 1)
        d[role] = tuple([(tuple((x[:2], x[3:]) if code == 'EU' else x for x in part.strip().split('|'))) for part in rest.split(' / ')])
    return d

R['US'] = _p('US', '''
inf Ready, sir.|Locked and loaded. / Moving out.|Oscar Mike. / Engaging!|Hooah, weapons free!
elite Operator ready.|Quiet professionals, standing by. / Moving silent.|Going dark. / Target acquired.|One shot, one kill.
at Javelin team up.|Tank hunters ready. / Moving the launcher.|Shouldering the tube. / Armor in sight, firing!|Javelin away!
tank Crew ready, Abrams up.|Gun's loaded, sir. / Rolling out.|Tracks turning. / Gunner, fire!|Sabot away!
veh Crew standing by.|Vehicle ready, sir. / On our way.|Rolling. / Fire mission!|Rounds going downrange!
pilot Pilot ready.|Birds are fueled and ready. / Wheels up.|Climbing to altitude. / Target in sight, weapons hot!|Fox three, missile away!
navy Captain on deck.|Crew at stations. / Full ahead.|Steady as she goes. / Guns, open fire!|Fire for effect, all batteries!
eng Engineers ready.|Ready to build, sir. / On site shortly.|Heading to the work site. / Laying charges!|We fight too, sir!
leader Commander on the line.|Awaiting your orders. / Follow me.|Advance with caution. / Attack, attack!|For the flag, forward!
''')
R['TR'] = _p('TR', '''
inf Hazırım komutanım.|Emrinizdeyim. / Harekete geçiyoruz.|Bismillah, ilerliyoruz. / Ateş!|Allah Allah, hücum!
elite Komandolar hazır.|Sessizce hazırız. / Gölge gibi ilerliyoruz.|Arkadan dolanıyoruz. / Hedef alındı.|Tek atış, tek hedef.
at Tank avcıları hazır.|Füze ekibi emrinde. / Füzeleri taşıyoruz.|Mevzi alıyoruz. / Zırhlı hedef, ateş!|Füze atıldı!
tank Mürettebat hazır.|Namlu hazır komutanım. / Paletler dönüyor.|İleri, hızlı! / Top hazır, ateş!|Zırh delici, ateş!
veh Mürettebat hazır.|Araç hazır komutanım. / Yola çıkıyoruz.|Gaza bas! / Destek ateşi!|Atış başladı!
pilot Pilot hazır.|Uçuşa hazırız. / Havalanıyoruz.|Hedefe yöneldim. / Hedef görüldü, ateş!|Bomba bırakıldı!
navy Gemi hazır.|Mürettebat görev başında. / Tam yol ileri.|Denize açılıyoruz. / Toplar, ateş!|Düşmana ateş!
eng İstihkâmcılar hazır.|İnşaata hazırız. / Şantiyeye gidiyoruz.|Yola çıkıyoruz. / Mayınlar hazır!|Biz de savaşırız!
leader Komutan hatta.|Emredin komutanım. / Beni izleyin.|Vatan için ileri! / Hücum!|Ne mutlu Türküm diyene!
''')
R['RU'] = _p('RU', '''
inf Готов.|Слушаю, командир. / Выдвигаюсь.|Вперёд! / Огонь!|Ура, в атаку!
elite Спецназ готов.|Работаем тихо. / Идём скрытно.|Заходим с тыла. / Цель вижу.|Один выстрел.
at Расчёт ПТУР готов.|Противотанковый расчёт готов. / Выдвигаем ракеты.|Занимаем позицию. / Бронетехника, пуск!|Ракета пошла!
tank Экипаж готов.|Орудие заряжено. / Танк пошёл.|Вперёд, механик! / Наводчик, огонь!|Бронебойным, огонь!
veh Расчёт готов.|Машина к бою готова. / Выдвигаемся.|Погнали! / Огонь по цели!|Залп!
pilot Пилот готов.|Борт к вылету готов. / Взлёт.|Иду на цель. / Цель вижу, пуск!|Бомбы сброшены!
navy Экипаж на местах.|Корабль готов. / Полный вперёд.|Курс на цель. / Орудия, огонь!|Залп по врагу!
eng Сапёры готовы.|Готовы строить. / Выдвигаемся на объект.|Идём на работу. / Мины в бою!|Мы тоже воюем!
leader Командир на связи.|Слушаю вас. / За мной.|Вперёд, за Родину! / В атаку!|Служу России!
''')
R['UA'] = _p('UA', '''
inf Готовий.|Слухаю, командире. / Рухаємося.|Вперед! / Вогонь!|Слава Україні!
elite Спецпризначенці готові.|Працюємо тихо. / Йдемо непомітно.|Заходимо з флангу. / Ціль бачу.|Один постріл.
at Протитанковий розрахунок готовий.|Джавелін готовий. / Висуваємось.|Займаємо позицію. / Броня в прицілі, пуск!|Ракета пішла!
tank Екіпаж готовий.|Гармата заряджена. / Танк рушив.|Уперед, механіку! / Навіднику, вогонь!|Бронебійним, вогонь!
veh Розрахунок готовий.|Машина готова. / Виходимо.|Поїхали! / Вогонь по цілі!|Залп!
pilot Пілот готовий.|Борт готовий до вильоту. / Зліт.|Іду на ціль. / Ціль бачу, пуск!|Бомби скинуто!
navy Екіпаж на місцях.|Корабель готовий. / Повний уперед.|Курс на ціль. / Гармати, вогонь!|Залп по ворогу!
eng Сапери готові.|Готові будувати. / Висуваємось на об’єкт.|Йдемо до роботи. / Міни готові!|Ми теж воюємо!
leader Командир на зв’язку.|Слухаю вас. / За мною.|Уперед, за Україну! / В атаку!|Героям слава!
''')
R['IL'] = _p('IL', '''
inf מוכן.|ממתין לפקודה. / זזים.|בתנועה. / אש!|קדימה, הסתערות!
elite הסיירת מוכנה.|פועלים בשקט. / נעים בחשאי.|מקיפים מהאגף. / מטרה בקנה.|ירייה אחת.
at צוות נגד טנקים מוכן.|טיל מוכן. / מזיזים את הטיל.|תופסים עמדה. / שריון באופק, שיגור!|הטיל שוגר!
tank צוות הטנק מוכן.|התותח טעון. / הטנק נע.|קדימה, נהג! / תותחן, אש!|פגז חודר שריון, אש!
veh הצוות מוכן.|הרכב מוכן. / יוצאים.|דורך על הגז! / אש תמיכה!|אש על המטרה!
pilot הטייס מוכן.|המטוס מוכן להמראה. / ממריאים.|בדרך למטרה. / מטרה בעין, שיגור!|פצצה שוחררה!
navy הצוות בעמדות.|הספינה מוכנה. / קדימה במלוא המהירות.|מפליגים. / תותחים, אש!|אש על האויב!
eng ההנדסה מוכנה.|מוכנים לבנות. / יוצאים לאתר.|בדרך לעבודה. / מוקשים מוכנים!|גם אנחנו נלחמים!
leader המפקד על הקו.|אני מקשיב. / אחריי.|עם ישראל חי! קדימה. / הסתערות!|קדימה, אחריי!
''')
R['SA'] = _p('SA', '''
inf جاهزين يا طويل العمر.|تحت أمرك. / نتحرك.|على بركة الله. / نار!|الله أكبر، هجوم!
elite القوات الخاصة جاهزة.|نعمل بصمت. / نتسلل بهدوء.|نلتف من الجناح. / الهدف في المرمى.|طلقة واحدة.
at فريق المضاد للدروع جاهز.|الصاروخ جاهز. / نحمل الصواريخ.|نأخذ موقعنا. / دبابة في المرمى، إطلاق!|الصاروخ انطلق!
tank طاقم الدبابة جاهز.|المدفع معبأ. / الدبابة تتحرك.|إلى الأمام يا سائق! / يا مدفعي، نار!|قذيفة خارقة، نار!
veh الطاقم جاهز.|المركبة جاهزة. / نخرج الآن.|بأقصى سرعة! / نار الإسناد!|المدفعية، نار!
pilot الطيار جاهز.|الطائرة جاهزة للإقلاع. / نقلع.|متجهين إلى الهدف. / الهدف في المرمى، نار!|القنبلة أُسقطت!
navy الطاقم في مواقعه.|السفينة جاهزة. / بأقصى سرعة للأمام.|نبحر. / المدافع، نار!|نار على العدو!
eng المهندسون جاهزون.|جاهزون للبناء. / نتجه إلى الموقع.|في طريقنا للعمل. / الألغام جاهزة!|نحن نقاتل أيضاً!
leader القائد على الخط.|أمرك يا طويل العمر. / اتبعوني.|للمجد والعلياء! / هجوم!|فداك يا وطن!
''')
R['AE'] = dict(R['SA']); R['AE'].update(_p('AE', '''
inf جاهزين يا قائد.|تحت أمرك. / نتحرك.|بسم الله. / نار!|الله أكبر، هجوم!
leader القائد على الخط.|أمرك يا قائد. / اتبعوني.|فداك يا إمارات! / هجوم!|عيشي بلادي!
'''))
R['EG'] = dict(R['SA']); R['EG'].update(_p('EG', '''
inf جاهزين يا باشا.|تحت أمرك. / ماشيين.|يلّا يا رجالة. / اضرب!|تحيا مصر، هجوم!
leader القائد على الخط.|أوامرك يا فندم. / اتبعوني.|تحيا مصر! / هجوم!|الله أكبر!
'''))
R['PK'] = _p('PK', '''
inf तैयार हैं सर!|हुक्म करें! / रवाना हो रहे हैं।|आगे बढ़ो! / फ़ायर!|नारा-ए-तकबीर, अल्लाहु अकबर!
elite एस एस जी तैयार है।|ख़ामोशी से तैयार हैं। / चुपचाप आगे बढ़ो।|पीछे से घेरो। / निशाना साध लिया।|एक गोली, एक दुश्मन।
at टैंक शिकारी तैयार हैं।|मिसाइल तैयार है। / मिसाइल उठाओ, चलो।|मोर्चा संभालो। / टैंक सामने, फ़ायर!|मिसाइल छोड़ी!
tank टैंक का अमला तैयार है।|तोप भरी हुई है। / टैंक आगे बढ़ रहा है।|आगे चलो, ड्राइवर! / गनर, फ़ायर!|गोला दाग़ो!
veh अमला तैयार है।|गाड़ी तैयार है सर। / निकल रहे हैं।|तेज़ चलाओ! / सपोर्ट फ़ायर!|तोपख़ाना, फ़ायर!
pilot पाइलट तैयार है।|जहाज़ उड़ान के लिए तैयार है। / उड़ान भर रहे हैं।|निशाने की तरफ़ जा रहे हैं। / निशाना नज़र में, फ़ायर!|बम गिरा दिया!
navy अमला अपनी जगह पर है।|जहाज़ तैयार है। / पूरी रफ़्तार से आगे।|समंदर की तरफ़। / तोपें, फ़ायर!|दुश्मन पर फ़ायर!
eng इंजीनियर तैयार हैं।|तामीर के लिए तैयार हैं। / काम की जगह जा रहे हैं।|काम पर चलो। / बारूदी सुरंग तैयार!|हम भी लड़ेंगे!
leader कमांडर लाइन पर हैं।|हुक्म दीजिए। / मेरे पीछे आओ।|बिस्मिल्लाह, आगे बढ़ो! / हमला!|पाकिस्तान ज़िंदाबाद!
''')
R['IN'] = _p('IN', '''
inf तैयार हैं साहब।|आदेश दीजिए। / आगे बढ़ो।|चलो जवानों! / फ़ायर!|भारत माता की जय!
elite कमांडो तैयार हैं।|चुपचाप तैयार हैं। / ख़ामोशी से आगे बढ़ो।|पीछे से घेरो। / निशाना साध लिया।|एक गोली, एक दुश्मन।
at टैंक भेदी दस्ता तैयार है।|मिसाइल तैयार है। / मिसाइल उठाओ, चलो।|मोर्चा संभालो। / टैंक सामने, दागो!|मिसाइल छोड़ी!
tank टैंक दल तैयार है।|तोप भरी है साहब। / टैंक आगे बढ़ रहा है।|आगे चलो, चालक! / गनर, दागो!|गोला छोड़ो!
veh दल तैयार है।|गाड़ी तैयार है साहब। / निकल रहे हैं।|तेज़ चलाओ! / सहायता फ़ायर!|तोपख़ाना, दागो!
pilot पायलट तैयार है।|विमान उड़ान के लिए तैयार है। / उड़ान भर रहे हैं।|लक्ष्य की ओर जा रहे हैं। / लक्ष्य दिख गया, दागो!|बम गिरा दिया!
navy दल अपने स्थान पर है।|जहाज़ तैयार है। / पूरी रफ़्तार से आगे।|समुद्र की ओर। / तोपें, दागो!|दुश्मन पर फ़ायर!
eng इंजीनियर तैयार हैं।|निर्माण के लिए तैयार हैं। / काम की जगह जा रहे हैं।|काम पर चलो। / बारूदी सुरंग तैयार!|हम भी लड़ेंगे!
leader कमांडर लाइन पर हैं।|आदेश दीजिए। / मेरे पीछे आओ।|जय हिंद, आगे बढ़ो! / हमला!|आयो गोरखाली!
''')
R['CN'] = _p('CN', '''
inf 准备就绪。|请指示。 / 出发。|听党指挥！ / 开火！|为人民服务！
elite 特种兵就位。|保持静默。 / 悄悄前进。|从侧翼包抄。 / 目标锁定。|一枪一个。
at 反坦克小组就位。|导弹准备好了。 / 扛起导弹，前进。|占领阵地。 / 发现装甲目标，发射！|导弹已发射！
tank 乘员组就位。|炮弹已装填。 / 坦克前进。|驾驶员，加速！ / 炮手，开火！|穿甲弹，发射！
veh 车组就位。|车辆准备完毕。 / 出发。|全速前进！ / 火力支援！|炮兵，开火！
pilot 飞行员就位。|飞机准备起飞。 / 起飞。|飞向目标。 / 发现目标，攻击！|炸弹已投下！
navy 全体就位。|舰艇准备完毕。 / 全速前进。|出海。 / 火炮，开火！|向敌舰开火！
eng 工兵就位。|准备施工。 / 前往工地。|出发干活。 / 地雷准备好了！|我们也能战斗！
leader 首长请指示。|听候命令。 / 跟我来。|同志们，冲啊！ / 进攻！|保卫祖国！
''')
R['KP'] = _p('KP', '''
inf 준비됐습니다, 동무!|명령만 내리십시오! / 전진!|앞으로! / 쏴라!|결사옹위!
elite 특수부대 준비됐습니다.|소리 없이 대기하겠습니다. / 은밀히 이동한다.|측면으로 돌아간다. / 목표 조준 완료.|한 발에 한 놈.
at 대전차 조 준비됐습니다.|미사일 준비 완료. / 미사일 운반, 이동한다.|진지를 점령한다. / 전차 발견, 발사!|미사일 발사!
tank 전차 승무원 준비됐습니다.|포탄 장전 완료. / 전차, 앞으로!|운전수, 속도를 높여라! / 포수, 발사!|철갑탄, 발사!
veh 승무원 준비됐습니다.|차량 준비 완료. / 출발한다.|전속력으로! / 화력 지원!|포병, 발사!
pilot 조종사 준비됐습니다.|비행 준비 완료. / 이륙한다.|목표로 향한다. / 목표 발견, 공격!|폭탄 투하!
navy 승조원 위치로.|함정 준비 완료. / 전속 전진.|바다로 나간다. / 함포, 발사!|적함에 사격!
eng 공병 준비됐습니다.|건설 준비 완료. / 현장으로 이동한다.|작업장으로 간다. / 지뢰 준비 완료!|우리도 싸운다!
leader 경애하는 지도자 동지, 명령하십시오.|지도자 동지의 명령을 기다립니다. / 나를 따르라.|조국을 위하여! / 공격하라!|경애하는 지도자 동지를 위하여!
''')
R['KR'] = _p('KR', '''
inf 준비됐습니다.|명령하십시오. / 이동합니다.|전진! / 사격!|충성! 필승!
elite 특전사 준비 완료.|조용히 대기합니다. / 은밀히 이동한다.|측면으로 우회한다. / 표적 확인.|일발필중.
at 대전차 팀 준비 완료.|미사일 준비됐습니다. / 미사일 이동한다.|진지를 확보한다. / 전차 발견, 발사!|미사일 발사!
tank 전차 승무원 준비 완료.|포탄 장전 완료. / 전차 이동한다.|조종수, 속도 올려라! / 포수, 사격!|철갑탄, 발사!
veh 승무원 준비 완료.|차량 준비됐습니다. / 출발한다.|전속력으로! / 화력 지원!|포병, 사격!
pilot 조종사 준비 완료.|이륙 준비됐습니다. / 이륙한다.|목표로 향한다. / 표적 확인, 공격!|폭탄 투하!
navy 승조원 전투 배치.|함정 준비 완료. / 전속 전진.|출항한다. / 함포, 사격!|적함에 사격!
eng 공병 준비 완료.|건설 준비됐습니다. / 현장으로 이동합니다.|작업장으로 갑니다. / 지뢰 준비 완료!|우리도 싸웁니다!
leader 지휘관님, 명령하십시오.|지시를 기다립니다. / 나를 따르라.|대한민국 만세, 전진! / 공격!|필승!
''')
R['CU'] = _p('CU', '''
inf Listo, comandante.|A sus órdenes. / Avanzamos.|¡Adelante! / ¡Fuego!|¡Patria o muerte!
elite Fuerzas especiales listas.|En silencio, comandante. / Avanzamos sin ruido.|Rodeamos por el flanco. / Objetivo a la vista.|Un solo disparo.
at Equipo antitanque listo.|Misil preparado. / Movemos el lanzador.|Tomamos posición. / Blindado a la vista, ¡fuego!|¡Misil lanzado!
tank Tripulación lista.|Cañón cargado. / El tanque avanza.|¡Adelante, conductor! / ¡Artillero, fuego!|¡Proyectil perforante, fuego!
veh Dotación lista.|Vehículo listo, comandante. / Salimos ya.|¡A toda velocidad! / ¡Fuego de apoyo!|¡Artillería, fuego!
pilot Piloto listo.|Avión listo para despegar. / Despegando.|Rumbo al objetivo. / Objetivo a la vista, ¡fuego!|¡Bomba lanzada!
navy Tripulación en sus puestos.|Barco listo. / Avante a toda máquina.|Zarpamos. / ¡Cañones, fuego!|¡Fuego al enemigo!
eng Ingenieros listos.|Listos para construir. / Vamos a la obra.|En camino al trabajo. / ¡Minas listas!|¡Nosotros también luchamos!
leader Comandante en línea.|Ordene, compañero. / Síganme.|¡Hasta la victoria siempre! / ¡Al ataque!|¡Venceremos!
''')
R['EU'] = _p('EU', '''
inf fr:Prêt.|de:Bereit. / fr:En route.|de:Abmarsch. / de:Feuer frei!|fr:Feu à volonté !
elite fr:Commandos prêts.|de:Spezialkräfte bereit. / de:Wir gehen leise.|fr:En silence. / fr:Cible verrouillée.|en:One shot.
at fr:Équipe antichar prête.|de:Panzerabwehr bereit. / de:Rakete wird verlegt.|fr:On prend position. / fr:Blindé en vue, tir !|de:Rakete los!
tank de:Panzerbesatzung bereit.|fr:Canon chargé. / fr:Le char avance.|de:Vorwärts, Fahrer! / de:Richtschütze, Feuer!|fr:Obus perforant, feu !
veh fr:Équipage prêt.|de:Besatzung bereit. / de:Wir rücken aus.|fr:À toute vitesse ! / fr:Tir d’appui !|de:Artillerie, Feuer!
pilot fr:Pilote prêt.|en:Pilot ready. / fr:Décollage.|de:Wir starten. / fr:Cible en vue, tir !|de:Bombe abgeworfen!
navy de:Besatzung auf Gefechtsstation.|fr:Navire prêt. / fr:En avant toute.|de:Volle Fahrt voraus. / de:Geschütze, Feuer!|fr:Feu sur l’ennemi !
eng fr:Génie prêt.|de:Pioniere bereit. / de:Wir rücken zur Baustelle.|fr:En route pour le chantier. / fr:Mines prêtes !|de:Wir kämpfen auch!
leader fr:Commandant en ligne.|de:Ich höre, Kommandant. / fr:Suivez-moi.|de:Mir nach! / fr:À l’attaque ! Vive l’Europe !|de:Vorwärts, für Europa!
''')
# OB: fictional Palestine Islamic Brigade - Palestinian (Levantine) Arabic, own lines, no Shia invocations (Abdullah 2026-11-15 00:21 "Palestinians have ... Shia dialogue")
R['OB'] = _p('OB', '''
inf جاهزين يا شباب.|تحت أمرك يا قائد. / ماشيين، على بركة الله.|يلّا يا شباب، قدّام. / نار!|الله أكبر، عليهم!
elite القنّاص جاهز.|بهدوء، جاهزين. / بنمشي بالسكوت.|بنلفّ عليهم من الجنب. / شايفه، طلقة وحدة.|الهدف وقع.
at فريق القاذف جاهز.|الآر بي جي جاهز. / بنحمل القذائف، ماشيين.|عالكمين يا شباب. / مدرّعة! اضرب!|القذيفة طلعت!
tank الطاقم جاهز.|المدرّعة جاهزة يا قائد. / المدرّعة ماشية.|قدّام يا سوّاق! / نار!|اضرب، اضرب!
veh الطاقم جاهز.|السيارة جاهزة. / ماشيين، بسرعة.|عالطريق يا سوّاق. / الرشّاش، نار!|إسناد، نار!
pilot المسيّرة جاهزة.|المشغّل جاهز. / المسيّرة طايرة.|عالهدف، ماشيين. / الهدف عالشاشة، اضرب!|نزّلها عليهم!
navy القارب جاهز.|البحّارة جاهزين. / عالبحر، بسرعة!|المحرّك على آخره. / نار عالهدف!|اضرب!
eng المهندسين جاهزين.|جاهزين للشغل. / عالموقع يا شباب.|رايحين عالورشة. / الألغام جاهزة!|احنا كمان بنقاتل!
leader القائد عالخط.|أوامرك يا شباب. / اتبعوني.|على بركة الله، معي. / هجوم!|ثابتين يا رجال، قدّام!
''')
# FR / DE / GB / RV: own lines (Abdullah 2026-11-15 00:21 "All factions should have appropriate quotes dialogue"; FR/DE used EU's mixed fr/de sheet, GB had none, RV borrowed Yemen's)
R['FR'] = _p('FR', '''
inf Prêt, mon lieutenant.|À vos ordres. / En route.|Compris, on avance. / Feu !|Ouvrez le feu !
elite Commandos prêts.|On est discrets. / On se faufile.|On les contourne. / Cible en vue, tir.|Une balle, un ennemi.
at Équipe antichar prête.|Missile prêt. / On prend les missiles.|En position. / Char en vue, tir !|Missile parti !
tank Équipage prêt.|Le canon est chargé. / Le char avance.|En avant, pilote ! / Canon, feu !|Obus perforant, feu !
veh Équipage prêt.|Véhicule prêt. / On démarre.|Plein gaz ! / Tir d'appui !|Artillerie, feu !
pilot Pilote prêt.|Prêt au décollage. / Décollage.|Cap sur l'objectif. / Cible verrouillée, tir !|Bombe larguée !
navy Équipage aux postes.|Navire paré. / En avant toute.|On appareille. / Pièces, feu !|Feu sur l'ennemi !
eng Génie prêt.|Prêts à construire. / On va au chantier.|En route. / Mines prêtes !|Le génie se bat aussi !
leader Le commandant écoute.|Vos ordres. / Suivez-moi.|Pour la France ! / À l'assaut !|En avant, avec moi !
''')
R['DE'] = _p('DE', '''
inf Bereit, Herr Leutnant.|Zu Befehl. / Wir rücken vor.|Verstanden, Abmarsch. / Feuer!|Feuer frei!
elite Kommando bereit.|Wir bleiben unsichtbar. / Wir schleichen uns ran.|Wir umgehen sie. / Ziel erfasst, Schuss.|Ein Schuss, ein Treffer.
at Panzerabwehr bereit.|Rakete bereit. / Raketen aufnehmen.|In Stellung. / Panzer im Visier, Feuer!|Rakete raus!
tank Besatzung bereit.|Kanone geladen. / Panzer marsch.|Vorwärts, Fahrer! / Kanone, Feuer!|Panzergranate, Feuer!
veh Besatzung bereit.|Fahrzeug bereit. / Wir fahren los.|Vollgas! / Feuerunterstützung!|Artillerie, Feuer!
pilot Pilot bereit.|Startklar. / Wir starten.|Kurs auf das Ziel. / Ziel aufgeschaltet, Feuer!|Bombe abgeworfen!
navy Besatzung auf Station.|Schiff klar. / Volle Fahrt voraus.|Wir laufen aus. / Geschütze, Feuer!|Feuer auf den Feind!
eng Pioniere bereit.|Bereit zum Bauen. / Zur Baustelle.|Wir sind unterwegs. / Minen bereit!|Pioniere kämpfen auch!
leader Kommandeur hört.|Ihre Befehle. / Mir nach!|Für Deutschland! / Angriff!|Vorwärts, mir nach!
''')
R['GB'] = _p('GB', '''
inf Ready, sir.|Standing by. / Moving out.|On our way. / Open fire!|Engaging, engaging!
elite Who dares wins.|Ready and quiet. / Moving silent.|Going round the flank. / Target down.|One shot, sir.
at Anti-tank team ready.|Javelin up. / Shifting position.|Moving to cover. / Tank in sight, firing!|Missile away!
tank Crew ready.|Gun's loaded, sir. / Driver, advance.|Tanks moving. / Gunner, fire!|Sabot, fire!
veh Crew ready.|Wagon's ready. / Mounting up.|Foot down! / Fire support!|Guns, fire!
pilot Pilot ready.|Ready for take-off. / Wheels up.|Inbound to target. / Target locked, firing!|Bombs gone!
navy Ship's company ready.|All stations manned. / Full ahead.|Under way. / Guns, fire!|Fire on the enemy!
eng Sappers ready.|Ready to build. / Off to the site.|On our way. / Mines ready!|Sappers fight too!
leader Commander here.|Go ahead. / Follow me.|For King and country! / Charge!|Up and at them!
''')
R['RV'] = _p('RV', '''
inf حاضرين يا حجي.|تأمر، يا علي مدد. / ماشين هسّه.|يلّه يا شباب، كدّام. / نار!|يا حسين، عليهم!
elite القنّاص جاهز.|بهدوء، حاضرين. / نمشي بلا صوت.|نلف عليهم من الصوب. / شايفه، طلقة وحدة.|طاح الهدف.
at فريق الصواريخ جاهز.|ضد الدروع حاضرين. / نشيل الصواريخ، ماشين.|للموقع يا رجال. / دبابة! اضرب!|الصاروخ طلع!
tank طاقم الدبابة جاهز.|المدفع جاهز يا حجي. / الدبابة ماشية.|كدّام يا سايق! / مدفعي، نار!|يا حيدر، نار!
veh الطاقم جاهز.|العجلة جاهزة. / نطلع هسّه.|دوس بنزين! / نار إسناد!|المدفعية، نار!
pilot الطيار جاهز.|جاهزين للطيران. / نطير.|للهدف، ماشين. / الهدف بالمنظار، نار!|نزّلناها!
navy الزورق جاهز.|البحّارة حاضرين. / للشط، بسرعة!|المكينة على الآخر. / نار عالهدف!|اضرب!
eng المهندسين حاضرين.|جاهزين للبناء. / للموقع يا شباب.|رايحين للشغل. / الألغام جاهزة!|احنه هم نقاتل!
leader القائد على الخط.|تأمرون يا أبطال. / تعالوا وياي.|يا علي، وياي. / هجوم!|لبيك يا حسين، كدّام!
''')
