import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toonVertex } from '../scene/materials';

/** Templates keyed by object name in props.glb (e.g. "prop_kiosk_vegetable"). */
const templates = new Map<string, THREE.Object3D>();

export async function loadProps(url = `${import.meta.env.BASE_URL}models/props.glb`): Promise<void> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const m = o as THREE.Mesh;
      m.material = toonVertex();
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  for (const child of gltf.scene.children) {
    child.position.set(0, 0, 0);
    templates.set(child.name, child);
  }
}

export const hasTemplate = (name: string) => templates.has(name);

export function instantiate(name: string): THREE.Object3D | null {
  const t = templates.get(name);
  return t ? t.clone(true) : null;
}

export const templateNames = () => [...templates.keys()];
