"""Shop buildings (4 kinds × 3 visual tiers) + fountain, in the style of the reference art.
Imported by build_props.py. Front of every prop faces -Y (Blender) = +Z (three.js) = the queue side.
"""
import math

# tier 0: plain stall  /  tier 1: + chalkboard, side goods, hanging sign
# tier 2: + giant rooftop mascot, wall lamps, flower boxes, bunting
STYLE = {
    #            wall        roof        awning   awning2   goods
    "vegetable": ("green",   "hedge",    "hedge", "white",  ["orange", "red", "green", "yellow"]),
    "bakery":    ("wood",    "woodDark", "orange", "cream", ["crust", "yellow", "cream", "crust"]),
    "cafe":      ("brown",   "coffee",   "orange", "cream", ["white", "coffee", "cream", "white"]),
    "flower":    ("pink",    "red",      "pink",  "white",  ["red", "yellow", "purple", "pink"]),
}


def striped_awning(p, c1, c2, cx, cy, cz, width, length, tilt, stripes=8, thick=0.05):
    """Sloped awning made of alternating colour stripes, tilted about X (higher at +Y)."""
    sw = width / stripes
    for i in range(stripes):
        x = cx - width / 2 + sw * (i + 0.5)
        p.box(c1 if i % 2 == 0 else c2, (sw, length, thick), (x, cy, cz), rot=(tilt, 0, 0))
    # scalloped front trim: small half-round bumps along the low edge
    fy = cy - (length / 2) * math.cos(tilt)
    fz = cz - (length / 2) * math.sin(tilt)
    for i in range(stripes):
        x = cx - width / 2 + sw * (i + 0.5)
        p.sphere(c2 if i % 2 == 0 else c1, sw * 0.5, (x, fy, fz), seg=6, rings=3, scale=(1, 0.5, 0.6))


def mascot(p, kind, base_z):
    z = base_z
    if kind == "bakery":  # croissant: crescent of spheres, fat in the middle
        for i in range(9):
            t = i / 8
            a = math.pi * (1.0 + t)              # 180°..360°
            r = 0.42
            rad = 0.11 + 0.16 * math.sin(t * math.pi)
            p.sphere("crust" if 1 <= i <= 7 else "wood", rad, (math.cos(a) * r, math.sin(a) * r * 0.6 + 0.1, z + 0.26), seg=8, rings=5)
        p.sphere("yellow", 0.06, (0.05, -0.12, z + 0.5), seg=5, rings=3)
    elif kind == "vegetable":  # pumpkin + tomato + carrot
        p.sphere("orange", 0.42, (-0.1, 0.05, z + 0.38), seg=10, rings=6, scale=(1, 1, 0.8))
        for i in range(6):
            a = 2 * math.pi * i / 6
            p.sphere("orange", 0.36, (-0.1 + math.cos(a) * 0.12, 0.05 + math.sin(a) * 0.12, z + 0.38), seg=8, rings=5, scale=(1, 1, 0.8))
        p.cyl("hedge", 0.05, 0.04, 0.2, (-0.1, 0.05, z + 0.78), seg=6)
        p.sphere("red", 0.22, (0.5, -0.15, z + 0.22), seg=8, rings=5)
        p.sphere("hedge", 0.06, (0.5, -0.15, z + 0.42), seg=5, rings=3)
        p.cone("orange", 0.11, 0.55, (0.45, 0.45, z + 0.15), seg=7, rot=(0, 1.2, 0.3))
        p.sphere("hedge", 0.09, (0.2, 0.55, z + 0.25), seg=5, rings=3)
    elif kind == "flower":  # big pink flower + leaf
        for i in range(5):
            a = 2 * math.pi * i / 5 + 0.3
            p.sphere("pink", 0.24, (math.cos(a) * 0.32, math.sin(a) * 0.32, z + 0.35), seg=8, rings=5, scale=(1, 1, 0.45))
        p.sphere("yellow", 0.17, (0, 0, z + 0.4), seg=8, rings=5)
        p.sphere("hedge", 0.22, (0.45, -0.3, z + 0.15), seg=7, rings=4, scale=(1.4, 0.7, 0.35))
        p.sphere("yellow", 0.1, (-0.5, 0.25, z + 0.2), seg=6, rings=4)
        p.sphere("purple", 0.09, (-0.55, -0.2, z + 0.18), seg=6, rings=4)
    elif kind == "cafe":  # coffee cup on a saucer, with steam
        p.cyl("white", 0.48, 0.48, 0.05, (0, 0, z + 0.03), seg=12)
        p.cyl("white", 0.26, 0.32, 0.42, (0, 0, z + 0.27), seg=10)
        p.cyl("coffee", 0.28, 0.28, 0.03, (0, 0, z + 0.48), seg=10)
        for dz, dx in ((0.16, 0.36), (0.30, 0.42), (0.40, 0.36)):
            p.box("white", (0.12, 0.08, 0.1), (dx, 0, z + dz))
        p.box("white", (0.06, 0.08, 0.28), (0.45, 0, z + 0.3))
        p.sphere("white", 0.06, (0.05, 0, z + 0.65), seg=5, rings=3)
        p.sphere("white", 0.05, (-0.06, 0, z + 0.78), seg=5, rings=3)


def shop(p, kind, tier):
    wall, roof, aw1, aw2, goods = STYLE[kind]
    # --- body ---------------------------------------------------------------
    p.box("paveDark", (1.7, 1.6, 0.1), (0, 0.15, 0.05))                 # plinth
    p.box(wall, (1.5, 1.3, 1.3), (0, 0.25, 0.75))                       # walls  (y -0.4 .. 0.9)
    p.box(roof, (1.66, 1.46, 0.12), (0, 0.25, 1.46))                     # roof slab
    p.box(roof, (1.66, 0.08, 0.14), (0, -0.44, 1.56))                    # parapet front
    p.box(roof, (1.66, 0.08, 0.14), (0, 0.94, 1.56))                     # parapet back
    p.box(roof, (0.08, 1.46, 0.14), (-0.79, 0.25, 1.56))
    p.box(roof, (0.08, 1.46, 0.14), (0.79, 0.25, 1.56))
    # corner posts
    for x in (-0.75, 0.75):
        for y in (-0.4, 0.9):
            p.box("woodDark", (0.1, 0.1, 1.3), (x, y, 0.75))
    # side windows
    for x in (-0.77, 0.77):
        p.box("woodDark", (0.06, 0.5, 0.5), (x, 0.35, 0.85))
        p.box("glass", (0.04, 0.4, 0.4), (x * 1.02, 0.35, 0.85))
        p.box("woodDark", (0.03, 0.02, 0.4), (x * 1.04, 0.35, 0.85))
        p.box("woodDark", (0.03, 0.4, 0.02), (x * 1.04, 0.35, 0.85))
    # back door
    p.box("woodDark", (0.4, 0.06, 0.8), (0, 0.92, 0.5))
    # front wall: shop window + serving hatch
    p.box("woodDark", (1.2, 0.06, 0.55), (0, -0.42, 0.95))
    p.box("glass", (1.1, 0.04, 0.45), (0, -0.44, 0.95))
    # --- counter ------------------------------------------------------------
    p.box("woodDark", (1.5, 0.55, 0.62), (0, -0.7, 0.41))
    p.box("cream", (1.6, 0.65, 0.06), (0, -0.7, 0.75))
    for i, c in enumerate(goods[:3]):
        x = -0.48 + i * 0.48
        p.box("wood", (0.38, 0.34, 0.16), (x, -0.72, 0.86))
        p.box("woodDark", (0.32, 0.28, 0.02), (x, -0.72, 0.95))
        for k in range(4):
            p.sphere(c, 0.07, (x - 0.1 + (k % 2) * 0.2, -0.78 + (k // 2) * 0.14, 1.0), seg=6, rings=3)
    # awning over the counter
    striped_awning(p, aw1, aw2, 0, -0.78, 1.31, 1.8, 0.82, 0.5)
    # --- tier 1 -------------------------------------------------------------
    if tier >= 1:
        # A-frame chalkboard, right front
        p.box("wood", (0.42, 0.04, 0.6), (0.98, -0.62, 0.3), rot=(0.25, 0, 0))
        p.box("ink", (0.34, 0.02, 0.44), (0.98, -0.645, 0.32), rot=(0.25, 0, 0))
        p.box("wood", (0.42, 0.04, 0.6), (0.98, -0.42, 0.3), rot=(-0.25, 0, 0))
        p.box("cream", (0.16, 0.01, 0.03), (0.98, -0.66, 0.4), rot=(0.25, 0, 0))
        p.box("cream", (0.22, 0.01, 0.03), (0.98, -0.65, 0.3), rot=(0.25, 0, 0))
        # barrels / baskets with goods, left front
        p.cyl("wood", 0.2, 0.22, 0.42, (-1.0, -0.55, 0.21), seg=8)
        p.cyl("woodDark", 0.22, 0.22, 0.03, (-1.0, -0.55, 0.3), seg=8)
        for k in range(5):
            a = 2 * math.pi * k / 5
            p.sphere(goods[3], 0.07, (-1.0 + math.cos(a) * 0.1, -0.55 + math.sin(a) * 0.1, 0.45), seg=6, rings=3)
        p.cyl("wood", 0.15, 0.17, 0.3, (-0.95, -0.15, 0.15), seg=8)
        p.sphere(goods[0], 0.1, (-0.95, -0.15, 0.35), seg=6, rings=3)
        # hanging sign on the right wall
        p.box("woodDark", (0.4, 0.04, 0.04), (0.95, -0.2, 1.3))
        p.box("cream", (0.04, 0.34, 0.26), (1.1, -0.2, 1.1))
        p.box(aw1, (0.02, 0.26, 0.18), (1.13, -0.2, 1.1))
    # --- tier 2 -------------------------------------------------------------
    if tier >= 2:
        mascot(p, kind, 1.52)
        # wall lamps
        for x in (-0.6, 0.6):
            p.box("ink", (0.05, 0.12, 0.05), (x, -0.45, 1.3))
            p.sphere("yellow", 0.09, (x, -0.55, 1.3), seg=6, rings=4)
        # flower boxes on the roof parapet and under the side windows
        for x in (-0.55, 0.55):
            p.box("wood", (0.4, 0.2, 0.16), (x, -0.42, 1.65))
            for k in range(3):
                p.sphere(("red", "yellow", "white")[k], 0.06, (x - 0.12 + k * 0.12, -0.42, 1.78), seg=5, rings=3)
        for x in (-0.95, 0.95):
            p.box("wood", (0.16, 0.5, 0.16), (x, 0.35, 0.55))
            p.box("hedge", (0.14, 0.46, 0.1), (x, 0.35, 0.67))
            p.sphere(goods[1] if kind != "cafe" else "red", 0.06, (x, 0.35, 0.75), seg=5, rings=3)
        # bunting from the front corners to a pole
        for i in range(7):
            t = i / 6
            x = -0.85 + 1.7 * t
            z = 1.9 - 0.25 * math.sin(t * math.pi)
            p.box((aw1, "white", "yellow")[i % 3], (0.12, 0.02, 0.14), (x, -0.9, z))
        p.box("ink", (0.9, 0.02, 0.02), (0, -0.9, 1.9))
        p.cyl("ink", 0.02, 0.02, 0.5, (0.9, -0.9, 1.7), seg=4)
        p.cyl("ink", 0.02, 0.02, 0.5, (-0.9, -0.9, 1.7), seg=4)


def fountain(p):
    p.cyl("paveDark", 1.0, 1.0, 0.12, (0, 0, 0.06), seg=12)
    p.cyl("pave", 0.92, 0.92, 0.3, (0, 0, 0.25), seg=12)
    p.cyl("pave", 0.98, 0.98, 0.06, (0, 0, 0.42), seg=12)
    p.cyl("glass", 0.84, 0.84, 0.04, (0, 0, 0.42), seg=12)
    p.cyl("pave", 0.22, 0.26, 0.5, (0, 0, 0.65), seg=8)
    p.cyl("pave", 0.5, 0.42, 0.1, (0, 0, 0.93), seg=10)
    p.cyl("glass", 0.44, 0.44, 0.04, (0, 0, 0.99), seg=10)
    p.cyl("pave", 0.08, 0.1, 0.35, (0, 0, 1.15), seg=6)
    p.sphere("glass", 0.12, (0, 0, 1.4), seg=6, rings=4)
    # four water arcs
    for k in range(4):
        a = math.pi / 2 * k + math.pi / 4
        for i in range(5):
            t = (i + 1) / 6
            r = 0.55 * t
            z = 1.35 + 0.4 * math.sin(t * math.pi) - 0.35 * t
            p.sphere("glass", 0.05 + 0.02 * i, (math.cos(a) * r, math.sin(a) * r, z), seg=5, rings=3)
    # flowers around the rim
    for i in range(12):
        a = 2 * math.pi * i / 12
        p.sphere(("red", "yellow", "white", "pink")[i % 4], 0.07, (math.cos(a) * 0.92, math.sin(a) * 0.92, 0.48), seg=5, rings=3)
        p.sphere("hedge", 0.09, (math.cos(a + 0.26) * 0.92, math.sin(a + 0.26) * 0.92, 0.46), seg=5, rings=3)
