# 実装段階

実装済み: Product構成、共通C++アプリ、簡素なWebPanel、2ボタンの共通割当、BLEの独立した
接続所有権とJSONL、暗号化GATTバイト通信部品、Windows中継、既存のCodex監視・質問返信と導入支援。
WebPanelのBLE経路は実機と同じBleUart.hを使用します。NimBLE / FreeRTOSの使用APIだけを代替し、無線通信は再現しません。

実機確認済み: 書き込み・画面起動、USB識別情報・状態の取得、ペアリング、BLE経由の2セッション状態通知。
未検証: 表示方向・色の詳細、全ボタン・電源操作、実機からのCodex返信、長時間安定性。
ファームウェアのビルド結果はVALIDATION.mdに記録します。
PC状態ブリッジ・セッション監視・BLE中継を起動して確認しました。Hook設定は変更していません。
導入手順はINSTALL.mdを参照してください。

仕様の一次資料: https://docs.m5stack.com/en/core/StickS3
