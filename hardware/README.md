# 基板資源の選択

GPIO・LCD・電源の正本はsources/board-m5sticks3/profiles/arduino-esp32.jsonです。
binding.jsonはLCDとA/Bを名前で選ぶだけです。操作の意味はProductのButtonMapping.h、
画面とセッション処理は共有アプリにあります。
