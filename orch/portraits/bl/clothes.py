"""Garments built from the body mesh itself (offset shells, so they always fit), plus lathed caps and wrapped turbans. Blender coords (Z up, face -Y)."""
import bpy, numpy as np, math, bmesh
from scipy.spatial import cKDTree
import mats
from strands import unit

def _obj(name, V, F, mat=None, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(np.asarray(V, float).tolist(), [], [list(map(int, f)) for f in F]); me.update()
    for p in me.polygons: p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def neck_info(H):
    """neck axis (x=0,y0) and z range from the vertices near x~0 under the chin"""
    V = H.V; m = (np.abs(V[:, 0]) < .45) & (V[:, 2] < H.chinY + .1) & (V[:, 2] > H.chinY - 1.2) & (V[:, 1] > -.7)
    c = V[m].mean(0); return c[1], H.chinY

def dense(H):
    if hasattr(H, 'dV'): return
    bm = bmesh.new(); bm.from_mesh(H.ob.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    H.dV = np.array([v.co[:] for v in bm.verts]); H.dF = [[v.index for v in f.verts] for f in bm.faces]; bm.free()
    from head import vertex_normals
    H.dN = vertex_normals(H.dV, H.dF)

def shell(H, name, mat, off, ztop, slope=3.0, vdepth=0., vwid=.5, yaxis=None, zmin=None, offfn=None, thick=.03, wave=0.):
    """body-conforming garment: keeps faces below a cone around the neck (ztop at the neck axis, rising `slope` per unit of radius);
    a V opening of depth `vdepth` down the front; offset `off` along the normals (offfn(z)->extra)"""
    dense(H); V = H.dV; N = H.dN; y0, chz = neck_info(H) if yaxis is None else yaxis
    r = np.hypot(V[:, 0], V[:, 1] - y0)
    zc = np.minimum(ztop + slope * np.maximum(0, r - .55), max(ztop, H.chinY - .62))
    if vdepth:
        fr = (V[:, 1] < y0 - .1).astype(float)
        zc = zc - fr * vdepth * np.clip(1 - np.abs(V[:, 0]) / vwid, 0, 1)
    keepv = V[:, 2] < zc
    if zmin is not None: keepv &= V[:, 2] > zmin
    keepf = [f for f in H.dF if all(keepv[i] for i in f)]
    used = sorted(set(i for f in keepf for i in f)); rm = {v: k for k, v in enumerate(used)}
    ex = off + (offfn(V[used]) if offfn else 0)
    cnt = {}
    for f in keepf:
        for q in range(len(f)):
            e = tuple(sorted((f[q], f[(q + 1) % len(f)]))); cnt[e] = cnt.get(e, 0) + 1
    bset = set(i for e, n_ in cnt.items() if n_ == 1 for i in e)
    V = V.copy()
    for i in bset: V[i, 2] = max(V[i, 2], min(zc[i], V[i, 2] + .1))
    P = V[used] + N[used] * np.reshape(ex, (-1, 1))
    F = [[rm[i] for i in f] for f in keepf]
    ob = _obj(name, P, F, mat)
    s = ob.modifiers.new('sol', 'SOLIDIFY'); s.thickness = -thick; s.offset = 1
    sb = ob.modifiers.new('sub', 'SUBSURF'); sb.levels = 1; sb.render_levels = 2
    ob['rim'] = 1
    # rim loop (boundary) for piping: edges used by one face
    ecount = {}
    for f in F:
        for i in range(len(f)):
            e = tuple(sorted((f[i], f[(i + 1) % len(f)]))); ecount[e] = ecount.get(e, 0) + 1
    bnd = [e for e, c in ecount.items() if c == 1]
    return ob, P, bnd

def rim_tube(P, bnd, mat, rad=.035, zmax=None, name='rim'):
    """smooth tube along the biggest closed boundary loop(s) of a shell (collar piping / neckline edge) """
    from collections import defaultdict
    adj = defaultdict(list)
    for a, b in bnd: adj[a].append(b); adj[b].append(a)
    seen = set(); loops = []
    for s in list(adj):
        if s in seen: continue
        loop = [s]; seen.add(s); prev = None; cur = s
        while True:
            nx = [n for n in adj[cur] if n != prev and n not in seen]
            if not nx: break
            prev, cur = cur, nx[0]; seen.add(cur); loop.append(cur)
        loops.append(loop)
    out = []
    for lp in loops:
        if len(lp) < 20: continue
        pts = P[lp]
        if zmax is not None and pts[:, 2].mean() < zmax: continue
        k = 4
        for _ in range(3):   # smooth
            pts = (np.roll(pts, 1, 0) + pts * 2 + np.roll(pts, -1, 0)) / 4
        cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = rad; cu.bevel_resolution = 3; cu.use_fill_caps = False
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1); sp.use_cyclic_u = True
        for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
        ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob); cu.materials.append(mat); out.append(ob)
    return out

def strip_on_surface(H, name, mat, pts_xz, wid, off=.035, front=True):
    """a flat band (tie, placket, ribbon bar) following the chest: pts_xz = list of (x,z) down the front; surface y from raycast"""
    from mathutils import Vector
    from strands import Surf
    S = H._S if hasattr(H, '_S') else Surf(H); H._S = S
    rows = []
    for (x, z, w) in pts_xz:
        row = []
        for sx in (-1, 1):
            p, n = S.ray(x + sx * w, z)
            if p is None: p = np.array([x + sx * w, -1.5, z]); n = np.array([0, -1, 0.])
            row.append(p + n * off)
        rows.append(row)
    rows = np.array(rows); V = rows.reshape(-1, 3); F = [[2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2] for i in range(len(rows) - 1)]
    return _obj(name, V, F, mat)

def lathe(name, prof, mat, seg=64, rx=1.0, ry=1.0, cx=0., cy=0., cz=0., tilt=0., twist=None, noise=0., rng=None):
    """surface of revolution; prof = [(radius, z)...] ; elliptic via rx,ry"""
    prof = np.array(prof, float); n = len(prof); V = []; F = []
    for j in range(seg):
        a = 2 * math.pi * j / seg
        for (r, z) in prof:
            rr = r * (1 + (noise * (rng.random() - .5) if noise else 0))
            V.append([cx + rr * rx * math.cos(a), cy + rr * ry * math.sin(a), cz + z])
    V = np.array(V)
    for j in range(seg):
        for i in range(n - 1):
            a = j * n + i; b = ((j + 1) % seg) * n + i
            F.append([a, b, b + 1, a + 1])
    if tilt:
        c = np.array([cx, cy, cz + prof[:, 1].mean()]); R = np.array([[1, 0, 0], [0, math.cos(tilt), -math.sin(tilt)], [0, math.sin(tilt), math.cos(tilt)]])
        V = (V - c) @ R.T + c
    return _obj(name, V, F, mat)

def head_frame(H):
    V = H.V; m = (V[:, 2] > H.eyeY + .25) & (V[:, 2] < H.eyeY + .65) & (np.abs(V[:, 0]) < 1.1)
    cx = 0.; cy = (V[m, 1].max() + V[m, 1].min()) / 2; w = np.percentile(np.abs(V[m, 0]), 99); d = (V[m, 1].max() - V[m, 1].min()) / 2
    return cx, cy, w, d, H.eyeY, H.top

def peaked_cap(H, crown, band, badge, rng, tilt=.10, high=1.0, big=1.0, flare=1.0):
    cx, cy, w, d, ez, top = head_frame(H)
    hw = w + .05; hd = d + .05; zb = ez + .27; span = top - zb + .05
    prof = [(1.0, zb - .02), (1.0, zb + .26 * span / 1.1), (1.05, zb + .38 * span / 1.1), (1.16 * flare, zb + .66 * span / 1.1), (1.30 * flare * big, zb + .90 * span / 1.1),
            (1.30 * flare * big, zb + .95 * span / 1.1), (1.0, zb + 1.0 * span / 1.1), (.55, zb + 1.02 * span / 1.1), (0.0, zb + 1.03 * span / 1.1)]
    obs = [lathe('crown', prof, crown, rx=hw, ry=hd, cy=cy, tilt=tilt, seg=72)]
    obs.append(lathe('band', [(1.012, zb - .025), (1.012, zb + .30 * span / 1.1)], band, rx=hw, ry=hd, cy=cy, tilt=tilt, seg=72))
    # visor: front sector, drooping forward
    V = []; F = []; k = 30; m = 6
    for i in range(k + 1):
        th = math.pi * (.12 + .76 * i / k) + math.pi      # front half, y<0
        ext = .55 * (math.sin(math.pi * i / k) ** .6 + .0)
        for r in range(m + 1):
            t = r / m
            V.append([cx + math.cos(th) * hw * (1.0 + ext * t * .25), cy + math.sin(th) * (hd + ext * t * 1.1), zb - .03 - .17 * t ** 1.4 + .0])
    for i in range(k):
        for r in range(m): a = i * (m + 1) + r; F.append([a, a + 1, a + m + 2, a + m + 1])
    ob = _obj('visor', V, F, band); s = ob.modifiers.new('s', 'SOLIDIFY'); s.thickness = .025; obs.append(ob)
    # badge + gold braid on the band
    obs.append(lathe('badge', [(.0, 0), (.5, .0), (.5, .03)], badge, rx=.10, ry=.10, cx=0, cy=cy - hd * 1.0, cz=zb + .12, seg=24, tilt=-math.pi / 2 + .1))
    return obs

def beret(H, cloth, band=None, tilt=.35, rng=None):
    cx, cy, w, d, ez, top = head_frame(H)
    z0 = ez + .42
    prof = [(1.0, z0), (1.12, z0 + .04), (1.28, z0 + .12), (1.24, z0 + .20), (1.0, z0 + .25), (.5, z0 + .27), (0, z0 + .27)]
    ob = lathe('beret', prof, cloth, rx=w + .06, ry=d + .06, cy=cy, tilt=tilt, seg=72)
    return [ob]

def turban(H, cloth, rng, layers=5, big=1.0):
    """wrapped cloth: tilted stacked bands with folds"""
    cx, cy, w, d, ez, top = head_frame(H)
    obs = []; seg = 96; z0 = ez + .30
    V = []; F = []; rows = 0
    layers_n = layers
    for L in range(layers_n * 5 + 1):
        t = L / (layers_n * 5)
        # spiralling wrapped band from brow line up to the crown
        z = z0 + t * (top - z0 + .22) * 1.0
        shrink = 1 + .16 * big * math.sin(math.pi * min(1, t * 1.15)) - .0 * t
        crownf = math.sqrt(max(0, 1 - t ** 3.0))
        for j in range(seg):
            a = 2 * math.pi * j / seg
            tw = .03 * math.sin(a * 3 + L * 1.7) + .035 * math.sin(a * 2 - L * .9)
            fold = .028 * math.sin(a * 7 + L * 2.3 + rng.random() * .0)
            rx = (w + .09) * shrink * crownf + fold + tw; ry = (d + .09) * shrink * crownf + fold + tw
            V.append([cx + rx * math.cos(a), cy + ry * math.sin(a), z + .045 * math.sin(a * 2 + L * .7) + (math.cos(a) * 0 )])
        rows += 1
    V = np.array(V)
    # tilt the whole thing slightly (wrapped higher at the back)
    for r in range(rows - 1):
        for j in range(seg):
            a = r * seg + j; b = r * seg + (j + 1) % seg; F.append([a, b, b + seg, a + seg])
    ob = _obj('turban', V, F, cloth)
    s = ob.modifiers.new('sol', 'SOLIDIFY'); s.thickness = .03; obs.append(ob)
    return obs

def ghutra(H, cloth, agal, rng, flap=1.0):
    cx, cy, w, d, ez, top = head_frame(H); obs = []
    zb = ez + .26
    Hh = top + .10 - zb
    prof = [(1.0 + .07 * math.sin(math.pi * min(1, t / .55)) * (t < .55) + .07 * (t >= .55) * math.cos((t - .55) / .45 * 1.2), zb + t * Hh) for t in np.linspace(0, 1, 14)]
    prof = [(max(0., (1.07 * math.sqrt(max(0, 1 - (t / 1.0) ** 2.6)) if t > .3 else 1.0 + .07 * t / .3)), zb + t * Hh) for t in np.linspace(0, 1, 16)]
    obs.append(lathe('dome', prof, cloth, rx=w + .10, ry=d + .10, cy=cy, seg=72, noise=.02, rng=rng))
    obs[-1].modifiers.new('sol', 'SOLIDIFY').thickness = .03
    obs.append(lathe('agal', [(1.0, zb + .50 * Hh), (1.08, zb + .52 * Hh), (1.10, zb + .58 * Hh), (1.08, zb + .64 * Hh), (1.0, zb + .66 * Hh)], agal, rx=w + .15, ry=d + .15, cy=cy, seg=72))
    for sx in (-1, 1):
        k = 14; m = 8; V = []; F = []
        for i in range(k + 1):
            t = i / k
            x = sx * (w + .08 + .45 * t ** 1.3 + .05 * math.sin(t * 5)); z = (zb + .1) * (1 - t) + (H.chinY - .95) * t
            for j in range(m + 1):
                u = j / m; y = cy - .05 + .75 * u - .35 * t * u + .06 * math.sin(u * 5 + t * 6 + sx)
                V.append([x + sx * .05 * math.sin(u * 9 + t * 3) * t, y, z])
        for i in range(k):
            for j in range(m): a = i * (m + 1) + j; F.append([a, a + 1, a + m + 2, a + m + 1])
        ob = _obj('flap', V, F, cloth); ob.modifiers.new('sol', 'SOLIDIFY').thickness = .035; obs.append(ob)
    return obs

def epaulettes(H, mat_board, mat_gold, rank=3):
    from mathutils import Vector
    from strands import Surf
    S = H._S if hasattr(H, '_S') else Surf(H); H._S = S; obs = []
    for sx in (-1, 1):
        h = S.bvh.ray_cast(Vector((sx * 1.55, -.2, 12)), Vector((0, 0, -1)))
        if h[0] is None: continue
        p = np.array(h[0]) + np.array(h[1]) * .13; n = np.array(h[1])
        bpy.ops.mesh.primitive_cube_add(size=1, location=tuple(p)); e = bpy.context.active_object
        e.scale = (.55, .32, .035); e.rotation_euler = Vector(n).to_track_quat('Z', 'Y').to_euler(); e.rotation_mode = 'XYZ'
        e.data.materials.append(mat_board); obs.append(e)
        for k in range(rank):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=.035, location=tuple(p + n * .03 + np.array([sx * (-.17 + k * .17), 0, 0]) * 0.0 + (Vector(n).to_track_quat('Z', 'Y').to_matrix() @ Vector((-.18 + k * .18, 0, 0)))))
            s = bpy.context.active_object; s.data.materials.append(mat_gold); obs.append(s)
    return obs

def lapels(H, mat, off=.115):
    """lapel outline: a raised band along each side of the V opening (notch-style), raycast onto the body then offset out"""
    from strands import Surf
    from mathutils import Vector
    S = H._S if hasattr(H, '_S') else Surf(H); H._S = S; zt = H.chinY - .58; out = []
    for sx in (-1, 1):
        for (xa, za, xb, zb_, w) in ((.80, zt + .06, .10, zt - .92, .26), (.62, zt + .04, .06, zt - .96, .02)):
            P = []
            for t in np.linspace(0, 1, 18):
                x = sx * (xa + (xb - xa) * t); z = za + (zb_ - za) * t
                p, n = S.ray(x, z)
                if p is None: continue
                P.append(p + n * off)
            if len(P) < 4: continue
            P = np.array(P)
            cu = bpy.data.curves.new('lapel', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .045 if w > .1 else .02; cu.bevel_resolution = 3
            sp = cu.splines.new('POLY'); sp.points.add(len(P) - 1)
            for i, q in enumerate(P): sp.points[i].co = (*q, 1)
            ob = bpy.data.objects.new('lapel', cu); bpy.context.collection.objects.link(ob); cu.materials.append(mat); out.append(ob)
    return out
