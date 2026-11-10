/**
 * 配信対象ユーザーの直近7日間の感情記録を集計し、
 * 記録が存在するユーザーのDMへ円グラフと一覧表を送信するSlackカスタム関数。
 */

import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { weeklyEmotionBlocks } from "../blocks/weekly_emotion_report.ts";
import type { ReflectionRecord } from "../blocks/weekly_emotion_report.ts";
import DailyReflectionsDatastore from "../datastores/daily_reflections.ts";
import { deliverWeeklyReport } from "./delivery_helpers.ts";

/** 週次感情レポート配信用のSlack関数定義 */
export const PostWeeklyEmotionReportFunction = DefineFunction({
  callback_id: "post_weekly_emotion_report",
  title: "今週の感情記録をDMに送る",
  source_file: "functions/post_weekly_emotion_report.ts",
  input_parameters: { properties: {}, required: [] },
});

/** `daily_reflections` Datastoreから今週の記録を取得し、対象ユーザーのDMに送信するハンドラ */
export default SlackFunction(
  PostWeeklyEmotionReportFunction,
  async ({ client }) => {
    return await deliverWeeklyReport<ReflectionRecord>(client, {
      datastore: DailyReflectionsDatastore.name,
      text: "今週の感情記録を振り返りましょう。",
      recordErrorLabel: "記録",
      deliveryErrorLabel: "週次レポート",
      buildBlocks: weeklyEmotionBlocks,
    });
  },
);
