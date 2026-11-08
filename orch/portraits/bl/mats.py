import bpy, numpy as np
def lin(c): return tuple(float(x) ** 2.2 for x in c)
def _n(nt, t, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    return m, nt, nt.nodes['Material Output']
def attr(nt, name):
    a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = name; return a.outputs['Color']
def mixrgb(nt, a, b, f, blend='MIX'):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend
    m.inputs[0].default_value = 1.0 if f is None else 0
    if f is not None: nt.links.new(f, m.inputs[0])
    for i, x in ((6, a), (7, b)):
        if hasattr(x, 'node'): nt.links.new(x, m.inputs[i])
        else: m.inputs[i].default_value = (*x, 1)
    return m.outputs[2]
def mathn(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    for i, x in enumerate((a, b)):
        if x is None: continue
        if hasattr(x, 'node'): nt.links.new(x, n.inputs[i])
        else: n.inputs[i].default_value = x
    return n.outputs[0]

def skin(tone, age, hcol=None, yellow=0., tex=None, tint=(1, 1, 1)):
    """tone 0 (pale) .. 1 (dark brown). returns material. vertex colour attrs: lips cheek nose eyes brow fore laugh"""
    m, nt, out = mat('skin'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    pale = np.array([.74, .55, .46]); dark = np.array([.30, .19, .14]); mid = np.array([.55, .38, .29])
    base = pale * (1 - tone) ** 1.5 + mid * 0 + dark * tone ** 1.2 if False else (pale + (mid - pale) * min(1, tone * 2) if tone < .5 else mid + (dark - mid) * (tone - .5) * 2)
    base = np.array(base) * (1 - yellow) + yellow * np.array(base) * np.array([1.0, 1.06, .98]) * (np.array([.98, 1.0, .82]) / 1.0)
    base = np.array(lin(base))
    tc = nt.nodes.new('ShaderNodeTexCoord'); 
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 5; nz.inputs['Detail'].default_value = 6; nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    col = mixrgb(nt, tuple(base * np.array([.9, .9, .92])), tuple(base * np.array([1.2, .95, .86])), nz.outputs['Fac'])
    blush = tuple(np.clip(base * np.array([1.12, .78, .72]), 0, 1))
    col = mixrgb(nt, col, blush, mathn(nt, 'MULTIPLY', attr(nt, 'cheek'), .55))
    col = mixrgb(nt, col, blush, mathn(nt, 'MULTIPLY', attr(nt, 'nose'), .45))
    shade = tuple(base * np.array([.72, .62, .66]))
    col = mixrgb(nt, col, shade, mathn(nt, 'MULTIPLY', attr(nt, 'eyes'), .5))
    hairc = tuple(np.array(lin(hcol)) if hcol else base * .3)
    col = mixrgb(nt, col, hairc, mathn(nt, 'MULTIPLY', attr(nt, 'under'), .8))
    col = mixrgb(nt, col, tuple(base * .12), mathn(nt, 'MULTIPLY', attr(nt, 'lid'), 1.0))
    lipc = tuple(np.clip(base * np.array([.92, .46, .46]), 0, 1))
    col = mixrgb(nt, col, lipc, mathn(nt, 'MULTIPLY', attr(nt, 'lips'), .9))
    if tex:   # real MakeHuman skin texture (pack): base colour from the photo-based map, tinted to the person's tone
        import mhclo
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = mhclo.image(tex); ti.interpolation = 'Cubic'
        uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UV'; nt.links.new(uvn.outputs[0], ti.inputs[0])
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        nt.links.new(ti.outputs['Color'], mul.inputs[6]); mul.inputs[7].default_value = (*tint, 1)
        col = mixrgb(nt, col, mul.outputs[2], mathn(nt, 'ADD', .94, 0))
        col = mixrgb(nt, col, hairc, mathn(nt, 'MULTIPLY', attr(nt, 'under'), .55))
        col = mixrgb(nt, col, lipc, mathn(nt, 'MULTIPLY', attr(nt, 'lips'), .18))
    # freckles/age spots
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 90; vor.feature = 'F1'; nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    spot = mathn(nt, 'LESS_THAN', vor.outputs['Distance'], .06 if age > 55 else 0.0)
    sp2 = mathn(nt, 'MULTIPLY', spot, nz.outputs['Fac'])
    col = mixrgb(nt, col, tuple(base * .62), mathn(nt, 'MULTIPLY', sp2, .55))
    nt.links.new(col, b.inputs['Base Color'])
    b.inputs['Subsurface Weight'].default_value = .55 - .25 * tone; b.inputs['Subsurface Scale'].default_value = .035
    b.inputs['Subsurface Radius'].default_value = (.8, .35, .22)
    b.inputs['Roughness'].default_value = .56; b.inputs['Specular IOR Level'].default_value = .2
    b.inputs['Coat Weight'].default_value = 0.0; b.inputs['Coat Roughness'].default_value = .3
    # bump: pores + fine noise + wrinkles
    pores = nt.nodes.new('ShaderNodeTexVoronoi'); pores.inputs['Scale'].default_value = 190; pores.feature = 'F1'; nt.links.new(tc.outputs['Object'], pores.inputs['Vector'])
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 330; fine.inputs['Detail'].default_value = 3; nt.links.new(tc.outputs['Object'], fine.inputs['Vector'])
    h = mathn(nt, 'ADD', mathn(nt, 'MULTIPLY', pores.outputs['Distance'], .6), mathn(nt, 'MULTIPLY', fine.outputs['Fac'], .5))
    # forehead lines: wave bands along height (Blender Z), distorted, masked
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 7
    wv.inputs['Distortion'].default_value = 3; wv.inputs['Detail'].default_value = 2; nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
    ag = max(0, (age - 35) / 70)
    wr = mathn(nt, 'MULTIPLY', mathn(nt, 'MULTIPLY', wv.outputs['Fac'], attr(nt, 'fore')), ag * 1.4)
    wr2 = mathn(nt, 'MULTIPLY', mathn(nt, 'MULTIPLY', fine.outputs['Fac'], attr(nt, 'laugh')), ag * .5)
    wr3 = mathn(nt, 'MULTIPLY', mathn(nt, 'MULTIPLY', fine.outputs['Fac'], attr(nt, 'eyes')), ag * 0.8)
    h = mathn(nt, 'ADD', h, mathn(nt, 'ADD', wr, mathn(nt, 'ADD', wr2, wr3)))
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .5; bp.inputs['Distance'].default_value = .006
    nt.links.new(h, bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m

def eye(iris, dark=False):
    m, nt, out = mat('eye'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    # front axis is local -Y. angle from front: acos(-y/r)
    r = nt.nodes.new('ShaderNodeVectorMath'); r.operation = 'LENGTH'; nt.links.new(tc.outputs['Object'], r.inputs[0])
    ny = mathn(nt, 'DIVIDE', mathn(nt, 'MULTIPLY', sep.outputs['Y'], -1), r.outputs['Value'])
    ang = mathn(nt, 'ARCCOSINE', mathn(nt, 'MINIMUM', ny, .999))
    pup = mathn(nt, 'LESS_THAN', ang, .14)
    irisf = mathn(nt, 'LESS_THAN', ang, .52)
    # iris radial fibres
    az = mathn(nt, 'ARCTAN2', sep.outputs['X'], sep.outputs['Z'])
    fib = nt.nodes.new('ShaderNodeTexNoise'); fib.inputs['Scale'].default_value = 7; fib.inputs['Detail'].default_value = 4; nt.links.new(tc.outputs['Object'], fib.inputs['Vector'])
    iris = np.array(lin(iris)); ic = mixrgb(nt, tuple(iris * .55), tuple(iris * 1.25), fib.outputs['Fac'])
    ring = mathn(nt, 'SMOOTH_MAX', mathn(nt, 'SUBTRACT', ang, .40), 0, False)
    ic = mixrgb(nt, ic, (.02, .02, .02), mathn(nt, 'MULTIPLY', mathn(nt, 'GREATER_THAN', ang, .45), 1.0))
    sc = lin((.86, .83, .80)) if not dark else lin((.80, .70, .62))
    col = mixrgb(nt, sc, ic, irisf)
    col = mixrgb(nt, col, (.005, .005, .005), pup)
    nt.links.new(col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .12; b.inputs['Coat Weight'].default_value = .4; b.inputs['Coat Roughness'].default_value = .05
    b.inputs['Specular IOR Level'].default_value = .8
    return m

def hair(color, melanin=.5, redness=.5, gray=0., rough=.35):
    m, nt, out = mat('hair'); h = nt.nodes.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'MELANIN'
    nt.links.new(h.outputs[0], out.inputs[0])
    hi = nt.nodes.new('ShaderNodeHairInfo')
    # per strand grey: melanin -> 0 for a random share
    gs = mathn(nt, 'LESS_THAN', hi.outputs['Random'], gray)
    mel = mathn(nt, 'ADD', mathn(nt, 'MULTIPLY', mathn(nt, 'SUBTRACT', 1.0, gs), melanin), mathn(nt, 'MULTIPLY', gs, .09))
    mel = mathn(nt, 'MULTIPLY', mel, mathn(nt, 'ADD', .75, mathn(nt, 'MULTIPLY', hi.outputs['Random'], .5)))
    nt.links.new(mel, h.inputs['Melanin']); h.inputs['Melanin Redness'].default_value = redness
    h.inputs['Roughness'].default_value = rough + .15; h.inputs['Radial Roughness'].default_value = .65; h.inputs['Coat'].default_value = 0.0
    h.inputs['Random Roughness'].default_value = .2; h.inputs['Random Color'].default_value = .25
    if gray > .3: h.inputs['Tint'].default_value = (.78, .78, .8, 1)
    return m

def cloth(color, rough=.8, sheen=.08, weave=0., bump=.22):
    m, nt, out = mat('cloth'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs['Base Color'].default_value = (*lin(color), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Sheen Weight'].default_value = sheen
    tc = nt.nodes.new('ShaderNodeTexCoord'); w = nt.nodes.new('ShaderNodeTexNoise'); w.inputs['Scale'].default_value = 420; w.inputs['Detail'].default_value = 2
    nt.links.new(tc.outputs['Object'], w.inputs['Vector'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = .004
    nt.links.new(w.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m
