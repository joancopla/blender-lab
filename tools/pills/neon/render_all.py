# Renders the images of the neon look pill (src/pills/blender/neon/).
#
# Run from a live Blender 5.1 session: exec this file, then call main(). It builds its own
# scene "PillNeon" (the factory cube, camera and light) and leaves the user's scene alone.
# Every step is rendered with EEVEE through the factory camera, with the scene's compositor
# (Glare Bloom from step 4), so each image is what the student sees in Rendered.
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


def build(out):
    s = Scene()
    s.factory()
    sc = s.sc
    cam = sc.camera

    # 1. Numpad 0, select the camera, Focal Length 35 mm (the 50 mm one cuts the cube).
    cam.data.lens = LENS
    # Still in Solid: Workbench with a transparent background (the page draws the viewport's).
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.color_mode = "RGBA"
    s.render(out, 1)
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.render.image_settings.color_mode = "RGB"

    # 2. Rendered, delete the light, black World.
    bpy.data.objects.remove(s.light)
    s.bg.inputs["Color"].default_value = (0, 0, 0, 1)
    s.render(out, 2)

    # 3. Cube up 1 m, its material renamed "Neó cian" with a cyan Emission, and a Wireframe.
    s.cube.location.z = 1
    cyan = s.cube.data.materials[0]
    cyan.name = "Neó cian"
    s.neon(cyan, CYAN, CYAN_STRENGTH)
    s.cube.modifiers.new("Wireframe", "WIREFRAME")
    s.render(out, 3)

    # 4. Grid 20 × 20, Size 20, Wireframe, the same material.
    with s.ctx():
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=20, y_subdivisions=20, size=20, location=(0, 0, 0))
    grid = bpy.context.active_object
    wf = grid.modifiers.new("Wireframe", "WIREFRAME")
    grid.data.materials.append(cyan)
    s.render(out, 4)

    # 5. Compositor: New, Glare Bloom between Render Layers and the Reroute.
    ng, rl, rr = s.compositor_new()
    glare = ng.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Bloom"
    ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
    ng.links.new(glare.outputs["Image"], rr.inputs[0])
    s.render(out, 5)

    # 6. View Transform Standard.
    sc.view_settings.view_transform = "Standard"
    s.render(out, 6)

    # 7. Torus with an orange neon and its own Wireframe, placed in the N panel.
    with s.ctx():
        bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0))
    torus = bpy.context.active_object
    torus.location = TORUS_LOC
    torus.rotation_euler = tuple(math.radians(a) for a in TORUS_ROT)
    orange = bpy.data.materials.new("Neó taronja")
    torus.data.materials.append(orange)
    s.neon(orange, ORANGE, ORANGE_STRENGTH)
    torus.modifiers.new("Wireframe", "WIREFRAME")
    s.render(out, 7)

    # 8. Ready for the wall: thicker grid lines and a wider bloom.
    wf.thickness = THICK
    glare.inputs["Size"].default_value = GLARE_SIZE
    s.render(out, 8)

    # 9. F12: the same image at full size.
    sc.render.resolution_percentage = 100
    sc.render.image_settings.quality = 85
    s.render(out, 9)
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
