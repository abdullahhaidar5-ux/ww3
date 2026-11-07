"""person (from src/13l-people.js via make-people.mjs) -> portrait spec for bl/portrait.py. Deterministic from person.look.h.
No real person is modelled: every face is a procedural MakeHuman mix (age, ethnic mix, weight, face-shape targets) from the person's seed."""
import numpy as np
# culture -> (race weights, tone lo..hi, iris palette, beard prob, hair colour weights)
EU = dict(r={'caucasian': 1}, tone=(.10, .26), iris='eu', beard=.18, hair={'black': .1, 'dkbrown': .3, 'brown': .3, 'blond': .15, 'auburn': .15})
SO = dict(r={'caucasian': 1}, tone=(.22, .34), iris='mix', beard=.3, hair={'black': .35, 'dkbrown': .45, 'brown': .2})
ME = lambda c, a, t, b=.75: dict(r={'caucasian': c, 'african': a, 'asian': 1 - c - a}, tone=t, iris='dark', beard=b, hair={'black': .6, 'dkbrown': .4})
CUL = {
 'fa': ME(.85, 0, (.34, .46)), 'lb': ME(.9, .05, (.30, .42)), 'ye': ME(.62, .38, (.46, .60)), 'iq': ME(.82, .1, (.34, .46)), 'sy': ME(.9, .05, (.30, .42)),
 'gu': ME(.72, .26, (.40, .54), .85), 'jo': ME(.85, .1, (.34, .46)), 'eg': ME(.66, .34, (.38, .52), .5), 'ku': ME(.9, 0, (.30, .40), .6), 'tr': ME(.92, 0, (.26, .38), .5),
 'az': ME(.92, 0, (.28, .38), .4), 'he': ME(1, 0, (.22, .34), .35), 'af': ME(.7, 0, (.34, .46), .85), 'ur': ME(.55, .15, (.46, .60), .8), 'hi': ME(.5, .2, (.48, .62), .5),
 'ko': dict(r={'asian': 1}, tone=(.16, .28), iris='dark', beard=.03, hair={'black': 1}), 'zh': dict(r={'asian': 1}, tone=(.16, .30), iris='dark', beard=.04, hair={'black': 1}),
 'ja': dict(r={'asian': 1}, tone=(.14, .26), iris='dark', beard=.04, hair={'black': 1}), 'vi': dict(r={'asian': 1}, tone=(.22, .36), iris='dark', beard=.04, hair={'black': 1}),
 'th': dict(r={'asian': .9, 'caucasian': .1}, tone=(.28, .40), iris='dark', beard=.05, hair={'black': 1}), 'id': dict(r={'asian': .85, 'african': .1, 'caucasian': .05}, tone=(.34, .46), iris='dark', beard=.1, hair={'black': 1}),
 'ph': dict(r={'asian': .9, 'caucasian': .1}, tone=(.32, .44), iris='dark', beard=.05, hair={'black': 1}), 'kz': dict(r={'asian': .65, 'caucasian': .35}, tone=(.2, .32), iris='dark', beard=.15, hair={'black': .8, 'dkbrown': .2}),
 'ru': dict(EU, tone=(.10, .22), beard=.1), 'uk': dict(EU, tone=(.10, .22), beard=.1), 'pl': dict(EU, tone=(.10, .22)), 'de': dict(EU, tone=(.10, .22)), 'fr': EU, 'se': dict(EU, hair={'blond': .5, 'brown': .3, 'dkbrown': .2}), 'en': EU,
 'es': SO, 'it': SO, 'gr': SO,
 'ng': dict(r={'african': 1}, tone=(.78, .92), iris='dark', beard=.15, hair={'black': 1}), 'za': dict(r={'african': .9, 'caucasian': .1}, tone=(.70, .86), iris='dark', beard=.15, hair={'black': 1}),
 'et': dict(r={'african': .75, 'caucasian': .25}, tone=(.58, .72), iris='dark', beard=.2, hair={'black': 1}),
 'la': dict(r={'caucasian': .55, 'asian': .25, 'african': .2}, tone=(.30, .50), iris='dark', beard=.3, hair={'black': .5, 'dkbrown': .5}), 'br': dict(r={'caucasian': .5, 'african': .3, 'asian': .2}, tone=(.34, .58), iris='dark', beard=.2, hair={'black': .5, 'dkbrown': .5}),
}
NAT = {  # nation -> (suit colours, military colour, cap colour, tie, headgear for leaders)
 'US': ((.13, .16, .27), (.18, .20, .30), (.18, .20, .30), (.45, .05, .08)), 'GB': ((.08, .08, .12), (.30, .26, .18), (.30, .26, .18), (.1, .15, .4)),
 'RU': ((.08, .08, .1), (.22, .27, .16), (.2, .25, .15), (.5, .1, .1)), 'CN': ((.06, .06, .08), (.2, .26, .15), (.2, .26, .15), (.6, .08, .08)),
 'TR': ((.07, .08, .12), (.24, .28, .22), (.22, .26, .2), (.6, .1, .1)), 'IL': ((.08, .09, .14), (.3, .32, .24), (.3, .32, .24), (.15, .25, .55)),
 'IR': ((.1, .1, .1), (.2, .23, .16), (.18, .21, .14), (.1, .1, .1)), 'SA': ((.9, .9, .88), (.45, .4, .28), (.45, .4, .28), (.1, .4, .2)),
 'KP': ((.34, .36, .34), (.30, .30, .20), (.26, .28, .18), (.5, .08, .08)), 'DEF': ((.08, .09, .13), (.24, .27, .2), (.22, .25, .19), (.4, .1, .12))}
GULF = {'SA', 'AE', 'OM', 'JO', 'MA', 'KW', 'QA', 'BH'}
def pick(R, d):
    k = list(d); w = np.array([d[x] for x in k], float); return k[R.choice(len(k), p=w / w.sum())]

def make(p):
    L = p['look']; R = np.random.default_rng(L['h'] % (2 ** 32)); c = p['c']; cul = L['cul']; C = CUL.get(cul, EU)
    sx = 1.0 if p['sx'] == 'm' else .0; age = L['age']; role = p['role']; ttl = p.get('ttl', '')
    race = {k: float(v) for k, v in C['r'].items()}
    for k in ('african', 'asian', 'caucasian'): race.setdefault(k, 0.)
    tone = C['tone'][0] + (C['tone'][1] - C['tone'][0]) * L['tone']
    j = lambda s=1.: float(np.clip(R.normal(0, (.7 if sx > .5 else .35) * s), -1.3, 1.3))
    mods = {'eyes/l-eye-height1-incr': .5, 'eyes/r-eye-height1-incr': .5, 'eyes/l-eye-height2-incr': .4, 'eyes/r-eye-height2-incr': .4, 'eyes/l-eye-height3-incr': .2, 'eyes/r-eye-height3-incr': .2, 'nose/nose-scale-depth-decr': .35, 'nose/nose-point-down': .15}
    def M(path, v): mods[path] = mods.get(path, 0) + v
    for nm in ('head-oval', 'head-round', 'head-rectangular', 'head-square', 'head-triangular', 'head-diamond'):
        if R.random() < .3: M('head/' + nm, float(R.random() * .6))
    M('head/head-scale-horiz-incr', j(.4)); M('nose/nose-scale-vert-incr', j(.35)); M('nose/nose-scale-horiz-incr', j(.6)); M('nose/nose-point-up', j(.4)); M('nose/nose-hump-incr', max(0, j(.8)))
    M('chin/chin-prominent-incr', j(.6)); M('chin/chin-width-incr', j(.6)); M('cheek/l-cheek-bones-incr', j(.5)); M('cheek/r-cheek-bones-incr', mods['cheek/l-cheek-bones-incr'])
    M('chin/chin-height-incr', j(.7)); M('chin/chin-cleft-incr', max(0, j(.8))); M('nose/nose-flaring-incr', j(.7)); M('nose/nose-scale-depth-incr', j(.6)); M('nose/nose-curve-convex', max(0, j(.7)))
    ee = j(.3); M('eyes/l-eye-height1-incr', ee); M('eyes/r-eye-height1-incr', ee); M('eyes/l-eye-bag-incr', max(0, j(.8))); M('eyes/r-eye-bag-incr', mods['eyes/l-eye-bag-incr']); M('eyes/l-eye-push1-in', j(.4)); M('eyes/r-eye-push1-in', mods['eyes/l-eye-push1-in'])
    M('forehead/forehead-nubian-incr', max(0, j(.8))); M('forehead/forehead-temple-incr', j(.5)); M('head/head-fat-incr', j(.4)); M('cheek/l-cheek-volume-incr', j(.6)); M('cheek/r-cheek-volume-incr', mods['cheek/l-cheek-volume-incr']); M('mouth/mouth-cupidsbow-incr', j(.5))
    M('mouth/mouth-scale-horiz-incr', j(.5)); M('mouth/mouth-lowerlip-volume-incr', j(.5)); M('forehead/forehead-scale-vert-incr', j(.5)); M('eyebrows/eyebrows-trans-up', 0)
    M('ears/l-ear-scale-incr', j(.4)); M('ears/r-ear-scale-incr', mods['ears/l-ear-scale-incr'])
    for k in list(mods):                       # MakeHuman modifier pairs are separate decr/incr targets: split sign
        if k.endswith('-incr') and mods[k] < 0 and not k.startswith('eyes/l-eye-bag'): mods[k.replace('-incr', '-decr')] = -mods[k]; mods[k] = 0
        if k == 'nose/nose-point-up' and mods[k] < 0: mods['nose/nose-point-down'] = -mods[k]; mods[k] = 0
    mods.pop('eyebrows/eyebrows-trans-up', None)
    weight = float(np.clip(.5 + (L['build'] - .5) * .5 + (.06 if age > 55 else 0), .2, .85)); muscle = float(np.clip(.45 + (L['build'] - .5) * .2, .25, .7))
    body = dict(gender=sx, age=float(age), race=race, weight=weight, muscle=muscle, mods=mods)
    # hair
    gray = float(np.clip((age - 40) / 45 + R.normal(0, .1), 0, .75)); hc = pick(R, C['hair'])
    if cul in ('ko', 'zh', 'ja', 'vi') and age > 50: gray = max(gray, .35)
    cleric = ttl in ('Supreme Ayatollah', 'Imam', 'Hojatoleslam')
    if sx > .5:
        sty = pick(R, {'crop': .35, 'side': .3, 'back': .2, 'bald': .15 if age > 50 else .04})
        afro = cul in ('ng', 'za', 'et') or (cul in ('ye', 'ur') and R.random() < .1)
        hair = dict(style=sty, col=hc, gray=gray)
        if sty == 'crop': hair.update(len_top=.10, len_side=.045, comb=(0, -1, .2), lift=.5, grav=.1, count=24000, clump=.12)
        elif sty == 'side': hair.update(len_top=.22, len_side=.06, comb=(0, -.4, 0), part=float(R.choice([-.45, .45])), part_amt=.8, lift=.4, grav=.25, count=26000, clump=.2)
        elif sty == 'back': hair.update(len_top=.32, len_side=.07, comb=(0, 1, .3), lift=.3, grav=.28, count=26000, clump=.2)
        if afro and sty != 'bald': hair = dict(style='afro', col=hc, gray=gray * .8, len_top=.10, len_side=.04, comb=(0, 0, 1), lift=.9, grav=0, curl=.9, count=34000, clump=.05)
    else:
        hair = dict(style='bob', col=hc, gray=gray, len_top=.5, len_side=.5, fade=.3, comb=(0, .15, -.2), part=float(R.choice([-.3, .3])), part_amt=.5, lift=.35, grav=.7, wave=.35, count=34000, clump=.3)
    beard = None
    if sx > .5 and R.random() < C['beard']:
        kind = pick(R, {'stubble': .25, 'short': .35, 'full': .25, 'mous': .15, 'goatee': .0})
        beard = dict(kind=kind, len={'stubble': .035, 'short': .13, 'full': .22, 'mous': .12}[kind], count=22000 if kind != 'stubble' else 26000, curl=.3, under=1.0 if kind == 'stubble' else .85)
        if kind == 'stubble': beard['r'] = .0022; beard['lift'] = .4
    SUITS = [(.13, .16, .27), (.22, .22, .25), (.10, .10, .12), (.30, .22, .16), (.26, .30, .32), (.16, .20, .17)]
    cloth = dict(kind='suit', col=SUITS[int(R.integers(0, len(SUITS)))] if c not in ('KP',) else NAT[c][0], col2=(.86, .85, .82), tie=NAT.get(c, NAT['DEF'])[3] if sx > .5 else None)
    headgear = None; hat = (.9, .9, .88); extra = {}
    nat = NAT.get(c, NAT['DEF'])
    if cleric:
        sup = ttl == 'Supreme Ayatollah'; blk = (c in ('RS', 'RV')) or (ttl == 'Hojatoleslam' and R.random() < .5)
        cloth = dict(kind='robe', col=(.1, .09, .08) if c != 'DW' else (.32, .25, .17), col2=(.88, .87, .84))
        headgear = 'turban'; hat = (.05, .05, .06) if blk else (.74, .73, .70)
        beard = dict(kind='long' if sup else 'full', len=.5 if sup else (.3 if ttl == 'Imam' else .16), count=30000, curl=.35, under=.9)
        if sup or ttl == 'Imam': hair['gray'] = max(hair['gray'], .8); hc = 'gray'; hair['col'] = 'gray'
        age_boost = 0
    elif c in GULF and role in ('leader', 'heir'):
        cloth = dict(kind='robe', col=(.8, .79, .75), col2=(.8, .79, .75)); headgear = 'ghutra'; hat = (.78, .78, .76) if c != 'JO' else (.76, .72, .66)
        if beard is None: beard = dict(kind='short', len=.12, count=22000, curl=.2, under=.8)
    elif c == 'KP':
        cloth = dict(kind='tunic', col=nat[0] if role != 'general' else nat[1])
        if role in ('leader', 'heir'): hair.update(style='back', len_top=.14, comb=(0, 1, .2)); beard = None; extra['rimless'] = 1
    elif role == 'general':
        cloth = dict(kind='tunic', col=nat[1], col2=(.8, .8, .75)); headgear = pick(R, {'cap_peaked': .6, 'beret': .4}); hat = nat[2] if headgear == 'cap_peaked' else pick(R, {'x': 1}) and (.28, .08, .1) if c in ('IR',) else (.12, .12, .1)
        if c in ('IR',) and headgear == 'beret': hat = (.08, .1, .07)
        extra['epaulettes'] = 3 if age > 50 else 2
    if sx < .5: cloth['tie'] = None
    iris = {'dark': (.16, .09, .045), 'eu': {0: (.20, .30, .50), 1: (.30, .24, .12), 2: (.25, .38, .25), 3: (.35, .20, .08)}[int(R.integers(0, 4))], 'mix': (.22, .13, .06)}[C['iris']]
    yellow = .3 if cul in ('ko', 'zh', 'ja', 'vi', 'th', 'id', 'ph', 'kz') else (.1 if cul in ('ru', 'uk', 'pl', 'de', 'se', 'en', 'fr') else 0.)
    return dict(id=p['id'], yellow=yellow, seed=int(L['h'] % 99991), tone=float(tone), iris=iris, body=body, hair=hair, beard=beard, cloth=cloth, headgear=headgear, hat=hat,
                brow=1.0 + (.3 if sx > .5 else -.3), yaw=float(R.choice([-30, -24, -18, 18, 24, 30])), **extra, nm=p['ttl'] + ' ' + p['nm'] if p.get('ttl') else p['nm'], c=c, role=role)
