import * as THREE from 'three';
import { createScene } from './scene/setup';
import { buildGround, buildGhost, buildProp } from './world/props';
import { cellToWorld, worldToCell, inBounds, key, findPath, ENTRANCE, EXIT, GRID_H, type Cell } from './world/grid';
import { CustomerSystem } from './sim/customers';
import { STALLS, DECORS, isStallKind, isUnlocked, buildCost, spawnRate, upgradeCost, currentGoal, incomePerSecond, type BuildKind, type Stall, type Decor } from './sim/economy';
import { sfx } from './ui/sfx';
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
const angryGeo = new THREE.SphereGeometry(0.16, 6, 4);
const angryMat = new THREE.MeshBasicMaterial({ color: PALETTE.red });
function coinPop(at: THREE.Vector3, angry = false) {
  const m = new THREE.Mesh(angry ? angryGeo : coinGeo, angry ? angryMat : coinMat);
  m.position.copy(at).add(new THREE.Vector3(0, 1.6, 0));
  m.rotation.x = Math.PI / 2;
  rig.scene.add(m);
  pops.push({ m, life: 0.8 });
}

// --- systems --------------------------------------------------------------
const customers = new CustomerSystem(rig.scene, state, blockedCells, {
  onPaid: (_stall, _amount, at) => { coinPop(at); sfx.coin(); dirty = true; hud.refresh(); checkUnlocks(); checkGoals(); },
  onGaveUp: (at) => { coinPop(at, true); sfx.unhappy(); dirty = true; hud.refresh(); },
});

let selectedBuild: BuildKind | null = null;
let movingId: number | null = null;   // prop being relocated (free)
let dirty = false;
const ghost = buildGhost();
ghost.visible = false;
rig.scene.add(ghost);

const hud = new Hud(state, {
  onSelectBuild: (k) => { selectedBuild = k; if (k) stopMove(); ghost.visible = false; },
  onMove: (id) => { if (id < 0) { stopMove(); return; } hud.select(null); startMove(id); },
  onRemoveDecor: (d) => {
    state.money += Math.floor(DECORS[d.kind].cost / 2);
    state.decors.splice(state.decors.indexOf(d), 1);
    const m = propMeshes.get(d.id); if (m) { propRoot.remove(m); propMeshes.delete(d.id); }
    customers.replanAll();
    sfx.remove(); dirty = true; hud.refresh();
  },
  onUpgrade: (stall, which) => {
    const cost = upgradeCost(stall, which);
    if (state.money < cost) return;
    state.money -= cost;
    if (which === 'stock') stall.stockLevel++; else stall.speedLevel++;
    sfx.place(); dirty = true; hud.refresh(); checkGoals();
  },
  onRemove: (stall) => {
    state.money += Math.floor(STALLS[stall.kind].cost / 2);
    state.stalls.splice(state.stalls.indexOf(stall), 1);
    customers.stallRemoved(stall.id);
    const m = propMeshes.get(stall.id); if (m) { propRoot.remove(m); propMeshes.delete(stall.id); }
    sfx.remove(); dirty = true; hud.refresh();
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
      if (def.unlockAt > 0 && state.revenue > 0) { hud.toast(`${def.icon} ${def.name} が解放！`); sfx.unlock(); }
    }
  }
}
function checkGoals() {
  const g = currentGoal(state);
  if (g && g.done(state)) {
    state.goalsDone.push(g.id);
    state.money += g.reward;
    hud.toast(`🎯 目標達成「${g.text}」 +${g.reward}`);
    sfx.goal();
    dirty = true; hud.refresh();
    checkGoals(); // several goals may complete at once
  }
}
// settle income earned while the page was closed (max 2 hours, only if stalls exist)
{
  const away = state.lastSeen ? Math.min((Date.now() - state.lastSeen) / 1000, 7200) : 0;
  const earned = Math.floor(away * incomePerSecond(state));
  if (earned > 0 && away > 60) {
    state.money += earned; state.revenue += earned;
    hud.toast(`🏠 お留守番中の売上 +${earned}`);
    dirty = true; hud.refresh();
  }
}
checkUnlocks();
checkGoals();
if (state.stalls.length === 0) hud.toast('🥕 青果の露店を置いてお客さんを呼ぼう');

// --- placement / picking --------------------------------------------------
function findProp(id: number): Stall | Decor | undefined {
  return state.stalls.find((s) => s.id === id) ?? state.decors.find((d) => d.id === id);
}

function kindOf(id: number | null, fallback: BuildKind | null): BuildKind | null {
  if (id === null) return fallback;
  return findProp(id)?.kind ?? fallback;
}

function canPlace(cell: Cell, ignoreId: number | null = null, kind: BuildKind | null = selectedBuild): string | null {
  if (!inBounds(cell)) return null;
  const k = key(cell);
  const kk = kindOf(ignoreId, kind);
  if (kk && isStallKind(kk) && cell.z === GRID_H - 1) return '一番手前の列は行列が作れません';
  if (k === key(ENTRANCE) || k === key(EXIT)) return '入口と出口には置けません';
  const blocked = blockedCells();
  if (ignoreId !== null) { const p = findProp(ignoreId); if (p) blocked.delete(key(p.cell)); }
  if (blocked.has(k)) return 'そこには既に何かあります';
  blocked.add(k);
  if (!findPath(ENTRANCE, EXIT, blocked).length) return '通り道をふさげません';
  return '';
}

function startMove(id: number) {
  const p = findProp(id);
  const m = propMeshes.get(id);
  if (!p || !m) return;
  movingId = id;
  m.position.y = 0.6; // lift to show it is being carried
  hud.toast('移動先のタイルをクリック（Esc で中止）');
}
function stopMove() {
  if (movingId === null) return;
  const m = propMeshes.get(movingId); if (m) m.position.y = 0;
  movingId = null; ghost.visible = false;
}
function moveTo(cell: Cell) {
  if (movingId === null) return;
  const p = findProp(movingId); const m = propMeshes.get(movingId);
  if (!p || !m) { stopMove(); return; }
  p.cell = cell;
  const [x, z] = cellToWorld(cell);
  m.position.set(x, 0, z);
  movingId = null; ghost.visible = false;
  customers.replanAll();
  sfx.place(); dirty = true; hud.refresh();
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
  sfx.place(); dirty = true; hud.refresh(); checkGoals();
}

let downX = 0, downY = 0;
// long-press on a prop → pick it up and drag it to a new tile
const LONG_PRESS_MS = 380;
let pressTimer: number | null = null;
let dragId: number | null = null;       // prop currently being dragged
let dragOrigin: Cell | null = null;

function propAt(clientX: number, clientY: number): number | undefined {
  rig.raycaster.setFromCamera(rig.ndc(clientX, clientY), rig.camera);
  return rig.raycaster.intersectObjects(propRoot.children, true)[0]?.object.userData.propId as number | undefined;
}
function beginDrag(id: number) {
  const p = findProp(id); const m = propMeshes.get(id);
  if (!p || !m) return;
  hud.select(null); stopMove(); hud.closePanel();
  dragId = id; dragOrigin = { ...p.cell };
  m.position.y = 0.6;
  rig.setPanEnabled(false);
  sfx.place();
  if (navigator.vibrate) navigator.vibrate(15);
}
function dragTo(clientX: number, clientY: number) {
  if (dragId === null) return;
  const m = propMeshes.get(dragId); if (!m) return;
  const hit = rig.pickGround(clientX, clientY); if (!hit) return;
  const cell = worldToCell(hit.x, hit.z);
  const err = canPlace(cell, dragId);
  if (err === null) { ghost.visible = false; return; }
  const [x, z] = cellToWorld(cell);
  m.position.set(x, 0.6, z);
  ghost.visible = true; ghost.position.set(x, 0.05, z);
  (ghost.material as THREE.MeshBasicMaterial).color.setHex(err ? PALETTE.red : PALETTE.teal);
}
function endDrag(clientX: number, clientY: number) {
  if (dragId === null) return;
  const id = dragId; const p = findProp(id); const m = propMeshes.get(id);
  dragId = null; ghost.visible = false; rig.setPanEnabled(true);
  if (!p || !m || !dragOrigin) return;
  const hit = rig.pickGround(clientX, clientY);
  const cell = hit ? worldToCell(hit.x, hit.z) : null;
  const err = cell ? canPlace(cell, id) : null;
  if (cell && err === '') {
    if (key(cell) !== key(dragOrigin)) { p.cell = cell; customers.replanAll(); sfx.place(); dirty = true; hud.refresh(); }
  } else {
    if (err) { hud.toast(err); sfx.deny(); }
    p.cell = dragOrigin;
  }
  const [x, z] = cellToWorld(p.cell);
  m.position.set(x, 0, z);
  dragOrigin = null;
}
function cancelPress() { if (pressTimer !== null) { clearTimeout(pressTimer); pressTimer = null; } }

canvas.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY;
  cancelPress();
  if (selectedBuild || movingId !== null) return;
  const id = propAt(e.clientX, e.clientY);
  if (id !== undefined) pressTimer = window.setTimeout(() => { pressTimer = null; beginDrag(id); }, LONG_PRESS_MS);
});
window.addEventListener('pointerup', (e) => { cancelPress(); endDrag(e.clientX, e.clientY); });
window.addEventListener('pointercancel', () => { cancelPress(); if (dragId !== null && dragOrigin) endDrag(-1, -1); });
canvas.addEventListener('pointermove', (e) => {
  if (pressTimer !== null && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) cancelPress();
  if (dragId !== null) { dragTo(e.clientX, e.clientY); return; }
  if (!selectedBuild && movingId === null) { ghost.visible = false; return; }
  const hit = rig.pickGround(e.clientX, e.clientY);
  if (!hit) { ghost.visible = false; return; }
  const cell = worldToCell(hit.x, hit.z);
  const err = canPlace(cell, movingId);
  ghost.visible = err !== null;
  if (err === null) return;
  const [x, z] = cellToWorld(cell);
  ghost.position.set(x, 0.05, z);
  (ghost.material as THREE.MeshBasicMaterial).color.setHex(err ? PALETTE.red : PALETTE.teal);
});
canvas.addEventListener('pointerup', (e) => {
  if (dragId !== null) return; // release after a long-press drag (window handler drops it)
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; // it was a drag/pan
  const hit = rig.pickGround(e.clientX, e.clientY);
  if (!hit) return;
  const cell = worldToCell(hit.x, hit.z);
  // A click on an existing prop always opens its panel, even while a build kind is selected.
  rig.raycaster.setFromCamera(rig.ndc(e.clientX, e.clientY), rig.camera);
  const propHit = rig.raycaster.intersectObjects(propRoot.children, true)[0]?.object.userData.propId as number | undefined;
  if (propHit !== undefined && movingId === null) {
    if (selectedBuild) hud.select(null);
    const s = state.stalls.find((t) => t.id === propHit);
    const d = state.decors.find((t) => t.id === propHit);
    if (s) hud.showStall(s); else if (d) hud.showDecor(d);
    return;
  }
  if (movingId !== null) {
    const err = canPlace(cell, movingId);
    if (err === null) { stopMove(); return; }
    if (err) { hud.toast(err); sfx.deny(); return; }
    moveTo(cell);
    return;
  }
  if (selectedBuild) {
    const err = canPlace(cell);
    if (err === null) return;
    if (err) { hud.toast(err); sfx.deny(); return; }
    place(selectedBuild, cell);
    if (state.money < buildCost(selectedBuild)) hud.select(null);
    return;
  }
  hud.closePanel();
});
// right-click / long-press cancels build or move mode
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); hud.select(null); stopMove(); });

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

// debug handle (dev only)
if (import.meta.env.DEV) Object.assign(window, { __state: state, __customers: customers, __rig: rig, __propMeshes: propMeshes });
