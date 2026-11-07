"""Procedural hair / beard / brow strands as Blender hair curves, hugging the head surface (no detached parts by construction)."""
import bpy, numpy as np, math
from scipy.spatial import cKDTree
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def unit(v): return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)

class Surf:
    def __init__(s, H, extra_off=0.0):
        s.H = H; s.tree = cKDTree(H.V)
        tris = []
        for f in H.faces:
            tris.append([f[0], f[1], f[2]])
            if len(f) == 4: tris.append([f[0], f[2], f[3]])
        s.tris = np.array(tris)
        s.bvh = BVHTree.FromPolygons([tuple(v) for v in H.V], [tuple(t) for t in s.tris])
        a = H.V[s.tris]; s.area = np.linalg.norm(np.cross(a[:, 1] - a[:, 0], a[:, 2] - a[:, 0]), axis=1) / 2
    def sample(s, vmask, n, rng, thr=.5, pw=None):
        """n random surface points on triangles whose vertices' mean mask > thr; returns pos, normal, per-point mask"""
        tm = vmask[s.tris].mean(1); ok = np.where(tm > thr)[0]
        w = s.area[ok] * (tm[ok] if pw is None else tm[ok] ** pw); w = w / w.sum()
        t = rng.choice(ok, n, p=w); r1, r2 = rng.random(n), rng.random(n); sq = np.sqrt(r1)
        bc = np.stack([1 - sq, sq * (1 - r2), sq * r2], 1)
        idx = s.tris[t]; pos = (s.H.V[idx] * bc[:, :, None]).sum(1); nrm = unit((s.H.N[idx] * bc[:, :, None]).sum(1))
        mk = (vmask[idx] * bc).sum(1)
        return pos, nrm, mk
    def push(s, p, off):
        d, i = s.tree.query(p); N = s.H.N[i]; h = ((p - s.H.V[i]) * N).sum(1)
        bad = h < off; p = p.copy(); p[bad] += N[bad] * (off - h[bad])[:, None]; return p
    def ray(s, x, z, y0=-6.0):
        h = s.bvh.ray_cast(Vector((x, y0, z)), Vector((0, 1, 0)))
        return (np.array(h[0]), np.array(h[1])) if h[0] is not None else (None, None)

def grow(S, pos, nrm, comb, length, rng, npts=7, lift=.35, grav=.25, curl=0., off=.012, wave=0., stiff=1.0, down=(0, 0, -1)):
    """grow strands from roots. comb: (n,3) preferred flow direction; length: (n,) total length; returns (n,npts,3)"""
    n = len(pos); down = np.array(down, float)
    t = comb - (comb * nrm).sum(1, keepdims=True) * nrm; t = unit(t + 1e-6)
    d = unit(t * (1 - lift) + nrm * lift)
    pts = [pos + nrm * off * .5]; cur = pts[0].copy(); ph = rng.random(n) * 6.28
    seg = length / (npts - 1)
    for k in range(1, npts):
        g = grav * (k / (npts - 1)) ** 1.2
        d = unit(d * (1 - .0) + down * g)
        if curl:
            d = unit(d + curl * np.stack([np.sin(ph + k * 1.9), np.cos(ph * 1.3 + k * 1.7), np.sin(ph * .7 + k * 1.1)], 1) * .5)
        if wave:
            d = unit(d + wave * np.stack([np.sin(ph + k * 1.1), 0 * ph, np.cos(ph + k * .9)], 1) * .4)
        cur = cur + d * seg[:, None]
        cur = S.push(cur, off)
        pts.append(cur)
    return np.stack(pts, 1)

def make_curves(name, strands, rroot, rtip):
    n, k, _ = strands.shape
    cu = bpy.data.hair_curves.new(name); cu.add_curves([k] * n)
    cu.position_data.foreach_set('vector', strands.reshape(-1, 3).astype(np.float32).ravel())
    r = np.tile(np.linspace(rroot, rtip, k), n).astype(np.float32)
    a = cu.attributes.get('radius') or cu.attributes.new('radius', 'FLOAT', 'POINT'); a.data.foreach_set('value', r)
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob); return ob
