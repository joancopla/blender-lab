# Renders the images of the neon look pill (src/pills/blender/neon/).
#
# Run from a live Blender 5.1 session: exec this file, then call main(). It builds its own
# scene "PillNeon" (the factory cube, camera and light) and leaves the user's scene alone.
# Every step is rendered with EEVEE through the factory camera, with the scene's compositor
# (Glare Bloom from step 16), so each image is what the student sees in Rendered; steps 1-5
# are still in Solid (Workbench, transparent background).
# Output: img/sNN.webp.
import math, os
import bpy

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None

CYAN = "00D8FF"
ORANGE = "FF6A00"
CYAN_STRENGTH = 5
ORANGE_STRENGTH = 9        # orange is darker than cyan: it needs more Strength to balance
LENS = 35
TORUS_LOC = (-2.5, 2, 1.25)
TORUS_ROT = (90, 0, 45)
THICK = 0.05               # last step: thicker grid lines for the wall
GLARE_SIZE = 0.7


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_color(h):
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


class Scene:
    def __init__(self):
        self.win = bpy.context.window
        self.sc = bpy.data.scenes.get("PillNeon") or bpy.data.scenes.new("PillNeon")
        for o in list(self.sc.objects):
            bpy.data.objects.remove(o)
        # Materials of earlier runs ("Neó cian", "Neó taronja.001"...) would take the names and
        # be picked by Browse Material in the later pills.
        ours = lambda m: m is not None and m.name.startswith("Neó ")
        for me in list(bpy.data.meshes):
            if me.users == 0 and any(ours(m) for m in me.materials):
                bpy.data.meshes.remove(me)
        for m in list(bpy.data.materials):
            if m.users == 0 and ours(m):
                bpy.data.materials.remove(m)
        self.sc.compositing_node_group = None
        self.win.scene = self.sc
        self.area = next(a for a in self.win.screen.areas if a.type == "VIEW_3D")
        self.region = next(r for r in self.area.regions if r.type == "WINDOW")

    def ctx(self):
        return bpy.context.temp_override(window=self.win, area=self.area, region=self.region,
                                         scene=self.sc)

    def factory(self):
        """The factory startup scene: cube with "Material", camera, point light, grey World."""
        sc = self.sc
        with self.ctx():
            bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
        self.cube = bpy.context.active_object
        self.cube.name = "Cube"
        m = bpy.data.materials.new("Material")
        self.cube.data.materials.append(m)
        cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
        sc.collection.objects.link(cam)
        cam.location = (7.3589, -6.9258, 4.9583)
        cam.rotation_euler = (math.radians(63.559), 0, math.radians(46.692))
        sc.camera = cam
        light = bpy.data.objects.new("Light", bpy.data.lights.new("Light", "POINT"))
        sc.collection.objects.link(light)
        light.location = (4.0762, 1.0055, 5.9039)
        light.data.energy, light.data.shadow_soft_size = 1000, 0.1
        self.light = light
        w = bpy.data.worlds.get("PillNeonWorld") or bpy.data.worlds.new("PillNeonWorld")
        w.use_nodes = True
        self.bg = next(nd for nd in w.node_tree.nodes if nd.type == "BACKGROUND")
        self.bg.inputs["Color"].default_value = (0.0509, 0.0509, 0.0509, 1)
        self.bg.inputs["Strength"].default_value = 1
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

    @staticmethod
    def neon(m, hexcol, strength):
        """Principled BSDF ▸ Emission: Color and Strength."""
        if m.node_tree is None:
            m.use_nodes = True
        bsdf = next(nd for nd in m.node_tree.nodes if nd.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Emission Color"].default_value = hex_color(hexcol)
        bsdf.inputs["Emission Strength"].default_value = strength
        return m

    def compositor_new(self):
        """What the compositor's New button builds in 5.1.2."""
        ng = bpy.data.node_groups.new("Compositor Nodes", "CompositorNodeTree")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = ng.nodes.new("CompositorNodeRLayers")
        rr = ng.nodes.new("NodeReroute")
        out = ng.nodes.new("NodeGroupOutput")
        viewer = ng.nodes.new("CompositorNodeViewer")
        ng.links.new(rl.outputs["Image"], rr.inputs[0])
        ng.links.new(rr.outputs[0], out.inputs[0])
        ng.links.new(rr.outputs[0], viewer.inputs[0])
        self.sc.compositing_node_group = ng
        return ng, rl, rr

    def render(self, out, n):
        if out is None:  # building the scene for a later pill, no images
            return
        self.sc.render.filepath = os.path.join(out, "img", f"s{n:02d}.webp")
        bpy.ops.render.render(write_still=True, scene=self.sc.name)


def solid(sc, on):
    """Solid view (Workbench, transparent: the page draws the viewport) or back to EEVEE."""
    if on:
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.display.shading.light = "STUDIO"
        sc.display.shading.color_type = "MATERIAL"
        sc.render.film_transparent = True
        sc.view_settings.view_transform = "Standard"
        sc.render.image_settings.color_mode = "RGBA"
    else:
        sc.render.engine = "BLENDER_EEVEE"
        sc.render.film_transparent = False
        sc.view_settings.view_transform = "AgX"
        sc.render.image_settings.color_mode = "RGB"


def build(out):
    """One image per step (sNN.webp is step NN), each one what the student sees after it."""
    s = Scene()
    s.factory()
    sc = s.sc
    cam = sc.camera
    shot = lambda n: s.render(out, n)

    # 1. Map of the screen (the factory scene, as on opening Blender) and
    # 2. Numpad 0 and 3. the camera selected in the Outliner: still the 50 mm lens, in Solid.
    solid(sc, True)
    shot(1)
    shot(2)
    shot(3)
    # 4. Focal Length 35 mm (the 50 mm one cuts the cube once it is lifted).
    cam.data.lens = LENS
    shot(4)
    # 5. The cube up 1 m (G Z 1), still in Solid so the student sees it move.
    s.cube.location.z = 1
    shot(5)

    # 6. Rendered: EEVEE with the factory light and grey World.
    solid(sc, False)
    shot(6)
    # 7. Delete the light: only the grey World lights the cube.
    bpy.data.objects.remove(s.light)
    shot(7)
    # 8. Black World: the screen goes black.
    s.bg.inputs["Color"].default_value = (0, 0, 0, 1)
    shot(8)
    # 9. The material renamed "Neó cian": nothing changes on screen.
    cyan = s.cube.data.materials[0]
    cyan.name = "Neó cian"
    shot(9)
    # 10. Emission: the whole cube glows (almost white with AgX).
    s.neon(cyan, CYAN, CYAN_STRENGTH)
    shot(10)
    # 11. Wireframe: only the edges are left.
    s.cube.modifiers.new("Wireframe", "WIREFRAME")
    shot(11)

    # 12. Grid 20 × 20, Size 20: without material or light it is black on black.
    with s.ctx():
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=20, y_subdivisions=20, size=20, location=(0, 0, 0))
    grid = bpy.context.active_object
    shot(12)
    # 13. Wireframe and the same material: the grid glows too.
    wf = grid.modifiers.new("Wireframe", "WIREFRAME")
    grid.data.materials.append(cyan)
    shot(13)
    # 14. Compositor ▸ New and 15. the Glare: the viewport does not show it yet.
    shot(14)
    shot(15)
    # 16. Compositor Always in the viewport: the bloom appears.
    ng, rl, rr = s.compositor_new()
    glare = ng.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Bloom"
    ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
    ng.links.new(glare.outputs["Image"], rr.inputs[0])
    shot(16)
    # 17. View Transform Standard: the cyan stops turning white.
    sc.view_settings.view_transform = "Standard"
    shot(17)

    # 18. Torus placed in the N panel: without material it is black, nothing new on screen.
    with s.ctx():
        bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0))
    torus = bpy.context.active_object
    torus.location = TORUS_LOC
    torus.rotation_euler = tuple(math.radians(a) for a in TORUS_ROT)
    shot(18)
    # 19. New material "Neó taronja" with its Emission: a solid orange ring.
    orange = bpy.data.materials.new("Neó taronja")
    torus.data.materials.append(orange)
    s.neon(orange, ORANGE, ORANGE_STRENGTH)
    shot(19)
    # 20. Its Wireframe.
    torus.modifiers.new("Wireframe", "WIREFRAME")
    shot(20)

    # 21. Thicker grid lines and 22. a wider bloom, for the wall.
    wf.thickness = THICK
    shot(21)
    glare.inputs["Size"].default_value = GLARE_SIZE
    shot(22)

    # 23. F12: the same image at full size.
    sc.render.resolution_percentage = 100
    sc.render.image_settings.quality = 85
    shot(23)
    return {"scene": s, "cube": s.cube, "grid": grid, "torus": torus, "glare": glare}


def main(here=HERE, out=None):
    out = out or os.path.normpath(os.path.join(here, "..", "..", "..", "src", "pills", "blender", "neon"))
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    win = bpy.context.window
    old = win.scene
    try:
        build(out)
    finally:
        win.scene = old
    print("neon pill rendered to", out)
