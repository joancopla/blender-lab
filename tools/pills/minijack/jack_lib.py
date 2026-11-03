# Minijack tutorial: builds the plug step by step (same geometry a student gets with
# Inset / Extrude / Scale on an 8-sided cylinder) and renders "edit mode looking" frames.
# Units: 1 Blender unit = 1 cm (scaled-up model). Z up.
import bpy, bmesh, math, json
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

N = 8
COS = math.cos(math.pi / N)
# Same vertex order as bpy.ops.mesh.primitive_cylinder_add(vertices=8): first at +Y, clockwise.
ANG = [math.radians(90 - 45 * k) for k in range(N)]
RES = (1200, 1080)
MATS = ["rubber", "metal", "plastic", "cable"]
MAT_COLORS = {"rubber": (0.16, 0.16, 0.17, 1), "metal": (0.85, 0.85, 0.82, 1),
              "plastic": (0.015, 0.015, 0.015, 1), "cable": (0.04, 0.04, 0.045, 1)}


def inset_r(r, th):
    return r - th / COS


class Ring:
    def __init__(self, z, r, mat="rubber"):
        self.z, self.r, self.mat, self.sel = z, r, mat, False  # mat = band above this ring


class Prof:
    def __init__(self):
        self.rings = []
        self.top_sel = False
        self.bot_sel = False
        self.top_mat = "rubber"
        self.bot_mat = "rubber"
        self.edit = True        # draw cage wires
        self.smooth = False     # shade smooth + subsurf
        self.subsurf = 0

    @property
    def top(self):
        return self.rings[-1]

    @property
    def bot(self):
        return self.rings[0]

    def top_add(self, z, r, mat):
        self.top.mat = mat
        self.rings.append(Ring(z, r))
        self.top_mat = mat

    def bot_add(self, z, r, mat):
        self.rings.insert(0, Ring(z, r, mat))
        self.bot_mat = mat


# --- modelling operations, t in [0, 1] animates the modal value -------------------
def ext_top(p, d, mat, t=1):
    p.top_add(p.top.z + d * t, p.top.r, mat)

def ins_top(p, th, mat, t=1):
    p.top_add(p.top.z, inset_r(p.top.r, th * t), mat)

def sc_top(p, f, t=1):
    p.top.r *= 1 + (f - 1) * t

def ext_bot(p, d, mat, t=1):
    p.bot_add(p.bot.z - d * t, p.bot.r, mat)

def ins_bot(p, th, mat, t=1):
    p.bot_add(p.bot.z, inset_r(p.bot.r, th * t), mat)

def sc_bot(p, f, t=1):
    p.bot.r *= 1 + (f - 1) * t


def seq(p, ops, t):
    """Run a list of ops one after another; t sweeps through them."""
    n = len(ops)
    for i, op in enumerate(ops):
        lt = min(1, max(0, t * n - i))
        if lt <= 0:
            break
        op(p, lt)


def handle_band(p):
    for i in range(len(p.rings) - 1):
        a, b = p.rings[i], p.rings[i + 1]
        if abs(a.z + 1) < 1e-6 and abs(b.z - 1) < 1e-6 and abs(a.r - b.r) < 1e-6:
            return i
    return None


def loop_cuts_handle(p, t=1):
    i = handle_band(p)
    if i is None:
        return
    a = p.rings[i]
    new = [Ring(-1 + 0.25 * k, a.r, a.mat) for k in range(1, 8)]
    p.rings[i + 1:i + 1] = new


def groove_handle(p, t=1):
    for r in p.rings:
        if r.mat == "rubber" and any(abs(r.z - z) < 1e-6 for z in (-0.75, -0.25, 0.25, 0.75)):
            r.sel = True
            r.r *= 1 + (0.9 - 1) * t


# Bands that get a bevel instead of support loops (lower z of the band): the metal collar
# and the tip body.
BEVEL_BANDS = (1.0, 2.52)
BEVEL_WIDTH = 0.02


def support_loops(p, t=1, off=0.03, skip=BEVEL_BANDS):
    out = []
    rs = p.rings
    vert = lambda i: (abs(rs[i].r - rs[i + 1].r) < 1e-6 and rs[i + 1].z - rs[i].z >= 0.15
                      and not any(abs(rs[i].z - z) < 1e-6 for z in skip))
    for i in range(len(rs)):
        out.append(rs[i])
        if i < len(rs) - 1 and vert(i):
            a, b = rs[i], rs[i + 1]
            corner_lo = i == 0 or not (abs(rs[i - 1].r - a.r) < 1e-6)
            corner_hi = i + 1 == len(rs) - 1 or not (abs(rs[i + 2].r - b.r) < 1e-6)
            mids = []
            if corner_lo:
                mids.append(Ring(a.z + off, a.r, a.mat))
            if corner_hi:
                mids.append(Ring(b.z - off, a.r, a.mat))
            for m in mids:
                m.sel = True
            out.extend(mids)
    p.rings = out


def bevel_corners(p, t=1, width=BEVEL_WIDTH, bands=BEVEL_BANDS):
    """Ctrl+B on the bottom and top loops of each band in `bands`, with the defaults of
    Blender's Bevel operator (Offset, 1 segment, loop slide). Runs bmesh's bevel on the real
    mesh and reads the new profile back from the column of vertices at +Y."""
    rs = p.rings
    targets = set()
    for i in range(len(rs) - 1):
        if any(abs(rs[i].z - z) < 1e-6 for z in bands) and abs(rs[i].r - rs[i + 1].r) < 1e-6:
            targets.update((i, i + 1))
    old = {(round(r.z, 5), round(r.r, 5)): r.mat for r in rs}
    bm = bmesh.new()
    rv = [[bm.verts.new(v) for v in ring_verts(r)] for r in rs]
    for i in range(len(rv) - 1):
        for k in range(N):
            k2 = (k + 1) % N
            bm.faces.new((rv[i][k], rv[i][k2], rv[i + 1][k2], rv[i + 1][k]))
    bm.faces.new(rv[-1])
    bm.faces.new(list(reversed(rv[0])))
    edges = [bm.edges.get((rv[i][k], rv[i][(k + 1) % N])) for i in targets for k in range(N)]
    bmesh.ops.bevel(bm, geom=edges, offset=width * t, offset_type="OFFSET",
                    profile_type="SUPERELLIPSE", segments=1, profile=0.5, affect="EDGES",
                    clamp_overlap=False, loop_slide=True, miter_outer="SHARP")
    col = [v for v in bm.verts if abs(v.co.x) < 1e-6 and v.co.y > 0]
    ids = {id(v) for v in col}
    start = min(col, key=lambda v: v.co.z)
    chain, prev, cur = [start], None, start
    while True:
        nb = [e.other_vert(cur) for e in cur.link_edges
              if id(e.other_vert(cur)) in ids and e.other_vert(cur) is not prev]
        if not nb:
            break
        prev, cur = cur, nb[0]
        chain.append(cur)
    out = []
    for v in chain:
        key = (round(v.co.z, 5), round(v.co.y, 5))
        ring = Ring(v.co.z, v.co.y, old.get(key))
        ring.sel = key not in old
        out.append(ring)
    bm.free()
    # Each beveled loop becomes two new loops, in order; both keep the material of the band
    # above the loop they replace (the bevel face belongs to the metal part).
    replaced = [rs[i] for i in sorted(targets)]
    new = [r for r in out if r.sel]
    for k, ring in enumerate(new):
        ring.mat = replaced[min(k // 2, len(replaced) - 1)].mat
    p.rings = out


# --- the steps (geometry only; texts live in steps.json) --------------------------
def s_cyl(p, t):
    p.rings = [Ring(-1, 0.38, "rubber"), Ring(1, 0.38)]

STEPS = [
    ("cylinder",   []),
    ("edit",       []),
    ("select_top", []),
    ("inset_collar", [lambda p, t: ins_top(p, 0.1, "rubber", t)]),
    ("extrude_collar", [lambda p, t: ext_top(p, 0.2, "metal", t)]),
    ("inset_plug", [lambda p, t: ins_top(p, 0.09, "metal", t)]),
    ("extrude_sleeve", [lambda p, t: ext_top(p, 0.75, "metal", t)]),
    ("rings", [lambda p, t: ext_top(p, 0.1, "plastic", t),
               lambda p, t: ext_top(p, 0.25, "metal", t),
               lambda p, t: ext_top(p, 0.1, "plastic", t)]),
    ("tip", [lambda p, t: ext_top(p, 0.05, "metal", t),
             lambda p, t: sc_top(p, 0.7, t),
             lambda p, t: ext_top(p, 0.07, "metal", t),
             lambda p, t: sc_top(p, 1.4, t),
             lambda p, t: ext_top(p, 0.2, "metal", t),
             lambda p, t: ext_top(p, 0.1, "metal", t),
             lambda p, t: sc_top(p, 0.45, t)]),
    ("select_bottom", []),
    ("strain_relief", [lambda p, t: ext_bot(p, 0.3, "rubber", t),
                       lambda p, t: sc_bot(p, 0.8, t),
                       lambda p, t: ext_bot(p, 0.5, "rubber", t),
                       lambda p, t: sc_bot(p, 0.7, t)]),
    ("cable", [lambda p, t: ins_bot(p, 0.08, "rubber", t),
               lambda p, t: ext_bot(p, 1.5, "cable", t)]),
    ("grip", [loop_cuts_handle, groove_handle]),
    ("subsurf", []),
    ("support", [support_loops]),
    ("bevel", [bevel_corners]),
    ("materials", []),
    ("final", []),
]
NAMES = [s[0] for s in STEPS]


def profile_at(step, t=1.0):
    """Geometry and display state after `step` (index), with that step at progress t."""
    p = Prof()
    s_cyl(p, 1)
    for i in range(step + 1):
        name, ops = STEPS[i]
        lt = t if i == step else 1
        for r in p.rings:
            r.sel = False
        if name == "grip":
            loop_cuts_handle(p)
            groove_handle(p, lt)
        elif name == "support":
            support_loops(p)
        elif name == "bevel":
            bevel_corners(p, lt)
        else:
            seq(p, ops, lt)
    name = STEPS[step][0]
    p.top_sel = name in ("select_top", "inset_collar", "extrude_collar", "inset_plug",
                         "extrude_sleeve", "rings", "tip")
    p.bot_sel = name in ("select_bottom", "strain_relief", "cable")
    p.edit = name not in ("cylinder", "subsurf", "materials", "final")
    if step >= NAMES.index("subsurf"):
        p.smooth, p.subsurf = True, 2
    return p


# --- scene objects ----------------------------------------------------------------
def scene():
    sc = bpy.data.scenes.get("JackTut") or bpy.data.scenes.new("JackTut")
    return sc


def link(sc, ob):
    if ob.name not in sc.collection.objects:
        sc.collection.objects.link(ob)


def get_obj(sc, name, data):
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = bpy.data.objects.new(name, data)
    elif data is not None:
        old = ob.data
        ob.data = data
        if old is not None and old.users == 0:
            (bpy.data.meshes if isinstance(old, bpy.types.Mesh) else bpy.data.curves).remove(old)
    link(sc, ob)
    return ob


def ring_verts(r):
    return [Vector((r.r * math.cos(a), r.r * math.sin(a), r.z)) for a in ANG]


def build_mesh(p):
    me = bpy.data.meshes.new("Jack")
    bm = bmesh.new()
    rv = [[bm.verts.new(v) for v in ring_verts(r)] for r in p.rings]
    for i in range(len(rv) - 1):
        for k in range(N):
            k2 = (k + 1) % N
            f = bm.faces.new((rv[i][k], rv[i][k2], rv[i + 1][k2], rv[i + 1][k]))
            f.material_index = MATS.index(p.rings[i].mat)
    ft = bm.faces.new(rv[-1])
    ft.material_index = MATS.index(p.top_mat)
    fb = bm.faces.new(list(reversed(rv[0])))
    fb.material_index = MATS.index(p.bot_mat)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = p.smooth
    return me


def build_wires(p, width, which):
    """Cage edges as thin curve tubes. which = 'all' | 'sel'."""
    cu = bpy.data.curves.new("wire", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = width
    cu.bevel_resolution = 0
    rings = p.rings

    def poly(pts, closed):
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for i, v in enumerate(pts):
            sp.points[i].co = (v.x, v.y, v.z, 1)
        sp.use_cyclic_u = closed

    for i, r in enumerate(rings):
        sel = r.sel or (p.top_sel and i == len(rings) - 1) or (p.bot_sel and i == 0)
        if which == "all" or sel:
            poly(ring_verts(r), True)
    if which == "all":
        for i in range(len(rings) - 1):
            a, b = ring_verts(rings[i]), ring_verts(rings[i + 1])
            if (a[0] - b[0]).length < 1e-5:
                continue
            for k in range(N):
                poly([a[k], b[k]], False)
    return cu


def build_selface(p):
    me = bpy.data.meshes.new("selface")
    bm = bmesh.new()
    for flag, r, dz in ((p.top_sel, p.rings[-1], 0.004), (p.bot_sel, p.rings[0], -0.004)):
        if flag:
            vs = [bm.verts.new(v + Vector((0, 0, dz))) for v in ring_verts(r)]
            bm.faces.new(vs)
    bm.to_mesh(me)
    bm.free()
    return me


# --- camera -----------------------------------------------------------------------
VIEWS = {
    # name: (eye direction from target, up hint, ortho, header text)
    "persp": (Vector((1.0, -1.7, 0.9)), Vector((0, 0, 1)), False, "User Perspective"),
    "persp_top": (Vector((0.8, -1.3, 1.6)), Vector((0, 0, 1)), False, "User Perspective"),
    "persp_below": (Vector((0.9, -1.6, -1.0)), Vector((0, 0, 1)), False, "User Perspective"),
    "front": (Vector((0, -1, 0)), Vector((0, 0, 1)), True, "Front Orthographic"),
    "top": (Vector((0, 0, 1)), Vector((0, 1, 0)), True, "Top Orthographic"),
    "bottom": (Vector((0, 0, -1)), Vector((0, -1, 0)), True, "Bottom Orthographic"),
}


def look_at(cam, eye, target, up):
    f = (target - eye).normalized()
    r = f.cross(up).normalized()
    u = r.cross(f)
    m = Matrix((r, u, -f)).transposed()
    cam.matrix_world = Matrix.Translation(eye) @ m.to_4x4()


def frame_box(p, view, zr=None):
    zs = [r.z for r in p.rings]
    rmax = max(r.r for r in p.rings)
    z0, z1 = (min(zs), max(zs)) if zr is None else zr
    if view in ("top", "bottom"):
        return Vector((0, 0, z1 if view == "top" else z0)), 2 * rmax, 2 * rmax
    return Vector((0, 0, (z0 + z1) / 2)), 2 * rmax, z1 - z0


def setup_camera(sc, p, view, zr=None, margin=1.5):
    cam = bpy.data.objects.get("TutCam")
    if cam is None:
        cam = bpy.data.objects.new("TutCam", bpy.data.cameras.new("TutCam"))
    link(sc, cam)
    sc.camera = cam
    d, up, ortho, _ = VIEWS[view]
    c, w, h = frame_box(p, view, zr)
    aspect = RES[0] / RES[1]
    cd = cam.data
    cd.clip_start, cd.clip_end = 0.01, 200
    if ortho:
        cd.type = "ORTHO"
        need_w = max(w * margin, h * margin * aspect)
        cd.ortho_scale = need_w
        eye = c + d.normalized() * 20
        px = need_w / RES[0]
    else:
        cd.type = "PERSP"
        cd.lens, cd.sensor_width = 50, 36
        R = 0.5 * math.sqrt(w * w + h * h) * margin * 0.8
        fov_v = 2 * math.atan(math.tan(math.atan(18 / 50)) / aspect)
        dist = R / math.sin(fov_v / 2)
        eye = c + d.normalized() * dist
        px = 2 * dist * math.tan(math.atan(18 / 50)) / RES[0]
    look_at(cam, eye, c, up)
    return cam, px


# --- render -----------------------------------------------------------------------
def setup_render(sc, engine="WORKBENCH"):
    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "WEBP"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = 90
    try:
        sc.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    if engine == "WORKBENCH":
        sc.render.engine = "BLENDER_WORKBENCH"
        sh = sc.display.shading
        sh.light = "STUDIO"
        sh.color_type = "OBJECT"
        sh.show_cavity = False
        sh.show_object_outline = False
        sh.show_specular_highlight = True
        sc.display.render_aa = "16"


def grid_lines(sc, cam, view):
    """Viewport grid as 2D polylines (pixels), drawn later under the render."""
    lines = []
    W, H = RES

    def proj(v):
        co = world_to_camera_view(sc, cam, v)
        return (co.x * W, (1 - co.y) * H, co.z)

    def add(a, b, kind, n=48):
        pts = []
        for i in range(n + 1):
            v = a.lerp(b, i / n)
            x, y, z = proj(v)
            if z > 0:
                pts.append((round(x, 1), round(y, 1)))
        if len(pts) > 1:
            lines.append({"kind": kind, "pts": pts})

    d, up, ortho, _ = VIEWS[view]
    if ortho:
        for k in range(-60, 61):
            if k % 10 == 0:
                continue
            v = k / 10
            if view == "front":
                add(Vector((v, 0, -6)), Vector((v, 0, 6)), "minor", 2)
                add(Vector((-6, 0, v)), Vector((6, 0, v)), "minor", 2)
            else:
                add(Vector((v, -6, 0)), Vector((v, 6, 0)), "minor", 2)
                add(Vector((-6, v, 0)), Vector((6, v, 0)), "minor", 2)
    if view == "front":
        for k in range(-20, 21):
            kind = "major"
            add(Vector((k, 0, -20)), Vector((k, 0, 20)), kind, 2)
            if k != 0:
                add(Vector((-20, 0, k)), Vector((20, 0, k)), kind, 2)
        add(Vector((-20, 0, 0)), Vector((20, 0, 0)), "x", 2)
    elif view in ("top", "bottom"):
        for k in range(-20, 21):
            if k != 0:
                add(Vector((k, -20, 0)), Vector((k, 20, 0)), "major", 2)
                add(Vector((-20, k, 0)), Vector((20, k, 0)), "major", 2)
        add(Vector((-20, 0, 0)), Vector((20, 0, 0)), "x", 2)
        add(Vector((0, -20, 0)), Vector((0, 20, 0)), "y", 2)
    else:
        for k in range(-12, 13):
            if k != 0:
                add(Vector((k, -12, 0)), Vector((k, 12, 0)), "floor")
                add(Vector((-12, k, 0)), Vector((12, k, 0)), "floor")
        add(Vector((-12, 0, 0)), Vector((12, 0, 0)), "x")
        add(Vector((0, -12, 0)), Vector((0, 12, 0)), "y")
    return lines


def render_step(step, t, out_png, meta_path, view, zr=None, active="Cylinder"):
    sc = scene()
    setup_render(sc)
    p = profile_at(step, t)
    cam, px = setup_camera(sc, p, view, zr)

    jack = get_obj(sc, "Jack", build_mesh(p))
    jack.color = (0.8, 0.8, 0.8, 1)
    for m in list(jack.modifiers):
        jack.modifiers.remove(m)
    if p.subsurf:
        md = jack.modifiers.new("Subdivision", "SUBSURF")
        md.levels = md.render_levels = p.subsurf
    use_mats = step >= NAMES.index("materials")
    sc.display.shading.color_type = "MATERIAL" if use_mats else "OBJECT"
    me = jack.data
    if use_mats:
        for name in MATS:
            m = bpy.data.materials.get("tut_" + name) or bpy.data.materials.new("tut_" + name)
            m.diffuse_color = MAT_COLORS[name]
            m.roughness = 0.25 if name == "metal" else 0.8
            m.metallic = 0.0
            me.materials.append(m)

    wires = get_obj(sc, "Wires", build_wires(p, px * 0.55, "all"))
    wires.color = (0.0, 0.0, 0.0, 1)
    wires.hide_render = not p.edit
    selw = get_obj(sc, "SelWires", build_wires(p, px * 0.9, "sel"))
    selw.color = (1.0, 0.45, 0.0, 1)
    selw.hide_render = not p.edit
    self_ = get_obj(sc, "SelFace", build_selface(p))
    self_.color = (1.0, 0.66, 0.36, 1)
    self_.hide_render = not p.edit

    sc.render.filepath = out_png
    win = bpy.context.window
    old = win.scene
    win.scene = sc
    try:
        bpy.ops.render.render(write_still=True, scene=sc.name)
    finally:
        win.scene = old

    R = cam.matrix_world.to_3x3()
    meta = {
        "step": NAMES[step], "t": t, "view": view, "header": VIEWS[view][3],
        "edit": p.edit, "active": active,
        "cam_right": list(R.col[0]), "cam_up": list(R.col[1]), "cam_back": list(R.col[2]),
        "grid": grid_lines(sc, cam, view),
    }
    with open(meta_path, "w", encoding="utf-8") as fh:
        json.dump(meta, fh)
    return meta
