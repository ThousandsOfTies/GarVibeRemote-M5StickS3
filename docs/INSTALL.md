# WindowsとStickS3の導入

対象はM5Stack StickS3 (K150)。Node.js 24以降、Python 3.11以降、Git、Bluetoothアダプターを使用します。
PCの状態ブリッジはlocalhostのみ。S3をWi-Fi・社内LANに接続する必要はありません。

## 準備

```powershell
git clone --recurse-submodules https://github.com/ThousandsOfTies/GarVibeRemote-M5StickS3.git
cd GarVibeRemote-M5StickS3
python scripts/setup_remote.py doctor
python scripts/setup_remote.py prepare
python tools/product.py build
```

`prepare`はProduct内の隔離環境へ依存ライブラリを入れ、`build`はビルドだけを行います。
Windowsの成果物は `%USERPROFILE%/.cache/gar/<Product別ID>/build/sticks3-usb/`、
Linuxでは `.cache/gar-target-build/<実行環境>/build/sticks3-usb/`。成功時に表示されるパスを使います。
実機で書き込み・BLE状態通知まで確認した版です。各環境で元のフラッシュのバックアップ、
型番・書き込み先の確認、書き込み、表示・電源・2ボタンの検証を行ってください。
Plus2用のファームウェアは使いません。

書き込みと導入完了の基準は[READMEのAI向け手順](../README.md#導入を担当するaiへ)を参照してください。

## Codexの設定

CHAT_IDを対象のローカルCodexチャットIDへ置換します。まず1件で確認し、複数監視する場合は
`--session-scope local`を加えます。これは全プロジェクトのローカルチャットを監視します。

```powershell
python scripts/setup_remote.py configure --project D:\YourProject --session-id CHAT_ID --chat-questions
```

設定とトークンはGit管理外の `artifacts/connection/local.json` に保存します。
移行時は `--import-config <以前のPC設定ファイル>` を指定できます。
実機の回答元は `m5sticks3-ble` / `m5sticks3-usb` に限定します。
Hookを使用する場合だけ、明示的に次を実行してCodexの `/hooks` で確認・信頼してください。

```powershell
python scripts/setup_remote.py hooks --project D:\YourProject
```

## BLE接続

実機の表示名は `M5StickS3`。Windowsでペアリングし、両方に表示された番号を確認して、
S3でB短押し→YES、Aで決定し、Windows側でも確定します。固定PINは使いません。

```powershell
python scripts/setup_remote.py ble-scan
```

対象のBluetoothアドレスを確認します。次の各サービスは別ターミナルで起動します。

```powershell
# 1. PC状態ブリッジ
python scripts/setup_remote.py bridge
# 2. Codex Appから起動する質問連携（複数監視なら questions の代わりに sessions）
python scripts/setup_remote.py questions
# 3. アドレスをble-scanの結果へ置換
python scripts/setup_remote.py device --transport ble --port AA:BB:CC:DD:EE:FF
```

`--port`は既存CLIとの互換名で、BLE時はBluetoothアドレスです。BLEはCOMポートを使いません。
USBの切り分け時だけ `device --transport usb --port COM番号` を使用します。
質問連携は対象チャットを開いたCodex Appの実行環境が必要です。
自由記述やツールの実行承認は実機へ転送しません。

## WebPanelと診断

```powershell
python scripts/build.py --wsl Ubuntu-26.04
python scripts/simulate.py --port 8773
```

通常は本体と操作案内のみを表示。「開発用の設定」で試験条件・回答結果・ログを開けます。
BLE相当の試験では20バイトに分割して共通C++アプリへ渡します。無線・GATTの再現ではありません。
本番の状態を閲覧するときは `python scripts/setup_remote.py simulator-feed` を起動し、
`http://127.0.0.1:8773/?live=1`を開きます。このモードから実チャットへ回答は送れません。

診断は `doctor`、停止は各ターミナルでCtrl+Cです。doctorは実機接続の成功を保証しません。
Bluetooth切断後は新規接続と最新一覧の取得を行い、不明な回答を自動で再送しません。
