/* People: names (+ portrait hooks in 13m-portraits.js). One owner for every named person on the grand map: national leaders, heirs,
   cabinet ministers, generals. Every person is FICTIONAL (plausible combinations of common first/family names for the nation's
   culture, never a real leader or general). Deterministic from the campaign seed; the roster is kept in GC.ppl (saved with the
   campaign). Generals keep their own record in GC.mil.g (13i-grandmil.js) and take their names from here (pplGenName / pplRank).
   API: pplName(p) -> "Ayatollah Mahdi Tabrizi"; pplRoster(c) -> {leader, heir|null, cab:[4]}; pplOf(c,role) ; pplGeneral(g) -> person. */
const PPL_T={   // culture -> [first names, family names, patronymics (ru/uk only), female first names (optional)]
 fa:['Behnam Kaveh Dariush Arman Reza Shahin Farhad Nima Babak Omid Mehrdad Kamran Siavash Parviz Bahram Hamid Javad Saeed','Karimzadeh Rostami Nouri Sadeghi Farahani Zandi Mirzaei Tavakoli Bahrami Heidari Ghorbani Sharifi Azizi Moradi Jalali Soltani Hashemi Dehghan'],
 cfa:['Mahdi Abbas Hossein Mohsen Jafar Morteza Reza Hadi Sadegh Ebrahim Kazem Taqi','Tabrizi Shirazi Isfahani Mashhadi Qomi Kermani Yazdi Hamadani Gilani Zanjani Najafabadi Rashti'],
 lb:['Hadi Ali Mahmoud Hussein Jawad Nabil Bilal Ziad Fadi Kassem Rida Ammar Mustafa Samer Yasser Ghassan','Amili Jaber Zein Hamadeh Khalil Saleh Bazzi Shehab Mroue Ghandour Nasser Fakih Bitar Mazraani Charafeddine Hijazi'],
 clb:['Hadi Jawad Abbas Ammar Mohammad Hasan Kassem Rida Ibrahim Mortada','Amili Zein Jaber Hamadeh Shehab Mroue Charafeddine Mousawi Sadeq Baalbaki Tyrawi Nabatieh'],
 ye:['Abdulsalam Yahya Nasser Hamoud Saleh Mansour Hashim Fouad Ahmed Murad Zaid Abdullatif Najib Jamil Adel Taha','al-Sanaani al-Hamdani al-Raymi al-Shami al-Wazir al-Madani al-Khawlani al-Yafei al-Hadrami al-Quhali al-Dhamari al-Ansi al-Marwani al-Jabri'],
 cir:['Hussein Ali Mohammad Mahdi Jawad Muhsin Baqir Abbas Hasan Kazim Sadiq Hamid','al-Hilli al-Karbalai al-Mousawi al-Gharawi al-Kufi al-Saadi al-Jaberi al-Nasiri al-Zubaidi al-Rubaie al-Fatlawi al-Moussawi'],
 cye:['Yahya Hamoud Mansour Zaid Hashim Murad Najm Ahmed Hussein Abdulwahab','al-Sanaani al-Hamdani al-Raymi al-Wazir al-Madani al-Khawlani al-Dhamari al-Ansi al-Marwani al-Saadi'],
 iq:['Haider Ali Mustafa Hussein Karrar Zaid Ahmed Omar Salam Qasim Jabbar Rafid Thamer Ayad Falah Hakim','al-Tamimi al-Jubouri al-Obeidi al-Shammari al-Saadi al-Rubaie al-Zubaidi al-Bayati al-Dulaimi al-Hashimi al-Azzawi al-Kinani al-Nuaimi al-Ani'],
 sy:['Karim Nabil Samir Walid Tariq Salim Rami Fouad Jamal Bassel Majd Anas Wael Adnan Ghiath Mazen','Haddad Mansour Khoury Darwish Najjar Sabbagh Hakim Farouk Rahal Shami Hamwi Atassi Kurdi Jaber Halabi Zaidan'],
 gu:['Khalid Faisal Sultan Majid Nasser Turki Saud Rashid Hamad Mishal Badr Salman Abdulaziz Fahad Hamdan Zayed','al-Rashid al-Harbi al-Qahtani al-Otaibi al-Mutairi al-Dosari al-Shehri al-Ghamdi al-Nuaimi al-Mazrouei al-Kaabi al-Suwaidi al-Falasi al-Mansoori al-Ketbi al-Zaabi'],
 jo:['Ayman Hazem Mazen Nashat Khaled Omar Zaid Ghazi Awni Hussam Rakan Bassam Maher Sami Raed Fares','al-Majali al-Tarawneh al-Zoubi al-Kilani al-Hiyari al-Khasawneh al-Rawashdeh al-Maaytah al-Fayez al-Qudah al-Shboul al-Momani al-Bataineh al-Sarhan al-Omari'],
 eg:['Hossam Tarek Amr Sherif Wael Mostafa Khaled Ashraf Magdy Hany Ayman Essam Medhat Sameh Yasser Adel','Abdelaziz El-Sayed Fathy Mansour Hegazy Zaki Soliman Ghoneim Selim Radwan Sabry Naguib El-Gohary Bakr Shaaban Taha Kamel'],
 ku:['Bakhtiar Karwan Dilshad Hawre Aram Rebwar Shwan Sirwan Peshraw Zana Kamaran Azad Nawzad Hemin Serbest Dana','Hawrami Shaways Mukriyani Rawandzi Jaff Berwari Soran Sindi Dizayi Baban Hamawandi Surchi Khoshnaw Pizhdar Zerevani'],
 tr:['Murat Selim Kemal Orhan Cem Emre Burak Volkan Tolga Altan Hakan Levent Serdar Erkan Ismail Mehmet Ugur','Yildirim Demirel Aksoy Kaplan Arslan Erdem Tekin Sezer Polat Koc Aydin Ozturk Celik Kurt Dogan Yalcin Bozkurt Tuncer','','Ayse Elif Zeynep Selin Deniz Burcu Ebru Gulsen'],
 az:['Rashad Elchin Vugar Farid Kamran Orkhan Tural Samir Nijat Rovshan Anar Elnur Ilgar Zaur Natig Rafiq','Aliyarov Hasanov Guliyev Mammadov Huseynov Ismayilov Rahimov Safarov Najafov Jabbarov Karimov Valiyev Abbasov Aslanov Bagirov Mustafayev'],
 he:['Eitan Yossi Amir Noam Gil Oren Ronen Tomer Ilan Uri Dror Itai Nadav Shaul Yair Guy','Shaham Shalev Peretz Navon Harel Sasson Golan Tamir Avni Ben-Ami Carmel Mizrahi Rosen Segal Dagan Yaron','','Noa Maya Tamar Shira Yael Dana Michal Orly'],
 ru:['Dmitri Andrei Viktor Anatoly Gleb Roman Yevgeny Stepan Kirill Lev Konstantin Vadim Oleg Timur Nikolai Arkady','Vorontsov Kalinin Sokolov Baranov Lebedev Orlov Zhukovsky Belov Gromov Rybakov Kuznetsov Melnikov Tarasov Zimin Ushakov Berezin','Andreyevich Viktorovich Sergeyevich Pavlovich Nikolayevich Ivanovich Petrovich Mikhailovich Alexeyevich Borisovich Yuryevich Olegovich'],
 uk:['Taras Oleksandr Bohdan Yaroslav Mykola Vasyl Ihor Andriy Roman Danylo Maksym Volodymyr Petro Stepan Oleh Yuriy','Kovalenko Shevchuk Bondarenko Tkachenko Kravets Melnyk Savchenko Lysenko Marchenko Romanyuk Hrytsenko Polishchuk Moroz Pavlenko Kostenko Zinchenko','Andriyovych Petrovych Oleksandrovych Mykolayovych Volodymyrovych Ivanovych Ihorovych Vasylovych Bohdanovych Yuriyovych'],
 ko:['Min-jun Seung Dae-ho Joon Hyun Tae-yang Sung Ji-hoon Woo Kang Jin-ho Dong-hyun Young-soo Hyeok Sang-chul Gwang-ho','Baek Ryu Seo Yoon Han Cho Jang Moon Shin Kwon Choi Kang Lim Hwang Oh Song','','Ji-woo Min-seo Soo-jin Hye-won Yeon-hee Eun-ji Na-yeon Seo-yeon'],
 zh:['Wei Jun Hao Bo Lin Feng Tao Yong Ming Kai Jian Guang Hua Lei Qiang Zhong','Zhao Liang Xu Gu Shen Han Tang Peng Luo Jiang Cai Fan Dong Lu Yao Zhou','','Mei Xiu Ying Lan Yan Hui Jing Fang'],
 ja:['Haruto Kenji Daisuke Takeshi Ryo Shin Akira Naoki Hideo Jun Koji Masato Satoru Tetsu Yuji Kazuki','Aizawa Hoshino Kuroda Miyake Sakurai Tsuda Narita Okabe Fujisawa Nomura Hayashida Kitano Morita Ishikura Sugita Takagi','','Yuki Haruka Aoi Mika Rina Sakura Nanami Emi'],
 vi:['Minh Tuan Hung Dung Long Quang Thanh Hai Nam Phuc Khoa Son Hoang Viet Cuong Duc','Nguyen Tran Le Pham Hoang Vu Dang Bui Do Ngo Duong Ly Truong Dinh Trinh Mai'],
 hi:['Arjun Vikram Rohan Sanjay Naveen Rajiv Anil Pradeep Suresh Manoj Deepak Harish Kiran Vivek Ashok Girish','Rathore Chauhan Nair Verma Iyer Reddy Menon Bhatia Kulkarni Deshmukh Thakur Rawat Malhotra Sengupta Pillai Joshi','','Anjali Priya Kavya Meera Sunita Neha Divya Radha'],
 ur:['Imran Aamir Kabir Faisal Zubair Tariq Naeem Shoaib Adnan Salman Usman Waqar Rizwan Jawad Asif Bilal','Malik Bhatti Qureshi Gill Khattak Chaudhry Mirza Awan Cheema Gondal Warraich Niazi Sheikh Abbasi Lodhi Durrani'],
 af:['Abdul Gul Najib Rahim Sami Wahid Jawid Farid Hamid Zalmay Atiq Nasir Ehsan Sayed Latif Mirwais','Ahmadzai Yousafzai Noorzai Barakzai Safi Wardak Popalzai Shinwari Mangal Hotak Kakar Faizi Rahimi Karokhel Sultani Tokhi'],
 id:['Arief Bayu Dewa Agus Budi Eko Hendra Wawan Joko Rizal Surya Teguh Bambang Dedi Gunawan Rudi','Pratama Santoso Wijaya Saputra Hidayat Nugroho Kusuma Susanto Setiawan Wibowo Siregar Lubis Harahap Purnomo Hartono Sembiring','','Dewi Sari Putri Ayu Lestari Wulan Rina Intan'],
 ph:['Ramon Jose Carlo Emilio Rodel Alfredo Benigno Dante Ferdie Gerardo Nestor Rey Virgilio Lorenzo Teodoro Arnel','Dela Cruz Bautista Villanueva Mercado Aquino Santos Reyes Manalo Dizon Magsaysay Panganiban Soriano Tolentino Valencia Cabrera Ocampo','','Maria Liza Rosario Corazon Teresita Luz Imelda Divina'],
 th:['Somchai Niran Anurak Chaiyo Prasert Surachai Wichai Thanet Kittipong Sakda Anan Boonmee Chatchai Pichit Narong Decha','Wongsakul Rattana Srisai Thongchai Boonsri Jaidee Phetcharat Suksai Chantarasri Kaewmanee Pongpan Saetang Sirikul Ruangrit Prakobkit Intharat'],
 kz:['Nurlan Askar Bauyrzhan Daulet Erlan Marat Sanzhar Talgat Yerbol Zhanat Berik Kairat Aidos Ruslan Bolat Almas','Nurgaliyev Sadykov Akhmetov Kassymov Dosmukhamedov Tulegenov Baimukhanov Omarov Zhaksybekov Temirbayev Utepov Abenov Mukhametov Seitkali Ospanov Kenzhebayev'],
 ng:['Chidi Emeka Obinna Tunde Segun Bayo Ikenna Kelechi Femi Yusuf Musa Ibrahim Uche Chukwuma Dayo Sani','Okafor Abara Adeyemi Okoye Balogun Eze Nwosu Adebayo Ogunleye Bello Danjuma Olawale Umeh Obi Lawal Okonkwo'],
 za:['Sipho Themba Thabo Lwazi Bongani Mandla Johan Pieter Willem Andile Sizwe Kobus Dumisani Gerhard Lungile Riaan','Mbatha Nkosi Dlamini Zulu Khumalo Naidoo van der Merwe Botha Mokoena Ndlovu Pretorius Mahlangu Venter Sithole Jacobs Cele'],
 et:['Tesfaye Abebe Dawit Haile Getachew Yonas Bekele Mulugeta Henok Tadesse Solomon Girma Berhanu Fikru Yared Kebede','Bekele Tadesse Alemayehu Gebre-Selassie Wolde Tsegaye Assefa Negash Tekle Mengistu Desta Worku Lemma Abera Gizaw Demissie'],
 la:['Alejandro Rafael Mateo Joaquin Luciano Enzo Tiago Emilio Bruno Hugo Santiago Ignacio Esteban Gustavo Ricardo Andres','Salcedo Ibarra Montoya Ferreira Duarte Romero Vidal Navarro Cardoso Bellini Rojas Quintero Paredes Olivares Mendoza Ortega','','Valentina Camila Lucia Isabel Marisol Paula Daniela Renata'],
 br:['Rodrigo Thiago Gustavo Leandro Caio Bruno Henrique Marcelo Fabio Rafael Vinicius Eduardo Murilo Cassio Otavio Lucas','Ferreira Cardoso Albuquerque Teixeira Carvalho Monteiro Barbosa Nogueira Siqueira Magalhaes Pacheco Guimaraes Amaral Rezende Cavalcanti Ribeiro','','Beatriz Larissa Juliana Camila Fernanda Aline Renata Patricia'],
 fr:['Julien Antoine Etienne Thibault Mathieu Olivier Laurent Gaspard Remy Benoit Alexandre Hugues Sebastien Maxime Guillaume Pascal','Delmas Moreau Lefevre Roussel Gauthier Marchand Fontaine Brunet Lacroix Perrin Duval Mercier Girard Blanchard Chevalier Vasseur','','Camille Margaux Elodie Claire Sophie Isabelle Helene Juliette'],
 de:['Lukas Jonas Matthias Anders Stefan Henrik Konrad Lars Florian Emil Dieter Markus Tobias Jens Ralf Christoph','Brandt Falk Hartmann Weiss Keller Vogel Reiter Lang Berger Roth Winkler Kessler Neumann Albrecht Vollmer Hofmann','','Anna Katrin Sabine Julia Marlene Greta Ingrid Lena'],
 pl:['Tomasz Marek Piotr Krzysztof Pawel Jakub Wojciech Lech Andrzej Jan Michal Zbigniew Bartosz Rafal Kazimierz Dariusz','Kowalczyk Wisniewski Zielinski Jankowski Lewandowski Kaminski Wojciechowski Szymanski Dabrowski Kozlowski Mazur Krawczyk Piotrowski Grabowski Pawlak Michalski','','Agnieszka Katarzyna Magdalena Joanna Ewa Monika Zofia Halina'],
 it:['Lorenzo Matteo Alessandro Davide Riccardo Stefano Giorgio Fabrizio Massimo Paolo Gianluca Enrico Claudio Salvatore Roberto Vittorio','Rossetti Moretti Bianchi Ferrari Conti Greco Bruno Gallo Costa Fontana Barbieri Ricci Marino Vitale Santoro Caruso','','Giulia Chiara Francesca Elena Silvia Laura Federica Marta'],
 gr:['Nikos Giorgos Dimitris Kostas Yannis Stavros Thanasis Manolis Vassilis Panagiotis Christos Spyros Alexandros Lefteris Sotiris Petros','Papadakis Karras Pappas Vlachos Nikolaidis Georgiou Antonopoulos Katsaros Mavridis Kontos Theodorou Galanis Stavrou Alexiou Oikonomou Kyriakos'],
 es:['Javier Alvaro Sergio Pablo Fernando Ramon Gonzalo Iker Adrian Rubén Marcos Ismael Julian Cristobal Ignacio Guillermo','Gallego Herrera Castillo Dominguez Vazquez Santana Molina Cabrera Prieto Fuentes Aguilar Benitez Calvo Ledesma Cordero Pascual','','Marta Carmen Pilar Elena Beatriz Rocio Irene Teresa'],
 se:['Erik Anders Lars Johan Mikael Nils Per Gustav Henrik Oskar Fredrik Magnus Olof Stefan Hakan Sven','Lindqvist Sandberg Nordin Eklund Holmgren Bergstrom Forsberg Sjoberg Lundgren Engstrom Wallin Dahlberg Hedlund Ostlund Samuelsson Granath','','Karin Ingrid Annika Maria Elin Sofia Helena Astrid'],
 en:['James Robert Marcus Daniel Edward Thomas Philip Gordon Neil Walter Richard Andrew Graham Nigel Jonathan Martin','Hollis Kendrick Whitaker Barlow Ashby Crane Mercer Pryor Langley Thorne Blackwood Caldwell Fairfax Harlow Rutledge Sterling','','Eleanor Katherine Margaret Olivia Rebecca Helen Susan Victoria']};
const PPL_CUL={IR:'fa',RS:'lb',DW:'ye',RV:'iq',IQ:'iq',SY:'sy',SA:'gu',AE:'gu',OM:'gu',JO:'jo',EG:'eg',KD:'ku',TR:'tr',AZ:'az',IL:'he',RU:'ru',UA:'uk',KP:'ko',KR:'ko',CN:'zh',TW:'zh',JP:'ja',VN:'vi',IN:'hi',PK:'ur',AF:'af',ID:'id',PH:'ph',TH:'th',KZ:'kz',NG:'ng',ZA:'za',ET:'et',DZ:'eg',MA:'eg',LY:'eg',SD:'eg',CU:'la',VE:'la',MX:'la',AR:'la',CO:'la',CL:'la',BR:'br',ES:'es',FR:'fr',DE:'de',EU:'de',PL:'pl',IT:'it',GR:'gr',SE:'se',US:'en',GB:'en',AU:'en',CA:'en'};
const PPL_REG={ME:'iq',AF:'ng',SA:'hi',EA:'zh',SEA:'id',EU:'de',NA:'en',SAM:'la'};
const PPL_FF={ko:1,zh:1,ja:1,vi:1};   // family name first
const PPL_CLERIC={IR:'cfa',RS:'clb',DW:'cye'};   // nations whose head of state is always a cleric: ONE Supreme Ayatollah (IR); the Imams of RS, DW and RV are their own sub-leaders (Abdullah 2026-11-06 23:09); other clerics: Hojatoleslam
const PPL_CLTTL={IR:'Supreme Ayatollah',RS:'Secretary-General Sayyid',DW:'Leader of the Revolution Sayyid'};   // like the real world (Abdullah 23:09 "Make it like the real world", CLAUDE.md): RV is led by a Chairman (PPL_HEAD), not a cleric
const PPL_HEAD={RV:'Chairman',SA:'King',JO:'King',MA:'King',OM:'Sultan',AE:'President',GB:'Prime Minister',JP:'Prime Minister',IL:'Prime Minister',DE:'Chancellor',EU:'President',IN:'Prime Minister',ES:'Prime Minister',IT:'Prime Minister',PL:'Prime Minister',SE:'Prime Minister',GR:'Prime Minister',CA:'Prime Minister',AU:'Prime Minister',TR:'President',CN:'President',KP:'Dear Leader',IR:'Supreme Ayatollah',RS:'Imam',DW:'Imam',RV:'Imam',TH:'Prime Minister',VN:'General Secretary',KD:'President',AF:'Chairman',LY:'Chairman',SD:'Chairman',KZ:'President'};
const PPL_HEIR={SA:'Crown Prince',JO:'Crown Prince',MA:'Crown Prince',OM:'Crown Prince',AE:'Crown Prince',KP:'Successor',IR:'Designated successor',RS:'Designated successor',DW:'Designated successor',RV:'Designated successor'};
const PPL_POSTS=['Minister of Foreign Affairs','Minister of Defense','Minister of Finance','Minister of the Interior'];
const PPL_RANKS={fa:['Sarhang','Sartip Dovom','Sartip','Sarlashkar','Sardar'],ar:['Aqid','Amid','Liwa','Fariq','Fariq Awwal'],en:['Colonel','Brigadier','Major General','Lieutenant General','General']};
function pplHash(s){let h=2166136261;s=''+s;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function pplCul(c){if(PPL_CUL[c])return PPL_CUL[c];const n=(typeof grNat==='function'?grNat(c):null)||{};return PPL_REG[n.reg]||'en';}
function pplTab(k){const t=PPL_T[k]||PPL_T.en;if(!t._p)t._p=[0,1,2,3].map(i=>t[i]?t[i].split(' '):[]);return t._p;}
function pplPick(a,R){return a[Math.floor(R()*a.length)];}
/* a name in the culture's own order; f=1 uses the female first names where the table has them */
function pplMakeName(cul,R,f,tabKey){const T=pplTab(tabKey||cul),fn=(f&&T[3].length)?T[3]:T[0],a=pplPick(fn,R),b=pplPick(T[1],R);
  if(PPL_FF[cul])return b+' '+a;
  if(T[2].length){const pat=pplPick(T[2],R);return a+' '+pat+' '+b;}
  return a+' '+b;}
function pplGenName(c,R){return pplMakeName(pplCul(c),R,0);}
function pplRank(c,lv){const cul=pplCul(c),k=cul==='fa'?'fa':(['lb','ye','iq','sy','gu','jo','eg'].includes(cul)?'ar':'en');return PPL_RANKS[k][Math.max(0,Math.min(4,lv|0))];}
function pplLook(key,c,sx,role){const h=pplHash(key+'|'+c),R=grRng(h|0),n=(typeof grNat==='function'?grNat(c):null)||{};   // look seeds for the portrait renderer
  return {h,sx,age:role==='heir'?28+Math.floor(R()*14):role==='leader'?(PPL_CLERIC[c]?62+Math.floor(R()*14):52+Math.floor(R()*18)):role==='general'?46+Math.floor(R()*16):42+Math.floor(R()*20),reg:n.reg||'',cul:pplCul(c),beard:R(),build:R(),tone:R()};}
function pplMakePerson(c,role,idx,R,post,used){used=used||{};for(let t=0;t<8;t++){const p=pplMakePerson1(c,role,idx,R,post),k=p.nm.split(' ').filter(w=>w.length>3).pop();if(!used[p.nm]&&!used['f'+k]||t===7){used[p.nm]=1;used['f'+k]=1;return p;}}}
function pplMakePerson1(c,role,idx,R,post){const cul=pplCul(c),cl=PPL_CLERIC[c];let ttl='',nm,sx='m',tab=cul;
  if(role==='leader'){ttl=PPL_HEAD[c]||'President';if(cl){tab=cl;ttl=PPL_CLTTL[c]||'Supreme Ayatollah';}}
  else if(role==='heir'){ttl=PPL_HEIR[c]||'Heir';if(cl){tab=cl;ttl='Hojatoleslam';}}
  else if(role==='minister'){ttl='';if(cl&&R()<.4){tab=cl;ttl='Hojatoleslam';}
    else if(PPL_T[cul]&&PPL_T[cul][3]&&R()<.22)sx='f';}
  if(role==='leader'&&c==='KP'){tab='ko';}
  nm=pplMakeName(cul,R,sx==='f'?1:0,tab);
  const id=c+':'+role+idx;return {id,c,role,post:post||'',ttl,nm,sx,look:pplLook(id,c,sx,role)};}
function pplRoster(c){if(!GC)return null;if(!GC.ppl)GC.ppl={};let r=GC.ppl[c];if(r)return r;
  const R=grRng(((GC.seed|0)*977)^pplHash('ppl'+c));const U={};r={leader:pplMakePerson(c,'leader',0,R,'Head of state',U),heir:null,cab:[]};
  if(PPL_HEIR[c]&&(PPL_CLERIC[c]||c==='KP'||R()<1))r.heir=pplMakePerson(c,'heir',0,R,PPL_HEIR[c],U);
  for(let i=0;i<PPL_POSTS.length;i++)r.cab.push(pplMakePerson(c,'minister',i,R,PPL_POSTS[i],U));
  GC.ppl[c]=r;return r;}
/* the person behind a general record from GC.mil.g */
function pplGeneral(g){if(!g)return null;const id='g'+g.id+g.o;return {id,c:g.o,role:'general',post:'Commander',ttl:pplRank(g.o,g.lv),nm:g.nm,sx:'m',look:pplLook(id,g.o,'m','general')};}
function pplName(p){return p?(p.ttl?p.ttl+' ':'')+p.nm:'';}
function pplOf(c,role,i){const r=pplRoster(c);return !r?null:role==='leader'?r.leader:role==='heir'?r.heir:r.cab[i|0]||null;}
/* Government tab on the nation panel: leader, heir, cabinet, generals (names always; portrait pictures only when ptOn() says so) */
function pplCard(p){const img=(typeof ptOn==='function'&&ptOn())?ptHtml(p,72):'';return '<div style="display:flex;gap:10px;align-items:center;padding:6px 8px;border-bottom:1px solid #1f3247">'+img+'<div><div style="font-size:16px;color:#ffe6a8">'+pplName(p)+'</div><div style="font-size:13px;opacity:.7">'+(p.post||'')+'</div></div></div>';}
if(typeof npTab==='function')npTab('gov','👤','Government',(code,body)=>{const r=pplRoster(code);if(!r){body.textContent='';return;}
  let h='<div style="max-width:560px">'+pplCard(r.leader)+(r.heir?pplCard(r.heir):'')+r.cab.map(pplCard).join('');
  const gs=GC.mil?Object.values(GC.mil.g).filter(g=>g.o===code&&!g.st).sort((a,b)=>a.id-b.id):[];
  h+=gs.map(g=>pplCard(pplGeneral(g))).join('')+'</div>';body.innerHTML=h;});
/* portraits are OFF until Abdullah approves the art (orch/portraits/); the hooks exist so cards can adopt them later */
function ptOn(){return true;}   // Abdullah 2026-11-07 15:00: portraits round 3 approved — "Turn on now"
function ptHtml(p,sz){const f=p&&p.id?String(p.id).replace(/[^A-Za-z0-9_-]/g,'_'):'';return f?'<img src="art/portraits/'+f+'.webp" width="'+sz+'" height="'+Math.round(sz*1.25)+'" alt="" style="flex:none;border-radius:3px" onerror="this.style.display=\'none\'">':'';}
(function ptCredits(){try{if(document.getElementById('ptCred'))return;const ps=[...document.querySelectorAll('p.credits')];if(!ps.length)return;
  const p=document.createElement('p');p.className='credits';p.id='ptCred';
  p.textContent='Leader portraits (rendered offline): MakeHuman community base mesh, face targets, skins, eyebrows, eyelashes and clothes (CC0); women\'s hair by Elvaerwyn from the MakeHuman asset pack hair02 (CC-BY). All people are fictional.';
  ps[0].insertAdjacentElement('beforebegin',p);}catch(e){}})();
