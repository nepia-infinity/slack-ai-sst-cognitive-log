/**
 * 週次の感情記録・アンガーログ振り返りワークフロー定義。
 *
 * 処理ステップ:
 * 1. `PostWeeklyEmotionReportFunction`: 直近7日間の感情内訳（円グラフ）と記録一覧をDMで送信する
 * 2. `PostWeeklyAngerReportFunction`: 直近7日間に怒りの記録がある場合、日別最大強度の折れ線グラフと一覧をDMで送信する
 */

import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { PostWeeklyEmotionReportFunction } from "../functions/post_weekly_emotion_report.ts";
import { PostWeeklyAngerReportFunction } from "../functions/post_weekly_anger_report.ts";

/** 今週の感情記録とアンガーログを送信する週次ワークフロー */
export const WeeklyEmotionReportWorkflow = DefineWorkflow({
  callback_id: "weekly_emotion_report_workflow",
  title: "今週の感情記録を振り返る",
  description: "毎週日曜の夜、感情記録とアンガーログをDMで送ります",
  input_parameters: { properties: {}, required: [] },
});

WeeklyEmotionReportWorkflow.addStep(PostWeeklyEmotionReportFunction, {});
WeeklyEmotionReportWorkflow.addStep(PostWeeklyAngerReportFunction, {});

export default WeeklyEmotionReportWorkflow;
