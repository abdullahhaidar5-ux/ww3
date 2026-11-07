"""MakeHuman proxy (.mhclo + .obj + .mhmat) loader: fits a pack asset (hair, beard, brows, lashes, clothes, hats) to the
morphed base mesh with MakeHuman's own barycentric weights + offsets, and builds a Blender object with UVs and an
alpha-textured material. Pack data live only in the scratch dir (never committed). Build-time only."""
import numpy as np, os, bpy
import mh

def parse(path):
    d = {'verts': [], 'scale': {}}
    mode = None
    for ln in open(path, errors='ignore'):
        s = ln.strip()
        if not s or s.startswith('#'): continue
        p = s.split()
        if p[0] == 'verts': mode = 'v'; continue
        if p[0] in ('delete_verts', 'weights', 'texture_uv', 'vertexboneweights_file', 'subdivide'): mode = None if p[0] != 'delete_verts' else 'd'; continue
        if mode == 'v':
            if len(p) == 9: d['verts'].append((list(map(int, p[:3])), list(map(float, p[3:6])), list(map(float, p[6:9]))))
            elif len(p) == 1: d['verts'].append(([int(p[0])] * 3, [1., 0., 0.], [0., 0., 0.]))
        elif mode == 'd':
            if p[0] == 'delete_verts': continue
        elif p[0] in ('x_scale', 'y_scale', 'z_scale'): d['scale'][p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif p[0] in ('obj_file', 'material', 'name', 'z_depth', 'basemesh'): d[p[0]] = p[1]
    return d

def read_obj(path):
    V = []; UV = []; F = []; FU = []; G = []
    g = ''
    for ln in open(path, errors='ignore'):
        if ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
        elif ln.startswith('vt '): UV.append([float(x) for x in ln.split()[1:3]])
        elif ln.startswith('g ') or ln.startswith('o '): g = ln.split()[1] if len(ln.split()) > 1 else ''
        elif ln.startswith('f '):
            t = [q.split('/') for q in ln.split()[1:]]
            F.append([int(a[0]) - 1 for a in t]); FU.append([int(a[1]) - 1 if len(a) > 1 and a[1] else 0 for a in t]); G.append(g)
    return np.array(V), np.array(UV) if UV else np.zeros((1, 2)), F, FU, G

def fit(cl, P):
    """P: morphed base vertices (full MH mesh, MH space). Returns proxy vertex positions in MH space."""
    sc = []
    for ax, i in (('x', 0), ('y', 1), ('z', 2)):
        if ax in cl['scale']:
            a, b, den = cl['scale'][ax]; sc.append(abs(P[a][i] - P[b][i]) / den)
        else: sc.append(1.)
    sc = np.array(sc)
    out = np.zeros((len(cl['verts']), 3))
    for k, (ix, w, dd) in enumerate(cl['verts']):
        out[k] = P[ix[0]] * w[0] + P[ix[1]] * w[1] + P[ix[2]] * w[2] + np.array(dd) * sc
    return out

def read_mat(path):
    m = {'diffuseColor': (.8, .8, .8), 'opacity': 1., 'tex': None, 'alpha': None, 'normal': None, 'bump': None, 'spec': None, 'sss': None, 'transparent': False}
    if not path or not os.path.exists(path): return m
    base = os.path.dirname(path)
    for ln in open(path, errors='ignore'):
        p = ln.split()
        if not p: continue
        k = p[0]
        if k == 'diffuseColor': m['diffuseColor'] = tuple(map(float, p[1:4]))
        elif k == 'opacity': m['opacity'] = float(p[1])
        elif k == 'diffuseTexture': m['tex'] = os.path.join(base, ' '.join(p[1:]))
        elif k == 'transparencyMapTexture': m['alpha'] = os.path.join(base, ' '.join(p[1:]))
        elif k == 'normalmapTexture': m['normal'] = os.path.join(base, ' '.join(p[1:]))
        elif k == 'bumpTexture': m['bump'] = os.path.join(base, ' '.join(p[1:]))
        elif k == 'specularmapTexture': m['spec'] = os.path.join(base, ' '.join(p[1:]))
        elif k == 'transparent': m['transparent'] = p[1].lower() == 'true'
        elif k == 'alphaToCoverage': m['transparent'] = m['transparent'] or p[1].lower() == 'true'
    return m

def build(mhclo_path, P, B, name, parent_fn=None):
    """returns (object, material-info). B: MH->Blender coord function."""
    cl = parse(mhclo_path); d = os.path.dirname(mhclo_path)
    V, UV, F, FU, G = read_obj(os.path.join(d, cl['obj_file']))
    # some proxies export the mesh with a different vertex count than the mhclo verts list (rare) -> trim
    n = len(cl['verts'])
    pos = fit(cl, P)
    F2 = []; U2 = []
    for f, u in zip(F, FU):
        if max(f) < n: F2.append(f); U2.append(u)
    me = bpy.data.meshes.new(name); me.from_pydata(B(pos).tolist(), [], F2); me.update()
    uvl = me.uv_layers.new(name='UV'); li = 0
    for f, u in zip(F2, U2):
        for k in range(len(f)): uvl.data[li].uv = UV[u[k]]; li += 1
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    mat = read_mat(os.path.join(d, cl.get('material', '')) if cl.get('material') else None)
    return ob, mat, cl

def image(path, nonc=False):
    im = bpy.data.images.load(path, check_existing=True)
    if nonc: im.colorspace_settings.name = 'Non-Color'
    return im
