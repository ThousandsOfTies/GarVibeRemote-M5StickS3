# 初期構成の確認記録

2026-11-01: `python tools/product.py validate` 成功。
`python scripts/build.py --wsl Ubuntu-26.04` で新ProductのソースからWASMをビルド。
従来Productの生成済みバイナリをコピーしていません。

`node --test tests/*.test.cjs`: 6件成功。

- B短押しによる選択、Aによる回答、模擬PCのACK。
- B長押しによる一覧、B短押しとAによる別セッション選択。
- 押下キャンセルから決定を生成しないこと。
- 自動スクロール、接続断・再接続、存在しないC入力・SPP指定の拒否。
- 本番閲覧モードから回答を生成しないこと。
- HTTPの非公開パス拒否と操作APIのオリジン制限。

ブラウザでもA/Bの操作から模擬PCへの回答を確認。
gar-tools `web-simulator/tests/sticks3-browser` は2台を独立配置し、公開属性、
ボタンedge・キャンセル・C入力無効・独立イベントを確認してPASS。

筐体はgar-toolsの `web-simulator/components/m5sticks3.mjs`。
Productには操作割当・メッセージ・シナリオ・接続先のみを置きます。
LCD内は共有LVGLの画素で、Product adapterは共通部品のShadow DOMを参照しません。
筐体の外観は概略で、寸法・端子形状・色の製造公差の検証用ではありません。

未確認: 実機のファームウェアビルド・書き込み、ボタンと電源管理、USBおよびBLEの実接続。
