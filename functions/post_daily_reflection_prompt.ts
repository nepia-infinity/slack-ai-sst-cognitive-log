/**
 * 配信対象ユーザーのDMへ振り返り案内メッセージを投稿し、
 * ボタン操作・モーダル入力・送信・キャンセルの各インタラクションを処理するSlackカスタム関数。
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  ANGER_LEVEL_ACTION_ID,
  ANGER_LEVEL_BLOCK_ID,
  ANGER_PRIORITY_ACTION_ID,
  ANGER_PRIORITY_BLOCK_ID,
  DAILY_REFLECTION_MODAL_CALLBACK_ID,
  dailyReflectionMessageBlocks,
  dailyReflectionModal,
  EMOTION_INPUT_ACTION_ID,
  EMOTION_INPUT_BLOCK_ID,
  isValidAngerLevel,
  isValidAngerPriority,
  isValidEmotion,
  REFLECTION_INPUT_ACTION_ID,
  REFLECTION_INPUT_BLOCK_ID,
  START_REFLECTION_ACTION_ID,
} from "../blocks/daily_reflection_prompt.ts";
import {
  fetchEnabledRecipients,
  postDirectMessage,
} from "./delivery_helpers.ts";

/**
 * 振り返り案内DMの配信とモーダル入力の受付を行うSlack関数定義。
 * モーダル送信またはクローズのイベントが到着するまで `completed: false` で待機する。
 */
export const PostDailyReflectionPromptFunction = DefineFunction({
  callback_id: "post_daily_reflection_prompt",
  title: "毎日の振り返りを投稿",
  description:
    "Datastoreで設定したユーザーのDMに振り返りメッセージを投稿します",
  source_file: "functions/post_daily_reflection_prompt.ts",
  input_parameters: {
    properties: {},
    required: [],
  },
  output_parameters: {
    properties: {
      reflection: {
        type: Schema.types.string,
        description: "ユーザーが入力した出来事の振り返り",
      },
      emotion: {
        type: Schema.types.string,
        description: "ユーザーが選択した感情の固定コード",
      },
      angerLevel: { type: Schema.types.string },
      angerPriority: { type: Schema.types.string },
      submissionId: { type: Schema.types.string },
      userId: { type: Schema.slack.types.user_id },
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
    },
    required: [],
  },
});

/**
 * 1. 初回実行時: `survey_enabled: true` の対象者へ「記録する」ボタン付きDMを送信し、入力待ちにする。
 * 2. `START_REFLECTION_ACTION_ID`: ボタン押下時に元のDMのチャンネルID・タイムスタンプを引き継いでモーダルを開く。
 * 3. `EMOTION_INPUT_ACTION_ID`: 感情で「怒り」が選択・解除された際にモーダルを更新し、専用入力欄を出し分ける。
 * 4. `addViewSubmissionHandler`: 入力値を検証し、後続の保存・AI振り返りステップへ出力を渡して関数を完了する。
 * 5. `addViewClosedHandler`: モーダルが閉じられた場合は空の出力で関数を完了し、後続ステップをスキップさせる。
 */
export default SlackFunction(
  PostDailyReflectionPromptFunction,
  async ({ client }) => {
    const recipientsResult = await fetchEnabledRecipients(client);
    if (!recipientsResult.ok) {
      return { error: recipientsResult.error };
    }

    let deliveryCount = 0;
    for (const { userId, dmChannelId } of recipientsResult.recipients) {
      const sent = await postDirectMessage(client, {
        userId,
        dmChannelId,
        text: `<@${userId}> 出来事を振り返る時間です。`,
        blocks: dailyReflectionMessageBlocks(userId),
        deliveryErrorLabel: "振り返りメッセージ",
      });
      if (sent) {
        deliveryCount += 1;
      }
    }

    if (deliveryCount === 0) {
      return {
        error:
          "配信対象が見つからないか、すべてのDM送信に失敗しました。survey_enabledがtrueのユーザーを確認してください。",
      };
    }

    return { completed: false };
  },
)
  .addBlockActionsHandler(
    [START_REFLECTION_ACTION_ID],
    async ({ body, client }) => {
      const privateMetadata = JSON.stringify({
        channelId: body.container.channel_id,
        messageTs: body.container.message_ts,
      });

      const response = await client.views.open({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: dailyReflectionModal(privateMetadata),
      });

      if (response.error) {
        await client.functions.completeError({
          function_execution_id: body.function_data.execution_id,
          error: `入力画面を開けませんでした: ${response.error}`,
        });
      }
    },
  )
  .addBlockActionsHandler(
    [EMOTION_INPUT_ACTION_ID],
    async ({ action, body, client }) => {
      const selected = action as {
        selected_option?: { value?: string } | null;
      };
      const emotion = selected.selected_option?.value;
      if (emotion && !isValidEmotion(emotion)) {
        return;
      }
      if (!body.view?.id) return;
      const angerFieldsVisible = body.view.blocks?.some((block) =>
        block.block_id === ANGER_LEVEL_BLOCK_ID
      );
      if (angerFieldsVisible === (emotion === "anger")) return;

      const response = await client.views.update({
        view_id: body.view.id,
        hash: body.view.hash,
        view: dailyReflectionModal(body.view.private_metadata ?? "", emotion),
      });
      if (!response.ok) {
        console.error(
          `感情の入力画面を更新できませんでした: ${response.error}`,
        );
      }
    },
  )
  .addViewSubmissionHandler(
    [DAILY_REFLECTION_MODAL_CALLBACK_ID],
    async ({ body, client, view }) => {
      const reflection = view.state.values[REFLECTION_INPUT_BLOCK_ID]
        ?.[REFLECTION_INPUT_ACTION_ID]
        ?.value?.trim();
      const emotion = view.state.values[EMOTION_INPUT_BLOCK_ID]
        ?.[EMOTION_INPUT_ACTION_ID]
        ?.selected_option?.value;
      if (!reflection) {
        return {
          response_action: "errors",
          errors: { [REFLECTION_INPUT_BLOCK_ID]: "出来事を入力してください。" },
        };
      }
      if (!isValidEmotion(emotion)) {
        return {
          response_action: "errors",
          errors: { [EMOTION_INPUT_BLOCK_ID]: "感情を1つ選択してください。" },
        };
      }
      const angerLevel = view.state.values[ANGER_LEVEL_BLOCK_ID]
        ?.[ANGER_LEVEL_ACTION_ID]
        ?.selected_option?.value;
      const angerPriority = view.state.values[ANGER_PRIORITY_BLOCK_ID]
        ?.[ANGER_PRIORITY_ACTION_ID]
        ?.selected_option?.value;
      if (emotion === "anger") {
        if (!isValidAngerLevel(angerLevel)) {
          return {
            response_action: "errors",
            errors: { [ANGER_LEVEL_BLOCK_ID]: "1〜10から選択してください。" },
          };
        }
        if (!isValidAngerPriority(angerPriority)) {
          return {
            response_action: "errors",
            errors: {
              [ANGER_PRIORITY_BLOCK_ID]: "当てはまるものを選択してください。",
            },
          };
        }
      }
      const { channelId, messageTs } = JSON.parse(view.private_metadata!);

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          submissionId: body.function_data.execution_id,
          userId: body.user.id,
          reflection,
          emotion,
          ...(emotion === "anger" ? { angerLevel, angerPriority } : {}),
          channelId,
          messageTs,
        },
      });

      return { response_action: "clear" };
    },
  )
  .addViewClosedHandler(
    [DAILY_REFLECTION_MODAL_CALLBACK_ID],
    async ({ body, client }) => {
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  );
