import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { weeklyEmotionBlocks } from "../blocks/weekly_emotion_report.ts";
import type { ReflectionRecord } from "../blocks/weekly_emotion_report.ts";
import DailyReflectionsDatastore from "../datastores/daily_reflections.ts";
import { deliverWeeklyReport } from "./delivery_helpers.ts";

export const PostWeeklyEmotionReportFunction = DefineFunction({
  callback_id: "post_weekly_emotion_report",
  title: "今週の感情記録をDMに送る",
  source_file: "functions/post_weekly_emotion_report.ts",
  input_parameters: { properties: {}, required: [] },
});

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
