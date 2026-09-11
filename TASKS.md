# TASKS

## Phase 0 — 雛形 ✅ 2026-09-11
- [x] Vite + TS + three.js、GitHub Pages workflow、ART.md

## Phase 1 — 縦切り ✅ 2026-09-11
- [x] 等角カメラ、地面、パン/ズーム
- [x] 露店4種・装飾5種の配置（プリミティブ仮アセット）、通路ブロック判定
- [x] NPC 客: 出現 → A* → 行列 → 購入 → 退場、コイン演出
- [x] HUD、露店パネル（アップグレード/撤去）、アンロック通知、localStorage 保存
- [ ] 初デプロイ → `/explain-usage` で実測

## Phase 2 — Blender MCP アセット
- [ ] パレットテクスチャ 256×256
- [ ] prop_kiosk_{vegetable,bakery,cafe,flower}, deco_parasol, deco_bench, deco_planter, deco_hedge, deco_lamp, deco_statue
- [ ] GLB 一括書き出しスクリプト、gltf-transform、props.ts を GLB 読み込みに置換
- [ ] キャラ: Quaternius CC0 GLB（ダウンロードはユーザー承認が必要）

## Phase 3 — 経営ロジック拡張
- [ ] 客の満足度（待ち時間で離脱）、装飾の配置ボーナス
- [ ] 目標/実績、統計画面
- [ ] タブ非表示中の経過時間精算（オフライン売上）

## Phase 4 — 仕上げ
- [ ] トゥーン輪郭、SE、スマホ調整、ローディング

## Phase 5 — 公開
- [ ] GitHub Pages 公開 URL を社内共有
