import { TriggerTypes } from "deno-slack-api/mod.ts";
import { ScheduledTrigger } from "deno-slack-api/typed-method-types/workflows/triggers/scheduled.ts";
import { nextEightAmJst } from "../blocks/report_utils.ts";
import DailyReflectionWorkflow from "../workflows/daily_reflection_workflow.ts";

const DailyReflection: ScheduledTrigger<
  typeof DailyReflectionWorkflow.definition
> = {
  type: TriggerTypes.Scheduled,
  name: "毎朝8時の出来事の振り返り",
  description: "毎朝8時にDatastoreで設定したユーザーのDMへ投稿します",
  workflow: `#/workflows/${DailyReflectionWorkflow.definition.callback_id}`,
  inputs: {},
  schedule: {
    start_time: nextEightAmJst(),
    timezone: "Asia/Tokyo",
    frequency: {
      type: "daily",
    },
  },
};

export default DailyReflection;
