# BLE検証経路

実機: PC → Windows GATT → 無線 → NimBLE/FreeRTOS → BleUart.h → DeviceApplication/CompactUi

PC: 模擬PC → NimBLE/FreeRTOS使用APIのホスト代替 → 同じBleUart.h → 同じDeviceApplication/CompactUi

逆方向もアプリの出力をBleUart.send/poll/notifyへ通し、分割通知を模擬PCで復元します。
既定のWebPanel試験経路はBLEです。USB選択時のみUSB受信口を利用します。
Productのhost-entryはSDKイベントとアプリの接続を担当し、BLE制御ロジックを複製しません。
SDK代替はgar-tools/transports/ble-uart/hostにあります。

認証の自動成功はSDK代替の通常シナリオです。接続イベントに対して実際のBleUartが
startSecurityを呼ばなければ認証は進みません。試験では自動認証を停止し、
認証失敗・購読解除・再接続等のイベントも個別に投入できます。
セッション・質問・回答ID・ACKは模擬PCと共通アプリが従来どおり処理します。

仮想化しない範囲: 実際のNimBLEスタック、電波、暗号演算、WindowsのGATTキャッシュ、
FreeRTOSの競合・スケジューリング、実機の消費電力。ホスト代替は使用APIに限定したテストダブルです。


## 検証結果（2026-11-05）

- Node 23件、Python GATT試験2件成功。
- Productと独立したSDK境界試験で、認証前の拒否、通知、再接続、認証失敗を確認。
- 一時コピーからstartSecurityの呼び出しだけを削除すると試験が失敗し、実コードでは成功することを確認。
- GAR sim build/deploy/start/diagを使用。管理対象パネルは8774番（8773番の他Productと分離）。
- 上記はホスト代替による制御経路の検証であり、今回実機の再書き込み・無線試験は実施していません。


本番表示はシミュレータサーバがlocalhost:8775/stateから受信します（1秒間隔、同時要求なし）。
ブラウザはフレーム表示とボタン操作のみで、本番データの転送を担当しません。
受信先が到達不能・未接続になった場合、仮想BLEリンクを切断してアプリを接続待ちへ戻します。
模擬シナリオは明示的にdemoを指定した自動試験でのみ有効で、通常のHTTP入力からは投入できません。
