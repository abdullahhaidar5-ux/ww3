"""Pack proxies -> Blender objects with materials (alpha-cut textures, tinted hair colour)."""
import bpy, numpy as np, os
import mhclo, mats
from mats import lin

def hair_mat(info, tint, rough=.45, sheen=.2, name='proxyhair', alpha_from_color=False, tint_amt=1.0):
    m, nt, out = mats.mat(name)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = rough
    try: b.inputs['Coat Weight'].default_value = 0.0; b.inputs['Sheen Weight'].default_value = sheen
    except Exception: pass
    col = (*lin(tint), 1)
    alpha_out = None
    if info.get('tex') and os.path.exists(info['tex']):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = mhclo.image(info['tex']); t.interpolation = 'Cubic'
        mulc = nt.nodes.new('ShaderNodeMix'); mulc.data_type = 'RGBA'; mulc.blend_type = 'MULTIPLY'
        mulc.inputs[0].default_value = tint_amt; mulc.inputs[6].default_value = (1, 1, 1, 1); nt.links.new(t.outputs['Color'], mulc.inputs[6]); mulc.inputs[7].default_value = col
        # tint: texture luminance modulates the hair colour
        bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(t.outputs['Color'], bw.inputs[0])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = 1.7; nt.links.new(bw.outputs[0], mm.inputs[0])
        mm2 = nt.nodes.new('ShaderNodeMix'); mm2.data_type = 'RGBA'; mm2.blend_type = 'MULTIPLY'; mm2.inputs[0].default_value = 1.0
        nt.links.new(mm.outputs[0], mm2.inputs[6]); mm2.inputs[7].default_value = col
        nt.links.new(mm2.outputs[2], b.inputs['Base Color'])
        alpha_out = t.outputs['Alpha']
    else:
        b.inputs['Base Color'].default_value = col
    if info.get('alpha') and os.path.exists(info['alpha']):
        ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = mhclo.image(info['alpha'], True); alpha_out = ta.outputs['Color']
    if alpha_out is not None:
        nt.links.new(alpha_out, b.inputs['Alpha'])
        m.blend_method = 'HASHED' if hasattr(m, 'blend_method') else None
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

def add(path, H, name, mat, scale=1.0, push=0.0):
    ob, info, cl = mhclo.build(path, H.Pfull, __import__('head').B, name)
    if push:
        pass
    ob.data.materials.append(mat)
    return ob, info

def cloth_mat(info, tint=None, rough=.7, sheen=.25, bump=.5, name='proxycloth', gain=1.0, base_col=None):
    """textured garment: pack diffuse (optionally multiplied by a linear tint) + the pack's bump/normal map"""
    m, nt, out = mats.mat(name)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = rough
    try: b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = .5
    except Exception: pass
    nt.links.new(b.outputs[0], out.inputs[0])
    uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UV'
    if info.get('tex') and os.path.exists(info['tex']):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = mhclo.image(info['tex']); nt.links.new(uvn.outputs[0], t.inputs[0])
        if tint is not None or gain != 1.0:
            mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
            nt.links.new(t.outputs['Color'], mul.inputs[6]); tt = tint if tint is not None else (1, 1, 1)
            mul.inputs[7].default_value = (tt[0] * gain, tt[1] * gain, tt[2] * gain, 1); nt.links.new(mul.outputs[2], b.inputs['Base Color'])
        else: nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    elif base_col is not None: b.inputs['Base Color'].default_value = (*lin(base_col), 1)
    if info.get('normal') and os.path.exists(info['normal']):
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = mhclo.image(info['normal'], True); nt.links.new(uvn.outputs[0], tn.inputs[0])
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = bump; nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    return m
