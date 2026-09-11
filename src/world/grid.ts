export const TILE = 2; // metres
export const GRID_W = 12;
export const GRID_H = 12;

export interface Cell { x: number; z: number }

export const ENTRANCE: Cell = { x: 0, z: 6 };
export const EXIT: Cell = { x: 11, z: 6 };

export const key = (c: Cell) => `${c.x},${c.z}`;
export const inBounds = (c: Cell) => c.x >= 0 && c.z >= 0 && c.x < GRID_W && c.z < GRID_H;

/** World position of a cell centre (y = 0). */
export function cellToWorld(c: Cell): [number, number] {
  return [(c.x - GRID_W / 2 + 0.5) * TILE, (c.z - GRID_H / 2 + 0.5) * TILE];
}
export function worldToCell(x: number, z: number): Cell {
  return { x: Math.floor(x / TILE + GRID_W / 2), z: Math.floor(z / TILE + GRID_H / 2) };
}

/** 4-neighbour A* on a blocked-set. Returns cells from start (exclusive) to goal (inclusive), or [] if unreachable. */
export function findPath(start: Cell, goal: Cell, blocked: Set<string>): Cell[] {
  if (key(start) === key(goal)) return [];
  const h = (c: Cell) => Math.abs(c.x - goal.x) + Math.abs(c.z - goal.z);
  const open: Cell[] = [start];
  const came = new Map<string, Cell>();
  const g = new Map<string, number>([[key(start), 0]]);
  const f = new Map<string, number>([[key(start), h(start)]]);
  const closed = new Set<string>();
  const goalKey = key(goal);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if ((f.get(key(open[i])) ?? 1e9) < (f.get(key(open[bi])) ?? 1e9)) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur);
    if (ck === goalKey) {
      const path: Cell[] = [];
      let c: Cell | undefined = cur;
      while (c && key(c) !== key(start)) { path.push(c); c = came.get(key(c)); }
      return path.reverse();
    }
    closed.add(ck);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: cur.x + dx, z: cur.z + dz };
      const nk = key(n);
      if (!inBounds(n) || closed.has(nk)) continue;
      if (blocked.has(nk) && nk !== goalKey) continue;
      const ng = (g.get(ck) ?? 0) + 1;
      if (ng < (g.get(nk) ?? 1e9)) {
        came.set(nk, cur);
        g.set(nk, ng);
        f.set(nk, ng + h(n));
        if (!open.some((o) => key(o) === nk)) open.push(n);
      }
    }
  }
  return [];
}
