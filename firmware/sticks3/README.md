# StickS3 firmware

共通C++アプリをUSB/LCDおよび暗号化BLE UARTへ接続します。
BLE通信部品はgar-tools、基板I/Oはboard-m5sticks3、2ボタンの操作割当はProductに置きます。
`python tools/product.py build`はビルドだけを行います。書き込みません。
UUIDはtransports/ble/profile.jsonを正本としてビルド時に生成します。
実機のペアリング・通信・表示・ボタン・電源は未検証です。
Plus2のGPIO4電源保持は使用しません。
