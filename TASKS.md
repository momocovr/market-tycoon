# TASKS

## Phase 0 — 雛形 ✅ 2026-09-11
- [x] Vite + TS + three.js、GitHub Pages workflow、ART.md

## Phase 1 — 縦切り ✅ 2026-09-11
- [x] 等角カメラ、地面、パン/ズーム
- [x] 露店4種・装飾5種の配置（プリミティブ仮アセット）、通路ブロック判定
- [x] NPC 客: 出現 → A* → 行列 → 購入 → 退場、コイン演出
- [x] HUD、露店パネル（アップグレード/撤去）、アンロック通知、localStorage 保存
- [x] 初デプロイ → `/explain-usage` で実測（約300万トークン効果換算 / 107ターン）

## Phase 2 — Blender MCP アセット ✅ 2026-09-11
- [x] 配色は頂点カラー（テクスチャ不要、UV 不要）。blender/build_props.py が唯一のソース
- [x] prop_kiosk_{vegetable,bakery,cafe,flower}, deco_{parasol,bench,planter,hedge,lamp,statue}
- [x] GLB 書き出し（public/models/props.glb 約500KB）、src/assets/loader.ts で読み込み。GLB が無ければプリミティブにフォールバック
- [x] キャラ: 自作ローポリ 6 色（char_customer_0..5）。Quaternius 流用は歩行アニメが欲しくなった時点で再検討
- [ ] 歩行アニメ（今は上下バウンドのみ）
- [ ] gltf-transform 圧縮（現状 500KB なので保留）

## Phase 3 — 経営ロジック拡張 ✅ 2026-09-11
- [x] 客の我慢（行列で 14〜24 秒待つと怒って帰る）
- [x] 目標 11 個（報酬つき、HUD に現在の目標を表示）
- [x] 離席中の売上精算（最大 2 時間、効率 50%）
- [ ] 統計画面（未着手）

## Phase 4 — 仕上げ（一部）
- [x] WebAudio 合成の効果音 7 種 + ミュート
- [x] ローディング画面、スマホ表示確認（375px）
- [ ] トゥーン輪郭（保留: 現状の見た目で十分）
- [ ] キャラ歩行アニメ

## Phase 5 — 公開 ✅
- [x] https://momocovr.github.io/market-tycoon/ （main へ push で自動更新）
- [ ] 社内フィードバック反映
