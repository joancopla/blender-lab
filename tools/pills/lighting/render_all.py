# Renders the images of the lighting pill (src/pills/blender/lighting/).
#
# The scene is the one a student has at the end of the minijack pill: the finished jack
# ("Cylinder", Subdivision Surface level 2, four material slots). The script then builds
# what each step adds, with the same rounded values the step texts give.
#
# Run inside Blender 5.x, from a live session: exec this file, then call main().
# Output: img/sNN.webp and frames.json (viewport header and grid of each step).
import importlib, json, math, os, sys
import bpy, bmesh
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None

# Values shown to the student (keep in sync with src/pills/blender/lighting/ca.json).
JACK_ROT = (0, 90, -30)          # R Y 90, R Z -30 (degrees)
JACK_Z = 0.38                    # G Z 0.38: the handle radius, so it rests on the floor
CAMERA_LOC = (2.6, -9.6, 4.4)
CAMERA_ROT = (68, 0, 15)         # degrees
CAMERA_LENS = 60
LIGHTS = [
    # name, location, power W, shape, size x, size y, colour
    ("Area", (-5, -5, 6), 300, "RECTANGLE", 5, 3, (1, 1, 1)),
    ("Area.001", (2, 5, 5), 700, "RECTANGLE", 5, 0.6, (1, 1, 1)),
    ("Area.002", (6, -5, 3), 70, "SQUARE", 4, 4, (0.85, 0.9, 1)),
    ("Area.003", (0, -2, 6), 160, "RECTANGLE", 8, 0.4, (1, 1, 1)),
]
MATERIALS = {
    # slot: (base colour linear, metallic, roughness)
    "rubber": ((0.025, 0.025, 0.027), 0, 0.55),
    "metal": ((0.92, 0.9, 0.86), 1, 0.18),
    "plastic": ((0.01, 0.01, 0.01), 0, 0.3),
    "cable": ((0.02, 0.02, 0.022), 0, 0.45),
}
FLOOR = ((0.035, 0.037, 0.042), 0.8)  # base colour, roughness
WORLD = (0.012, 0.013, 0.015)
SAMPLES = 96
FSTOP = 5.6
PERCENT = 60  # camera images at 60 % of 1920 × 1080 (the page shows them ~1100 px wide)


def lib(here):
    p = os.path.join(here, "..", "minijack")
    if p not in sys.path:
        sys.path.insert(0, p)
    import jack_lib
    return importlib.reload(jack_lib)


def srgb_hex(c):
    def f(x):
        x = max(0.0, min(1.0, x))
        return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(f(x) * 255):02X}" for x in c)


class Scene:
    def __init__(self, jl):
        self.jl = jl
        sc = bpy.data.scenes.get("PillLighting")
        if sc:
            bpy.data.scenes.remove(sc)
        self.sc = sc = bpy.data.scenes.new("PillLighting")
        sc.render.resolution_x, sc.render.resolution_y = 1920, 1080

        me = jl.build_mesh(jl.profile_at(len(jl.STEPS) - 1))
        self.mats = {}
        for n in jl.MATS:
            m = bpy.data.materials.new(f"pl_{n}")
            m.use_nodes = True
            me.materials.append(m)
            self.mats[n] = m
        self.jack = bpy.data.objects.new("Cylinder", me)
        sc.collection.objects.link(self.jack)
        md = self.jack.modifiers.new("Subdivision", "SUBSURF")
        md.levels = md.render_levels = 2
        self.sweep = None
        self.camera = None
        self.lights = []
        w = bpy.data.worlds.new("pl_world")
        w.use_nodes = True
        sc.world = w
        self.bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
        self.bg.inputs["Color"].default_value = (0.0509, 0.0509, 0.0509, 1)  # Blender default

    # --- what each step adds ---------------------------------------------------
    def add_sweep(self, bevel=False):
        """Plane, S 10 in Edit Mode, back edge E Z 8; with bevel, corner edge Ctrl+B 3, 8 segments."""
        bm = bmesh.new()
        s = 10
        v = [bm.verts.new(p) for p in ((-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0))]
        bm.faces.new(v)
        back = next(e for e in bm.edges if all(abs(x.co.y - s) < 1e-6 for x in e.verts))
        ext = bmesh.ops.extrude_edge_only(bm, edges=[back])
        for x in ext["geom"]:
            if isinstance(x, bmesh.types.BMVert):
                x.co.z += 8
        bm.edges.ensure_lookup_table()
        corner = next(e for e in bm.edges if all(abs(x.co.y - s) < 1e-6 and abs(x.co.z) < 1e-6 for x in e.verts))
        if bevel:
            bmesh.ops.bevel(bm, geom=[corner] + list(corner.verts), offset=3, offset_type="OFFSET", segments=8,
                            profile=0.5, affect="EDGES", clamp_overlap=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new("Plane")
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = bevel  # Shade Smooth comes with the bevel step
        if self.sweep:
            old = self.sweep.data
            self.sweep.data = me
            bpy.data.meshes.remove(old)
            return
        self.sweep = bpy.data.objects.new("Plane", me)
        self.sc.collection.objects.link(self.sweep)

    def lay_jack(self):
        self.jack.rotation_euler = Euler([math.radians(a) for a in JACK_ROT], "XYZ")
        self.jack.location = (0, 0, JACK_Z)

    def add_camera(self):
        cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
        self.sc.collection.objects.link(cam)
        cam.location = CAMERA_LOC
        cam.rotation_euler = Euler([math.radians(a) for a in CAMERA_ROT], "XYZ")
        cam.data.lens = CAMERA_LENS
        self.sc.camera = self.camera = cam

    def add_light(self, i):
        name, loc, power, shape, sx, sy, col = LIGHTS[i]
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.shape, ld.size, ld.size_y, ld.color = power, shape, sx, sy, col
        o = bpy.data.objects.new(name, ld)
        self.sc.collection.objects.link(o)
        o.location = loc
        c = o.constraints.new("TRACK_TO")
        c.target = self.jack
        c.track_axis, c.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
        self.lights.append(o)

    def set_materials(self):
        fm = bpy.data.materials.new("pl_floor")
        fm.use_nodes = True
        b = next(n for n in fm.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        b.inputs["Base Color"].default_value = (*FLOOR[0], 1)
        b.inputs["Roughness"].default_value = FLOOR[1]
        self.sweep.data.materials.append(fm)
        for n, (col, metal, rough) in MATERIALS.items():
            b = next(x for x in self.mats[n].node_tree.nodes if x.type == "BSDF_PRINCIPLED")
            b.inputs["Base Color"].default_value = (*col, 1)
            b.inputs["Metallic"].default_value = metal
            b.inputs["Roughness"].default_value = rough

    def set_world(self):
        self.bg.inputs["Color"].default_value = (*WORLD, 1)

    # --- rendering ---------------------------------------------------------------
    def _render(self, path):
        sc = self.sc
        win = bpy.context.window
        old = win.scene if win else None
        if win:
            win.scene = sc
        try:
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True, scene=sc.name)
        finally:
            if win:
                win.scene = old

    def _webp(self, alpha, quality=88):
        s = self.sc.render.image_settings
        s.file_format, s.color_mode, s.quality = "WEBP", "RGBA" if alpha else "RGB", quality

    def workbench_persp(self, path):
        """Solid viewport look over the page's grid, from a user perspective view."""
        jl, sc = self.jl, self.sc
        sc.render.engine = "BLENDER_WORKBENCH"
        sh = sc.display.shading
        sh.light, sh.color_type, sh.show_cavity, sh.show_object_outline = "STUDIO", "MATERIAL", False, False
        sh.show_specular_highlight = True
        sc.display.render_aa = "16"
        sc.render.film_transparent = True
        sc.render.resolution_x, sc.render.resolution_y = jl.RES
        sc.render.resolution_percentage = 100
        sc.view_settings.view_transform = "Standard"
        self._webp(True, 90)
        cam = bpy.data.objects.get("pl_view") or bpy.data.objects.new("pl_view", bpy.data.cameras.new("pl_view"))
        if cam.name not in sc.collection.objects:
            sc.collection.objects.link(cam)
        cam.data.lens, cam.data.sensor_width, cam.data.clip_end = 50, 36, 500
        target = Vector((0, 2, 1.5))
        eye = target + Vector((1.0, -1.7, 0.9)).normalized() * 34
        jl.look_at(cam, eye, target, Vector((0, 0, 1)))
        keep = sc.camera
        sc.camera = cam
        self._render(path)
        grid = jl.grid_lines(sc, cam, "persp")
        sc.camera = keep
        sc.collection.objects.unlink(cam)
        return {"header": "User Perspective",
                "grid": [[g["kind"], " ".join(f"{round(x)},{round(y)}" for x, y in g["pts"])] for g in grid]}

    def through_camera(self, path, engine, look="None", dof=False, alpha=False):
        sc = self.sc
        sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
        sc.render.resolution_percentage = PERCENT
        sc.render.film_transparent = alpha
        self.camera.data.dof.use_dof = dof
        if dof:
            self.camera.data.dof.focus_object = self.jack
            self.camera.data.dof.aperture_fstop = FSTOP
        sc.view_settings.view_transform = "AgX"
        try:
            sc.view_settings.look = "AgX - Medium High Contrast" if look == "mhc" else "None"
        except TypeError:
            pass
        if engine == "WORKBENCH":
            sc.render.engine = "BLENDER_WORKBENCH"
            sc.view_settings.view_transform = "Standard"
            self._webp(True, 90)
        elif engine == "EEVEE":
            for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
                try:
                    sc.render.engine = e
                    break
                except TypeError:
                    continue
            self._webp(False)
        else:
            sc.render.engine = "CYCLES"
            sc.cycles.samples = SAMPLES
            sc.cycles.use_denoising = True
            self._webp(False)
        self._render(path)
        return {"header": "Camera Perspective", "grid": []}


def main(here=HERE, out=None):
    jl = lib(here)
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "lighting"))
    img = os.path.join(out, "img")
    os.makedirs(img, exist_ok=True)
    s = Scene(jl)
    p = lambda n: os.path.join(img, f"s{n:02d}.webp")
    frames = []
    steps = [
        (lambda: s.add_sweep(), lambda n: s.workbench_persp(p(n))),                  # floor and wall
        (lambda: s.add_sweep(bevel=True), lambda n: s.workbench_persp(p(n))),        # curved corner
        (s.lay_jack, lambda n: s.workbench_persp(p(n))),                             # jack on the floor
        (s.add_camera, lambda n: s.through_camera(p(n), "WORKBENCH", alpha=True)),   # camera
        (lambda: s.add_light(0), lambda n: s.through_camera(p(n), "EEVEE")),         # key, Rendered
        (lambda: s.add_light(1), lambda n: s.through_camera(p(n), "EEVEE")),         # rim
        (lambda: s.add_light(2), lambda n: s.through_camera(p(n), "EEVEE")),         # fill
        (lambda: s.add_light(3), lambda n: s.through_camera(p(n), "EEVEE")),         # strip
        (s.set_materials, lambda n: s.through_camera(p(n), "EEVEE")),                # materials
        (s.set_world, lambda n: s.through_camera(p(n), "EEVEE")),                    # dark World
        (lambda: None, lambda n: s.through_camera(p(n), "CYCLES")),                  # Cycles
        (lambda: None, lambda n: s.through_camera(p(n), "CYCLES", look="mhc")),      # colour management
        (lambda: None, lambda n: s.through_camera(p(n), "CYCLES", look="mhc", dof=True)),  # DOF + F12
    ]
    for n, (do, shot) in enumerate(steps, 1):
        do()
        frames.append(shot(n))
    with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as fh:
        json.dump(frames, fh, separators=(",", ":"))
    print("hex", {n: srgb_hex(c) for n, (c, _, _) in MATERIALS.items()}, "floor", srgb_hex(FLOOR[0]), "world", srgb_hex(WORLD))
    print("lighting pill rendered to", out)
