import * as THREE from 'three';

/** Palette shared with ART.md. Keep the two in sync. */
export const PALETTE = {
  sky: 0xbfe6f5,
  pave: 0xe8d9c3,
  paveDark: 0xd2bfa3,
  grass: 0x8cc152,
  hedge: 0x5fa83f,
  teal: 0x3baa9a,
  orange: 0xf28c28,
  yellow: 0xf6c544,
  cream: 0xfff4de,
  wood: 0xb9793a,
  red: 0xe45b4f,
  skin: 0xf4c9a6,
  white: 0xffffff,
  ink: 0x3b3a45,
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** 3-step gradient map for MeshToonMaterial. */
const gradientMap = (() => {
  const data = new Uint8Array([120, 190, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const cache = new Map<number, THREE.MeshToonMaterial>();

export function toon(color: number | PaletteKey): THREE.MeshToonMaterial {
  const hex = typeof color === 'string' ? PALETTE[color] : color;
  let m = cache.get(hex);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: hex, gradientMap });
    cache.set(hex, m);
  }
  return m;
}

let vertexMat: THREE.MeshToonMaterial | null = null;
/** Shared toon material that reads per-vertex colours (Blender-exported props). */
export function toonVertex(): THREE.MeshToonMaterial {
  if (!vertexMat) vertexMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
  return vertexMat;
}
