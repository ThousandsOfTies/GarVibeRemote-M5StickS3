# 自由入力と音声回答

自由入力の `request_user_input_async` も赤い入力待ちとして表示します。
選択肢がなくても質問を捨てません。実行承認・秘密入力・複数選択には音声回答を提供しません。

## 操作

1. 自由入力の質問を表示し、Aを700ms以上押し続けます。
2. 録音中の表示になったら話します。Aを離すと録音終了（上限10秒）。
3. BLE転送・文字認識を待ちます。認識した文章は自動スクロールで確認できます。
4. A短押しで送信、B短押しで録り直し、B長押しで中止します。

録音から確認までセッションを固定します。回答先は開始時のsessionId/uiIdで固定し、
質問の取り消し・変更、PCから先に回答、切断、時間切れが起きた場合は送信しません。
減光中の最初のボタン操作は従来どおり復帰のみです。
選択式の質問ではA短押しの決定を維持します。A長押しで選択肢を誤決定しません。

## PCの準備

通常の導入準備に加えて、Productルートで実行します。

```powershell
python scripts/setup_remote.py voice-prepare
python scripts/setup_remote.py prepare
```

`voice-prepare` は `.gar/speech-python` に faster-whisper 1.2.1を導入し、
日本語対応のbaseモデルを `.gar/speech-model` にダウンロードします。
初回のみインターネットが必要です。認識はCPU/int8・2スレッドでローカル実行します。
実装元: https://github.com/SYSTRAN/faster-whisper

その後、既存のbridge・sessions・deviceサービスを更新版で再起動します。
`device` はsetup_remote.pyから起動し、Productのパスを子プロセスに渡してください。
録音したPCMと認識結果はメモリ内で処理し、音声ファイルや文字起こしログは保存しません。
人が送信した回答本文は通常のCodex会話履歴へ残ります。クラウド音声APIやAPIキーは使いません。

## 実行経路

StickS3のM5Unified Mic → board::microphone/poll → 共通DeviceApplication/VoiceInput
→ 実機と共通のBleUart → PC VoiceReceiver → ローカルWhisper
→ BLEで認識結果 → A短押しによる明示確認 → 通常の質問回答経路 → 元のCodexカード。

収録・認識の音声は16kHz/mono/PCM16、最大320,000 bytes。無線では標準IMA ADPCMへ圧縮し、
約4分の1の容量で送ります。512 byte以下の独立ブロックごとの連番と受信確認を使い、
BLEのMTUによらず転送します。途中の欠落・順序違いはエラーで中止し、自動送信・再送はしません。
転送中は進捗％を表示します。短い発話にすると待ち時間を減らせます。
認識結果はPC側に保持し、確認時にデバイスから別の文章を差し込めません。
元の質問・回答元・ジャーナル・native IPCの再検証を既存の選択回答と共用します。

## シミュレータと検証範囲

通常のWebPanelも実機と同じ本番の質問・回答経路へ接続します。
「マイクを準備」を押してPCマイクを許可した後、自由入力の質問でAを長押しします。
音声認識結果をA短押しで送ると元のCodexカードへ戻ります。実機から先に回答した場合は
シミュレータの質問も更新され、古い質問に送信できません。選択式の回答も同じです。
PCマイクの権限が使えるEdge等を利用してください。

明示的な `--voice-test` は単体試験専用で、本番接続とは併用しません。
GARの生成artifactはProductルートを起動引数へ渡し、同じPCの非公開設定と準備済み
Whisperを利用します。トークン・モデルはartifactへコピーしません。

仮想マイクはPCM取得境界を置き換えます。ボタン割当・録音状態管理・転送制御・BLE制御
（実機と同じBleUart.h、SDK使用APIのみ代替）・確認画面は同じC++コードです。
実機M5UnifiedのI2S/codec/DMA、電気的タイミングや無線品質は再現しません。
`tests/voice.test.cjs` はPCMをこの境界へ入れ、録音、セッション固定、確認、切断を検証します。
認識結果の模擬値を使う試験と、Whisperへ実音声を通す試験は区別します。
