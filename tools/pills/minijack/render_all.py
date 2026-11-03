# Renders the images of the minijack pill (src/pills/blender/minijack/).
#
# Run inside Blender 5.x (it builds its own scenes and leaves the user's scene alone):
#   blender -b --factory-startup --python tools/pills/minijack/render_all.py
# or from a live Blender session: exec this file, then call main().
#
# Output: img/sNN.webp (Workbench, transparent, drawn over the page's viewport grid),
# img/final.webp (Cycles beauty shot for the last step) and frames.json (viewport header
# and grid lines of each step, in image pixels).
import importlib, json, math, os, sys
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None
OUT = None  # defaults to src/pills/blender/minijack next to this repo

# (view, z range to frame or None for the whole model), one per step.
VIEWS = [
    ("persp", None), ("persp", None), ("persp_top", None), ("persp_top", None),
    ("persp", None), ("persp_top", None), ("persp", None), ("persp", (0.6, 2.5)),
    ("persp", (1.7, 2.95)), ("persp_below", None), ("persp_below", None), ("persp", None),
    ("persp", (-1.95, 1.5)), ("persp", (-1.95, 2.95)), ("persp", (0.7, 2.95)),
    ("persp", (-1.95, 2.95)), ("persp", (-1.95, 2.95)),
]


def lib(here):
    if here not in sys.path:
        sys.path.insert(0, here)
    import jack_lib
    return importlib.reload(jack_lib)


def render(sc, path):
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


def steps(jl, out):
    frames = []
    for i, (view, zr) in enumerate(VIEWS):
        png = os.path.join(out, "img", f"s{i + 1:02d}.webp")
        meta = os.path.join(out, "img", "_meta.json")
        m = jl.render_step(i, 1.0, png, meta, view, zr)
        frames.append({
            "header": m["header"],
            "grid": [[g["kind"], " ".join(f"{round(x)},{round(y)}" for x, y in g["pts"])] for g in m["grid"]],
        })
    os.remove(os.path.join(out, "img", "_meta.json"))
    with open(os.path.join(out, "frames.json"), "w", encoding="utf-8") as fh:
        json.dump(frames, fh, separators=(",", ":"))


def principled(name, col, metal, rough, spec=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = col
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    return m


def aim(ob, target):
    ob.rotation_euler = (target - ob.location).normalized().to_track_quat("-Z", "Y").to_euler()


def beauty(jl, out):
    """Finished jack lying on a dark studio sweep, three-quarter view."""
    import bmesh
    sc = bpy.data.scenes.get("JackBeauty") or bpy.data.scenes.new("JackBeauty")
    for o in list(sc.collection.objects):
        sc.collection.objects.unlink(o)

    me = jl.build_mesh(jl.profile_at(len(jl.STEPS) - 1))
    mats = {
        "rubber": principled("beauty_rubber", (0.025, 0.025, 0.027, 1), 0, 0.55),
        "metal": principled("beauty_metal", (0.92, 0.9, 0.86, 1), 1, 0.18),
        "plastic": principled("beauty_plastic", (0.01, 0.01, 0.01, 1), 0, 0.3),
        "cable": principled("beauty_cable", (0.02, 0.02, 0.022, 1), 0, 0.45),
    }
    for n in jl.MATS:
        me.materials.append(mats[n])
    jack = bpy.data.objects.new("JackBeauty", me)
    sc.collection.objects.link(jack)
    md = jack.modifiers.new("Subdivision", "SUBSURF")
    md.levels = md.render_levels = 3
    jack.rotation_euler = (0, math.radians(78), math.radians(-28))

    # Studio sweep: flat floor that curves up into a back wall.
    bm = bmesh.new()
    W, D, H, R = 30, 12, 12, 3.0
    prof = [(-D / 2, 0)]
    for i in range(25):
        a = math.radians(90 * i / 24)
        prof.append((D / 2 - R + R * math.sin(a), R - R * math.cos(a)))
    prof.append((D / 2, H))
    rows = [[bm.verts.new((x, y, z)) for (y, z) in prof] for x in (-W / 2, W / 2)]
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    sme = bpy.data.meshes.new("Sweep")
    bm.to_mesh(sme)
    bm.free()
    for poly in sme.polygons:
        poly.use_smooth = True
    sweep = bpy.data.objects.new("Sweep", sme)
    sc.collection.objects.link(sweep)
    sweep.scale = (2, 3, 1)
    sweep.location = (0, 10, -0.35)
    sme.materials.append(principled("beauty_floor", (0.035, 0.037, 0.042, 1), 0, 0.8, 0.25))

    # Rest the jack on the floor and frame it from its real vertices.
    win = bpy.context.window
    old = win.scene if win else None
    if win:
        win.scene = sc
    try:
        dg = bpy.context.evaluated_depsgraph_get()
        dg.update()
        ev = jack.evaluated_get(dg)
        tmp = ev.to_mesh()
        ws = [jack.matrix_world @ v.co for v in tmp.vertices]
        ev.to_mesh_clear()
    finally:
        if win:
            win.scene = old
    drop = -0.35 - min(v.z for v in ws)
    jack.location.z = drop
    lo = Vector([min(v[i] for v in ws) for i in range(3)]) + Vector((0, 0, drop))
    hi = Vector([max(v[i] for v in ws) for i in range(3)]) + Vector((0, 0, drop))
    axis = (jack.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
    c = (lo + hi) / 2 + axis * 0.55
    size = (hi - lo).length

    for name, off, energy, (sx, sy), col in (
        ("Key", (-5, -4, 6), 300, (5, 3), (1, 1, 1)),
        ("Fill", (6, -5, 2.5), 70, (4, 4), (0.85, 0.9, 1)),
        ("Rim", (1.5, 5, 5), 700, (5, 0.6), (1, 1, 1)),
        ("Strip", (0, -1.5, 6), 160, (8, 0.4), (1, 1, 1)),
    ):
        ld = bpy.data.lights.new("beauty_" + name, "AREA")
        ld.shape, ld.size, ld.size_y, ld.energy, ld.color = "RECTANGLE", sx, sy, energy, col
        lo_ = bpy.data.objects.new("beauty_" + name, ld)
        sc.collection.objects.link(lo_)
        lo_.location = c + Vector(off)
        aim(lo_, c)

    cam = bpy.data.objects.new("BeautyCam", bpy.data.cameras.new("BeautyCam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 60
    dist = (size * 0.47) / math.tan(math.atan(18 / 60))
    cam.location = c + Vector((0.25, -1, 0.42)).normalized() * dist
    aim(cam, c)
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = (c - cam.location).length
    cam.data.dof.aperture_fstop = 5.6

    w = bpy.data.worlds.new("BeautyWorld")
    sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.012, 0.013, 0.015, 1)

    try:
        sc.render.engine = "CYCLES"
    except TypeError as e:
        print(e)
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = jl.RES
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    s = sc.render.image_settings
    s.file_format, s.color_mode, s.quality = "WEBP", "RGB", 88
    render(sc, os.path.join(out, "img", "final.webp"))


def main(here=HERE, out=OUT):
    jl = lib(here)
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "minijack"))
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    steps(jl, out)
    beauty(jl, out)
    print("minijack pill rendered to", out)


if __name__ == "__main__" and HERE:
    main()
