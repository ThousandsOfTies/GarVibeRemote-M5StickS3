# 検証記録

## 2026-11-07 シミュレータの本番質問・回答経路

- embedded-development SKILLへ、実装前の実機/シミュレータ経路照合、既存制約の見直し、元の接続先への応答と未検証範囲の確認を必須チェックとして追加。junction元のSKILLを修正し、quick_validate成功。
- 通常のパネルを、実機と同じstartDeviceBridge・VoiceReceiver・PCブリッジ・question_service・NativeChatReplyへ接続。readonlyフィード経由とAボタン回答禁止を撤去。
- 差し替えはNimBLE/FreeRTOS使用APIとバイトポート、Web AudioによるPCM取得。C++アプリ・ボタン割当・IMA圧縮・BleUartの制御・PC音声認識・返信処理は同じ実装。詳細はSIMULATION_PATH.md。
- Product Nodeテスト41件成功。選択/音声回答を共有中継からnativeカードへ届ける結合試験、片方が回答した後の他方の二重送信拒否、PCブリッジ再起動時の古い押下の破棄と再接続を含む。
- 共通SDK byte portのバイナリ透過・独立した2端点・所有権解放を単体試験1件で確認。マイク部品とS3筐体は既存の共通Web Componentsを再利用。
- Edgeの偽マイクを使うブラウザ試験で、通常の本番接続用構成からPCM→共通C++→中継→確認→隔離nativeカードの往復を検証。ここでの質問/認識結果はfixtureであり、本番の証明とは分ける。
- 本番の質問に人がWebPanelから選択回答し、chat-answer-delivered(source=m5sticks3-sim-ble)と元のチャットの返信を照合。
- 続いて人がPCマイクで回答し、「コーヒーを飲みたいです」が元の本番質問への返信として到着。パネル側のvoice-audio-received/voice-transcribed/voice-confirmed/answer-acceptedと、監視側のchat-answer-delivered(source=m5sticks3-sim-ble)を確認。
- 初回の音声試験はマイク準備部品が見つからずエラー。部品を本体の上へ移動。マイク許可失敗の表示が次の画面更新で消える問題も修正。
- マイク許可を初回だけ拒否するブラウザ試験で、定期画面更新後もエラーが残り、再試行後にPCM入力と返信が回復することを確認。
- 最終artifactは20261107T014331387845Z-7ef7a9c0。GAR sim build/deploy/start/diagを実施し、running/deployed/expectedのbuild ID一致、本番質問経路有効、SDK側の認証・購読完了を確認。
- 実機の再書き込みは行っていない。PC代替では実際のI2S/codec/DMA、電波、暗号演算、無線タイミングを検証していない。

## 2026-11-07 自由入力と音声回答

- Product Nodeテスト37件、共有AppのTypeScript型チェックとテスト40件、GATT Pythonテスト2件成功。共通マイクworklet試験1件成功。
- 自由入力の検出、PCの通常文による回答の優先、native IPCでの元カードへの回答を隔離試験で検証。
- 共通C++ VoiceInputで700ms境界、録音、他セッション到着中の固定、認識結果確認、明示送信、質問変更・切断での中止を検証。
- PC中継のPCM組み立て、受信連番、320KB上限、ASR中の取り消し、直接の未確認テキスト拒否、再送しない動作を検証。
- ローカルWhisper base/int8/CPUで日本語合成音声を認識し、「縦と横は10cm、高さは4cmです。」と取得。実機マイクによる認識精度の証明ではない。
- Edgeの偽マイク機能を用い、独立した2つのgar-microphone-inputと、ProductのA長押し→PCM取得→認識結果表示→A短押し確認をブラウザで検証。ブラウザ試験の認識結果は模擬値で、本番へ送信しない。
- GAR target build/deploy最終版: 20261106T231737302641Z-aa937499。COM4のESP32-S3-PICO-1、MAC 7c:e8:b1:e5:32:10に書き込み、各フラッシュハッシュ検証成功。
- 実機snapshotでvoiceState=idle、activeTransport=bluetooth-ble、bleClient=trueと自由入力質問のwaiting/freeText=trueを取得。
- GAR sim build最終版: 20261106T231951835879Z-a4ac2c3a。通常の本番表示用として再配置・起動し、sim diagでbuild ID一致・本番フィード受信を確認。
- 初回の実機試験では無圧縮の転送時間が長く、進捗表示もなかった。IMA ADPCM圧縮と転送％を追加。デコーダーはPython audioopの独立した参照値と照合。
- 別の実機試験では、音声認識とPCブリッジ受信まで成功したがnative返信がunconfirmed。読み取り専用のCodex native snapshotで、自由入力のoptionsがnullであることを確認。元ログの未指定と厳密比較していたため一致確認で拒否されていた。自由入力に限りnull/未指定を同一扱いにし、同じnullを用いるnative IPC回帰試験を追加。
- 最終試験で実機マイクの69,632 byteのPCMを圧縮転送し、Whisperが8文字を認識。本人がAで確認し、「縦横10cmです」が元の質問への回答としてこのチャットへ到着した。
- PCログのvoice-confirmed、answer-accepted、chat-answer-delivered(source=m5sticks3-ble)を照合し、実機snapshotでBLE接続維持・voiceState=idleへの復帰を確認。過去の未確認回答は自動再送していない。
- 転送は録音終了から十数秒程度かかった。録音環境別の認識精度、長時間運用、通信品質の異なる環境は未検証。

2026-11-01

- 共通C++アプリからNode/WASMをビルド成功。
- ESP32-S3ファームウェアのビルド・リンク・イメージ生成成功。
  Flash 1,336,653 / 3,342,336 bytes (40.0%)、静的RAM 89,548 / 327,680 bytes (27.3%)。
  実行時ヒープ、BLEバッファ、スタックの使用量は別途実機確認が必要です。
- ProductのNodeテスト21件成功。2ボタン、スクロール、BLE相当の分割入力と所有権、
  再接続、ACK、古い回答・重複・異なる機器の拒否、本番閲覧の回答禁止を含みます。
- PythonのGATT分割・途中失敗を再送しない試験2件成功。
- gar-toolsのembedded composition 5件と共通composition 8件成功。
- 隔離したPCループバックで状態・質問・回答経路を確認。
- 新しい設定を一時フォルダーに作り、S3の回答元とトークン継続を確認。
- WebPanelの水色Aボタン、B短押し、B長押しの一覧表示をブラウザで確認。
- gar-toolsの部品単体例で2台の表示・電源・イベントの独立を確認してPASS。

Windowsの長いSDKパスではGCCが展開するコマンドが上限を超えたため、共通ビルド機構を
短いProduct／環境別キャッシュへ変更しています。新規導入ではそこへ直接構築します。

共通筐体と汎用GATT部品はgar-toolsに置きます。基板の端子・USB・LCDは独立した
board-m5sticks3、ProductはUUID設定、2ボタンの割当、Codex連携、シナリオと接続を所有します。
ブラウザは実際のLVGL画素を表示し、別のJS画面ロジックを持ちません。

実機未確認: 書き込み、起動・電源、LCD方向と色、ペアリング、MTU・通信速度、
USB/BLEの実送受信・切断復帰、実機回答からの本番チャット操作。
PC試験は無線の再現でも実ユーザーの承認でもありません。


## 2026-11-04 実機導入

- StickS3の8MBフラッシュをローカルへバックアップし、GAR target build/deployで書き込み・ハッシュ照合成功。
- USBのdeviceInfoでm5sticks3、135×240、BLE初期化成功、表示名M5StickS3を確認。画面起動はユーザー確認済み。
- BLE接続時に明示的にリンク暗号化を開始し、WindowsではGATTサービスを再取得するよう修正。
- BLE中継のdevice-readyと、USBから読み取ったsnapshotでactiveTransport=bluetooth-ble、実チャットのrunning状態、2セッション受信を確認。
- 中継関連Nodeテスト7件、GATT分割のPythonテスト2件成功。
- 本番チャットへの実機回答、全ボタン・電源操作、長時間・再起動後の安定性は未確認。
- READMEの表紙はAI生成の利用イメージであり、実機写真ではありません。


## 2026-11-05 待機時バックライト

共通アプリのIdleBacklightと全セッション待機判定を、S3実機とPCの双方で使用。
全セッションidleが30秒継続すると96→8へ減光し、非idle状態または物理ボタンで復帰。
キー割り当てより前で起床操作の押下・長押し・解放を消費し、誤回答を防止します。
Node試験27件成功。30秒境界、別セッション実行、質問到着、起床B長押し、
起床Aを保持中に質問が届いた場合の誤回答防止を含みます。
GARで実機版をビルド・書き込み・ハッシュ照合し、再起動後のBLE状態受信を確認。
シミュレータも再配置・起動済み。実機の見た目の減光量と電池持ちは未測定です。


## 2026-11-05 充電アイコン

M5UnifiedのStickS3向けisChargingから取得した事実を、基板→DeviceApplication→CompactUiへ渡します。
残量の右にLV_SYMBOL_CHARGEを独立配置し、充電停止時は消します。満充電で充電停止した場合も非表示。
Node 28件成功。充電状態の切り替えによるアイコン領域の画素変化・消去を確認。
実機へ書き込み・ハッシュ照合し、USB snapshotでcharging=true、battery=27、BLE接続維持を確認。
USBケーブルの抜き差しによる現物表示の切り替えはユーザー未確認です。
