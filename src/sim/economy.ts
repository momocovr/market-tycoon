import type { Cell } from '../world/grid';

export type StallKind = 'vegetable' | 'bakery' | 'cafe' | 'flower';
export type DecorKind = 'parasol' | 'bench' | 'planter' | 'hedge' | 'lamp' | 'statue';
export type BuildKind = StallKind | DecorKind;

export interface StallDef {
  kind: StallKind; name: string; icon: string; cost: number;
  price: number; serviceTime: number; unlockAt: number;
}
export interface DecorDef {
  kind: DecorKind; name: string; icon: string; cost: number;
  attract: number; unlockAt: number;
}

export const STALLS: Record<StallKind, StallDef> = {
  vegetable: { kind: 'vegetable', name: '青果', icon: '🥕', cost: 100, price: 8, serviceTime: 2.0, unlockAt: 0 },
  bakery:    { kind: 'bakery',    name: 'パン', icon: '🥐', cost: 180, price: 12, serviceTime: 2.4, unlockAt: 300 },
  cafe:      { kind: 'cafe',      name: 'カフェ', icon: '☕', cost: 300, price: 18, serviceTime: 3.0, unlockAt: 800 },
  flower:    { kind: 'flower',    name: '花', icon: '🌷', cost: 250, price: 14, serviceTime: 2.4, unlockAt: 1500 },
};
export const DECORS: Record<DecorKind, DecorDef> = {
  planter: { kind: 'planter', name: '花壇', icon: '🌼', cost: 50, attract: 0.06, unlockAt: 0 },
  bench:   { kind: 'bench',   name: 'ベンチ', icon: '🪑', cost: 80, attract: 0.08, unlockAt: 150 },
  parasol: { kind: 'parasol', name: 'パラソル席', icon: '⛱️', cost: 120, attract: 0.12, unlockAt: 400 },
  hedge:   { kind: 'hedge',   name: '生垣', icon: '🌳', cost: 40, attract: 0.04, unlockAt: 0 },
  lamp:    { kind: 'lamp',    name: '街灯', icon: '🏮', cost: 90, attract: 0.08, unlockAt: 600 },
  statue:  { kind: 'statue',  name: '記念像', icon: '🗽', cost: 400, attract: 0.25, unlockAt: 1200 },
};
export const isStallKind = (k: BuildKind): k is StallKind => k in STALLS;

export interface Stall {
  id: number; kind: StallKind; cell: Cell;
  stockLevel: number;  // +price
  speedLevel: number;  // -serviceTime
  sold: number;
  busyUntil: number;   // sim time when current customer is done
}
export interface Decor { id: number; kind: DecorKind; cell: Cell }

export interface GameState {
  money: number; revenue: number; served: number;
  stalls: Stall[]; decors: Decor[]; nextId: number;
}

export const newGame = (): GameState => ({ money: 250, revenue: 0, served: 0, stalls: [], decors: [], nextId: 1 });

export const stallPrice = (s: Stall) => STALLS[s.kind].price + s.stockLevel * 3;
export const stallService = (s: Stall) => Math.max(0.8, STALLS[s.kind].serviceTime - s.speedLevel * 0.3);
export const upgradeCost = (s: Stall, which: 'stock' | 'speed') =>
  Math.round(STALLS[s.kind].cost * 0.5 * (1 + (which === 'stock' ? s.stockLevel : s.speedLevel)));

/** Customers per second. */
export function spawnRate(st: GameState): number {
  if (st.stalls.length === 0) return 0;
  const attract = st.decors.reduce((a, d) => a + DECORS[d.kind].attract, 0);
  return (0.25 + st.stalls.length * 0.08) * (1 + Math.min(attract, 1.5));
}

export function isUnlocked(kind: BuildKind, st: GameState): boolean {
  const def = isStallKind(kind) ? STALLS[kind] : DECORS[kind];
  return st.revenue >= def.unlockAt;
}
export const buildCost = (kind: BuildKind) => (isStallKind(kind) ? STALLS[kind].cost : DECORS[kind].cost);
