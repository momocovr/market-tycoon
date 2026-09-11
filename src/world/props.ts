import * as THREE from 'three';
import { toon, PALETTE } from '../scene/materials';
import type { BuildKind, DecorKind, StallKind } from '../sim/economy';
import { isStallKind } from '../sim/economy';
import { TILE, GRID_W, GRID_H } from './grid';
import { instantiate } from '../assets/loader';

/** Phase 1 placeholder props built from primitives. Replaced by Blender GLBs in Phase 2. */

function mesh(geo: THREE.BufferGeometry, color: Parameters<typeof toon>[0], y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const AWNING: Record<StallKind, number> = {
  vegetable: PALETTE.orange, bakery: PALETTE.yellow, cafe: PALETTE.cream, flower: PALETTE.red,
};
const GOODS: Record<StallKind, number[]> = {
  vegetable: [PALETTE.orange, PALETTE.red, PALETTE.hedge],
  bakery: [PALETTE.wood, PALETTE.yellow, PALETTE.cream],
  cafe: [PALETTE.white, PALETTE.wood, PALETTE.cream],
  flower: [PALETTE.red, PALETTE.yellow, PALETTE.white],
};

export function buildStall(kind: StallKind): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.9, 1.2), 'teal', 0.45));           // body
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.12, 1.4), 'cream', 0.95));        // counter
  const roof = mesh(new THREE.ConeGeometry(1.35, 0.7, 4), AWNING[kind], 1.75);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const post = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6);
  for (const [x, z] of [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]]) {
    const p = mesh(post, 'teal', 0.7); p.position.x = x; p.position.z = z; g.add(p);
  }
  g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), 'yellow', 2.15));        // finial
  // goods crates on the front counter
  GOODS[kind].forEach((c, i) => {
    const crate = mesh(new THREE.BoxGeometry(0.36, 0.22, 0.3), 'wood', 1.12);
    crate.position.set(-0.5 + i * 0.5, 1.12, 0.45);
    const top = mesh(new THREE.BoxGeometry(0.3, 0.1, 0.24), c, 1.28);
    top.position.set(-0.5 + i * 0.5, 1.28, 0.45);
    g.add(crate, top);
  });
  return g;
}

export function buildDecor(kind: DecorKind): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case 'parasol': {
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), 'white', 0.75));
      g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), 'white', 1.1));
      const top = mesh(new THREE.ConeGeometry(1.1, 0.5, 4), 'orange', 2.25);
      top.rotation.y = Math.PI / 4; g.add(top);
      for (const a of [0, Math.PI]) {
        const chair = mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), 'white', 0.45);
        chair.position.set(Math.cos(a) * 0.8, 0.45, Math.sin(a) * 0.8); g.add(chair);
      }
      break;
    }
    case 'bench': {
      g.add(mesh(new THREE.BoxGeometry(1.4, 0.1, 0.45), 'wood', 0.45));
      const back = mesh(new THREE.BoxGeometry(1.4, 0.4, 0.08), 'wood', 0.7); back.position.z = -0.2; g.add(back);
      for (const x of [-0.55, 0.55]) { const leg = mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), 'teal', 0.2); leg.position.x = x; g.add(leg); }
      break;
    }
    case 'planter': {
      g.add(mesh(new THREE.BoxGeometry(1.2, 0.4, 0.8), 'wood', 0.2));
      g.add(mesh(new THREE.BoxGeometry(1.1, 0.1, 0.7), 'hedge', 0.42));
      for (let i = 0; i < 5; i++) {
        const f = mesh(new THREE.SphereGeometry(0.12, 8, 6), i % 2 ? 'yellow' : 'red', 0.58);
        f.position.set(-0.4 + i * 0.2, 0.58, (i % 2 ? 0.15 : -0.15)); g.add(f);
      }
      break;
    }
    case 'hedge': {
      const h = mesh(new THREE.BoxGeometry(1.7, 0.9, 0.9), 'hedge', 0.45); g.add(h);
      g.add(mesh(new THREE.BoxGeometry(1.5, 0.2, 0.7), 'grass', 0.95));
      break;
    }
    case 'fountain': {
      g.add(mesh(new THREE.CylinderGeometry(1, 1, 0.4, 12), 'pave', 0.2));
      g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 12), 'sky', 0.42));
      g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8), 'pave', 0.7));
      break;
    }
    case 'statue': {
      g.add(mesh(new THREE.CylinderGeometry(1, 1, 0.15, 12), 'grass', 0.07));
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), 'white', 0.55));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8), 'white', 1.35));
      break;
    }
    case 'lamp': {
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.3, 8), 'teal', 0.15));
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8), 'teal', 1.45));
      g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), 'yellow', 2.85));
      g.add(mesh(new THREE.ConeGeometry(0.3, 0.2, 8), 'teal', 3.1));
      break;
    }
  }
  return g;
}

export function buildProp(kind: BuildKind, tier = 0): THREE.Object3D {
  const glb = instantiate(isStallKind(kind) ? `prop_kiosk_${kind}_lv${tier}` : `deco_${kind}`) ?? (isStallKind(kind) ? instantiate(`prop_kiosk_${kind}`) : null);
  if (glb) return glb;
  return isStallKind(kind) ? buildStall(kind) : buildDecor(kind);
}

const SHIRTS = [PALETTE.teal, PALETTE.orange, PALETTE.red, PALETTE.yellow, PALETTE.hedge, 0x6f8fd6];

export function buildCustomer(): THREE.Object3D {
  const glb = instantiate(`char_customer_${Math.floor(Math.random() * 6)}`);
  if (glb) return glb;
  const g = new THREE.Group();
  const shirt = SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
  g.add(mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), shirt, 0.55));
  g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), 'skin', 1.1));
  const hair = mesh(new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), Math.random() < 0.5 ? PALETTE.wood : PALETTE.ink, 1.12);
  g.add(hair);
  const bag = mesh(new THREE.BoxGeometry(0.2, 0.25, 0.12), 'cream', 0.55); bag.position.x = 0.3; g.add(bag);
  return g;
}

export function buildGround(): THREE.Group {
  const g = new THREE.Group();
  const w = GRID_W * TILE, h = GRID_H * TILE;
  const pave = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, h), toon('pave'));
  pave.position.y = -0.1; pave.receiveShadow = true; g.add(pave);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(w + 12, 0.2, h + 12), toon('grass'));
  grass.position.y = -0.16; grass.receiveShadow = true; g.add(grass);

  // tile grooves
  const pts: number[] = [];
  for (let i = 0; i <= GRID_W; i++) { const x = -w / 2 + i * TILE; pts.push(x, 0.005, -h / 2, x, 0.005, h / 2); }
  for (let j = 0; j <= GRID_H; j++) { const z = -h / 2 + j * TILE; pts.push(-w / 2, 0.005, z, w / 2, 0.005, z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: PALETTE.paveDark })));

  // border trees on the grass
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6);
  const crown = new THREE.SphereGeometry(0.9, 10, 8);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = Math.max(w, h) / 2 + 3 + (i % 3);
    const t = new THREE.Group();
    t.add(mesh(trunk, 'wood', 0.4), mesh(crown, 'hedge', 1.5));
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.9);
    t.scale.setScalar(0.8 + (i % 4) * 0.15);
    g.add(t);
  }
  return g;
}

/** Transparent tile highlight used while placing. */
export function buildGhost(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(TILE * 0.96, 0.08, TILE * 0.96),
    new THREE.MeshBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.45 }),
  );
  m.position.y = 0.05;
  return m;
}
