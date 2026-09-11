import { STALLS, DECORS, isUnlocked, buildCost, stallPrice, stallService, upgradeCost, currentGoal, type BuildKind, type GameState, type Stall, type Decor } from '../sim/economy';
import { sfx } from './sfx';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export interface HudCallbacks {
  onSelectBuild(kind: BuildKind | null): void;
  onUpgrade(stall: Stall, which: 'stock' | 'speed'): void;
  onRemove(stall: Stall): void;
  onRemoveDecor(decor: Decor): void;
  onMove(id: number): void;
  onReset(): void;
}

export class Hud {
  private selected: BuildKind | null = null;
  private openStall: Stall | null = null;
  private openDecor: Decor | null = null;
  private buttons = new Map<BuildKind, HTMLButtonElement>();

  constructor(private state: GameState, private cb: HudCallbacks) {
    const build = $('build');
    const kinds: BuildKind[] = [...Object.keys(STALLS), ...Object.keys(DECORS)] as BuildKind[];
    for (const kind of kinds) {
      const def = kind in STALLS ? STALLS[kind as keyof typeof STALLS] : DECORS[kind as keyof typeof DECORS];
      const b = document.createElement('button');
      b.innerHTML = `<span class="ico">${def.icon}</span><span>${def.name}</span><span class="cost">${def.cost}</span>`;
      b.addEventListener('click', () => this.select(this.selected === kind ? null : kind));
      build.appendChild(b);
      this.buttons.set(kind, b);
    }
    $('reset').addEventListener('click', () => { if (confirm('セーブを消して最初からにしますか？')) cb.onReset(); });
    $('mute').addEventListener('click', () => { $('mute').textContent = sfx.toggleMute() ? '🔇' : '🔊'; });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.select(null); this.closePanel(); this.cb.onMove(-1); } });
    this.refresh();
  }

  select(kind: BuildKind | null) {
    this.selected = kind;
    this.buttons.forEach((b, k) => b.classList.toggle('selected', k === kind));
    if (kind) this.closePanel();
    this.cb.onSelectBuild(kind);
  }

  refresh() {
    $('money').textContent = String(Math.floor(this.state.money));
    $('revenue').textContent = String(Math.floor(this.state.revenue));
    const g = currentGoal(this.state);
    $('goaltext').textContent = g ? `${g.text}（+${g.reward}）` : '全目標達成！';
    this.buttons.forEach((b, kind) => {
      const unlocked = isUnlocked(kind, this.state);
      b.disabled = !unlocked || this.state.money < buildCost(kind);
      const def = kind in STALLS ? STALLS[kind as keyof typeof STALLS] : DECORS[kind as keyof typeof DECORS];
      b.title = unlocked ? `${def.name} — ${def.cost}` : `売上 ${def.unlockAt} で解放`;
      b.querySelector<HTMLElement>('.cost')!.textContent = unlocked ? String(def.cost) : `🔒${def.unlockAt}`;
    });
    if (this.openStall) this.renderPanel(this.openStall);
    if (this.openDecor) this.renderDecorPanel(this.openDecor);
  }

  setCustomers(n: number) { $('customers').textContent = String(n); }

  toast(msg: string) {
    const el = document.createElement('div');
    el.className = 'toast-msg'; el.textContent = msg;
    $('toast').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  showStall(stall: Stall) { this.openDecor = null; this.openStall = stall; this.renderPanel(stall); $('panel').hidden = false; }
  showDecor(decor: Decor) { this.openStall = null; this.openDecor = decor; this.renderDecorPanel(decor); $('panel').hidden = false; }
  closePanel() { this.openStall = null; this.openDecor = null; $('panel').hidden = true; }

  private renderDecorPanel(d: Decor) {
    if (!this.state.decors.includes(d)) { this.closePanel(); return; }
    const def = DECORS[d.kind];
    const panel = $('panel');
    panel.innerHTML = `
      <h3>${def.icon} ${def.name}</h3>
      <div class="row"><span>集客ボーナス</span><b>+${Math.round(def.attract * 100)}%</b></div>
      <div class="row"><button data-a="move">↔ 移動</button><button data-a="close">閉じる</button><button data-a="remove" class="danger">撤去 (+${Math.floor(def.cost / 2)})</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'close') this.closePanel();
      else if (a === 'remove') { this.cb.onRemoveDecor(d); this.closePanel(); }
      else if (a === 'move') { this.cb.onMove(d.id); this.closePanel(); }
    }));
  }

  private renderPanel(s: Stall) {
    if (!this.state.stalls.includes(s)) { this.closePanel(); return; }
    const def = STALLS[s.kind];
    const panel = $('panel');
    const sc = upgradeCost(s, 'stock'), pc = upgradeCost(s, 'speed');
    panel.innerHTML = `
      <h3>${def.icon} ${def.name}の露店</h3>
      <div class="row"><span>売れた数</span><b>${s.sold}</b></div>
      <div class="row"><span>単価</span><b>${stallPrice(s)}</b></div>
      <div class="row"><span>接客</span><b>${stallService(s).toFixed(1)}秒</b></div>
      <div class="row"><span>品揃え Lv${s.stockLevel}</span><button data-a="stock" ${this.state.money < sc ? 'disabled' : ''}>+3円 / ${sc}</button></div>
      <div class="row"><span>接客速度 Lv${s.speedLevel}</span><button data-a="speed" ${this.state.money < pc || stallService(s) <= 0.8 ? 'disabled' : ''}>-0.3秒 / ${pc}</button></div>
      <div class="row"><button data-a="move">↔ 移動</button><button data-a="close">閉じる</button><button data-a="remove" class="danger">撤去 (+${Math.floor(def.cost / 2)})</button></div>`;
    panel.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'close') this.closePanel();
      else if (a === 'remove') { this.cb.onRemove(s); this.closePanel(); }
      else if (a === 'move') { this.cb.onMove(s.id); this.closePanel(); }
      else this.cb.onUpgrade(s, a as 'stock' | 'speed');
    }));
  }
}
