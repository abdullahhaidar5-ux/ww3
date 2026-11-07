"""MakeHuman (CC0) head builder for bpy: loads base.obj body, applies macro + face targets with MakeHuman's own weighting.
Build-time only. MH data dir = clone of github.com/makehumancommunity/makehuman (makehuman/data)."""
import numpy as np, os, bpy, bmesh
D = os.environ.get('MHDATA', '/tmp/mhrepo/makehuman/data') + '/'
_V = None; _F = None; _UV = None; _FUV = None; _T = {}; _EYE = {}
def load_base():
    global _V, _F, _UV, _FUV
    if _V is not None: return
    V = []; UV = []; F = []; FU = []; grp = None
    for ln in open(D + '3dobjs/base.obj'):
        if ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
        elif ln.startswith('vt '): UV.append([float(x) for x in ln.split()[1:3]])
        elif ln.startswith('g '): grp = ln.split()[1]
        elif ln.startswith('f ') and grp == 'body':
            t = [p.split('/') for p in ln.split()[1:]]
            F.append([int(a[0]) - 1 for a in t]); FU.append([int(a[1]) - 1 for a in t])
        elif ln.startswith('f ') and grp in ('joint-l-eye', 'joint-r-eye'):
            _EYE.setdefault(grp, set()).update(int(p.split('/')[0]) - 1 for p in ln.split()[1:])
    _V = np.array(V); _UV = np.array(UV); _F = F; _FUV = FU
def target(path):
    if path not in _T:
        d = np.zeros_like(_V)
        for ln in open(D + 'targets/' + path + '.target'):
            if ln[0] == '#' or not ln.strip(): continue
            p = ln.split(); d[int(p[0])] = [float(x) for x in p[1:4]]
        _T[path] = d
    return _T[path]
def macro(gender, age_years, race, weight=.5, muscle=.5):
    """gender 0 female..1 male; race dict african/asian/caucasian summing 1; MakeHuman age mapping (25y = young=0.5)"""
    a = age_years
    if a < 11: a_= a/11*.1875
    elif a < 25: a_ = .1875 + (a-11)/14*(.5-.1875)
    else: a_ = .5 + min(1, (a-25)/65)*.5
    wb = max(0, 1 - a_/.1875) if a_ < .1875 else 0
    wc = (a_/.1875 if a_ < .1875 else max(0, 1-(a_-.1875)/(.5-.1875))) if a_ < .5 else 0
    wy = 0 if a_ <= .1875 else (((a_-.1875)/(.5-.1875)) if a_ < .5 else max(0, 1-(a_-.5)/.5))
    wo = max(0, (a_-.5)/.5) if a_ > .5 else 0
    ag = {'baby': wb, 'child': wc, 'young': wy, 'old': wo}
    P = _V.copy()
    for r, wr in race.items():
        for gn, wg in (('male', gender), ('female', 1 - gender)):
            for an, wa in ag.items():
                w = wr * wg * wa
                if w > 1e-4: P += w * target(f'macrodetails/{r}-{gn}-{an}')
    # weight / muscle (universal)
    wm = {'minmuscle': max(0, 1 - muscle*2), 'averagemuscle': 1 - abs(muscle-.5)*2, 'maxmuscle': max(0, muscle*2 - 1)}
    ww = {'minweight': max(0, 1 - weight*2), 'averageweight': 1 - abs(weight-.5)*2, 'maxweight': max(0, weight*2 - 1)}
    for gn, wg in (('male', gender), ('female', 1 - gender)):
        for an, wa in ag.items():
            if wa < 1e-4 or wg < 1e-4: continue
            for mk, mv in wm.items():
                for wk, wv in ww.items():
                    w = wg * wa * mv * wv
                    if w > 1e-4: P += w * target(f'macrodetails/universal-{gn}-{an}-{mk}-{wk}')
    return P
def apply(P, mods):
    """mods: {target path (without .target): weight}; negative weight allowed by naming decr/incr pairs in caller"""
    for k, w in mods.items():
        if abs(w) > 1e-4: P = P + w * target(k)
    return P
def make_mesh(P, name, ymin=3.4):
    keep = np.where(_V[:, 1] > ymin)[0]
    remap = -np.ones(len(_V), int); remap[keep] = np.arange(len(keep))
    faces = []; fuv = []
    for f, u in zip(_F, _FUV):
        if all(remap[i] >= 0 for i in f): faces.append([int(remap[i]) for i in f]); fuv.append(u)
    me = bpy.data.meshes.new(name); me.from_pydata(P[keep].tolist(), [], faces); me.update()
    uvl = me.uv_layers.new(name='UV')
    li = 0
    for f, u in zip(faces, fuv):
        for k in range(len(f)): uvl.data[li].uv = _UV[u[k]]; li += 1
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob, keep
def eye_centres(P):
    return {k: P[sorted(v)].mean(0) for k, v in _EYE.items()}
