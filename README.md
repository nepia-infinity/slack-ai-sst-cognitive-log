# ai-sst-cognitive-log
> [!NOTE]
> 基本機能は一通り完成しています。現在は個人用ワークスペース（利用者1名）でのみ検証しており、複数ユーザー環境での動作確認は実施していません。
> 本ワークフローはCBTを素人が独自アレンジしたもので、医療行為を提供するものではありません。
> AIは真偽が不確かな情報を出力することもあります。きちんと外部の専門家や医療機関へ相談・指示に従うようにしてください。

## YouTubeで挙動イメージを確認する
[![デモ動画を見る](https://img.youtube.com/vi/HL2DfUUxLzg/hqdefault.jpg)](https://youtu.be/HL2DfUUxLzg)

## Slackのイメージ画像
<img src="https://github.com/user-attachments/assets/714295e1-94c2-40af-9083-af107d5e87f1" alt="Slackの画面2" width="600">

## このリポジトリの簡単な説明
CBT（認知行動療法）の考え方に基づいて、日々の出来事、認知、感情を分類し、datastoreで記録し、AIによる振り返りと具体的な対策を届けるSlackのカスタムワークフローです。

## ディレクトリ

| 場所 | 役割 |
| --- | --- |
| [blocks/](blocks/) | 入力画面、AIの行動カード、週次レポートのBlock Kit表示 |
| [datastores/](datastores/) | 配信対象と回答のデータ構造 |
| [functions/](functions/) | DM配信、回答保存、AI処理、週次レポートの関数 |
| [prompts/](prompts/) | CBTの指示文とAIの回答形式 |
| [triggers/](triggers/) | 手動・定時実行の開始条件 |
| [workflows/](workflows/) | 日次・週次の処理順序 |
| [.devcontainer/](.devcontainer/) | コンテナを使う開発環境 |

## 主な機能

- 毎朝8時（日本時間）に、配信を有効にしたユーザーへ記録の案内をDMで送信します。
- 感情を13種類から選び、出来事や考えを入力すると、回答をDatastoreに保存します。
- 「怒り」を選ぶと同じ入力画面にアンガーマネジメントの案内、怒りの強さ（1〜10）、重要度と変えられるかの選択欄が表示されます。
- OpenAIの `gpt-5-mini` が入力を「出来事・認知・感情」と最大3件の行動案に整理し、DMに表示します。
- 毎週日曜20時（日本時間）に、直近7日間の感情の内訳と記録一覧をDMで送ります。

## LINEで使えたら、さらに便利かも？
<img width="400" alt="image" src="https://github.com/user-attachments/assets/801b709e-db2e-4ac2-b4c4-4de6f7acd4fe" />


## ローカルで動かす

Slack CLI、Deno、アプリをインストールできるSlackワークスペースが必要です。以下はWindows PowerShellで `slack-cli` を使う例です。

```powershell
git clone https://github.com/nepia-infinity/ai-sst-cognitive-log.git
cd ai-sst-cognitive-log
slack-cli login
```

> [!NOTE]
> コマンド名が `slack` の環境では読み替えてください。
> `token_revoked` が出た場合は、`slack-cli login` を実行して認証してください。

### 配信対象の登録とトリガー

`U0123ABCDEF` は対象者のSlackユーザーIDに置き換えてください。`survey_enabled: true` のユーザー全員が配信対象です。

```powershell
slack-cli datastore put --app local --datastore slack_user_profiles '{"item":{"slack_member_id":"U0123ABCDEF","survey_enabled":true}}'
slack-cli trigger create --app local --trigger-def triggers/manual_daily_reflection.ts
```

手動トリガーの作成結果に表示されるリンクを開くと、配信対象の**全員**へ案内を送ります。確認できたら定時トリガーを作成します。

```powershell
slack-cli trigger create --app local --trigger-def triggers/daily_reflection.ts
slack-cli trigger create --app local --trigger-def triggers/weekly_emotion_report.ts
```

トリガーの種類と配信時刻は [triggers/README.md](triggers/README.md) にまとめています。重複配信を避けるため、作成済みのトリガーは `slack-cli trigger list --app local` で確認してください。

### 動作確認

```powershell
slack-cli datastore count --app local --datastore daily_reflections
slack-cli datastore query --app local --datastore daily_reflections '{"limit":10}' --output json
deno task test
```


