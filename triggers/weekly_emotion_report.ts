import { TriggerTypes } from "deno-slack-api/mod.ts";
import { ScheduledTrigger } from "deno-slack-api/typed-method-types/workflows/triggers/scheduled.ts";
import { nextSundayEightPmJst } from "../blocks/report_utils.ts";
import WeeklyEmotionReportWorkflow from "../workflows/weekly_emotion_report_workflow.ts";

const WeeklyEmotionReport: ScheduledTrigger<
  typeof WeeklyEmotionReportWorkflow.definition
> = {
  type: TriggerTypes.Scheduled,
  name: "毎週日曜20時の感情記録",
  description: "今週の感情の内訳と記録一覧をDMに送ります",
  workflow: `#/workflows/${WeeklyEmotionReportWorkflow.definition.callback_id}`,
  inputs: {},
  schedule: {
    start_time: nextSundayEightPmJst(),
    timezone: "Asia/Tokyo",
    frequency: {
      type: "weekly",
      repeats_every: 1,
      on_days: ["Sunday"],
    },
  },
};

export default WeeklyEmotionReport;
