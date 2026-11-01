# StickS3 firmware scaffold

USBとLCDを共通アプリにつなぐ初期構成です。BLEは未実装、実機ビルド・書き込みは未検証です。
`python tools/product.py prepare`で選択した基板の設定を生成します。
`python tools/product.py build`はビルドだけを行い、書き込みません。
S3のリセット／電源操作はPlus2とは異なり、GPIO4の電源保持を使用しません。
