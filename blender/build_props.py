"""Build low-poly market props with vertex colours and export them to public/models/props.glb.

Runs inside Blender (4.x). Works in a dedicated scene "MarketProps" so the currently open
file is left alone. Re-running rebuilds everything from scratch.
"""
import math
import bpy
import bmesh
from mathutils import Vector

OUT = r"D:\market_tycoon\public\models\props.glb"
SCENE = "MarketProps"
COLL = "props"

# Palette — keep in sync with ART.md / src/scene/materials.ts (sRGB hex → linear)
HEX = {
    "pave": 0xE8D9C3, "paveDark": 0xD2BFA3, "grass": 0x8CC152, "hedge": 0x5FA83F,
    "teal": 0x3BAA9A, "tealDark": 0x2E8A7D, "orange": 0xF28C28, "yellow": 0xF6C544,
    "cream": 0xFFF4DE, "wood": 0xB9793A, "woodDark": 0x8E5A28, "red": 0xE45B4F,
    "skin": 0xF4C9A6, "white": 0xFFFFFF, "ink": 0x3B3A45, "glass": 0xBFE6F5,
    "pink": 0xF39BC0, "purple": 0x8E6BC1, "green": 0x7CC46B, "brown": 0xB5845A,
    "crust": 0xD9924A, "coffee": 0x4A2C1A,
}

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def col(name):
    h = HEX[name]
    r, g, b = ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)

# ---------------------------------------------------------------- scene setup
def get_scene():
    sc = bpy.data.scenes.get(SCENE)
    if sc is None:
        sc = bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = sc
    # wipe previous build
    coll = bpy.data.collections.get(COLL)
    if coll:
        for o in list(coll.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    else:
        coll = bpy.data.collections.new(COLL)
        sc.collection.children.link(coll)
    for m in list(bpy.data.meshes):
        if m.users == 0 and m.name.startswith("mp_"):
            bpy.data.meshes.remove(m)
    return sc, coll

def get_material():
    mat = bpy.data.materials.get("MP_Palette")
    if mat is None:
        mat = bpy.data.materials.new("MP_Palette")
        mat.use_nodes = True
        nt = mat.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        attr = nt.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        bsdf.inputs["Roughness"].default_value = 0.9
    return mat

# ---------------------------------------------------------------- part builder
class Prop:
    def __init__(self, name, coll, mat):
        self.name = name
        self.coll = coll
        self.mat = mat
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.color.new("Col")

    def _add(self, verts, faces, color, loc, rot, scale):
        c = col(color)
        m = bmesh.new()
        vs = [m.verts.new(Vector(v)) for v in verts]
        for f in faces:
            try:
                m.faces.new([vs[i] for i in f])
            except ValueError:
                pass
        m.normal_update()
        bmesh.ops.scale(m, vec=Vector(scale), verts=m.verts)
        if rot:
            from mathutils import Euler
            bmesh.ops.rotate(m, cent=Vector((0, 0, 0)), matrix=Euler(rot, "XYZ").to_matrix(), verts=m.verts)
        bmesh.ops.translate(m, vec=Vector(loc), verts=m.verts)
        # copy into main bmesh with colour
        m.verts.index_update()
        nv = [self.bm.verts.new(v.co) for v in m.verts]
        for f in m.faces:
            try:
                nf = self.bm.faces.new([nv[v.index] for v in f.verts])
            except ValueError:
                continue
            for l in nf.loops:
                l[self.layer] = c
        m.free()

    # primitives -------------------------------------------------------------
    def box(self, color, size, loc, rot=None):
        sx, sy, sz = [s / 2 for s in size]
        verts = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
                 (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        self._add(verts, faces, color, loc, rot, (1, 1, 1))

    def cyl(self, color, r_bottom, r_top, h, loc, seg=8, rot=None, cap=True):
        verts, faces = [], []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((math.cos(a) * r_bottom, math.sin(a) * r_bottom, -h / 2))
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((math.cos(a) * r_top, math.sin(a) * r_top, h / 2))
        for i in range(seg):
            j = (i + 1) % seg
            faces.append((i, j, seg + j, seg + i))
        if cap:
            faces.append(tuple(reversed(range(seg))))
            faces.append(tuple(range(seg, 2 * seg)))
        self._add(verts, faces, color, loc, rot, (1, 1, 1))

    def cone(self, color, r, h, loc, seg=8, rot=None):
        verts = [(math.cos(2 * math.pi * i / seg) * r, math.sin(2 * math.pi * i / seg) * r, -h / 2) for i in range(seg)]
        verts.append((0, 0, h / 2))
        faces = [(i, (i + 1) % seg, seg) for i in range(seg)]
        faces.append(tuple(reversed(range(seg))))
        self._add(verts, faces, color, loc, rot, (1, 1, 1))

    def sphere(self, color, r, loc, seg=8, rings=5, scale=(1, 1, 1)):
        verts, faces = [], []
        for j in range(1, rings):
            phi = math.pi * j / rings
            for i in range(seg):
                th = 2 * math.pi * i / seg
                verts.append((r * math.sin(phi) * math.cos(th), r * math.sin(phi) * math.sin(th), r * math.cos(phi)))
        top = len(verts); verts.append((0, 0, r))
        bot = len(verts); verts.append((0, 0, -r))
        for j in range(rings - 2):
            for i in range(seg):
                a, b = j * seg + i, j * seg + (i + 1) % seg
                faces.append((a, b, b + seg, a + seg))
        for i in range(seg):
            faces.append(((i + 1) % seg, i, top))
            base = (rings - 2) * seg
            faces.append((base + i, base + (i + 1) % seg, bot))
        self._add(verts, faces, color, loc, None, scale)

    def finish(self):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        me = bpy.data.meshes.new("mp_" + self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.materials.append(self.mat)
        for p in me.polygons:
            p.use_smooth = False
        ob = bpy.data.objects.new(self.name, me)
        self.coll.objects.link(ob)
        return ob

# ---------------------------------------------------------------- props
AWNING = {"vegetable": "orange", "bakery": "yellow", "cafe": "cream", "flower": "pink"}
GOODS = {
    "vegetable": ["orange", "red", "green"],
    "bakery": ["brown", "yellow", "cream"],
    "cafe": ["white", "brown", "cream"],
    "flower": ["red", "yellow", "pink"],
}

def kiosk(kind, coll, mat):
    p = Prop(f"prop_kiosk_{kind}", coll, mat)
    # octagonal body
    p.cyl("teal", 0.78, 0.78, 0.95, (0, 0, 0.475), seg=8)
    p.cyl("tealDark", 0.82, 0.82, 0.08, (0, 0, 0.04), seg=8)          # plinth
    p.cyl("cream", 0.92, 0.92, 0.1, (0, 0, 1.0), seg=8)               # counter
    # awning (two-tone scallop feel: main cone + slightly larger thin rim in cream)
    p.cone(AWNING[kind], 1.35, 0.55, (0, 0, 1.55), seg=8)
    p.cyl("cream", 1.36, 1.3, 0.08, (0, 0, 1.3), seg=8)
    # upper glass drum + roof
    p.cyl("glass", 0.55, 0.55, 0.45, (0, 0, 1.95), seg=8)
    for i in range(8):
        a = 2 * math.pi * i / 8
        p.box("teal", (0.06, 0.06, 0.5), (math.cos(a) * 0.55, math.sin(a) * 0.55, 1.95))
    p.cone("teal", 0.68, 0.7, (0, 0, 2.5), seg=8)
    p.sphere("yellow", 0.1, (0, 0, 2.9), seg=6, rings=4)
    # posts
    for a in [math.pi / 8 + i * math.pi / 4 for i in range(8)]:
        p.cyl("teal", 0.035, 0.035, 1.3, (math.cos(a) * 1.05, math.sin(a) * 1.05, 0.65), seg=5)
    # sign board
    p.box("cream", (0.7, 0.05, 0.3), (0, -0.8, 1.42))
    p.box(AWNING[kind], (0.6, 0.02, 0.2), (0, -0.83, 1.42))
    # goods crates on the front (−Y is front)
    for i, c in enumerate(GOODS[kind]):
        x = -0.45 + i * 0.45
        p.box("wood", (0.36, 0.3, 0.2), (x, -0.62, 1.15))
        p.box("woodDark", (0.3, 0.24, 0.02), (x, -0.62, 1.26))
        for k in range(3):
            p.sphere(c, 0.07, (x - 0.1 + k * 0.1, -0.62 + (k % 2) * 0.06 - 0.03, 1.3), seg=5, rings=3)
    # side crates on the ground
    p.box("wood", (0.5, 0.4, 0.35), (-1.05, 0.55, 0.175))
    p.box(GOODS[kind][0], (0.4, 0.3, 0.06), (-1.05, 0.55, 0.37))
    p.box("wood", (0.45, 0.4, 0.3), (1.05, 0.45, 0.15))
    p.box(GOODS[kind][1], (0.35, 0.3, 0.06), (1.05, 0.45, 0.32))
    return p.finish()

def parasol(coll, mat):
    p = Prop("deco_parasol", coll, mat)
    p.cyl("white", 0.55, 0.55, 0.05, (0, 0, 0.72), seg=8)
    p.cyl("white", 0.04, 0.04, 0.7, (0, 0, 0.36), seg=6)
    p.cyl("white", 0.25, 0.25, 0.04, (0, 0, 0.02), seg=8)
    p.cyl("white", 0.035, 0.035, 1.5, (0, 0, 1.5), seg=6)
    p.cone("orange", 1.15, 0.5, (0, 0, 2.1), seg=8)
    p.cyl("cream", 1.16, 1.1, 0.08, (0, 0, 1.87), seg=8)
    p.sphere("yellow", 0.07, (0, 0, 2.4), seg=6, rings=4)
    for a in (0.6, math.pi + 0.6):
        x, y = math.cos(a) * 0.85, math.sin(a) * 0.85
        p.box("white", (0.38, 0.38, 0.05), (x, y, 0.45))
        p.box("white", (0.38, 0.05, 0.4), (x - math.cos(a) * 0.17, y - math.sin(a) * 0.17, 0.65), rot=(0, 0, a))
        for dx, dy in ((-0.15, -0.15), (0.15, -0.15), (-0.15, 0.15), (0.15, 0.15)):
            p.cyl("white", 0.02, 0.02, 0.43, (x + dx, y + dy, 0.215), seg=4)
    return p.finish()

def bench(coll, mat):
    p = Prop("deco_bench", coll, mat)
    p.box("wood", (1.5, 0.45, 0.08), (0, 0, 0.46))
    for y in (-0.15, 0.0, 0.15):
        p.box("woodDark", (1.5, 0.02, 0.02), (0, y, 0.505))
    p.box("wood", (1.5, 0.08, 0.4), (0, 0.24, 0.72), rot=(-0.2, 0, 0))
    for x in (-0.6, 0.6):
        p.box("teal", (0.08, 0.4, 0.42), (x, 0, 0.21))
        p.box("teal", (0.08, 0.08, 0.5), (x, 0.24, 0.7), rot=(-0.2, 0, 0))
    return p.finish()

def planter(coll, mat):
    p = Prop("deco_planter", coll, mat)
    p.box("wood", (1.3, 0.8, 0.45), (0, 0, 0.225))
    p.box("woodDark", (1.34, 0.84, 0.06), (0, 0, 0.45))
    p.box("hedge", (1.2, 0.7, 0.1), (0, 0, 0.5))
    for i in range(6):
        x = -0.45 + (i % 3) * 0.45
        y = -0.18 if i < 3 else 0.18
        c = ["red", "yellow", "pink", "white", "orange", "purple"][i]
        p.cyl("green", 0.02, 0.02, 0.25, (x, y, 0.65), seg=4)
        p.sphere(c, 0.11, (x, y, 0.8), seg=6, rings=4)
    return p.finish()

def hedge(coll, mat):
    p = Prop("deco_hedge", coll, mat)
    p.box("hedge", (1.8, 0.9, 0.85), (0, 0, 0.45))
    p.box("grass", (1.7, 0.8, 0.12), (0, 0, 0.9))
    for x, y in ((-0.6, -0.25), (0.1, 0.3), (0.7, -0.2)):
        p.sphere("yellow", 0.06, (x, y, 0.98), seg=5, rings=3)
    return p.finish()

def lamp(coll, mat):
    p = Prop("deco_lamp", coll, mat)
    p.cyl("teal", 0.22, 0.16, 0.35, (0, 0, 0.175), seg=8)
    p.cyl("teal", 0.06, 0.05, 2.5, (0, 0, 1.6), seg=6)
    p.box("teal", (0.1, 0.1, 0.1), (0, 0, 2.9))
    p.box("teal", (0.03, 0.03, 0.35), (0, 0, 3.05))
    p.cone("teal", 0.3, 0.15, (0, 0, 3.3), seg=6)
    p.cyl("yellow", 0.2, 0.24, 0.35, (0, 0, 3.06), seg=6)
    p.box("orange", (0.5, 0.05, 0.7), (0.0, 0.32, 1.8))   # hanging banner
    p.box("yellow", (0.4, 0.02, 0.5), (0.0, 0.35, 1.8))
    return p.finish()

def statue(coll, mat):
    p = Prop("deco_statue", coll, mat)
    p.cyl("grass", 1.05, 1.05, 0.15, (0, 0, 0.075), seg=12)
    p.cyl("pave", 0.55, 0.55, 0.2, (0, 0, 0.25), seg=8)
    p.box("white", (0.5, 0.5, 0.7), (0, 0, 0.7))
    p.box("pave", (0.6, 0.6, 0.08), (0, 0, 1.08))
    p.cyl("white", 0.16, 0.14, 0.9, (0, 0, 1.55), seg=8)
    p.sphere("white", 0.22, (0, 0, 2.15), seg=8, rings=5)
    for i in range(8):
        a = 2 * math.pi * i / 8
        p.sphere(["yellow", "red", "white"][i % 3], 0.08, (math.cos(a) * 0.85, math.sin(a) * 0.85, 0.2), seg=5, rings=3)
    return p.finish()

def customer(coll, mat, shirt, hair, name):
    p = Prop(name, coll, mat)
    p.cyl("ink", 0.12, 0.13, 0.35, (-0.1, 0, 0.175), seg=6)
    p.cyl("ink", 0.12, 0.13, 0.35, (0.1, 0, 0.175), seg=6)
    p.cyl(shirt, 0.24, 0.2, 0.5, (0, 0, 0.6), seg=8)
    p.sphere(shirt, 0.24, (0, 0, 0.85), seg=8, rings=4, scale=(1, 1, 0.5))
    p.cyl(shirt, 0.07, 0.06, 0.45, (-0.3, 0, 0.62), seg=5)
    p.cyl(shirt, 0.07, 0.06, 0.45, (0.3, 0, 0.62), seg=5)
    p.sphere("skin", 0.07, (-0.3, 0, 0.38), seg=5, rings=3)
    p.sphere("skin", 0.07, (0.3, 0, 0.38), seg=5, rings=3)
    p.cyl("skin", 0.08, 0.08, 0.1, (0, 0, 0.9), seg=6)
    p.sphere("skin", 0.26, (0, 0, 1.2), seg=8, rings=5)
    p.sphere(hair, 0.28, (0, 0.02, 1.26), seg=8, rings=4, scale=(1, 1, 0.7))
    p.box("cream", (0.22, 0.14, 0.26), (0.36, 0.1, 0.5))
    return p.finish()

# ---------------------------------------------------------------- run
def load_shops():
    import importlib.util, os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\market_tycoonlender", "shops.py")
    spec = importlib.util.spec_from_file_location("mp_shops", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod

def build():
    sc, coll = get_scene()
    mat = get_material()
    shops = load_shops()
    objs = []
    for k in AWNING:
        for tier in range(3):
            p = Prop(f"prop_kiosk_{k}_lv{tier}", coll, mat)
            shops.shop(p, k, tier)
            objs.append(p.finish())
    pf = Prop("deco_fountain", coll, mat); shops.fountain(pf); objs.append(pf.finish())
    objs += [parasol(coll, mat), bench(coll, mat), planter(coll, mat), hedge(coll, mat), lamp(coll, mat), statue(coll, mat)]
    objs += [customer(coll, mat, s, h, f"char_customer_{i}") for i, (s, h) in enumerate(
        [("teal", "wood"), ("orange", "ink"), ("red", "brown"), ("purple", "yellow"), ("green", "ink"), ("yellow", "wood")])]
    # lay out in a row for inspection
    for i, o in enumerate(objs):
        o.location.x = (i % 8) * 3.0
        o.location.y = -(i // 8) * 3.5
    return objs

def export(objs):
    coll = bpy.data.collections[COLL]
    lc = next(l for l in bpy.context.view_layer.layer_collection.children if l.collection == coll)
    bpy.context.view_layer.active_layer_collection = lc
    for o in objs:
        o.location = (0, 0, 0)     # export at origin
    kw = dict(filepath=OUT, export_format="GLB", use_selection=False, use_active_collection=True, export_yup=True,
              export_apply=True, export_materials="EXPORT", export_normals=True,
              export_texcoords=False, export_animations=False, export_skins=False)
    try:
        bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    for i, o in enumerate(objs):
        o.location.x = (i % 8) * 3.0
        o.location.y = -(i // 8) * 3.5

objs = build()
export(objs)
import os
result = {"count": len(objs), "names": [o.name for o in objs],
          "tris": {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs},
          "glb_bytes": os.path.getsize(OUT), "blender": bpy.app.version_string}
