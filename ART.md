# アートバイブル v0.1

- 見た目: ローポリ + トゥーン3段階 + パステル。参考画像（広場・青果キオスク・カフェ）
- カメラ: Orthographic 等角。回転 X -35.264° / Y 45°
- グリッド: 1 タイル = 2m。12×12。原点は底面中央
- パレット（src/scene/materials.ts の PALETTE と同期）
  | 名前 | HEX | 用途 |
  |---|---|---|
  | sky | #BFE6F5 | 背景 |
  | pave | #E8D9C3 | 石畳 |
  | paveDark | #D2BFA3 | 石畳の目地/縁 |
  | grass | #8CC152 | 芝 |
  | hedge | #5FA83F | 生垣・木 |
  | teal | #3BAA9A | キオスク骨組み・柵 |
  | orange | #F28C28 | 天幕・パラソル |
  | yellow | #F6C544 | 天幕アクセント |
  | cream | #FFF4DE | 天幕フリル・テーブル |
  | wood | #B9793A | 木箱・看板 |
  | red | #E45B4F | トマト・アクセント |
  | skin | #F4C9A6 | キャラ |
- 1 アセット ≤ 2,000 tri。Blender 書き出しは GLB、+Y Up、単一パレットテクスチャ 256×256
