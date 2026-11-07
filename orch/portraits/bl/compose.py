import bpy, numpy as np, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mh, scene, head, strands, mats
from strands import Surf, grow, make_curves, unit
from mathutils import Vector

def scalp_mask(H, style):
    V = H.V; top = H.top; ez = H.eyeY
    y = V[:, 1]; z = V[:, 2]; x = np.abs(V[:, 0])
    span = top - ez
    hl = np.where(y < -.55, ez + .52 * span, np.interp(y, [-.55, -.2, .25, 1.0], [ez + .52 * span, ez + .34 * span, ez + .12 * span, ez - .9 * span]))
    hl = np.where(x > .62, np.minimum(hl, ez + .22 * span + (y < -.1) * .25 * span), hl)   # temples/sideburns
    nz = np.sin(V[:, 0] * 9.1 + V[:, 1] * 7.3) * np.cos(V[:, 2] * 8.7 + V[:, 0] * 3.1) * .08
    m = np.clip((z - hl + nz) / .22, 0, 1)
    return m

def add_hair(H, S, st, rng, hcol):
    if st['style'] == 'bald': return None
    m = scalp_mask(H, st)
    H.m_under = np.maximum(H.m_under, m * .85)
    n = st.get('count', 26000)
    pos, nrm, mk = S.sample(m, n, rng, .06, pw=1.6)
    top = H.top; ez = H.eyeY; span = top - ez
    # length profile: top long, sides/back fade
    hgt = (pos[:, 2] - (ez + .12 * span)) / (top - (ez + .12 * span))
    L = st['len_side'] + (st['len_top'] - st['len_side']) * np.clip(hgt, 0, 1) ** st.get('fade', 1.2)
    L = L * (.8 + .4 * rng.random(n))
    c = np.tile(np.array(st['comb'], float), (n, 1))
    if 'part' in st:  # side part: flow away from a part line at x = part
        px = st['part']; c[:, 0] = np.sign(pos[:, 0] - px) * st.get('part_amt', .6); 
    kk = np.floor(pos / .09).astype(int); hsh = (kk[:, 0] * 73856093 ^ kk[:, 1] * 19349663 ^ kk[:, 2] * 83492791) % 1000 / 1000.
    L = L * (.88 + .24 * hsh)
    c = c + np.stack([np.sin(hsh * 20), np.cos(hsh * 31), np.sin(hsh * 13)], 1) * st.get('clump', .25)
    S_ = grow(S, pos, nrm, c, L, rng, npts=st.get('npts', 7), lift=st.get('lift', .35), grav=st.get('grav', .25), curl=st.get('curl', 0.), wave=st.get('wave', 0.), off=.014)
    ob = make_curves('hair', S_, st.get('r', .0055), .0022)
    ob.data.materials.append(hcol); return ob

def add_brows(H, S, rng, hcol, thick=1., tilt=0.):
    hcol = mats.hair(None, .85, .3, 0.15)
    strs = []
    ez = H.eyeY
    for side in (-1, 1):
        k = 520
        u = rng.random(k) * .86                             # 0 inner .. 1 outer
        xs = side * (.07 + u * .52)
        zc = ez + .17 + .06 * np.sin(u * 3.0) * 1.0 - .04 * u ** 2 + tilt * u * .08
        zs = zc + (rng.random(k) - .5) * (.075 - .03 * u) * thick
        pos = []; nrm = []
        for x, z in zip(xs, zs):
            p, n = S.ray(x, z)
            if p is None: p = pos[-1] if pos else np.array([x, -1.4, z]); n = nrm[-1] if nrm else np.array([0, -1, 0.])
            pos.append(p); nrm.append(n)
        pos = np.array(pos); nrm = np.array(nrm)
        c = np.stack([side * (1 - u * .0), 0 * u, .55 - 1.2 * u], 1) * np.array([1, 1, 1]) ; c[:, 0] = side * 1.0
        L = (.075 - .02 * u) * (.8 + .5 * rng.random(k))
        strs.append(grow(S, pos, nrm, c, L, rng, npts=4, lift=.2, grav=0.0, off=.006))
    s = np.concatenate(strs); ob = make_curves('brows', s, .0032, .0014); ob.data.materials.append(hcol); return ob

def cheek_ok(H):
    return (np.abs(H.V[:, 0]) > .3)

def add_beard(H, S, st, rng, hcol):
    """st: dict dens, len, extent('stubble','short','full','long','goatee','mous'), """
    V = H.V; ez = H.eyeY; mz = H.mouthC[2]; chz = H.chinY; nz = H.noseTip[2]
    x = np.abs(V[:, 0]); y = V[:, 1]; z = V[:, 2]
    ex = st['kind']
    front = (y < H.noseTip[1] + .55) | (cheek_ok(H) & (y < H.noseTip[1] + 1.9))
    lips = H.m_lips > .25
    musta = (z < nz - .03) & (z > mz + .08) & (x < .62)
    chinz = (z < mz + .10) & (z > chz - .25) & (x < .55)
    cheek = (z < ez - .30) & (z > chz - .15) & (x > .30) & (x < 1.5) & (y < H.noseTip[1] + 1.0)
    under = (z < chz + .05) & (z > chz - .45) & (x < 1.0)
    if ex == 'stubble': m = (musta | chinz | cheek | under)
    elif ex == 'mous': m = musta
    elif ex == 'goatee': m = musta | chinz
    elif ex == 'short' or ex == 'full' or ex == 'long': m = musta | chinz | cheek | under
    m = (m & front & ~lips).astype(float)
    for _ in range(1):
        m = np.array([m[a].mean() if len(a) else 0 for a in H.adj]) * .5 + m * .5
    H.m_under = np.maximum(H.m_under, m * st.get('under', .8))
    n = st.get('count', 16000)
    pos, nrm, mk = S.sample(m, n, rng, .45)
    L = st['len'] * (.7 + .6 * rng.random(n))
    c = np.zeros((len(pos), 3)); c[:, 2] = -1
    mo = (pos[:, 2] > mz + .08)  # moustache flows down/outward
    c[mo, 0] = np.sign(pos[mo, 0]) * .8
    side = (np.abs(pos[:, 0]) > .5); c[side, 0] = -np.sign(pos[side, 0]) * .0
    S_ = grow(S, pos, nrm, c, L, rng, npts=st.get('npts', 6), lift=st.get('lift', .15), grav=st.get('grav', .5), curl=st.get('curl', .15), off=.007)
    ob = make_curves('beard', S_, st.get('r', .0042), .0016); ob.data.materials.append(hcol); return ob

def add_eyes(H, iris, dark=False, look=(0, -1, 0)):
    mat_ = mats.eye(iris, dark); objs = []
    for c in (H.eyeL, H.eyeR):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=.112, location=(c[0], c[1] - .03, c[2]))
        e = bpy.context.active_object; e.data.materials.append(mat_)
        for p in e.data.polygons: p.use_smooth = True
        v = Vector(look); e.rotation_euler = v.to_track_quat('-Y', 'Z').to_euler(); objs.append(e)
    return objs
