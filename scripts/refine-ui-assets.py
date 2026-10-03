"""Refine the supplied CC0 models using Blender, without application dependencies.

Run from the repository root:
    blender --background --factory-startup --python-exit-code 1 --python scripts/refine-ui-assets.py
Then convert the transparent PNG renders with scripts/encode-ui-posters.py.
"""

from pathlib import Path
import hashlib
import json
import math
import struct
import sys

import bpy
from mathutils import Vector, Matrix


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/pn-ui-v2/originals"
DESIGN = ROOT / "design/pn-ui-v2"
PUBLIC = ROOT / "public/assets/pn-ui-v2"
PALETTE = {
    "teal": "0b6b6b",
    "mint": "d8efee",
    "amber": "f2a33a",
    "paper": "f7f5f0",
    "ink": "14212b",
    "white": "ffffff",
    "blue": "91b5d1",
}
IDS = ("learning-board", "balance-scale", "algebra-kit")


def rgba_linear(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
                 for v in values) + (1.0,)


def material(color):
    mat = bpy.data.materials.new("PapanNalar_" + color)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba_linear(PALETTE[color])
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Roughness"].default_value = .58 if color == "amber" else .72
    shader.inputs["Specular IOR Level"].default_value = .28
    mat.diffuse_color = rgba_linear(PALETTE[color])
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 4
        modifier.harden_normals = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if bevel:
        modifier = obj.modifiers.new("Stable flat-face normals", "WEIGHTED_NORMAL")
        modifier.keep_sharp = True
        modifier.weight = 50
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def bounds(objects):
    corners = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    low = Vector(tuple(min(c[i] for c in corners) for i in range(3)))
    high = Vector(tuple(max(c[i] for c in corners) for i in range(3)))
    return low, high


def refine(source, mats):
    low, high = bounds([source])
    center, size = (high + low) / 2, high - low
    name = source.name.split(".")[0]
    color = source.data.materials[0].name.split(".")[0].removeprefix("pn_")
    bpy.data.objects.remove(source, do_unlink=True)
    if name in ("moment_of_understanding", "pivot", "insight"):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16,
                                            radius=max(size) / 2, location=center)
        return finish(bpy.context.object, name, mats[color])
    if "cord" in name or name.endswith("_pan"):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,
                                            radius=size.x / 2, depth=size.z,
                                            location=center)
        return finish(bpy.context.object, name, mats[color],
                      .024 if name.endswith("_pan") else .006)
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mats[color], min(.085, min(size) * .38))


def area(name, location, target, power, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.size = power, size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def glb_stats(path):
    data = path.read_bytes()
    length, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(data[20:20 + length])
    assert not any(b.get("uri") for b in doc.get("buffers", []))
    assert not doc.get("images") and not doc.get("animations")
    assert not doc.get("cameras") and not doc.get("skins")
    triangles = sum(doc["accessors"][p["indices"]]["count"] // 3
                    for m in doc["meshes"] for p in m["primitives"])
    assert len(data) < 500000
    return {"bytes": len(data), "triangles": triangles,
            "meshes": len(doc["meshes"]),
            "sha256": hashlib.sha256(data).hexdigest()}


def algebra_models(mats):
    """A coherent inclined tray: square x², equal-length x rods, unit squares.

    All markings are original mesh strokes. No fonts, textures or downloads.
    The sloping face remains visible from the application's +Z front camera.
    """
    models = []
    def box(name, location, size, color, rotation=0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        obj = bpy.context.object
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, name, mats[color], min(.055, min(size) * .28))
        obj.rotation_euler.z = rotation
        models.append(obj)
        return obj

    box("Rounded learning tray", (0, 0, 0), (2.88, 2.26, .14), "paper")
    box("Recessed mint surface", (0, 0, .082), (2.68, 2.06, .035), "mint")
    box("Square x squared", (-.73, .36, .17), (1.12, 1.12, .14), "teal")
    # Raised x marks: preserve clear tile silhouettes without a floating sphere.
    def x_mark(x, y, size=.14):
        for angle in (-math.pi / 4, math.pi / 4):
            box("Raised x mark", (x, y, .25), (size, .026, .018), "white", angle)
    x_mark(-.78, .36, .22)
    # A rounded original stroke keeps the raised superscript unmistakably 2.
    curve = bpy.data.curves.new("Raised numeral two", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution, curve.resolution_u = .009, 2, 6
    spline = curve.splines.new("BEZIER")
    points = [(-.60, .51), (-.58, .54), (-.53, .535), (-.53, .505),
              (-.56, .48), (-.60, .44), (-.52, .44)]
    spline.bezier_points.add(len(points) - 1)
    for point, (x, y) in zip(spline.bezier_points, points):
        point.co = (x, y, .25)
        point.handle_left_type = point.handle_right_type = "AUTO"
    numeral = bpy.data.objects.new("Raised squared mark", curve)
    bpy.context.scene.collection.objects.link(numeral)
    bpy.context.view_layer.objects.active = numeral
    numeral.select_set(True)
    bpy.ops.object.convert(target="MESH")
    finish(bpy.context.object, "Raised squared mark", mats["white"])
    models.append(bpy.context.object)
    for i in range(3):
        x = .15 + i * .37
        box("Equal x rod " + str(i + 1), (x, .36, .17), (.29, 1.12, .14), "teal" if i == 0 else "blue")
        x_mark(x, .36)
    for i in range(5):
        x = -.94 + i * .46
        box("Unit square " + str(i + 1), (x, -.68, .17), (.29, .29, .14), "amber")
        box("Raised unit mark", (x, -.68, .25), (.026, .13, .018), "ink")
    bpy.context.view_layer.update()
    rotation = Matrix.Rotation(math.radians(66), 4, "X")
    for obj in models:
        obj.matrix_world = Matrix.Translation(Vector((0, 0, 1.17))) @ rotation @ obj.matrix_world
    box("Stable low plinth", (0, .32, .07), (2.68, 1.22, .14), "paper")
    box("Rear support", (0, .70, .55), (.68, .21, 1.04), "teal")
    bpy.context.view_layer.update()
    return models


def build(asset):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.data.orphans_purge(do_recursive=True)
    mats = {name: material(name) for name in PALETTE}
    if asset == "algebra-kit":
        models = algebra_models(mats)
    else:
        bpy.ops.import_scene.gltf(filepath=str(SOURCE / "models" / (asset + ".glb")))
        imported = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        models = [refine(obj, mats) for obj in imported]
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in models:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = models[0]
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC / "models" / (asset + ".glb")),
                              export_format="GLB", use_selection=True,
                              export_animations=False, export_cameras=False,
                              export_lights=False, export_yup=True,
                              export_materials="EXPORT", export_normals=True,
                              export_texcoords=False, export_attributes=False)
    scene = bpy.context.scene
    scene.name = "PapanNalar — " + asset
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    # The system Blender build has no OpenImageDenoise. Render enough CPU
    # samples directly rather than depending on a missing denoising backend.
    scene.cycles.samples = 96
    scene.cycles.use_denoising = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 5
    scene.render.resolution_x = 720
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .5
    low, high = bounds(models)
    center = (low + high) / 2
    size = high - low
    data = bpy.data.cameras.new("Poster camera")
    camera = bpy.data.objects.new("Poster camera", data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((.42, -.86, .29)).normalized() * 8
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    bpy.context.view_layer.update()
    view = camera.matrix_world.inverted()
    projected = [view @ (o.matrix_world @ Vector(c)) for o in models for c in o.bound_box]
    width = max(c.x for c in projected) - min(c.x for c in projected)
    height = max(c.y for c in projected) - min(c.y for c in projected)
    data.ortho_scale = max(width, height * 4 / 3) * 1.14
    scene.camera = camera
    area("Large soft key", center + Vector((-3.2, -4.0, 5.0)), center, 420, 4)
    area("Front fill", center + Vector((3.5, -2.0, 2.0)), center, 180, 3.5)
    area("Soft rim", center + Vector((1.5, 3.0, 4.0)), center, 250, 3)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, low.z - .005))
    ground = bpy.context.object
    ground.name = "Poster contact shadow — excluded from GLB"
    ground.is_shadow_catcher = True
    ground.data.materials.append(mats["paper"])
    scene.render.filepath = str(DESIGN / "renders" / (asset + ".png"))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(DESIGN / (asset + ".blend")), compress=True)
    bpy.ops.render.render(write_still=True)
    return {"id": asset, **glb_stats(PUBLIC / "models" / (asset + ".glb")),
            "sourceSha256": hashlib.sha256((SOURCE / "models" / (asset + ".glb")).read_bytes()).hexdigest(),
            "blendFile": "design/pn-ui-v2/" + asset + ".blend",
            "dimensionsBlenderZUp": [round(v, 5) for v in size],
            **({"geometry": "Original inclined tray with x² square, three x rods and five unit tiles; raised mesh labels"} if asset == "algebra-kit" else {})}


(DESIGN / "renders").mkdir(parents=True, exist_ok=True)
bpy.context.scene.world = bpy.data.worlds.new("PapanNalar studio")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
selected = args or list(IDS)
assert all(asset in IDS for asset in selected)
previous = json.loads((DESIGN / "blender-provenance.json").read_text()) if (DESIGN / "blender-provenance.json").exists() else {"models": []}
updated = {item["id"]: item for item in previous["models"]}
for asset in selected:
    updated[asset] = build(asset)
results = [updated[asset] for asset in IDS]
receipt = {"tool": "Blender", "version": bpy.app.version_string,
           "renderEngine": "Cycles CPU", "samples": 96, "denoising": False,
           "posterSize": [720, 540],
           "license": "CC0-1.0", "externalAssetDownloads": 0,
           "models": results}
(DESIGN / "blender-provenance.json").write_text(json.dumps(receipt, indent=2) + "\n")
print("PN_BLENDER_EXPORT " + json.dumps(receipt))
