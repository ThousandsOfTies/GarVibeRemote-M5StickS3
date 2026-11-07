# 実機とシミュレータの実行経路

## 実装前に照合した経路と完了条件（2026-11-07）

両方とも、本番Codexの質問を共通アプリへ届け、人が選んだ回答を元のチャットへ一度だけ戻します。
既存の「閲覧専用」と8775経由の一方向フィードは、この目的を満たさないため通常経路から外しました。
単体試験の成功・PC中継のACKだけでは本番への返信確認とは扱いません。

| 段階 | 実機 | 通常のシミュレータ |
| --- | --- | --- |
| 質問・状態 | ローカルCodex → session_monitor/question_service → 本番PCブリッジ | 同じ監視範囲・同じ本番PCブリッジ |
| PC中継 | device_bridge.cjs の startDeviceBridge | 同じ startDeviceBridge（別インスタンス） |
| BLE境界 | BlePort → Windows GATT → 無線 → NimBLE/FreeRTOS | SDK byte port → NimBLE/FreeRTOS使用APIのホスト代替 |
| デバイス制御 | BleUart.h → DeviceApplication/CompactUi/ButtonMapping/VoiceInput | 同じC++コード。アプリ受信口へ直接注入しない |
| 音声取得 | M5Unified Mic / board adapter → PCM16 mono 16kHz | gar-microphone-input / PCマイク → 同じPCM取得境界 |
| 圧縮・音声転送 | VoiceInputのIMA ADPCM → BleUart → PC中継 | 同じVoiceInput/IMA ADPCM/BleUart → 同じPC中継 |
| 認識・確認 | VoiceReceiver → ローカルWhisper → 認識結果を本体で確認 | 同じVoiceReceiver/Whisper → 同じC++画面で確認 |
| 回答 | PCブリッジ → question_service → NativeChatReply → 元のCodexカード | 同じ経路。元のsession/question/choice IDと配信ジャーナルを維持 |

本番のシミュレータの回答元は `m5sticks3-sim-ble`、実機は `m5sticks3-ble` です。
監視範囲は増やしません。どちらかが先に回答すると、もう片方も最新状態に更新され、
回答の二重送信や、取り下げられた質問への音声回答を防ぎます。

## 起動・操作

PCブリッジとセッション監視は従来どおり必要です。Productの接続設定で
`chatQuestionSources` に `m5sticks3-sim-ble` を含めます。新規configureでは設定されます。
GARからsim build/deploy/start/diagを実施し、http://127.0.0.1:8774/ を開きます。
8775の閲覧用フィードは不要です。生成する起動descriptorはProductルートだけを渡し、
トークンはProductの非公開設定からサーバ側で読み込みます。ブラウザへ渡しません。

選択回答はB短押しで選択、A短押しで決定。自由入力は「マイクを準備」の後に
A長押しで収録し、離して認識、A短押しで確認送信します。ブラウザのマイク許可が必要です。
通常モードは本番の質問だけを扱い、HTTPから模擬シナリオや任意の本番状態を投入できません。
明示的なdemoは隔離された単体試験用であり、本番中継と同時に接続しません。

## 代替する範囲と限界

SDK代替はgar-tools/transports/ble-uart/hostにあり、node-byte-port.cjsが共通PC中継へ
バイトポートを提供します。接続時に実際のBleUartがstartSecurityを呼ばなければ認証は進みません。
アプリ出力もBleUart.send/poll/notifyへ通してからPC中継へ返します。

仮想化しない範囲: 実際のNimBLEスタック、電波、暗号演算、WindowsのGATTキャッシュ、
FreeRTOSの競合・スケジューリング、実機のI2S/codec/DMA、消費電力。
マイクのハードウェア制御はPCのWeb Audioで代替し、M5UnifiedのMicドライバ自体はPCで実行しません。
ホスト代替は使用APIに限定したテストダブルです。

## 検証結果（2026-11-05）

- Node 23件、Python GATT試験2件成功。
- Productと独立したSDK境界試験で、認証前の拒否、通知、再接続、認証失敗を確認。
- 一時コピーからstartSecurityの呼び出しだけを削除すると試験が失敗し、実コードでは成功することを確認。
- GAR sim build/deploy/start/diagを使用。管理対象パネルは8774番（8773番の他Productと分離）。
- 上記はホスト代替による制御経路の検証であり、今回実機の再書き込み・無線試験は実施していません。
