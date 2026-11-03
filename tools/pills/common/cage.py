# Edit Mode look for pill images, for any mesh object: the cage edges as thin black tubes,
# the selected edges in orange and the selected faces in light orange, so a Workbench
# render shows them with the right occlusion. Colours as in tools/pills/minijack/jack_lib.py.
#
# Use it in Object Mode (the selection flags are stored in the mesh when leaving Edit Mode):
#   objs = cage.build(scene, ob, px)   ...render...   cage.clear(scene)
import bmesh, bpy
from mathutils import Vector

WIRE = (0.0, 0.0, 0.0, 1)
SEL = (1.0, 0.45, 0.0, 1)
FACE = (1.0, 0.66, 0.36, 1)
NAMES = ("CageWires", "CageSel", "CageFaces")


def _tubes(name, segments, width):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = width
    cu.bevel_resolution = 0
    for a, b in segments:
        sp = cu.splines.new("POLY")
        sp.points.add(1)
        sp.points[0].co = (*a, 1)
        sp.points[1].co = (*b, 1)
    return cu


def _object(sc, name, data, color, matrix):
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = bpy.data.objects.new(name, data)
    else:
        old = ob.data
        ob.data = data
        if old is not None and old.users == 0:
            (bpy.data.curves if isinstance(old, bpy.types.Curve) else bpy.data.meshes).remove(old)
    if ob.name not in sc.collection.objects:
        sc.collection.objects.link(ob)
    ob.matrix_world = matrix
    ob.color = color
    ob.hide_render = False
    return ob


def build(sc, ob, px, lift=0.002):
    """Cage of `ob` (its mesh, before modifiers). `px` is the size of one image pixel in
    metres at the object, so the lines keep the same width in every image."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    s = max(ob.matrix_world.to_scale())
    w = px / s
    co = lambda v: tuple(v.co)
    wires = [(co(e.verts[0]), co(e.verts[1])) for e in bm.edges]
    sel = [(co(e.verts[0]), co(e.verts[1])) for e in bm.edges if e.select]
    fm = bpy.data.meshes.new("CageFaces")
    fb = bmesh.new()
    for f in bm.faces:
        if f.select:
            n = f.normal * (lift / s)
            fb.faces.new([fb.verts.new(v.co + n) for v in f.verts])
    fb.to_mesh(fm)
    fb.free()
    bm.free()
    m = ob.matrix_world
    return [
        _object(sc, "CageWires", _tubes("CageWires", wires, w * 0.55), WIRE, m),
        _object(sc, "CageSel", _tubes("CageSel", sel, w * 0.9), SEL, m),
        _object(sc, "CageFaces", fm, FACE, m),
    ]


def clear(sc):
    for name in NAMES:
        ob = bpy.data.objects.get(name)
        if ob is not None:
            ob.hide_render = True
