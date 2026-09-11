import * as THREE from 'three';
import { createScene } from './scene/setup';
import { buildGround, buildGhost, buildProp } from './world/props';
import { cellToWorld, worldToCell, inBounds, key, findPath, ENTRANCE, EXIT, type Cell } from './world/grid';
import { CustomerSystem } from './sim/customers';
import { STALLS, DECORS, isStallKind, isUnlocked, buildCost, spawnRate, upgradeCost, newGame, type BuildKind, type Stall, type Decor } from './sim/economy';
import { Hud } from './ui/hud';
import { load, save, clear } from './save/save';
import { PALETTE } from './scene/materials';
import { loadProps } from './assets/loader';

await loadProps().catch((e) => console.warn('props.glb not loaded, using primitives', e));
document.getElementById('loading')?.remove();

const canvas = document.getElementById('game') as HTMLCanvasElement;
const rig = createScene(canvas);
rig.scene.add(buildGround());

let state = load();

// --- placed objects -------------------------------------------------------
const propMeshes = new Map<number, THREE.Object3D>(); // id → mesh (stalls & decors)
const propRoot = new THREE.Group();
rig.scene.add(propRoot);

function blockedCells(): Set<string> {
  const s = new Set<string>();
  for (const st of state.stalls) s.add(key(st.cell));
  for (const d of state.decors) s.add(key(d.cell));
  return s;
}

function addPropMesh(id: number, kind: BuildKind, cell: Cell) {
  const g = buildProp(kind);
  const [x, z] = cellToWorld(cell);
  g.position.set(x, 0, z);
  g.traverse((o) => { o.userData.propId = id; });
  propRoot.add(g);
  propMeshes.set(id, g);
}
for (const st of state.stalls) addPropMesh(st.id, st.kind, st.cell);
for (const d of state.decors) addPropMesh(d.id, d.kind, d.cell);

// --- coin pop effect ------------------------------------------------------
const pops: { m: THREE.Mesh; life: number }[] = [];
const coinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
const coinMat = new THREE.MeshBasicMaterial({ color: PALETTE.yellow });
function coinPop(at: THREE.Vector3) {
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.copy(at).add(new THREE.Vector3(0, 1.6, 0));
  m.rotation.x = Math.PI / 2;
  rig.scene.add(m);
  pops.push({ m, life: 0.8 });
}

// --- systems --------------------------------------------------------------
const customers = new CustomerSystem(rig.scene, state, blockedCells, {
  onPaid: (_stall, _amount, at) => { coinPop(at); dirty = true; hud.refresh(); checkUnlocks(); },
});

let selectedBuild: BuildKind | null = null;
let dirty = false;
const ghost = buildGhost();
ghost.visible = false;
rig.scene.add(ghost);

const hud = new Hud(state, {
  onSelectBuild: (k) => { selectedBuild = k; ghost.visible = false; },
  onUpgrade: (stall, which) => {
    const cost = upgradeCost(stall, which);
    if (state.money < cost) return;
    state.money -= cost;
    if (which === 'stock') stall.stockLevel++; else stall.speedLevel++;
    dirty = true; hud.refresh();
  },
  onRemove: (stall) => {
    state.money += Math.floor(STALLS[stall.kind].cost / 2);
    state.stalls.splice(state.stalls.indexOf(stall), 1);
    customers.stallRemoved(stall.id);
    const m = propMeshes.get(stall.id); if (m) { propRoot.remove(m); propMeshes.delete(stall.id); }
    dirty = true; hud.refresh();
  },
  onReset: () => { clear(); location.reload(); },
});

const unlockedSeen = new Set<BuildKind>();
function checkUnlocks() {
  for (const kind of [...Object.keys(STALLS), ...Object.keys(DECORS)] as BuildKind[]) {
    if (unlockedSeen.has(kind)) continue;
    if (isUnlocked(kind, state)) {
      unlockedSeen.add(kind);
      const def = isStallKind(kind) ? STALLS[kind] : DECORS[kind];
      if (def.unlockAt > 0 && state.revenue > 0) hud.toast(`${def.icon} ${def.name} が解放！`);
    }
  }
}
checkUnlocks();
if (state.stalls.length === 0) hud.toast('🥕 青果の露店を置いてお客さんを呼ぼう');

// --- placement / picking --------------------------------------------------
function canPlace(cell: Cell): string | null {
  if (!inBounds(cell)) return null;
  const k = key(cell);
  if (k === key(ENTRANCE) || k === key(EXIT)) return '入口と出口には置けません';
  if (blockedCells().has(k)) return 'そこには既に何かあります';
  const blocked = blockedCells(); blocked.add(k);
  if (!findPath(ENTRANCE, EXIT, blocked).length) return '通り道をふさげません';
  return '';
}

function place(kind: BuildKind, cell: Cell) {
  const cost = buildCost(kind);
  if (!isUnlocked(kind, state)) return;
  if (state.money < cost) { hud.toast('お金が足りません'); return; }
  state.money -= cost;
  const id = state.nextId++;
  if (isStallKind(kind)) {
    const st: Stall = { id, kind, cell, stockLevel: 0, speedLevel: 0, sold: 0, busyUntil: 0 };
    state.stalls.push(st);
  } else {
    const d: Decor = { id, kind, cell };
    state.decors.push(d);
  }
  addPropMesh(id, kind, cell);
  dirty = true; hud.refresh();
}

let downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointermove', (e) => {
  if (!selectedBuild) { ghost.visible = false; return; }
  const hit = rig.pickGround(e.clientX, e.clientY);
  if (!hit) { ghost.visible = false; return; }
  const cell = worldToCell(hit.x, hit.z);
  const err = canPlace(cell);
  ghost.visible = err !== null;
  if (err === null) return;
  const [x, z] = cellToWorld(cell);
  ghost.position.set(x, 0.05, z);
  (ghost.material as THREE.MeshBasicMaterial).color.setHex(err ? PALETTE.red : PALETTE.teal);
});
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; // it was a drag/pan
  const hit = rig.pickGround(e.clientX, e.clientY);
  if (!hit) return;
  const cell = worldToCell(hit.x, hit.z);
  if (selectedBuild) {
    const err = canPlace(cell);
    if (err === null) return;
    if (err) { hud.toast(err); return; }
    place(selectedBuild, cell);
    if (state.money < buildCost(selectedBuild)) hud.select(null);
    return;
  }
  // pick an existing prop
  rig.raycaster.setFromCamera(rig.ndc(e.clientX, e.clientY), rig.camera);
  const hits = rig.raycaster.intersectObjects(propRoot.children, true);
  const id = hits[0]?.object.userData.propId as number | undefined;
  const stall = id !== undefined ? state.stalls.find((s) => s.id === id) : undefined;
  if (stall) hud.showStall(stall); else hud.closePanel();
});

// --- loop -----------------------------------------------------------------
const timer = new THREE.Timer();
let saveTimer = 0;
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  customers.update(dt, spawnRate(state));
  hud.setCustomers(customers.count);

  for (const p of [...pops]) {
    p.life -= dt; p.m.position.y += dt * 1.5; p.m.rotation.z += dt * 6;
    if (p.life <= 0) { rig.scene.remove(p.m); pops.splice(pops.indexOf(p), 1); }
  }

  saveTimer += dt;
  if (dirty && saveTimer > 2) { save(state); dirty = false; saveTimer = 0; }

  rig.update();
  requestAnimationFrame(frame);
}
frame();
window.addEventListener('beforeunload', () => save(state));

// keep `newGame` referenced for reset-in-place later
void newGame;
// debug handle (dev only)
if (import.meta.env.DEV) Object.assign(window, { __state: state, __customers: customers });
