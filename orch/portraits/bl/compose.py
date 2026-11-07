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
    hlf = ez + np.interp(x, [0, .3, .5, .7, .85, 1.0], [.64, .60, .54, .40, .20, .0])   # smooth hairline with temple points
    hl = np.where(y < -.1, np.minimum(hl, hlf), hl)
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

def _ss(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

def beard_mask(H, kind):
    """soft, jaw-following beard density 0..1 per vertex (no box edges): upper line rises from the moustache over the
    cheek to the sideburn at the ear, irregular edge, fades out before the ear and under the neck."""
    V = H.V; ez = H.eyeY; mz = H.mouthC[2]; chz = H.chinY; nz = H.noseTip[2]
    x = np.abs(V[:, 0]); y = V[:, 1]; z = V[:, 2]
    fr = V[(V[:, 2] > ez - .45) & (V[:, 2] < ez - .1) & (V[:, 1] < H.eyeL[1] + .3)]
    xe = np.abs(fr[:, 0]).max() - .06 if len(fr) else 1.0
    nzs = np.sin(x * 11.3 + z * 7.9) * np.cos(z * 13.1 - x * 5.7) * .045
    if kind == 'mous':
        up = nz - .03; lo = mz + .045
        m = _ss((up - z + nzs * .4) / .05) * _ss((z - lo) / .035) * (1 - _ss((x - .52 - (up - z) * .5) / .08))
    else:
        # upper line (z) as a function of |x|: moustache top -> mouth corner -> cheek -> sideburn
        zc = np.interp(x, [0, .2, .4, .55, xe * .92, xe], [nz - .10, nz - .12, nz - .13, nz - .05, nz + .16, nz + .30])
        if kind == 'stubble': zc = zc + .12
        m = _ss((zc - z + nzs) / .13)
        low = chz - {'stubble': .30, 'goatee': .22, 'short': .30, 'full': .5, 'long': .9}.get(kind, .3)
        m = m * _ss((z - low) / .16) * (1 - _ss((x - xe) / .08))
        if kind == 'goatee': m = m * (1 - _ss((x - .5) / .1)) * (z < mz + .15)
    face = (H.N[:, 1] < .35) | (z < chz + .1)
    m = m * face * (1 if kind == 'mous' else (1 - _ss(H.m_lips * 1.8 - .1)))
    m = m * (y < H.noseTip[1] + 1.9)
    return np.clip(m, 0, 1)

def add_beard(H, S, st, rng, hcol):
    V = H.V; mz = H.mouthC[2]; chz = H.chinY
    ex = st['kind']
    m = beard_mask(H, ex)
    for _ in range(1): m = np.array([m[a].mean() if len(a) else 0 for a in H.adj]) * .5 + m * .5
    H.m_under = np.maximum(H.m_under, m * st.get('under', .8))
    n = st.get('count', 16000) * (2 if ex == 'stubble' else 1)
    pos, nrm, mk = S.sample(m, n, rng, .12, pw=1.0)
    # thin the edge: keep with probability = mask (soft falloff)
    keep = rng.random(len(pos)) < np.clip(mk * 1.3, 0, 1) ** .8
    pos, nrm, mk = pos[keep], nrm[keep], mk[keep]
    n = len(pos)
    L = st['len'] * (.55 + .7 * rng.random(n)) * (.55 + .45 * np.clip(mk, 0, 1))
    c = np.zeros((n, 3)); c[:, 2] = -1
    mo = (pos[:, 2] > mz + .08); c[mo, 0] = np.sign(pos[mo, 0]) * .8
    side = (np.abs(pos[:, 0]) > .55) & ~mo; c[side, 1] = -.5; c[side, 0] = -np.sign(pos[side, 0]) * .2
    c = c + (rng.random((n, 3)) - .5) * .35
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
