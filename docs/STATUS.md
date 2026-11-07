# 実装段階

2026-11-07: 通常のシミュレータも本番PC中継・質問回答経路へ接続。
選択回答は本番チャットへの配信をsource=m5sticks3-sim-bleで確認済み。
SDK代替とPCマイク以外は実機と同じ実装を使い、片方の回答で他方も更新します。
シミュレータ音声の本番往復も確認済み（「コーヒーを飲みたいです」）。
マイク準備部品は本体の上に表示します。ブラウザのマイク許可が必要です。

2026-11-07: 自由入力質問の入力待ち表示、A長押しの音声回答を追加。
PCのローカルWhisper準備、実機ビルド・COM4への書き込み・BLE再接続、
実機snapshotのvoiceState=idle/freeText=true/waitingを確認。
実機の内蔵マイク→圧縮BLE転送→ローカルWhisper→認識結果の確認→A短押し→
元のチャットへの返信を確認済み（「縦横10cmです」、source=m5sticks3-ble）。
詳細はVOICE_INPUT.md、検証記録はVALIDATION.md。

実装済み: Product構成、共通C++アプリ、簡素なWebPanel、2ボタンの共通割当、BLEの独立した
接続所有権とJSONL、暗号化GATTバイト通信部品、Windows中継、既存のCodex監視・質問返信と導入支援。
WebPanelのBLE経路は実機と同じBleUart.hを使用します。NimBLE / FreeRTOSの使用APIだけを代替し、無線通信は再現しません。

実機確認済み: 書き込み・画面起動、USB識別情報・状態の取得、ペアリング、BLE経由の2セッション状態通知。
未検証: 表示方向・色の詳細、全ボタン・電源操作、長時間安定性。
ファームウェアのビルド結果はVALIDATION.mdに記録します。
PC状態ブリッジ・セッション監視・BLE中継を起動して確認しました。Hook設定は変更していません。
導入手順はINSTALL.mdを参照してください。

仕様の一次資料: https://docs.m5stack.com/en/core/StickS3
