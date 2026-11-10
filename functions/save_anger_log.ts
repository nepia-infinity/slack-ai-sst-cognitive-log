import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  isValidAngerLevel,
  isValidAngerPriority,
} from "../blocks/daily_reflection_prompt.ts";
import AngerLogDatastore from "../datastores/anger_log.ts";

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
