/**
 * 配信対象ユーザーの直近7日間のアンガーログを集計し、
 * 記録が存在するユーザーのDMへ折れ線グラフと一覧表を送信するSlackカスタム関数。
 */

import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { weeklyAngerBlocks } from "../blocks/weekly_anger_report.ts";
import type { AngerRecord } from "../blocks/weekly_anger_report.ts";
import AngerLogDatastore from "../datastores/anger_log.ts";
import { deliverWeeklyReport } from "./delivery_helpers.ts";

/** 週次アンガーログ配信用のSlack関数定義 */
export const PostWeeklyAngerReportFunction = DefineFunction({
  callback_id: "post_weekly_anger_report",
  title: "今週のアンガーログをDMに送る",
  source_file: "functions/post_weekly_anger_report.ts",
  input_parameters: { properties: {}, required: [] },
});

/** `anger_log` Datastoreから今週の記録を取得し、対象ユーザーのDMに送信するハンドラ */
export default SlackFunction(
  PostWeeklyAngerReportFunction,
  async ({ client }) => {
    return await deliverWeeklyReport<AngerRecord>(client, {
      datastore: AngerLogDatastore.name,
      text: "今週の怒りの強度と記録を振り返りましょう。",
      recordErrorLabel: "怒りの記録",
      deliveryErrorLabel: "週次アンガーログ",
      buildBlocks: weeklyAngerBlocks,
    });
  },
);
