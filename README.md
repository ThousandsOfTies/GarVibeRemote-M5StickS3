# VibeRemote · M5StickS3

Codexの状態・複数セッション・選択式の質問を、M5Stack StickS3で確認するProductです。
従来のPlus2版と同じ共通C++アプリを使用し、S3の2ボタンに操作を割り当てます。

## 現在できること

- WebPanelで実際の共通C++/LVGLアプリをNode + WebAssemblyで実行。
- 縦135×240、本文の自動スクロール、YES/NO・複数選択肢、最大16セッション。
- 状態による自動選択、操作中の表示固定、模擬PCへの回答とACK。
- 接続断・再接続、回答エラー、バックグラウンドの質問を試す。
- `?live=1`は既存のlocalhost:8775フィードを閲覧するモード。ブラウザの回答は実チャットへ送信しません。

**今回の到達点はProduct構成とWebPanelです。BLE無線とWindows GATT中継、
Codex導入支援の移植は次の段階です。実機用USB/LCDアダプターは初期構成で、
ビルド・書き込み・実機操作はまだ検証していません。SPP・Wi-Fiは使いません。**

## 初めて取得するとき

```powershell
git clone --recurse-submodules https://github.com/ThousandsOfTies/GarVibeRemote-M5StickS3.git
cd GarVibeRemote-M5StickS3
python tools/product.py validate
```

Python 3.11以降、Node.js 22以降、Gitが必要です。実機を接続する必要はありません。
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
transports/ble/              BLEの実装境界とプロトコル契約
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
