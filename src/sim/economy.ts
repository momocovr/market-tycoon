import type { Cell } from '../world/grid';

export type StallKind = 'vegetable' | 'bakery' | 'cafe' | 'flower';
export type DecorKind = 'parasol' | 'bench' | 'planter' | 'hedge' | 'lamp' | 'statue' | 'fountain';
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
  fountain:{ kind: 'fountain',name: '噴水', icon: '⛲', cost: 900, attract: 0.4, unlockAt: 3000 },
};
export const isStallKind = (k: BuildKind): k is StallKind => k in STALLS;

export interface Stall {
  id: number; kind: StallKind; cell: Cell;
  stockLevel: number;  // +price
  speedLevel: number;  // -serviceTime
  sold: number;
  busyUntil: number;   // sim time when current customer is done
}
export interface Decor { id: number; kind: DecorKind; cell: Cell; rot?: number /* 0..3 quarter turns */ }

export interface GameState {
  money: number; revenue: number; served: number; lost: number;
  stalls: Stall[]; decors: Decor[]; nextId: number;
  goalsDone: string[];
  lastSeen: number;   // epoch ms of last save, for offline income
}

export const newGame = (): GameState => ({
  money: 250, revenue: 0, served: 0, lost: 0, stalls: [], decors: [], nextId: 1, goalsDone: [], lastSeen: 0,
});

export interface Goal { id: string; text: string; reward: number; done(st: GameState): boolean }
export const GOALS: Goal[] = [
  { id: 'first',   text: '露店を 1 軒置く',        reward: 60,  done: (s) => s.stalls.length >= 1 },
  { id: 'serve10', text: 'お客さん 10 人に販売',    reward: 80,  done: (s) => s.served >= 10 },
  { id: 'decor2',  text: '装飾を 2 つ置く',        reward: 80,  done: (s) => s.decors.length >= 2 },
  { id: 'stalls3', text: '露店を 3 軒にする',       reward: 150, done: (s) => s.stalls.length >= 3 },
  { id: 'rev500',  text: '売上 500 を達成',        reward: 150, done: (s) => s.revenue >= 500 },
  { id: 'upg',     text: '露店をアップグレード',    reward: 120, done: (s) => s.stalls.some((t) => t.stockLevel + t.speedLevel > 0) },
  { id: 'kinds3',  text: '3 種類の露店をそろえる',  reward: 250, done: (s) => new Set(s.stalls.map((t) => t.kind)).size >= 3 },
  { id: 'serve100',text: 'お客さん 100 人に販売',   reward: 300, done: (s) => s.served >= 100 },
  { id: 'rev2000', text: '売上 2000 を達成',       reward: 400, done: (s) => s.revenue >= 2000 },
  { id: 'statue',  text: '記念像を建てる',          reward: 600, done: (s) => s.decors.some((d) => d.kind === 'statue') },
  { id: 'tier2',   text: '露店を Lv5 にして豪華にする', reward: 700, done: (s) => s.stalls.some((t) => t.stockLevel + t.speedLevel >= 5) },
  { id: 'fountain',text: '噴水を建てる',            reward: 1200, done: (s) => s.decors.some((d) => d.kind === 'fountain') },
  { id: 'rev5000', text: '売上 5000 を達成',       reward: 800, done: (s) => s.revenue >= 5000 },
  { id: 'kinds4',  text: '4 種類の露店をそろえる',  reward: 600, done: (s) => new Set(s.stalls.map((t) => t.kind)).size >= 4 },
  { id: 'serve500',text: 'お客さん 500 人に販売',   reward: 800, done: (s) => s.served >= 500 },
  { id: 'decor10', text: '装飾を 10 個置く',       reward: 900, done: (s) => s.decors.length >= 10 },
  { id: 'stalls8', text: '露店を 8 軒にする',       reward: 1200, done: (s) => s.stalls.length >= 8 },
  { id: 'lv5',     text: 'どれかの露店を合計 Lv5 に', reward: 1000, done: (s) => s.stalls.some((t) => t.stockLevel + t.speedLevel >= 5) },
  { id: 'rev10000',text: '売上 10000 を達成',      reward: 1500, done: (s) => s.revenue >= 10000 },
  { id: 'serve1000',text: 'お客さん 1000 人に販売', reward: 2000, done: (s) => s.served >= 1000 },
  { id: 'rev25000',text: '売上 25000 を達成',      reward: 3000, done: (s) => s.revenue >= 25000 },
  { id: 'stalls12',text: '露店を 12 軒にする',      reward: 3000, done: (s) => s.stalls.length >= 12 },
  { id: 'rev50000',text: '売上 50000 を達成',      reward: 5000, done: (s) => s.revenue >= 50000 },
  { id: 'rev100000',text: '売上 100000 を達成',    reward: 10000, done: (s) => s.revenue >= 100000 },
];
export const currentGoal = (st: GameState) => GOALS.find((g) => !st.goalsDone.includes(g.id)) ?? null;

/** Rough income per second used to settle time spent away (capped by the caller). */
export function incomePerSecond(st: GameState): number {
  if (!st.stalls.length) return 0;
  const avgPrice = st.stalls.reduce((a, s) => a + stallPrice(s), 0) / st.stalls.length;
  const avgService = st.stalls.reduce((a, s) => a + stallService(s), 0) / st.stalls.length;
  const capacity = st.stalls.length / avgService;          // customers/s the stalls can serve
  return Math.min(spawnRate(st), capacity) * avgPrice * 0.5;  // 50% efficiency while away
}

/** Visual tier 0..2 from total upgrade level (3 → tier 1, 5 → tier 2). */
export const stallTier = (s: Stall) => { const lv = s.stockLevel + s.speedLevel; return lv >= 5 ? 2 : lv >= 3 ? 1 : 0; };
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
