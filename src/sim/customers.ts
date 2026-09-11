import * as THREE from 'three';
import { buildCustomer } from '../world/props';
import { cellToWorld, findPath, ENTRANCE, EXIT, key, type Cell, GRID_H } from '../world/grid';
import { stallPrice, stallService, type GameState, type Stall, type StallKind } from './economy';

type Phase = 'toQueue' | 'queue' | 'leaving';

interface Customer {
  mesh: THREE.Object3D;
  cell: Cell;
  path: Cell[];
  t: number;            // 0..1 progress to path[0]
  phase: Phase;
  want: StallKind;
  stallId: number;
  happy: boolean;
  bob: number;
  patience: number;     // seconds left before giving up in the queue
}

const SPEED = 2.4; // m/s
const MAX_CUSTOMERS = 40;

export interface CustomerEvents {
  onPaid(stall: Stall, amount: number, at: THREE.Vector3): void;
  onGaveUp(at: THREE.Vector3): void;
}

export class CustomerSystem {
  private customers: Customer[] = [];
  private queues = new Map<number, Customer[]>();
  private time = 0;
  private spawnAcc = 0;

  constructor(private scene: THREE.Scene, private state: GameState, private blocked: () => Set<string>, private ev: CustomerEvents) {}

  get count() { return this.customers.length; }

  /** Cells currently claimed by queues (stall front tiles). Used to keep the tile in front of a stall free. */
  queueCellFor(stall: Stall, index: number): Cell {
    return { x: stall.cell.x, z: Math.min(GRID_H - 1, stall.cell.z + 1 + index) };
  }

  update(dt: number, rate: number) {
    this.time += dt;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1 && this.customers.length < MAX_CUSTOMERS) { this.spawnAcc -= 1; this.spawn(); }

    for (const c of [...this.customers]) this.step(c, dt);
  }

  /** Called after any prop moved: every walking customer re-plans its route. */
  replanAll() {
    for (const c of this.customers) {
      if (c.phase === 'leaving') { this.retarget(c, EXIT); if (!c.path.length) this.remove(c); continue; }
      const stall = this.state.stalls.find((s) => s.id === c.stallId);
      if (!stall) { this.leave(c, false); continue; }
      const q = this.queues.get(stall.id) ?? [];
      const goal = this.queueCellFor(stall, Math.max(q.indexOf(c), 0));
      if (key(c.cell) !== key(goal) || c.path.length) {
        c.phase = 'toQueue';
        // finish the current step first so the position stays continuous
        const from = c.path.length ? c.path[0] : c.cell;
        const rest = findPath(from, goal, this.blocked());
        c.path = c.path.length ? [from, ...rest] : rest;
        if (!c.path.length && key(c.cell) !== key(goal)) this.leave(c, false);
      }
    }
  }

  /** Called when a stall is removed: send its queue home. */
  stallRemoved(id: number) {
    for (const c of this.queues.get(id) ?? []) this.leave(c, false);
    this.queues.delete(id);
    for (const c of this.customers) if (c.stallId === id && c.phase === 'toQueue') this.leave(c, false);
  }

  private spawn() {
    const stalls = this.state.stalls;
    if (!stalls.length) return;
    const target = stalls[Math.floor(Math.random() * stalls.length)];
    const mesh = buildCustomer();
    const [x, z] = cellToWorld(ENTRANCE);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const c: Customer = { mesh, cell: { ...ENTRANCE }, path: [], t: 0, phase: 'toQueue', want: target.kind, stallId: target.id, happy: true, bob: Math.random() * 6, patience: 14 + Math.random() * 10 };
    this.customers.push(c);
    this.joinQueue(c, target);
  }

  private joinQueue(c: Customer, stall: Stall) {
    const q = this.queues.get(stall.id) ?? [];
    q.push(c);
    this.queues.set(stall.id, q);
    this.retarget(c, this.queueCellFor(stall, q.length - 1));
    if (!c.path.length && key(c.cell) !== key(this.queueCellFor(stall, q.length - 1))) this.leave(c, false);
  }

  private retarget(c: Customer, goal: Cell) {
    c.path = findPath(c.cell, goal, this.blocked());
    c.t = 0;
  }

  private leave(c: Customer, happy: boolean) {
    c.happy = happy;
    c.phase = 'leaving';
    const q = this.queues.get(c.stallId);
    if (q) { const i = q.indexOf(c); if (i >= 0) { q.splice(i, 1); this.reflowQueue(c.stallId); } }
    this.retarget(c, EXIT);
    if (!c.path.length) this.remove(c);
  }

  private reflowQueue(stallId: number) {
    const stall = this.state.stalls.find((s) => s.id === stallId);
    const q = this.queues.get(stallId);
    if (!stall || !q) return;
    q.forEach((cust, i) => {
      const goal = this.queueCellFor(stall, i);
      if (key(cust.cell) !== key(goal) || cust.path.length) { cust.phase = 'toQueue'; this.retarget(cust, goal); }
    });
  }

  private remove(c: Customer) {
    this.scene.remove(c.mesh);
    this.customers.splice(this.customers.indexOf(c), 1);
  }

  private step(c: Customer, dt: number) {
    // movement along path
    if (c.path.length) {
      const next = c.path[0];
      const [ax, az] = cellToWorld(c.cell);
      const [bx, bz] = cellToWorld(next);
      c.t += (SPEED * dt) / 2;
      const p = Math.min(c.t, 1);
      c.mesh.position.set(ax + (bx - ax) * p, 0, az + (bz - az) * p);
      c.mesh.rotation.y = Math.atan2(bx - ax, bz - az);
      c.bob += dt * 12;
      c.mesh.position.y = Math.abs(Math.sin(c.bob)) * 0.08;
      if (c.t >= 1) { c.cell = next; c.path.shift(); c.t = 0; }
      return;
    }
    c.mesh.position.y = 0;

    if (c.phase === 'leaving') {
      if (key(c.cell) === key(EXIT)) this.remove(c);
      else { this.retarget(c, EXIT); if (!c.path.length) this.remove(c); }
      return;
    }

    const stall = this.state.stalls.find((s) => s.id === c.stallId);
    if (!stall) { this.leave(c, false); return; }
    const q = this.queues.get(stall.id) ?? [];
    const idx = q.indexOf(c);
    const goal = this.queueCellFor(stall, Math.max(idx, 0));
    if (key(c.cell) !== key(goal)) { this.retarget(c, goal); if (!c.path.length) this.leave(c, false); return; }

    c.phase = 'queue';
    // face the stall
    c.mesh.rotation.y = Math.PI;
    if (idx !== 0) {
      c.patience -= dt;
      if (c.patience <= 0) { this.state.lost++; this.ev.onGaveUp(c.mesh.position.clone()); this.leave(c, false); }
      return;
    }

    if (stall.busyUntil === 0) { stall.busyUntil = this.time + stallService(stall); return; }
    if (this.time >= stall.busyUntil) {
      stall.busyUntil = 0;
      const amount = stallPrice(stall);
      stall.sold++;
      this.state.money += amount;
      this.state.revenue += amount;
      this.state.served++;
      this.ev.onPaid(stall, amount, c.mesh.position.clone());
      this.leave(c, true);
    }
  }
}
