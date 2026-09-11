# Vket Cloud 移植計画（v0.1 / 2026-09-12）

## 決定
- Unity 2022.3.22f1 + Vket Cloud SDK 16.5.7（npm 公開レジストリから導入。ログインはアップロード時のみ）
- Unity MCP は Unity 6 専用で使えない → Unity 側は **エディタスクリプト + バッチモード実行**で自動化
- Unity プロジェクト: `D:\market_tycoon_vkc`（Web 版 `D:\market_tycoon` とは別リポジトリにせず、同じ git で管理してもよいが Library は除外）
- **アップロード前に必ずユーザーへ通告**。公開ステータスは「非公開」または「限定公開」をユーザーが選ぶ（公開＝公式サイト掲載）

## Vket Cloud 側の対応表（Web 版 → HeliScript）
| Web 版 | Vket Cloud |
|---|---|
| three.js シーン | Unity シーン → HEO |
| 頂点カラー GLB | パレット PNG + UV（HEO は PNG テクスチャのみ） → FBX |
| OrthographicCamera 等角 | VKC Item Camera を固定配置し HeliScript で SetCamera。Player.SetControlEnabled(false) |
| クリック→タイル | hsInputGetMousePos + hsInputScreenToWorldPos（地面 Field にコライダー）/ OnClickNode |
| 露店の配置 | 雛形 VKC Item Object（非表示）を hsItemCreateClone → SetPos |
| NPC 客 | キャラ Object の clone、Update() 内で SetPos 補間、A* は HeliScript で自前実装 |
| HTML HUD | HSGUIModel + hsAddGUIText / hsAddGUIButton、OnClickedButton |
| localStorage | hsCookieSetStr / hsCookieGetStr（文字列にシリアライズ） |
| WebAudio 効果音 | VKC Item Audio（MP3 44.1kHz）を Play() |
| requestAnimationFrame | component Update() + hsSystemGetDeltaTime() |

## フェーズ
| # | 内容 | 状態 |
|---|---|---|
| V0 | Unity プロジェクト生成、SDK 導入、SDK 型情報のダンプ（コンポーネント名・フィールド） | 進行中 |
| V1 | Blender: パレットテクスチャ焼き込み + FBX 書き出し（props / characters） | |
| V2 | エディタスクリプトでシーン構築（Setting Base / Spawn / Camera / 地面 Field / 雛形 Object 群 / Audio / Attribute Script） | |
| V3 | HeliScript: グリッド・A*・経済・客 FSM・保存・HUD | |
| V4 | Build and Run（ローカル）で動作確認、調整 | |
| V5 | **ユーザーに通告 → ユーザーがログイン・非公開設定 → アップロード** | |

## リスク
- HEO の見た目（トゥーン不可、Standard/Unlit）→ Unlit + パレットで参考画像の雰囲気に寄せる
- HeliScript の list / class の制約（ジェネリック list<T>、参照渡し ref）で A* の性能
- バッチモードで SDK の初期化ウィンドウ（ログイン案内）が邪魔をする可能性
- 客数上限: 同時 clone 数と描画負荷（80 万 tri 上限は余裕）
