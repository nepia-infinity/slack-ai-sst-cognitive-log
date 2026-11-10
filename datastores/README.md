# Datastores

Slackに保存する配信設定と振り返りのデータ構造です。ローカル版とデプロイ版のDatastoreは別々です。

| 定義ファイル | Datastore名 | 主キー | 用途 |
| --- | --- | --- | --- |
| [slack_user_profiles.ts](slack_user_profiles.ts) | `slack_user_profiles` | `slack_member_id` | DMの配信対象。配信するユーザーは `survey_enabled: true` にする |
| [daily_reflections.ts](daily_reflections.ts) | `daily_reflections` | `id` | 1回答につき1レコードを保存 |
| [anger_log.ts](anger_log.ts) | `anger_log` | `id` | 「怒り」の場合だけ入力文、強さ、重要度を保存 |

`daily_reflections` には関数実行IDの `id`、回答者の `user_id`、入力文の `reflection`、感情の固定コード `emotion`、保存時刻（Unixミリ秒）の `recorded_at` を記録します。感情コードの一覧は [blocks/daily_reflection_prompt.ts](../blocks/daily_reflection_prompt.ts) にあります。

`anger_log` の `id` は元の `daily_reflections.id` と同じです。`user_id`、入力文 `reflection`、怒りの強さ `anger_level`（1〜10）、重要度と変更可能性の固定コード `priority`、保存時刻 `recorded_at` を保持します。怒りの週次レポートは `anger_log` だけから作成できます。既存のレコードには `reflection` がないため、過去分の本文が必要な場合は同じ `id` の `daily_reflections` から補完してください。

## ローカルのレコードを確認する

例のユーザーIDは自分のSlackユーザーIDに置き換えてください。次の例はWindows PowerShell用です。

```powershell
slack-cli.exe datastore get --app local --datastore slack_user_profiles '{"id":"U0123ABCDEF"}' --output json
slack-cli.exe datastore query --app local --datastore daily_reflections '{"expression":"#u = :u","expression_attributes":{"#u":"user_id"},"expression_values":{":u":"U0123ABCDEF"}}' --output json
```

`slack_user_profiles` の主キー属性は `slack_member_id` ですが、CLIの `get` では検索引数に `id` を指定します。回答の `id` はユーザーIDではありません。上記の `query` 結果から回答の `id` を確認し、1件だけ取得できます。

```powershell
slack-cli.exe datastore get --app local --datastore daily_reflections '{"id":"検索結果のid"}' --output json
```

本番のレコードを確認するときは `--app local` を `--app deployed` に変更します。ローカル版への操作でCLIがサポート警告を出す場合は、対象が `(local)` であることを確かめ、必要に応じて `--force` を追加してください。入力文には個人的な情報が含まれます。共有するときは内容を伏せてください。
