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

def peaked_cap(H, crown, band, badge, rng, tilt=.17, high=1.0, big=1.12, flare=1.0):
    """service cap that hugs the skull: band at the brow, slightly flaring saucer top, shiny visor, gold cord, cap badge"""
    cx, cy, w, d, ez, top = head_frame(H)
    hw = w + .06; hd = d + .15; zb = ez + .36; Hh = top - zb + .02
    prof = [(1.0, zb - .02), (1.0, zb + .14 * Hh), (1.02, zb + .40 * Hh), (1.0, zb + .70 * Hh), (1.05 * flare, zb + .86 * Hh), (1.17 * flare * big, zb + .955 * Hh),
            (1.17 * flare * big, zb + .99 * Hh), (.92, zb + 1.015 * Hh), (.5, zb + 1.03 * Hh), (0.0, zb + 1.03 * Hh)]
    obs = [lathe('crown', prof, crown, rx=hw, ry=hd, cy=cy, tilt=tilt, seg=72)]
    obs.append(lathe('band', [(1.015, zb - .03), (1.015, zb + .17 * Hh)], band, rx=hw, ry=hd, cy=cy, tilt=tilt, seg=72))
    obs.append(lathe('cord', [(1.03, zb + .17 * Hh), (1.03, zb + .20 * Hh)], badge, rx=hw, ry=hd, cy=cy, tilt=tilt, seg=72))
    V = []; F = []; k = 30; m = 6
    for i in range(k + 1):
        th = math.pi * (.14 + .72 * i / k) + math.pi
        ext = .32 * (math.sin(math.pi * i / k) ** .6)
        for r in range(m + 1):
            t = r / m
            V.append([cx + math.cos(th) * hw * (1.0 + ext * t * .2), cy + math.sin(th) * (hd + ext * t * 1.0), zb - .03 - .10 * t ** 1.5])
    for i in range(k):
        for r in range(m): a = i * (m + 1) + r; F.append([a, a + 1, a + m + 2, a + m + 1])
    ob = _obj('visor', V, F, band); s = ob.modifiers.new('s', 'SOLIDIFY'); s.thickness = .022; obs.append(ob)
    obs.append(lathe('badge', [(.0, 0), (.5, .0), (.5, .03)], badge, rx=.11, ry=.11, cx=0, cy=cy - hd * 1.03, cz=zb + .10 * Hh, seg=24, tilt=-math.pi / 2 + .1))
    return obs

def beret(H, cloth, band=None, tilt=.35, rng=None):
    """wool beret: a flattened dome with a headband at the brow line, wider than the head, pulled down to one side"""
    cx, cy, w, d, ez, top = head_frame(H)
    zb = ez + .34; Hh = top - zb + .06
    prof = []
    for t in np.linspace(0, 1, 18):
        r = (1.02 + .32 * math.sin(math.pi * min(1, t * 1.12) ** .9)) * math.sqrt(max(0.0, 1 - t ** 3.6))
        prof.append((r, zb - .03 + t * Hh))
    ob = lathe('beret', prof, cloth, rx=w + .07, ry=d + .10, cy=cy, tilt=tilt * .5, seg=72)
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
    """headcloth draped over the skull (front hem on the forehead line), falling in folds past the ears onto the shoulders and down the back;
    black agal cord ring sits on top."""
    cx, cy, w, d, ez, top = head_frame(H); obs = []
    zf = ez + .50; th_ = top + .10; zlow = H.chinY - .5; ph0 = math.radians(52)
    ss = lambda x: (lambda t: t * t * (3 - 2 * t))(min(1, max(0, x)))
    nphi = 96; nt = 30; V = []; F = []
    for i in range(nt + 1):
        t = i / nt
        for j in range(nphi + 1):
            ph = 2 * math.pi * j / nphi; dd = min(ph, 2 * math.pi - ph)      # angle from the front
            hem = zf + (zlow - zf) * ss((dd - ph0 * .55) / (ph0 * .75))
            z = th_ + (hem - th_) * t
            u = (th_ - z) / (th_ - zf)
            rr = math.sqrt(max(0.0, 1 - (1 - min(u, 1)) ** 2.2)) if u < 1 else 1.0
            q = max(0.0, (th_ - z) - (th_ - zf)) / max(.1, (th_ - zlow) - (th_ - zf))
            grow_ = (.04 + .70 * q ** 1.25) * (.5 + .5 * ss(dd / math.radians(100)))
            fold = (.085 * math.sin(ph * 6 + q * 3.0) + .035 * math.sin(ph * 11 + 1.3 + q * 4)) * q ** .8
            rx = (w + .09) * rr + grow_ + fold; ry = (d + .09) * rr + grow_ * .85 + fold
            V.append([cx - rx * math.sin(ph), cy - ry * math.cos(ph), z + .02 * math.sin(ph * 5 + t * 9) * q])
    for i in range(nt):
        for j in range(nphi):
            a = i * (nphi + 1) + j; F.append([a, a + 1, a + nphi + 2, a + nphi + 1])
    ob = _obj('headcloth', V, F, cloth); w_ = ob.modifiers.new('weld', 'WELD'); w_.merge_threshold = .002; ss_ = ob.modifiers.new('sub', 'SUBSURF'); ss_.levels = 1; ss_.render_levels = 2; s_ = ob.modifiers.new('sol', 'SOLIDIFY'); s_.thickness = .03; obs.append(ob)
    za = ez + .66
    for k, dz in enumerate((0, .08)):
        obs.append(lathe('agal%d' % k, [(1.0, za + dz - .035), (1.05, za + dz - .02), (1.06, za + dz + .02), (1.0, za + dz + .035)], agal, rx=w + .16, ry=d + .16, cy=cy, seg=72, tilt=.10))
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

def ribbons(H, mat_list, rows=3, cols=4):
    """service ribbons + a small medal bar on the wearer's left chest (our right of image), raycast onto the body and lifted over the jacket"""
    from mathutils import Vector
    from strands import Surf
    S = H._S if hasattr(H, '_S') else Surf(H); H._S = S; obs = []
    zt = H.chinY - .98
    for r in range(rows):
        for c in range(cols):
            x = (.78 + c * .125); z = zt - r * .05
            p, n = S.ray(x, z)
            if p is None: continue
            q = p + n * .135
            bpy.ops.mesh.primitive_cube_add(size=1, location=tuple(q)); e = bpy.context.active_object
            e.scale = (.115, .018, .042); e.rotation_euler = Vector(n).to_track_quat('Y', 'Z').to_euler()
            e.data.materials.append(mat_list[(r * 3 + c * 5) % len(mat_list)]); obs.append(e)
    return obs

def collar_tabs(H, mat):
    from mathutils import Vector
    from strands import Surf
    S = H._S if hasattr(H, '_S') else Surf(H); H._S = S; obs = []
    for sx in (-1, 1):
        p, n = S.ray(sx * .62, H.chinY - .62)
        if p is None: continue
        q = p + n * .15
        bpy.ops.mesh.primitive_cube_add(size=1, location=tuple(q)); e = bpy.context.active_object
        e.scale = (.20, .03, .085); e.rotation_euler = Vector(n).to_track_quat('Y', 'Z').to_euler(); e.data.materials.append(mat); obs.append(e)
    return obs
