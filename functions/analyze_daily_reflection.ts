/**
 * 保存済みの振り返り内容をOpenAI Responses API（`gpt-5-mini`）へ送信し、
 * CBTに基づく構造化回答で回答者のDMメッセージを更新するSlackカスタム関数。
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { getEmotionLabel } from "../blocks/daily_reflection_prompt.ts";
import { CBT_SYSTEM_PROMPT } from "../prompts/cbt_reflection.ts";
import { REFLECTION_RESPONSE_FORMAT } from "../prompts/reflection_response_format.ts";
import {
  aiReflectionBlocks,
  aiReflectionFallback,
  parseAiReflection,
} from "../blocks/ai_reflection.ts";

/**
 * AIによる振り返りを実行し、元のDMメッセージを上書き更新するSlack関数定義。
 * モーダルがキャンセルされた場合は空の入力を受け取り、何もせず正常終了する。
 */
export const AnalyzeDailyReflectionFunction = DefineFunction({
  callback_id: "analyze_daily_reflection",
  title: "AIと振り返る",
  description: "保存した振り返りをOpenAIで整理し、回答者のDMへ返します",
  source_file: "functions/analyze_daily_reflection.ts",
  input_parameters: {
    properties: {
      reflection: { type: Schema.types.string },
      emotion: { type: Schema.types.string },
      userId: { type: Schema.slack.types.user_id },
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
    },
    // 入力画面を閉じたときは前のステップから空の出力を受け取ります。
    required: [],
  },
});

/** OpenAI Responses API（`/v1/responses`）のレスポンス構造 */
type OpenAIResponse = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  usage?: {
    output_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

/**
 * OpenAI APIを呼び出して振り返り結果を生成し、`chat.update` で元のDMを更新するハンドラ。
 * APIキー未設定やAPIエラー時は、記録自体は保存済みである旨のエラー案内を同じDMに表示する。
 */
export default SlackFunction(
  AnalyzeDailyReflectionFunction,
  async ({ inputs, client, env }) => {
    const { reflection, emotion, userId, channelId, messageTs } = inputs;
    if (!reflection && !emotion && !userId && !channelId && !messageTs) {
      return { outputs: {} };
    }
    if (!reflection || !emotion || !userId || !channelId || !messageTs) {
      return { error: "AIとの振り返りに必要な入力が不足しています。" };
    }

    const apiKey = env["OPENAI_API_KEY"] ??
      Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error("OPENAI_API_KEY が設定されていません。");
      const updated = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text:
          `<@${userId}> 記録は保存しましたが、AIの振り返りを表示できませんでした。`,
      });
      if (!updated.ok) {
        console.error(
          `AI振り返り失敗メッセージの更新にも失敗しました: ${updated.error}`,
        );
      }
      return { error: "OPENAI_API_KEY が設定されていません。" };
    }

    try {
      const emotionLabel = getEmotionLabel(emotion) ?? emotion;
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions: CBT_SYSTEM_PROMPT,
          text: { format: REFLECTION_RESPONSE_FORMAT },
          input: `選んだ感情: ${emotionLabel}\n記述: ${reflection}`,
          max_output_tokens: 4000,
          store: false,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        console.error(`OpenAI API request failed: HTTP ${response.status}`);
        throw new Error("OpenAI API request failed");
      }

      const data = await response.json() as OpenAIResponse;
      if (data.status !== "completed") {
        console.error("OpenAI response incomplete:", {
          status: data.status ?? "unknown",
          reason: data.incomplete_details?.reason ?? "unknown",
          outputTokens: data.usage?.output_tokens,
          reasoningTokens: data.usage?.output_tokens_details?.reasoning_tokens,
        });
        throw new Error(`OpenAI response status: ${data.status ?? "unknown"}`);
      }
      const answer = data.output
        ?.filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text ?? "")
        .join("\n")
        .trim();
      if (!answer) {
        throw new Error("OpenAI API returned no text");
      }

      const result = parseAiReflection(JSON.parse(answer));
      const updated = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: aiReflectionFallback(result, userId),
        blocks: aiReflectionBlocks(result, userId),
      });
      if (!updated.ok) {
        console.error(
          `保存済みメッセージの更新に失敗しました: ${updated.error}`,
        );
        return { error: "AIの振り返りメッセージを更新できませんでした。" };
      }
      return { outputs: {} };
    } catch (error) {
      console.error("AIとの振り返りに失敗しました:", error);
      const updated = await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text:
          `<@${userId}> 記録は保存しましたが、AIの振り返りを表示できませんでした。時間をおいて再度お試しください。`,
      });
      if (!updated.ok) {
        console.error(
          `AI振り返り失敗メッセージの更新にも失敗しました: ${updated.error}`,
        );
      }
      return { error: "AIとの振り返りに失敗しました。" };
    }
  },
);
