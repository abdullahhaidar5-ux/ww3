"""Voice sets per nation. Variant i of a kind is read by voice i % len(voices): several distinct voices per nation.
p = pitch factor (also shifts the vocal tract, so <1 sounds bigger/older), t = tempo."""
def pi(m, p=1.0, ls=1.0, spk=None, t=1.0):
    d = dict(e='piper', model=m, p=p, ls=ls, t=t)
    if spk is not None: d['spk'] = spk
    return d
def ko(v, lang='en-us', p=1.0, sp=1.0): return dict(e='kokoro', v=v, lang=lang, p=p, sp=sp)
def mm(l, p=1.0, t=1.0): return dict(e='mms', l=l, p=p, t=t)

V = {
 'US': [ko('am_michael'), ko('am_onyx', sp=1.05), pi('en_US-ryan-high', p=.93, ls=.95), ko('am_adam', sp=1.05)],
 'EU': {'fr': pi('fr_FR-gilles-low', p=.95), 'de': pi('de_DE-thorsten-medium', p=.96), 'en': ko('bm_george', 'en-gb')},
 'TR': [pi('tr_TR-dfki-medium', p=.93), mm('tur', p=.93), pi('tr_TR-dfki-medium', p=.84, ls=.92)],
 'IL': [pi('he_IL-saspeech-medium', p=.95), mm('heb', p=.95), pi('he_IL-saspeech-medium', p=.86)],
 'UA': [pi('uk_UA-mykyta-high'), pi('uk_UA-oleksa-high'), pi('uk_UA-ukrainian_tts-medium', spk=1, p=.92)],
 'RU': [pi('ru_RU-denis-medium', p=.92), pi('ru_RU-dmitri-medium'), pi('ru_RU-ruslan-medium', p=.95)],
 'IR': [pi('fa_IR-amir-medium'), pi('fa_IR-ganji-medium'), pi('fa_IR-gyro-medium'), pi('fa_IR-reza_ibrahim-medium')],
 'SA': [pi('ar_JO-kareem-medium', p=.90), mm('ara', p=.88), pi('ar_JO-kareem-low', p=.85, ls=1.05)],
 'AE': [pi('ar_JO-kareem-medium', p=1.0, ls=.92), mm('ara', p=.97), pi('ar_JO-kareem-low', p=.95)],
 'EG': [pi('ar_JO-kareem-medium', p=1.06, ls=.9), mm('ara', p=1.04), pi('ar_JO-kareem-low', p=1.0, ls=.92)],
 'RS': [pi('ar_JO-kareem-medium', p=.82, ls=.96), mm('ara', p=.80), pi('ar_JO-kareem-low', p=.78)],
 'DW': [pi('ar_JO-kareem-medium', p=.93, ls=.94), mm('ara', p=.92), pi('ar_JO-kareem-low', p=.90, ls=.92)],
 'PK': [pi('ur_PK-fasih-medium'), mm('urd-script_arabic', p=.95), pi('ur_PK-fasih-medium', p=.88)],
 'IN': [pi('hi_IN-pratham-medium'), pi('hi_IN-rohan-medium'), ko('hm_omega', 'hi')],
 'CN': [ko('zm_yunjian', 'zh'), ko('zm_yunxi', 'zh'), ko('zm_yunyang', 'zh', p=.97)],
 'KR': [pi('ko_KR-kss-medium', p=.86), mm('kor', p=.95), pi('ko_KR-kss-medium', p=.80, ls=.95)],
 'KP': [mm('kor', p=.88, t=1.06), pi('ko_KR-kss-medium', p=.76, ls=.9), mm('kor', p=.82)],
 'CU': [ko('em_alex', 'es'), ko('em_santa', 'es'), pi('es_MX-claude-high'), pi('es_MX-ald-medium')],
}
