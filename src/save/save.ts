import { newGame, type GameState } from '../sim/economy';

const KEY = 'market-tycoon-save-v1';

export function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newGame();
    const s = JSON.parse(raw) as GameState;
    // Runtime-only field; never trust a saved busy timer.
    for (const st of s.stalls) st.busyUntil = 0;
    return { ...newGame(), ...s };
  } catch {
    return newGame();
  }
}

export function save(st: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* private mode etc. */ }
}

export function clear(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
