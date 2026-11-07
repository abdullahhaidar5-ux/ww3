"""portrait(spec) -> renders one painted-style source frame. spec keys: see people spec builder (orch/portraits/spec.py)."""
import bpy, numpy as np, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import mh, scene, head, mats, compose, clothes, strands
from compose import *
from mathutils import Vector

HAIR = {  # name -> (melanin, redness)
 'black': (.95, .2), 'dkbrown': (.7, .35), 'brown': (.5, .45), 'auburn': (.4, .8), 'blond': (.12, .3), 'gray': (.0, 0.), 'white': (0., 0.)}

def render(spec, out, res=(420, 525), samples=24):
    sc = scene.reset(); scene.world(sc, (.02, .02, .022))
    sc.render.resolution_x, sc.render.resolution_y = res; sc.cycles.samples = samples
    rng = np.random.default_rng(spec['seed'])
    H = head.build(spec['body'])
    ob = H.ob; tone = spec['tone']; age = spec['body']['age']
    mel, red = HAIR[spec['hair']['col']]
    hcol_rgb = {'black': (.06, .05, .05), 'dkbrown': (.16, .1, .07), 'brown': (.3, .18, .1), 'auburn': (.4, .17, .08), 'blond': (.62, .5, .3), 'gray': (.5, .5, .5), 'white': (.75, .75, .73)}[spec['hair']['col']]
    gr = spec['hair'].get('gray', 0.); hcol_rgb = tuple(np.array(hcol_rgb) * (1 - gr) + np.array((.55, .55, .55)) * gr)
    ob.data.materials.append(mats.skin(tone, age, hcol_rgb, spec.get('yellow', 0.)))
    s = ob.modifiers.new('s', 'SUBSURF'); s.levels = 1; s.render_levels = 2
    S = Surf(H); H._S = S
    hc = mats.hair(None, mel, red, spec['hair'].get('gray', 0.))
    hs = spec['hair']
    if hs.get('style') != 'bald' and spec.get('headgear') not in ('turban', 'ghutra'):
        st = dict(hs); 
        if spec.get('headgear') in ('cap_peaked', 'beret'): st['len_top'] = min(st['len_top'], .12); st['count'] = int(st.get('count', 26000) * .5)
        add_hair(H, S, st, rng, hc)
    add_brows(H, S, rng, hc, thick=spec.get('brow', 1.), tilt=spec.get('browtilt', 0.))
    if spec.get('beard'): add_beard(H, S, spec['beard'], rng, hc)
    for nme, v in (('under', H.m_under), ('lid', H.m_lid), ('lips', H.m_lips), ('cheek', H.m_cheek), ('nose', H.m_nose), ('eyes', H.m_eyes), ('brow', H.m_brow), ('fore', H.m_fore), ('laugh', H.m_laugh)): head.set_color_attr(ob, nme, v)
    add_eyes(H, spec.get('iris', (.25, .16, .08)), dark=tone > .45, look=(-.32 * (1 if spec.get('yaw', -24) > 0 else -1), -1, .0))
    # clothing
    cl = spec['cloth']; kind = cl['kind']
    c1 = mats.cloth(cl['col']); c2 = mats.cloth(cl.get('col2', (.8, .8, .78)), rough=.6)
    if kind == 'suit':
        j, P, b = clothes.shell(H, 'jacket', c1, .075, H.chinY - .35, slope=2.6, vdepth=.95, vwid=.75)
        sh, P2, b2 = clothes.shell(H, 'shirt', c2, .045, H.chinY - .08, slope=3.4, vdepth=.6, vwid=.5)
        clothes.rim_tube(P2, b2, c2, .025, zmax=H.chinY - 1)
        clothes.rim_tube(P, b, c1, .03, zmax=H.chinY - 1)
        if cl.get('tie') is not None:
            tc = mats.cloth(cl['tie'], rough=.4, sheen=.6)
            z1 = H.chinY - .62; clothes.strip_on_surface(H, 'tie', tc, [(0, z1 - .0 - k * .22, .09 + .035 * (k > 2) * (k - 2)) for k in range(8)], 1, off=.07)
    elif kind == 'tunic':
        j, P, b = clothes.shell(H, 'tunic', c1, .08, H.chinY - .08, slope=1.2, vdepth=0)
        clothes.rim_tube(P, b, c1, .045, zmax=H.chinY - 1)
        clothes.rim_tube(P, b, c1, .045)
    elif kind == 'robe':
        j, P, b = clothes.shell(H, 'robe', c1, .13, H.chinY - .45, slope=2.2, vdepth=.9, vwid=.6)
        u, Pu, bu = clothes.shell(H, 'under', c2, .06, H.chinY - .12, slope=3.0, vdepth=.5, vwid=.4)
        clothes.rim_tube(Pu, bu, c2, .03, zmax=H.chinY - 1)
        clothes.rim_tube(P, b, c1, .05, zmax=H.chinY - 1)
    hg = spec.get('headgear')
    if hg == 'turban':
        clothes.turban(H, mats.cloth(spec['hat'], rough=.9, sheen=.5, bump=.3), rng)
    elif hg == 'cap_peaked':
        clothes.peaked_cap(H, mats.cloth(spec['hat'], rough=.7), mats.cloth((.03, .03, .03), rough=.4), mats.cloth((.7, .55, .12), rough=.3), rng)
    elif hg == 'ghutra':
        clothes.ghutra(H, mats.cloth(spec['hat'], rough=.85, sheen=.4, bump=.2), mats.cloth((.02, .02, .02), rough=.5), rng)
    elif hg == 'beret':
        clothes.beret(H, mats.cloth(spec['hat'], rough=.95, bump=.25), rng=rng)
    if spec.get('epaulettes'): clothes.epaulettes(H, mats.cloth((.12, .12, .1)), mats.cloth((.8, .62, .2), rough=.3), spec['epaulettes'])
    # pose: rotate everything about Z (3/4 view)
    emp = bpy.data.objects.new('rig', None); bpy.context.collection.objects.link(emp)
    for o in list(bpy.data.objects):
        if o.type in ('MESH', 'CURVES', 'CURVE'): o.parent = emp
    emp.rotation_euler = (0, 0, math.radians(spec.get('yaw', -24)))
    cz = H.top - 1.75
    scene.camera((0, -9.8, cz), (0, 0, cz), 85)
    ks = -1 if spec.get('yaw', -24) > 0 else 1
    scene.area('key', (ks * 6.5, -5.5, cz + 4.0), (0, 0, cz), 2300, 3.0, (1, .94, .86))
    scene.area('fill', (-ks * 6, -7, cz - .5), (0, 0, cz), 120, 7, (.75, .85, 1))
    scene.area('rim', (-ks * 4.5, 3.5, cz + 2.5), (0, 0, cz), 1500, 3, (.85, .92, 1))
    sc.render.film_transparent = True; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = out; bpy.ops.render.render(write_still=True)
    return H
