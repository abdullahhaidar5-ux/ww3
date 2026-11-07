import bpy, math, numpy as np
from mathutils import Vector
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.render.resolution_x = 560; sc.render.resolution_y = 700
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.15
    sc.render.film_transparent = False
    return sc
def world(sc, col=(.06, .05, .045)):
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*col, 1); w.node_tree.nodes['Background'].inputs[1].default_value = .6
def area(name, loc, target, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color; l.specular_factor = 1.0 if name == 'key' else 0.0
    o = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(o); o.location = loc
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
def camera(loc, target, lens=85):
    c = bpy.data.cameras.new('cam'); c.lens = lens; o = bpy.data.objects.new('cam', c); bpy.context.collection.objects.link(o)
    o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = o; return o
