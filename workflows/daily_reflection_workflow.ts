/**
 * 日次の出来事・認知・感情の振り返りワークフロー定義。
 *
 * 処理ステップ:
 * 1. `PostDailyReflectionPromptFunction`: 対象ユーザーのDMへ案内を送信し、モーダル入力を受け付ける
 * 2. `SaveDailyReflectionFunction`: 回答を `daily_reflections` Datastoreへ保存し、DMを保存完了表示に更新する
 * 3. `SaveAngerLogFunction`: 感情が「怒り」の場合のみ、強度と重要度を `anger_log` Datastoreへ保存する
 * 4. `AnalyzeDailyReflectionFunction`: OpenAI APIで回答を整理し、元のDMをAIの振り返り・行動カードで更新する
 */

import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { PostDailyReflectionPromptFunction } from "../functions/post_daily_reflection_prompt.ts";
import { SaveDailyReflectionFunction } from "../functions/save_daily_reflection.ts";
import { AnalyzeDailyReflectionFunction } from "../functions/analyze_daily_reflection.ts";
import { SaveAngerLogFunction } from "../functions/save_anger_log.ts";

/** 毎日の出来事の振り返りワークフロー */
export const DailyReflectionWorkflow = DefineWorkflow({
  callback_id: "daily_reflection_workflow",
  title: "毎日の出来事の振り返り",
  description: "毎朝、出来事を記録するための案内をDMに投稿します",
  input_parameters: {
    properties: {},
    required: [],
  },
});

const prompt = DailyReflectionWorkflow.addStep(
  PostDailyReflectionPromptFunction,
  {},
);
const saved = DailyReflectionWorkflow.addStep(SaveDailyReflectionFunction, {
  submissionId: prompt.outputs.submissionId,
  userId: prompt.outputs.userId,
  reflection: prompt.outputs.reflection,
  emotion: prompt.outputs.emotion,
  channelId: prompt.outputs.channelId,
  messageTs: prompt.outputs.messageTs,
});

DailyReflectionWorkflow.addStep(SaveAngerLogFunction, {
  submissionId: prompt.outputs.submissionId,
  userId: prompt.outputs.userId,
  emotion: prompt.outputs.emotion,
  reflection: prompt.outputs.reflection,
  angerLevel: prompt.outputs.angerLevel,
  angerPriority: prompt.outputs.angerPriority,
});

DailyReflectionWorkflow.addStep(AnalyzeDailyReflectionFunction, {
  reflection: prompt.outputs.reflection,
  emotion: prompt.outputs.emotion,
  userId: prompt.outputs.userId,
  channelId: saved.outputs.channelId,
  messageTs: saved.outputs.messageTs,
});

export default DailyReflectionWorkflow;
