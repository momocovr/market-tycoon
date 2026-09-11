# かわいい街並み 商店街経営3Dゲーム 制作計画 v0.2（2026-09-11）

## 0. 決定事項

| 項目 | 決定 |
|---|---|
| ジャンル | 広場の商店街を経営するタイクーン（NPC客が買い物に来る） |
| ランタイム | three.js + Vite + TypeScript |
| UI | 素の HTML/CSS オーバーレイ（React 不使用） |
| アセット制作 | Blender MCP でローポリ小物・建物。単一パレットテクスチャ |
| 初期アセット | Kenney Fantasy Town Kit / City Kit（CC0, glTF） |
| キャラクター | CC0 流用（Quaternius のリグ・アニメ付き GLB）。自作しない |
| 公開範囲 | URL を知っている人なら誰でも → GitHub Pages |
| 実行体制 | メインセッションのみ。**サブエージェント不使用**（利用料抑制） |
| トークン | プラン不明のため Phase 0+1 実施後に `/explain-usage` で実測して外挿 |

## 1. ゲーム内容（MVP）

舞台: 参考画像と同じ広場 1 エリア（噴水/彫像の公園、青果キオスク、カフェ、生垣、街灯）。

コアループ:
1. 所持金で露店を空きマスに配置（青果、パン、カフェ、花…）
2. NPC 客が広場入口から出現 → 欲しい商品の露店へ歩く → 行列 → 購入 → 退場
3. 売上が入る。露店ごとに「品揃え」「接客速度」をアップグレード
4. 一定売上で新しい露店種類・装飾（パラソル、ベンチ、花壇）がアンロック
5. 装飾が増えると客の出現頻度と満足度が上がる（見た目とゲーム性が連動）
6. 自動保存（localStorage）。開き直すと続きから

MVP に入れないもの: 従業員雇用、天候、複数エリア、マルチプレイ、ランキング。

## 2. 技術構成

```
src/
  main.ts            起動、ループ
  scene/             カメラ(Orthographic 等角)、ライト、影、地面
  assets/            GLB ローダー、名前→Mesh 辞書、InstancedMesh
  world/             グリッド(2m)、配置、経路探索(A*)
  sim/               経済、露店、客のステートマシン(出現→移動→行列→購入→退場)
  ui/                HTML/CSS: 所持金、配置メニュー、露店詳細、アンロック通知
  save/              localStorage
public/models/       *.glb（gltf-transform 圧縮済み）
```

- 見た目: MeshToonMaterial + gradientMap、PCFSoft 影、パステル背景
- カメラ: OrthographicCamera、回転 X -35.264° / Y 45°、マウスホイールでズーム、ドラッグでパン
- キャラアニメ: Quaternius GLB の Idle / Walk を AnimationMixer で切替

## 3. 参考リポジトリ

- dgreenheck/simcity-threejs-clone — three.js + Vite グリッド配置。MIT。土台の骨格
- intellicia-public/parastore — 店内を回遊する NPC の経路探索・購買行動
- SebaLopez94/ThemeParkSpookyVibejam — 配置・価格・満足度のタイクーンループ
- aeml/eidolon — Blender→GLB→gltf-transform、アイソメ ARPG
- crgeary/idle — アンロック・経済の数式設計
- Soft8Soft/threejs-blender-template, funwithtriangles/blender-to-threejs-export-guide — Blender 書き出し
- mayacoda/toon-shader — トゥーン表現
- アセット: kenney.nl（Fantasy Town Kit 160点 / City Kit Suburban 40点）、Quaternius（キャラ）

## 4. フェーズ（セッション単位・直列実行）

| Phase | 内容 | セッション |
|---|---|---|
| 0 | リポジトリ、Vite+TS 雛形、GitHub Pages 用 Actions、アートバイブル（パレット 8〜12 色、カメラ角、タイル 2m） | 0.5 |
| 1 | 縦切り: 等角カメラ、地面タイル、Kenney キット配置、露店 1 種の配置、NPC 1 体が来て買って帰る、所持金表示。**ここで初デプロイ → `/explain-usage` で実測** | 1〜2 |
| 2 | Blender MCP 自作アセット: キオスク、パラソル、カフェテーブル/椅子、野菜クレート、生垣、街灯、看板、彫像。GLB 一括書き出しスクリプト、gltf-transform | 2〜3 |
| 3 | 経営ロジック: 露店 4 種、行列、アップグレード、アンロック、装飾効果、保存 | 3〜4 |
| 4 | 仕上げ: トゥーン化、影、SE、購入時パーティクル、スマホタッチ、ローディング画面 | 1〜2 |
| 5 | 公開: GitHub Pages 本番、社内に URL 共有、フィードバック反映 | 0.5〜1 |
| 合計 | | 9〜13 |

1 日 1 セッションで約 2 週間。Phase 1 完了時点の実測値で以降を見直す。

## 5. トークン節約ルール

- サブエージェントを使わない。調査は WebSearch 最小限
- Blender 確認は低解像度サムネイル描画（render_thumbnail_to_path）
- ファイルは小さく分割し、再読み込みを避ける
- 各セッション末にコミット + `TASKS.md` 更新。次セッションは PLAN.md と TASKS.md だけ読んで再開
- 見た目確認はブラウザスクリーンショットを 1 フェーズ数回に抑える

## 6. Blender MCP アセット規約

- 1 タイル = 2m。原点は底面中央。前方 -Y
- 1 アセット ≤ 2,000 tri。全体で単一パレットテクスチャ（256×256）
- 命名: `prop_kiosk_vegetable`, `tile_road_straight`, `deco_hedge_long`
- 書き出し: GLB、Apply Modifiers、+Y Up。圧縮は gltf-transform 側
- コレクション単位で 1 GLB（`props.glb`, `tiles.glb`）、three.js 側で名前参照して複製

## 7. リスク

- NPC の行列・すり抜け → グリッド A* + 露店ごとの待機マス列で簡略化
- スマホ性能 → InstancedMesh、影 1024、ポストプロセスなし
- 見た目の統一 → Phase 0 でパレット固定。Kenney → 自作差し替え時も同パレット
- セッション途中の枠切れ → こまめなコミットと TASKS.md で復帰コストを下げる
