/**
 * 感情として「怒り（`anger`）」が選択された回答について、
 * 怒りの強さ（1〜10）と重要度を `anger_log` Datastoreへ保存するSlackカスタム関数。
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  isValidAngerLevel,
  isValidAngerPriority,
} from "../blocks/daily_reflection_prompt.ts";
import AngerLogDatastore from "../datastores/anger_log.ts";

/**
 * 怒りの詳細記録を `anger_log` Datastoreに保存するSlack関数定義。
 * モーダルがキャンセルされた場合や「怒り」以外の感情が選ばれた場合は保存をスキップする。
 */
export const SaveAngerLogFunction = DefineFunction({
  callback_id: "save_anger_log",
  title: "怒りの振り返りを保存",
  source_file: "functions/save_anger_log.ts",
  input_parameters: {
    properties: {
      submissionId: { type: Schema.types.string },
      userId: { type: Schema.slack.types.user_id },
      emotion: { type: Schema.types.string },
      reflection: { type: Schema.types.string },
      angerLevel: { type: Schema.types.string },
      angerPriority: { type: Schema.types.string },
    },
    // 入力画面を閉じた場合や、怒り以外を選んだ場合は保存しません。
    required: [],
  },
});

/**
 * `emotion === "anger"` のときに入力値を検証し、`daily_reflections` と同じ `submissionId` を主キーとして
 * `anger_log` Datastoreへレコードを保存するハンドラ。
 */
export default SlackFunction(
  SaveAngerLogFunction,
  async ({ inputs, client }) => {
    const {
      submissionId,
      userId,
      emotion,
      reflection,
      angerLevel,
      angerPriority,
    } = inputs;
    if (!emotion || emotion !== "anger") return { outputs: {} };

    if (
      !submissionId || !userId || !reflection?.trim() ||
      !isValidAngerLevel(angerLevel) ||
      !isValidAngerPriority(angerPriority)
    ) {
      return { error: "怒りの記録に必要な入力が不足しています。" };
    }

    const response = await client.apps.datastore.put<
      typeof AngerLogDatastore.definition
    >({
      datastore: AngerLogDatastore.name,
      item: {
        id: submissionId,
        user_id: userId,
        reflection,
        anger_level: Number(angerLevel),
        priority: angerPriority,
        recorded_at: Date.now(),
      },
    });
    if (!response.ok) {
      console.error(`怒りの記録を保存できませんでした: ${response.error}`);
      return { error: `怒りの記録を保存できませんでした: ${response.error}` };
    }
    return { outputs: {} };
  },
);
