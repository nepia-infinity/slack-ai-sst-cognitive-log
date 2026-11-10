import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { savedReflectionMessageBlocks } from "../blocks/daily_reflection_prompt.ts";
import DailyReflectionsDatastore from "../datastores/daily_reflections.ts";

export const SaveDailyReflectionFunction = DefineFunction({
  callback_id: "save_daily_reflection",
  title: "振り返りを保存",
  source_file: "functions/save_daily_reflection.ts",
  input_parameters: {
    properties: {
      submissionId: { type: Schema.types.string },
      userId: { type: Schema.slack.types.user_id },
      reflection: { type: Schema.types.string },
      emotion: { type: Schema.types.string },
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
    },
    // モーダルを閉じた場合は空の出力が渡るため、入力は任意にしてスキップします。
    required: [],
  },
  output_parameters: {
    properties: {
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
    },
    required: [],
  },
});

export default SlackFunction(
  SaveDailyReflectionFunction,
  async ({ inputs, client }) => {
    const { submissionId, userId, reflection, emotion, channelId, messageTs } =
      inputs;
    if (
      !submissionId && !userId && !reflection && !emotion && !channelId &&
      !messageTs
    ) {
      return { outputs: {} }; // キャンセル時にはレコードを作らない
    }
    if (
      !submissionId || !userId || !reflection || !emotion || !channelId ||
      !messageTs
    ) {
      return { error: "振り返りの保存に必要な入力が不足しています。" };
    }

    const response = await client.apps.datastore.put<
      typeof DailyReflectionsDatastore.definition
    >({
      datastore: DailyReflectionsDatastore.name,
      item: {
        id: submissionId,
        user_id: userId,
        reflection,
        emotion,
        recorded_at: Date.now(),
      },
    });

    if (!response.ok) {
      console.error(`振り返りを保存できませんでした: ${response.error}`);
      const failed = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text:
          `<@${userId}> 振り返りを保存できませんでした。時間をおいてもう一度入力してください。`,
      });
      if (!failed.ok) {
        console.error(
          `保存失敗メッセージの更新にも失敗しました: ${failed.error}`,
        );
      }
      return { error: `振り返りを保存できませんでした: ${response.error}` };
    }

    const confirmation = await client.chat.update({
      channel: channelId,
      ts: messageTs,
      text: `<@${userId}> 本日の出来事を記録しました。`,
      blocks: savedReflectionMessageBlocks(userId),
    });
    if (!confirmation.ok) {
      // 保存は成功しているため、完了表示の失敗で再保存はしない。
      console.error(
        `保存後のメッセージ更新に失敗しました: ${confirmation.error}`,
      );
    }
    return { outputs: { channelId, messageTs } };
  },
);
