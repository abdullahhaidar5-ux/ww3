"""Builds one head: MakeHuman mesh (morphed), skin/eye materials, procedural hair/beard/brow strands. Blender coords: up=Z, face looks -Y."""
import bpy, numpy as np, math
from scipy.spatial import cKDTree
import mh

def B(P):  # MakeHuman (x,y up,z front) -> Blender (x,-z,y)
    P = np.asarray(P, float); return np.stack([P[..., 0], -P[..., 2], P[..., 1]], -1)

def vmask(keep, paths, smooth=2, adj=None, scale=None):
    """per-kept-vertex 0..1 mask from the vertices a set of MH targets move"""
    m = np.zeros(len(mh._V))
    for p in paths:
        d = np.linalg.norm(mh.target(p), axis=1); m = np.maximum(m, d / (d.max() + 1e-9))
    m = (m[keep] > 0.02).astype(float) if scale is None else m[keep]
    if smooth and adj is not None:
        for _ in range(smooth): m = (m + np.array([m[a].mean() if len(a) else 0 for a in adj])) / 2
    return m

def adjacency(n, faces):
    s = [set() for _ in range(n)]
    for f in faces:
        for i in range(len(f)):
            s[f[i]].add(f[(i + 1) % len(f)]); s[f[i]].add(f[i - 1])
    return [np.array(sorted(x), int) for x in s]

def vertex_normals(V, faces):
    N = np.zeros_like(V)
    for f in faces:
        a, b, c = V[f[0]], V[f[1]], V[f[2]]; n = np.cross(b - a, c - a)
        for i in f: N[i] += n
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)

class Head: pass

def build(spec, name='p'):
    """spec: dict gender(0-1) age race{...} weight muscle mods{target:w} tone(0-1 light..dark) etc."""
    mh.load_base()
    P = mh.macro(spec['gender'], spec['age'], spec['race'], spec.get('weight', .5), spec.get('muscle', .5))
    P = mh.apply(P, spec.get('mods', {}))
    ob, keep = mh.make_mesh(P, name)
    H = Head(); H.spec = spec; H.keep = keep; H.ob = ob
    Pk = P[keep]; H.Pmh = Pk
    faces = [list(p.vertices) for p in ob.data.polygons]; H.faces = faces
    H.adj = adjacency(len(Pk), faces)
    # rotate to Blender coords (apply to vertices)
    Vb = B(Pk); H.V = Vb
    for i, v in enumerate(ob.data.vertices): v.co = Vb[i]
    ob.data.update()
    H.N = vertex_normals(Vb, faces)
    # landmarks (MH space)
    eL = P[sorted(mh._EYE['joint-l-eye'])].mean(0); eR = P[sorted(mh._EYE['joint-r-eye'])].mean(0)
    H.eyeL = B(eL); H.eyeR = B(eR)
    top = Pk[:, 1].max(); H.top = top
    H.eyeY = eL[1]
    def lm(paths):
        m = vmask(keep, paths); return Pk[m > 0.5]
    nose = lm(['nose/nose-scale-depth-incr', 'nose/nose-point-up']); H.noseTip = B(nose[np.argmax(nose[:, 2])])
    mouth = lm(['mouth/mouth-lowerlip-height-incr', 'mouth/mouth-scale-horiz-incr']); H.mouthC = B(mouth.mean(0)); H.mouthTop = B(np.array([0, mouth[:, 1].max(), mouth[:, 2].mean()]))
    H.chinY = H.mouthC[2] - .34   # menton, measured on the base mesh profile
    # masks
    sm = lambda ps, k=2: vmask(keep, ps, k, H.adj)
    H.m_lips = sm(['mouth/mouth-lowerlip-volume-incr', 'mouth/mouth-cupidsbow-incr', 'mouth/mouth-upperlip-volume-incr'], 1)
    H.m_cheek = sm(['cheek/l-cheek-volume-incr', 'cheek/r-cheek-volume-incr'], 3)
    H.m_nose = sm(['nose/nose-scale-vert-incr', 'nose/nose-flaring-incr'], 2)
    H.m_eyes = sm(['eyes/l-eye-bag-incr', 'eyes/r-eye-bag-incr'], 3)
    H.m_brow = sm(['eyebrows/eyebrows-trans-up'], 1)
    H.m_fore = sm(['forehead/forehead-scale-vert-incr'], 2)
    H.m_laugh = sm(['mouth/mouth-laugh-lines-out'], 2)
    H.m_under = np.zeros(len(Pk)); H.m_lid = np.zeros(len(Pk))
    for c in (H.eyeL, H.eyeR):
        d = np.hypot(Vb[:, 0] - c[0], Vb[:, 2] - c[2]); front = Vb[:, 1] < c[1] - .05
        H.m_lid = np.maximum(H.m_lid, np.clip(1 - np.abs(d - .12) / .035, 0, 1) * front * (np.abs(Vb[:, 1] - (c[1] - .15)) < .3))
    return H

def set_color_attr(ob, name, vals):
    a = ob.data.color_attributes.new(name, 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(vals): a.data[i].color = (v, v, v, 1)
