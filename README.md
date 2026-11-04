# VibeRemote · M5StickS3

<p align="center">
  <img src="docs/images/viberemote-cover.png" alt="VibeRemote — M5StickS3を手に持ち、AIの状態確認と質問への回答を行う利用イメージ" width="360">
  <br><sub>利用イメージ（AI生成）。実機の外観・画面表示とは一部異なります。</sub>
</p>

PCから離れている間も、M5Stack StickS3でCodexの状態を確認し、選択式の質問に回答するProductです。
**B短押しで選択、Aで決定、B長押しでセッション一覧**。PCとはBluetooth LEで接続します。
従来のPlus2版と同じ共通C++アプリを使用し、S3の2ボタンに操作を割り当てます。

## 現在できること

- WebPanelで実際の共通C++/LVGLアプリをNode + WebAssemblyで実行。
- 縦135×240、本文の自動スクロール、YES/NO・複数選択肢、最大16セッション。
- 状態による自動選択、操作中の表示固定、模擬PCへの回答とACK。
- 接続断・再接続、回答エラー、バックグラウンドの質問を試す。
- `?live=1`は既存のlocalhost:8775フィードを閲覧するモード。ブラウザの回答は実チャットへ送信しません。

BLE通信部品、Windows GATT中継、Codex状態・質問連携、導入支援を実装しています。
実機への書き込み・画面起動・USB通信・ペアリング・BLE経由の状態通知を確認済みです。
実機ボタンから本番チャットへの回答と長時間の安定動作は、引き続き確認が必要です。
PC内の試験と実機での確認は区別してください。SPP・Wi-Fiは使いません。
実機導入は[Windows導入手順](docs/INSTALL.md)を参照してください。

## 初めて取得するとき

```powershell
git clone --recurse-submodules https://github.com/ThousandsOfTies/GarVibeRemote-M5StickS3.git
cd GarVibeRemote-M5StickS3
python tools/product.py validate
```

Python 3.11以降、Node.js 24以降、Gitが必要です。実機を接続する必要はありません。
WASMはGitに含めないため、初回にビルドしてください。WindowsではUbuntuのWSLと
Emscripten 3.1.64を有効にした環境を使用します。

```powershell
python scripts/build.py --wsl Ubuntu-26.04
python scripts/simulate.py --port 8773
# http://127.0.0.1:8773/
```

通常のLinux環境では `python3 scripts/build.py --bootstrap` で固定SDKを準備できます。
WindowsのWSLビルドは `~/.cache/gar-ui/emsdk/emsdk_env.sh` があれば読み込みます。
停止は起動したターミナルでCtrl+C。HTTPはPC内だけで待ち受けます。

## 操作

| 実物のキー | アプリの操作 |
| --- | --- |
| A短押し | 決定 |
| B短押し | 次の選択肢／次のセッション |
| Bを0.7秒長押し | セッション一覧／一覧から戻る |

WebPanelの本体ボタンを押すか、ボタンへフォーカスしてA/Bキーを使います。
側面リセットはアプリの3個目のボタンとして使いません。液晶は非タッチです。

## 構成とAIへの引き継ぎ

```text
product.json                 組み合わせ・アプリ設定
hardware/binding.json        使用するLCDとA/Bの選択
sources/
  gar-vibe-remote/            共通UI・JSONL・セッション・回答処理（submodule）
  gar-tools/                  ビルド・Web Components（submodule）
  board-m5sticks3/            公式基板定義・USB/LCDアダプター（submodule）
firmware/sticks3/
  include/ButtonMapping.h    S3の2ボタンを共通アプリ入力に変換（PCも同じものを使用）
  src/main.cpp               基板とアプリの接続
simulation/                  WebPanel・C++ホスト入口・模擬PC・HTTP
scripts/                     再現可能なビルドと開発用起動
tools/product.py             共通compositionへの入口
transports/ble/              BLEのUUID設定とプロトコル契約
docs/                       構成・実装段階・検証範囲
tests/                      共通C++アプリを使う回帰確認
```

まず[AGENTS.md](AGENTS.md)と[実装段階](docs/STATUS.md)を読んでください。
Plus2版を参照し続ける絶対パスや、別ProductのWASMのコピーは使用しません。
共有リポジトリの更新を先にpushし、そのコミットをProductで固定します。

## 確認

```powershell
python tools/product.py validate
node --test tests/*.test.cjs
```

テストには生成済み `simulation/runtime` が必要です。
外観部品はgar-toolsの `web-simulator/tests/sticks3-browser/` で、設定の異なる2台を独立確認できます。

## ライセンス

独自コードはMIT。共通アプリの日本語フォントはSIL OFL 1.1です。
依存ライブラリのライセンスは各リポジトリに従います。
