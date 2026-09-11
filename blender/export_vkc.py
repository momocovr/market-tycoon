"""Export the MarketProps scene for Vket Cloud: bake per-face vertex colours into a palette PNG + UVs,
then write one GLB per prop into the Unity project (VKC Item Object accepts .glb).

Run inside Blender after build_props.py has built the "MarketProps" scene.
"""
import os
import re
import bpy

OUT_DIR = r"D:\market_tycoon_vkc\Assets\MarketTycoon\Models"
PALETTE_PNG = os.path.join(OUT_DIR, "palette.png")
SCENE = "MarketProps"
COLL = "props"
CELL = 16          # px per palette cell
COLS = 8           # cells per row

# Reuse the HEX table from build_props.py so colours stay in sync.
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals()
                         else r"D:\market_tycoon\blender", "build_props.py"), encoding="utf-8").read()
_m = re.search(r"HEX = \{(.*?)\n\}", _src, re.S)
HEX = eval("{" + _m.group(1) + "}")
NAMES = list(HEX.keys())
ROWS = (len(NAMES) + COLS - 1) // COLS


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(name):
    h = HEX[name]
    return tuple(srgb_to_linear(((h >> s) & 255) / 255) for s in (16, 8, 0))


LINEAR = {n: lin(n) for n in NAMES}


def nearest(rgb):
    best, bd = NAMES[0], 1e9
    for n, c in LINEAR.items():
        d = sum((a - b) ** 2 for a, b in zip(rgb, c))
        if d < bd:
            best, bd = n, d
    return best


def cell_uv(name):
    i = NAMES.index(name)
    cx, cy = i % COLS, i // COLS
    # image origin is bottom-left in Blender UV space; fill rows from the top
    u = (cx + 0.5) / COLS
    v = 1.0 - (cy + 0.5) / ROWS
    return u, v


def write_png(path, w, h, rgb_rows):
    """Minimal 8-bit RGB PNG writer (no PIL in Blender's Python)."""
    import struct, zlib
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    filt = bytes([0])
    raw = b"".join(filt + bytes(row) for row in rgb_rows)
    sig = bytes([137, 80, 78, 71, 13, 10, 26, 10])
    png = sig + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def make_palette_image():
    w, h = COLS * CELL, ROWS * CELL
    rows = []
    for y in range(h):                       # PNG rows go top → bottom
        cy = y // CELL
        row = []
        for x in range(w):
            i = cy * COLS + x // CELL
            hx = HEX[NAMES[i]] if i < len(NAMES) else 0x000000
            row += [(hx >> 16) & 255, (hx >> 8) & 255, hx & 255]
        rows.append(row)
    os.makedirs(OUT_DIR, exist_ok=True)
    write_png(PALETTE_PNG, w, h, rows)
    old = bpy.data.images.get("MP_PaletteTex")
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.load(PALETTE_PNG)
    img.name = "MP_PaletteTex"
    img.colorspace_settings.name = "sRGB"
    return img


def make_material(img):
    mat = bpy.data.materials.get("MP_PaletteTex")
    if mat is None:
        mat = bpy.data.materials.new("MP_PaletteTex")
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 1.0
    return mat


def bake_uvs(ob, mat):
    me = ob.data
    col = me.color_attributes.get("Col") or me.attributes.get("Col")
    if col is None:
        raise RuntimeError(f"{ob.name}: no Col attribute")
    uv = me.uv_layers.get("Palette") or me.uv_layers.new(name="Palette")
    me.uv_layers.active = uv
    data = col.data  # per-loop (corner) colours
    for poly in me.polygons:
        c = data[poly.loop_start].color
        name = nearest((c[0], c[1], c[2]))
        u, v = cell_uv(name)
        for li in range(poly.loop_start, poly.loop_start + poly.loop_total):
            uv.data[li].uv = (u, v)
    me.materials.clear()
    me.materials.append(mat)


def export_all():
    os.makedirs(OUT_DIR, exist_ok=True)
    sc = bpy.data.scenes[SCENE]
    bpy.context.window.scene = sc
    img = make_palette_image()
    mat = make_material(img)
    coll = bpy.data.collections[COLL]
    objs = [o for o in coll.objects if o.type == "MESH"]
    written = []
    for o in objs:
        bake_uvs(o, mat)
    saved = {o.name: o.location.copy() for o in objs}
    # export via a temporary collection so selections in other scenes are never included
    tmp = bpy.data.collections.get("mp_export_tmp") or bpy.data.collections.new("mp_export_tmp")
    if tmp.name not in sc.collection.children:
        sc.collection.children.link(tmp)
    lc = next(l for l in bpy.context.view_layer.layer_collection.children if l.collection == tmp)
    bpy.context.view_layer.active_layer_collection = lc
    for o in objs:
        for x in list(tmp.objects):
            tmp.objects.unlink(x)
        tmp.objects.link(o)
        o.location = (0, 0, 0)
        path = os.path.join(OUT_DIR, o.name + ".glb")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False, use_active_collection=True,
                                  export_yup=True, export_apply=True, export_materials="EXPORT",
                                  export_image_format="AUTO", export_texcoords=True, export_normals=True,
                                  export_animations=False, export_skins=False, export_vertex_color="NONE")
        o.location = saved[o.name]
        tmp.objects.unlink(o)
        written.append((o.name, os.path.getsize(path)))
    return written


written = export_all()
result = {"palette": PALETTE_PNG, "cells": len(NAMES), "files": written}
