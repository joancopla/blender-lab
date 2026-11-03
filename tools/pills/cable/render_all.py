# Renders the images of the cable pill (src/pills/blender/cable/).
#
# Run from a live Blender 5.1 session (the curve operators need a 3D viewport): exec this
# file, then call main(). It builds its own scene "PillCable" and leaves the user's alone.
#
# The curve is made with Blender's own operators (Add Bézier, Extrude, Set Handle Type,
# Resize, Move), so every step shows what the student gets. What Blender draws on top in
# the viewport (the curve line, control points and handles) goes to frames.json and the
# page draws it over the image. Output: img/sNN.webp and frames.json.
import importlib, json, math, os, sys
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None

# Blender 5.1 factory theme (sRGB): Theme ▸ Common ▸ Curves and 3D Viewport.
WIRE_EDIT = "#000000"
VERTEX = "#000000"
VERTEX_SEL = "#ff7a00"
HANDLE_VERTEX = "#000000"
HANDLE_VERTEX_SEL = "#ff8500"
HANDLE_SEL = {"AUTO": "#ff1900", "ALIGNED": "#72ff57", "VECTOR": "#4444ff", "FREE": "#ffc300"}
HANDLE = {"AUTO": "#740d00", "ALIGNED": "#157000", "VECTOR": "#232374", "FREE": "#745900"}
OBJECT_ACTIVE = "#ffa028"

RADIUS = 0.03            # Bevel Depth
LIFT = 2 * RADIUS        # the crossing point goes up one cable diameter
CABLE_HEX = "1B1B1D"
LENS = 100
EXTRUDES = [(0, 1.2, 0), (-1, 0, 0), (0, -1.2, 0), (0, -1, 0), (-1.5, 0, 0)]

# Cameras: (target, eye direction, framing radius).
WIDE = (Vector((-0.2, 0.1, 0)), Vector((0.55, -1.5, 1.7)), 2.0)
LOW = (Vector((0.05, -0.05, 0.03)), Vector((1.3, -1.6, 0.55)), 0.75)


def jack_lib():
    path = os.path.join(HERE, "..", "minijack")
    if path not in sys.path:
        sys.path.insert(0, path)
    import jack_lib as jl
    return importlib.reload(jl)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_color(h):
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


class Builder:
    def __init__(self):
        self.win = bpy.context.window
        self.sc = bpy.data.scenes.get("PillCable") or bpy.data.scenes.new("PillCable")
        for o in list(self.sc.objects):
            bpy.data.objects.remove(o)
        self.area = next(a for a in self.win.screen.areas if a.type == "VIEW_3D")
        self.region = next(r for r in self.area.regions if r.type == "WINDOW")
        self.ob = None

    def ctx(self):
        return bpy.context.temp_override(window=self.win, area=self.area, region=self.region,
                                         scene=self.sc)

    def points(self):
        return self.ob.data.splines[0].bezier_points

    def select_only(self, i):
        bpy.ops.curve.select_all(action="DESELECT")
        p = self.points()[i]
        p.select_control_point = p.select_left_handle = p.select_right_handle = True


def bezier_polyline(ob, res):
    mw = ob.matrix_world
    pts = ob.data.splines[0].bezier_points
    out = [mw @ pts[0].co]
    for a, b in zip(pts[:-1], pts[1:]):
        p0, p1, p2, p3 = a.co, a.handle_right, b.handle_left, b.co
        for k in range(1, res + 1):
            t = k / res
            u = 1 - t
            out.append(mw @ (u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3))
    return out


def overlay(sc, cam, ob, edit):
    W, H = 1200, 1080

    def px(v):
        c = world_to_camera_view(sc, cam, v)
        return f"{round(c.x * W, 1)},{round((1 - c.y) * H, 1)}"

    line = " ".join(px(v) for v in bezier_polyline(ob, ob.data.resolution_u))
    if not edit:
        return [["l", OBJECT_ACTIVE, 2, line]]
    items = [["l", WIRE_EDIT, 2, line]]
    mw = ob.matrix_world
    pts = ob.data.splines[0].bezier_points
    dots = []
    for p in pts:
        if p.select_control_point:
            for h, t, s in ((p.handle_left, p.handle_left_type, p.select_left_handle),
                            (p.handle_right, p.handle_right_type, p.select_right_handle)):
                col = (HANDLE_SEL if s else HANDLE)[t]
                items.append(["l", col, 2, f"{px(mw @ p.co)} {px(mw @ h)}"])
                dots.append(["d", HANDLE_VERTEX_SEL if s else HANDLE_VERTEX, 4, px(mw @ h)])
    for p in pts:
        dots.append(["d", VERTEX_SEL if p.select_control_point else VERTEX, 5, px(mw @ p.co)])
    return items + dots


def camera(jl, sc, view):
    cam = bpy.data.objects.get("PillCableCam")
    if cam is None:
        cam = bpy.data.objects.new("PillCableCam", bpy.data.cameras.new("PillCableCam"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    sc.camera = cam
    target, d, R = view
    cam.data.type, cam.data.lens, cam.data.sensor_width = "PERSP", 50, 36
    cam.data.clip_start, cam.data.clip_end = 0.01, 200
    aspect = jl.RES[0] / jl.RES[1]
    fov_v = 2 * math.atan(math.tan(math.atan(18 / 50)) / aspect)
    jl.look_at(cam, target + d.normalized() * (R / math.sin(fov_v / 2)), target, Vector((0, 0, 1)))
    return cam


def render(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)


def shot(jl, b, out, n, view, edit, frames):
    """Render step n in Workbench (transparent) and store its grid and overlay."""
    sc = b.sc
    jl.setup_render(sc)
    sc.display.shading.color_type = "MATERIAL"
    cam = camera(jl, sc, view)
    was_edit = b.ob.mode == "EDIT"
    with b.ctx():
        if was_edit:
            bpy.ops.object.mode_set(mode="OBJECT")
        render(sc, os.path.join(out, "img", f"s{n:02d}.webp"))
        frames.append({
            "header": "User Perspective",
            "grid": [[g["kind"], " ".join(f"{round(x)},{round(y)}" for x, y in g["pts"])]
                     for g in jl.grid_lines(sc, cam, "persp")],
            "overlay": overlay(sc, cam, b.ob, edit) if (edit or b.ob.data.bevel_depth == 0) else [],
        })
        if was_edit:
            bpy.ops.object.mode_set(mode="EDIT")


def final_render(b, out, n):
    """F12 with the factory startup camera, light and World (the student's own scene)."""
    sc = b.sc
    cam = bpy.data.objects.get("Camera.factory")
    if cam is None:
        cam = bpy.data.objects.new("Camera.factory", bpy.data.cameras.new("Camera.factory"))
        sc.collection.objects.link(cam)
    cam.location = (7.3589, -6.9258, 4.9583)
    cam.rotation_euler = (math.radians(63.559), 0, math.radians(46.692))
    cam.data.lens = LENS  # the student changes it from 50 mm in the last step
    sc.camera = cam
    light = bpy.data.objects.get("Light.factory")
    if light is None:
        light = bpy.data.objects.new("Light.factory", bpy.data.lights.new("Light.factory", "POINT"))
        sc.collection.objects.link(light)
    light.location = (4.0762, 1.0055, 5.9039)
    light.data.energy, light.data.shadow_soft_size = 1000, 0.1
    w = bpy.data.worlds.get("PillCableWorld") or bpy.data.worlds.new("PillCableWorld")
    w.use_nodes = True
    bg = next(nd for nd in w.node_tree.nodes if nd.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.0509, 0.0509, 0.0509, 1)
    bg.inputs["Strength"].default_value = 1
    sc.world = w
    try:
        sc.render.engine = "BLENDER_EEVEE"
    except TypeError as e:
        print(e)
    sc.eevee.taa_render_samples = 64
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 60
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "None"
    s = sc.render.image_settings
    s.file_format, s.color_mode, s.quality = "WEBP", "RGB", 88
    render(sc, os.path.join(out, "img", f"s{n:02d}.webp"))


def main(here=HERE, out=None):
    win = bpy.context.window
    old = win.scene
    try:
        build(here, out)
    finally:
        win.scene = old


def build(here, out):
    jl = jack_lib()
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "cable"))
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    b = Builder()
    b.win.scene = b.sc  # the operators add to the window's scene
    frames = []
    with b.ctx():
        # 1. Delete the cube (the factory scene) and add a Bézier curve.
        bpy.ops.curve.primitive_bezier_curve_add(location=(0, 0, 0))
        b.ob = bpy.context.active_object
    shot(jl, b, out, 1, WIDE, False, frames)
    with b.ctx():
        # 2. Tab: both points selected, with their handles.
        bpy.ops.object.mode_set(mode="EDIT")
    shot(jl, b, out, 2, WIDE, True, frames)
    with b.ctx():
        # 3. Click the right end point.
        b.select_only(1)
    shot(jl, b, out, 3, WIDE, True, frames)
    with b.ctx():
        # 4. Five extrusions.
        for v in EXTRUDES:
            bpy.ops.curve.extrude_move(TRANSFORM_OT_translate={"value": v})
    shot(jl, b, out, 4, WIDE, True, frames)
    with b.ctx():
        # 5. A, V ▸ Automatic.
        bpy.ops.curve.select_all(action="SELECT")
        bpy.ops.curve.handle_type_set(type="AUTOMATIC")
    shot(jl, b, out, 5, WIDE, True, frames)
    with b.ctx():
        # 6. Click the top right point, S 1.4.
        b.select_only(2)
        bpy.ops.transform.resize(value=(1.4, 1.4, 1.4))
    shot(jl, b, out, 6, WIDE, True, frames)
    with b.ctx():
        # 7. Click the crossing point, G Z 0.06.
        b.select_only(4)
        bpy.ops.transform.translate(value=(0, 0, LIFT))
    shot(jl, b, out, 7, LOW, True, frames)
    with b.ctx():
        # 8. Tab, Bevel Depth and Fill Caps.
        bpy.ops.object.mode_set(mode="OBJECT")
        b.ob.data.bevel_depth = RADIUS
        b.ob.data.use_fill_caps = True
    shot(jl, b, out, 8, LOW, False, frames)
    with b.ctx():
        # 9. G Z 0.03, then a plane scaled by 10.
        bpy.ops.transform.translate(value=(0, 0, RADIUS))
        bpy.ops.mesh.primitive_plane_add(location=(0, 0, 0))
        bpy.ops.transform.resize(value=(10, 10, 10))
    shot(jl, b, out, 9, WIDE, False, frames)
    # 10. A material for the cable: in Solid the cable stays grey (Viewport Display colour).
    m = bpy.data.materials.get("PillCable") or bpy.data.materials.new("PillCable")
    m.use_nodes = True
    bsdf = next(nd for nd in m.node_tree.nodes if nd.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = hex_color(CABLE_HEX)
    bsdf.inputs["Roughness"].default_value = 0.4
    b.ob.data.materials.clear()
    b.ob.data.materials.append(m)
    shot(jl, b, out, 10, WIDE, False, frames)
    # 11. Numpad 0, F12.
    final_render(b, out, 11)
    frames.append({"header": "Camera Perspective", "grid": [], "overlay": []})
    with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as fh:
        json.dump(frames, fh, separators=(",", ":"))
    print("cable pill rendered to", out)
