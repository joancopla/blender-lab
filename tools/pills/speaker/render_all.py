# Renders the images of the speaker pill (src/pills/blender/speaker/).
#
# Run from a live Blender 5.1 session: exec this file, then call main(). It rebuilds the
# finished scene of the neon look pill (tools/pills/neon/render_all.py) without images, and
# then models the speakers with Blender's own operators, so every step shows what the
# student gets. Modelling steps: Workbench (Solid) with the Edit Mode cage from
# tools/pills/common/cage.py; the last step: EEVEE through the camera with the bloom.
# Output: img/sNN.webp and frames.json (viewport header and grid of each step).
import importlib, importlib.util, json, math, os, sys
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None

BOX_X = -4.0
LEFT = (-2, -2, 1)          # final places, on both sides of the camera
RIGHT = (2, 2, 1)
TURN = 45
FRONT = -0.46               # baffle after the inset and the extrusion inwards
WOOFER = dict(vertices=32, radius=0.4, depth=0.06, location=(BOX_X, -0.49, 0.75),
              rotation=(math.radians(90), 0, 0))
CONE = [("I", 0.04), ("E", 0.015), ("I", 0.02), ("E", -0.05), ("S", 0.45), ("E", 0.03), ("S", 0.7)]


def load(name, sub):
    path = os.path.normpath(os.path.join(HERE, "..", sub))
    if path not in sys.path:
        sys.path.insert(0, path)
    return importlib.reload(importlib.import_module(name))


def load_file(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Shots:
    """Renders each step: Workbench (Solid) with the cage, or EEVEE through the camera."""

    def __init__(self, jl, cage, s, out):
        self.jl, self.cage, self.s, self.out = jl, cage, s, out
        self.sc = s.sc
        self.frames = []
        self.n = 0
        cam = bpy.data.objects.new("PillSpeakerCam", bpy.data.cameras.new("PillSpeakerCam"))
        self.sc.collection.objects.link(cam)
        self.view_cam = cam
        self.scene_cam = self.sc.camera

    def look(self, target, d, R):
        cam = self.view_cam
        cam.data.lens, cam.data.sensor_width = 50, 36
        cam.data.clip_start, cam.data.clip_end = 0.01, 200
        aspect = self.jl.RES[0] / self.jl.RES[1]
        fov_v = 2 * math.atan(math.tan(math.atan(18 / 50)) / aspect)
        dist = R / math.sin(fov_v / 2)
        self.jl.look_at(cam, target + d.normalized() * dist, target, Vector((0, 0, 1)))
        return 2 * dist * math.tan(math.atan(18 / 50)) / self.jl.RES[0]

    def solid(self, view, edit=None):
        """A Solid viewport image; `edit` is the object in Edit Mode, if any."""
        sc = self.sc
        self.n += 1
        saved = (sc.render.engine, sc.render.resolution_x, sc.render.resolution_y,
                 sc.render.resolution_percentage, sc.view_settings.view_transform)
        self.jl.setup_render(sc)
        sc.display.shading.color_type = "OBJECT"
        sc.display.shading.show_object_outline = False
        sc.camera = self.view_cam
        px = self.look(*view)
        if edit is not None:
            self.cage.build(sc, edit, px)
        sc.render.filepath = os.path.join(self.out, "img", f"s{self.n:02d}.webp")
        bpy.ops.render.render(write_still=True, scene=sc.name)
        self.cage.clear(sc)
        self.frames.append({
            "header": "User Perspective",
            "grid": [[g["kind"], " ".join(f"{round(x)},{round(y)}" for x, y in g["pts"])]
                     for g in self.jl.grid_lines(sc, self.view_cam, "persp")],
        })
        sc.camera = self.scene_cam
        (sc.render.engine, sc.render.resolution_x, sc.render.resolution_y,
         sc.render.resolution_percentage, sc.view_settings.view_transform) = saved
        sc.render.film_transparent = False
        sc.render.image_settings.color_mode = "RGB"

    def rendered(self):
        """Rendered through the scene camera (EEVEE, compositor with the bloom)."""
        sc = self.sc
        self.n += 1
        sc.camera = self.scene_cam
        try:
            sc.render.engine = "BLENDER_EEVEE"
        except TypeError as e:
            print(e)
        sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
        sc.render.resolution_percentage = 60
        sc.render.film_transparent = False
        sc.view_settings.view_transform = "Standard"
        im = sc.render.image_settings
        im.file_format, im.color_mode, im.quality = "WEBP", "RGB", 88
        sc.render.filepath = os.path.join(self.out, "img", f"s{self.n:02d}.webp")
        bpy.ops.render.render(write_still=True, scene=sc.name)
        self.frames.append({"header": "Camera Perspective", "grid": []})


def edit(s, ob, select_mode="FACE"):
    with s.ctx():
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_mode(type=select_mode)


def object_mode(s):
    with s.ctx():
        bpy.ops.object.mode_set(mode="OBJECT")


def select_face(ob, normal):
    """Click on the face whose normal is closest to `normal` (world)."""
    import bmesh
    bm = bmesh.from_edit_mesh(ob.data)
    for f in bm.faces:
        f.select_set(False)
    rot = ob.matrix_world.to_3x3()
    best = max(bm.faces, key=lambda f: (rot @ f.normal).normalized().dot(normal) + 1e-3 * f.calc_area())
    best.select_set(True)
    bmesh.update_edit_mesh(ob.data)


def face_normal(ob):
    import bmesh
    bm = bmesh.from_edit_mesh(ob.data)
    f = next(f for f in bm.faces if f.select)
    return (ob.matrix_world.to_3x3() @ f.normal).normalized()


def run_ops(s, ob, ops):
    """I / E / S on the selected face, as the student types them."""
    with s.ctx():
        for op, v in ops:
            if op == "I":
                bpy.ops.mesh.inset(thickness=v, depth=0)
            elif op == "E":
                n = face_normal(ob)
                bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value": tuple(n * v), "orient_type": "GLOBAL"})
            elif op == "S":
                bpy.ops.transform.resize(value=(v, v, v))


def select_only(*obs, active=None):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or obs[-1]


def build(out):
    jl = load("jack_lib", "minijack")
    cage = load_file("pill_cage", os.path.join(HERE, "..", "common", "cage.py"))
    neon = load_file("pill_neon", os.path.join(HERE, "..", "neon", "render_all.py"))
    made = neon.build(None)
    s = made["scene"]
    sc = s.sc
    sh = Shots(jl, cage, s, out)
    for o in sc.objects:
        o.color = (0.8, 0.8, 0.8, 1)

    near = lambda z=1.0, R=1.6: (Vector((BOX_X, -0.4, z)), Vector((0.9, -1.6, 0.7)), R)
    front = lambda z, R: (Vector((BOX_X, -0.5, z)), Vector((0.35, -1.6, 0.35)), R)

    # 1. Solid, delete the torus.
    bpy.data.objects.remove(made["torus"])
    sh.solid((Vector((0, 0, 0.8)), Vector((0.55, -1.5, 1.0)), 6.5))

    # 2. Cube, moved to the side and resized in Edit Mode.
    with s.ctx():
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
    box = bpy.context.active_object
    box.name = "Cube.001"
    box.color = (0.8, 0.8, 0.8, 1)
    box.location = (BOX_X, 0, 1)
    edit(s, box)
    with s.ctx():
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.transform.resize(value=(0.6, 1, 1))
        bpy.ops.transform.resize(value=(1, 0.5, 1))
    object_mode(s)
    sh.solid(near(1.0, 1.7), edit=box)

    # 3. Front face: inset and push it in.
    edit(s, box)
    select_face(box, Vector((0, -1, 0)))
    run_ops(s, box, [("I", 0.06), ("E", -0.04)])
    object_mode(s)
    sh.solid(near(1.0, 1.7), edit=box)

    # 4. The woofer: a 32-sided cylinder in front of the baffle.
    with s.ctx():
        bpy.ops.mesh.primitive_cylinder_add(**WOOFER)
    woofer = bpy.context.active_object
    woofer.color = (0.8, 0.8, 0.8, 1)
    sh.solid((Vector((BOX_X, -0.5, 0.75)), Vector((1.1, -1.3, 0.8)), 0.8))  # from the side: its thickness shows

    # 5. The cone: inset, extrude and scale the front cap.
    edit(s, woofer)
    select_face(woofer, Vector((0, -1, 0)))
    run_ops(s, woofer, CONE)
    object_mode(s)
    sh.solid(front(0.75, 0.75), edit=woofer)

    # 6. Neon for the woofer: the orange material and a Wireframe.
    orange = bpy.data.materials.get("Neó taronja")
    woofer.data.materials.append(orange)
    woofer.modifiers.new("Wireframe", "WIREFRAME")
    sh.solid(front(0.75, 0.75))

    # 7. The tweeter: Shift+D, Z 0.8, S 0.4.
    with s.ctx():
        select_only(woofer)
        bpy.ops.object.duplicate_move(TRANSFORM_OT_translate={"value": (0, 0, 0.8)})
        bpy.ops.transform.resize(value=(0.4, 0.4, 0.4))
    tweeter = bpy.context.active_object
    sh.solid(front(1.1, 1.2))

    # 8. Neon for the box: "Neó cian" and a Wireframe.
    box.data.materials.append(bpy.data.materials.get("Neó cian"))
    box.modifiers.new("Wireframe", "WIREFRAME")
    with s.ctx():
        select_only(box)
    sh.solid(near(1.0, 1.7))

    # 9. Parent the cones to the box, then place the box in the N panel: to the left of the
    #    camera, turned to face it.
    with s.ctx():
        select_only(woofer, tweeter, box, active=box)
        bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
    box.location = LEFT
    box.rotation_euler = (0, 0, math.radians(TURN))
    overview = (Vector((0, 0, 0.8)), Vector((0.55, -1.5, 1.0)), 6.5)
    sh.solid(overview)

    # 10. The second speaker: Shift+D, right click, and its place in the N panel.
    with s.ctx():
        select_only(woofer, tweeter, box, active=box)
        bpy.ops.object.duplicate_move(TRANSFORM_OT_translate={"value": (0, 0, 0)})
    box2 = bpy.context.view_layer.objects.active
    box2.location = RIGHT
    sh.solid(overview)

    # 11. Rendered through the camera.
    sh.rendered()

    with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as fh:
        json.dump(sh.frames, fh, separators=(",", ":"))
    return {"scene": s, "speakers": (box, woofer, tweeter)}


def main(here=HERE, out=None):
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "speaker"))
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    win = bpy.context.window
    old = win.scene
    try:
        build(out)
    finally:
        win.scene = old
    print("speaker pill rendered to", out)
