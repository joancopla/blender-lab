# Renders the images of the turntable pill (src/pills/blender/turntable/).
#
# Run from a live Blender 5.1 session: exec this file, then call main(). It rebuilds the
# finished scene of the speaker pill (which rebuilds the neon one) without images, and then
# models the turntable with Blender's own operators. Same kind of images as the speaker
# pill: Workbench (Solid) with the Edit Mode cage, and EEVEE through the camera at the end.
# Output: img/sNN.webp and frames.json.
import importlib.util, json, math, os
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None

PLATTER = dict(vertices=32, radius=0.95, depth=0.06, location=(-0.4, 0, 0.3))
# Rim, four grooves and the label. No spindle: its spokes would turn the centre into a blob
# of Wireframe in the neon render.
GROOVES = [("I", 0.06)] + [("I", 0.15)] * 3 + [("I", 0.2)]
PIVOT = dict(vertices=16, radius=0.1, depth=0.2, location=(0.95, 0.7, 0.37))
ARM = dict(vertices=12, radius=0.025, depth=1.3, location=(0.58, 0.17, 0.42),
           rotation=(math.radians(90), 0, math.radians(-35)))
HEAD = [("E", 0.04), ("S", 2.4), ("E", 0.16)]
TURN = 45


def load_file(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(out):
    sp = load_file("pill_speaker", os.path.join(HERE, "..", "speaker", "render_all.py"))
    jl = sp.load("jack_lib", "minijack")
    cage = load_file("pill_cage", os.path.join(HERE, "..", "common", "cage.py"))
    made = sp.build(None)
    s = made["scene"]
    sc = s.sc
    sh = sp.Shots(jl, cage, s, out)
    edit, object_mode, select_face, run_ops, select_only = (
        sp.edit, sp.object_mode, sp.select_face, sp.run_ops, sp.select_only)

    near = (Vector((0, 0, 0.3)), Vector((0.6, -1.4, 1.3)), 1.9)
    top = (Vector((-0.4, 0, 0.3)), Vector((0.35, -0.8, 1.6)), 1.15)
    arm_view = (Vector((0.55, 0.15, 0.4)), Vector((0.9, -1.2, 1.0)), 1.0)
    overview = (Vector((0, 0, 0.8)), Vector((0.55, -1.5, 1.0)), 6.5)

    # 1. Solid, delete the neon cube in the middle.
    bpy.data.objects.remove(made["cube"])
    sh.solid(overview)

    # 2. The base: a cube resized in Edit Mode, then up to the floor.
    with s.ctx():
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
    base = bpy.context.active_object
    base.name = "Cube"  # the neon cube is gone, so Blender gives the new one its name
    base.color = (0.8, 0.8, 0.8, 1)
    edit(s, base, "VERT")
    with s.ctx():
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.transform.resize(value=(1.5, 1, 1))
        bpy.ops.transform.resize(value=(1, 1.1, 1))
        bpy.ops.transform.resize(value=(1, 1, 0.15))
    object_mode(s)
    base.location.z = 0.15
    sh.solid(near, edit=base)

    # 3. The top: inset and push it in.
    edit(s, base)
    select_face(base, Vector((0, 0, 1)))
    run_ops(s, base, [("I", 0.08), ("E", -0.03)])
    object_mode(s)
    sh.solid(near, edit=base)

    # 4. The platter: a 64-sided cylinder on the top.
    with s.ctx():
        bpy.ops.mesh.primitive_cylinder_add(**PLATTER)
    platter = bpy.context.active_object
    platter.name = "Cylinder.004"  # after the four cylinders of the speakers
    platter.color = (0.8, 0.8, 0.8, 1)
    sh.solid(near)

    # 5. Grooves, label and spindle: insets on the top cap, and the spindle up.
    edit(s, platter)
    select_face(platter, Vector((0, 0, 1)))
    run_ops(s, platter, GROOVES)
    object_mode(s)
    sh.solid(top, edit=platter)

    # 6. Neon: the base gets "Neó cian" and a Wireframe; Ctrl+L copies both to the platter.
    base.data.materials.append(bpy.data.materials.get("Neó cian"))
    base.modifiers.new("Wireframe", "WIREFRAME")
    with s.ctx():
        select_only(platter, base, active=base)
        bpy.ops.object.make_links_data(type="MATERIAL")
        bpy.ops.object.make_links_data(type="MODIFIERS")
    sh.solid(near)

    # 7. The arm's pivot.
    with s.ctx():
        bpy.ops.mesh.primitive_cylinder_add(**PIVOT)
    pivot = bpy.context.active_object
    pivot.name = "Cylinder.005"
    pivot.color = (0.8, 0.8, 0.8, 1)
    sh.solid(arm_view)

    # 8. The arm: a thin cylinder lying over the record, and the headshell at its end.
    with s.ctx():
        bpy.ops.mesh.primitive_cylinder_add(**ARM)
    arm = bpy.context.active_object
    arm.name = "Cylinder.006"
    arm.color = (0.8, 0.8, 0.8, 1)
    edit(s, arm)
    d = Vector((math.sin(math.radians(-35)), -math.cos(math.radians(-35)), 0))
    select_face(arm, d)
    run_ops(s, arm, HEAD)
    object_mode(s)
    sh.solid(arm_view, edit=arm)

    # 9. Orange neon for the arm, then Ctrl+L to the pivot.
    arm.data.materials.append(bpy.data.materials.get("Neó taronja"))
    arm.modifiers.new("Wireframe", "WIREFRAME")
    with s.ctx():
        select_only(pivot, arm, active=arm)
        bpy.ops.object.make_links_data(type="MATERIAL")
        bpy.ops.object.make_links_data(type="MODIFIERS")
    sh.solid(arm_view)

    # 10. Parent everything to the base and turn it to face the camera.
    with s.ctx():
        select_only(platter, pivot, arm, base, active=base)
        bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
    base.rotation_euler = (0, 0, math.radians(TURN))
    sh.solid(near)

    # 11. Rendered through the camera.
    sh.rendered()

    if out is not None:
        with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as fh:
            json.dump(sh.frames, fh, separators=(",", ":"))
    made.update({"turntable": (base, platter, pivot, arm)})
    return made


def main(here=HERE, out=None):
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "turntable"))
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    win = bpy.context.window
    old = win.scene
    try:
        build(out)
    finally:
        win.scene = old
    print("turntable pill rendered to", out)
