# 実装段階

## この段階

Productと独立したStickS3基板リポジトリを用意し、アプリ・ツール・基板を固定します。
WebPanelは共通DeviceApplicationをC++からビルドし、実際のLVGL画素を表示します。
2ボタンの変換はProductのButtonMapping.hをPCと実機で共用します。
操作案内だけを共通UIの公開設定で差し替え、Plus2の既定表示は維持します。

WebPanelの模擬通信はJSONLのUSB相当経路です。BLEの無線・GATT・MTU・Windowsとの
実接続の検証にはなりません。UIの操作が通ることと無線の完成を区別してください。

## 次の実装

1. 共通アプリのUSB/SPP前提を見直し、BLEの接続状態・所有権・切断を正式に追加。
2. 独立したBLEバイト通信部品と、WindowsのGATTクライアントを用意。
3. 既存ProductのCodex監視・質問返信・導入支援を移植し、S3の機器確認を追加。
4. 実機ファームウェアをビルドし、USB、2ボタン、LCD、M5PM1を確認。
5. BLEの再接続・長文・多セッション・回答の重複防止を実機で確認。

新規利用者へ「実機導入まで完了」と案内するのは上記完了後です。
Plus2のSPPコードや電源保持GPIO4をS3へ持ち込まないでください。

仕様の一次資料: https://docs.m5stack.com/en/core/StickS3
