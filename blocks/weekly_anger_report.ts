/**
 * 週次アンガーログ（日別の最大怒り強度の折れ線グラフと記録一覧表）のBlock Kit配列を生成するモジュール。
 */

import {
  getAngerPriorityLabel,
  isValidAngerLevel,
} from "./daily_reflection_prompt.ts";
import { jstDateTime, MAX_TABLE_RECORDS, shorten } from "./report_utils.ts";

// Slack APIが新しいグラフ・表ブロックを検証するため、SDK側の古いBlock型は使わない。
// deno-lint-ignore no-explicit-any
type WeeklyAngerBlocks = any[];

/** `anger_log` Datastoreから取得される1件分の怒り記録レコード */
export type AngerRecord = {
  id: string;
  user_id: string;
  reflection?: string;
  anger_level: number | string;
  priority?: string;
  recorded_at: number;
};

/**
 * 指定ユーザー・集計期間内の怒りの記録から、折れ線グラフと一覧表のBlock Kit配列を生成する。
 * 対象期間内の有効な記録が0件の場合は空配列 `[]` を返し、配信をスキップできるようにする。
 *
 * @param records Datastoreから取得した怒り記録の配列
 * @param window 集計期間（`start` 以上 `end` 未満のUnixミリ秒）
 * @param userId 対象ユーザーのSlackメンバーID
 * @returns 週次アンガーログのBlock Kit配列（該当なしの場合は空配列）
 */
export function weeklyAngerBlocks(
  records: AngerRecord[],
  window: { start: number; end: number },
  userId: string,
): WeeklyAngerBlocks {
  const selected = records.filter((record) =>
    record.user_id === userId &&
    record.recorded_at >= window.start &&
    record.recorded_at < window.end &&
    isValidAngerLevel(record.anger_level)
  ).sort((a, b) => b.recorded_at - a.recorded_at || a.id.localeCompare(b.id));

  if (selected.length === 0) return [];

  // 同じ日の記録は最大値を折れ線グラフに採用し、表には全件を残す。
  const maximumByDate = new Map<string, number>();
  for (const record of selected) {
    const date = jstDateTime(record.recorded_at).slice(0, 10);
    maximumByDate.set(
      date,
      Math.max(maximumByDate.get(date) ?? 0, Number(record.anger_level)),
    );
  }
  const dates = Array.from(maximumByDate.keys()).sort();
  const categories = dates.map((date) => date.slice(5).replace("-", "/"));
  const rows = [
    ["日付", "投稿内容", "怒りの強度", "重要度"].map((text) => ({
      type: "raw_text",
      text,
    })),
    ...selected.slice(0, MAX_TABLE_RECORDS).map((record, index) => [
      {
        type: "raw_text",
        text: `${jstDateTime(record.recorded_at)} (#${index + 1})`,
      },
      {
        type: "raw_text",
        text: shorten(record.reflection?.trim() || "（投稿内容なし）"),
      },
      { type: "raw_number", value: Number(record.anger_level) },
      {
        type: "raw_text",
        text: getAngerPriorityLabel(record.priority ?? "") ?? "未設定",
      },
    ]),
  ];
  const period = `${jstDateTime(window.start)}〜${
    jstDateTime(window.end)
  }（日本時間）`;
  const caption = selected.length > MAX_TABLE_RECORDS
    ? `週次アンガーログ（最新${MAX_TABLE_RECORDS}件／全${selected.length}件）`
    : `週次アンガーログ（${selected.length}件）`;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `集計期間: ${period}\nグラフは記録のある日ごとの最大強度です。`,
      },
    },
    {
      type: "data_visualization",
      block_id: "weekly-anger-intensity",
      title: "日別の最大怒り強度（1〜10）",
      chart: {
        type: "line",
        series: [{
          name: "怒りの強度",
          data: dates.map((date, index) => ({
            label: categories[index],
            value: maximumByDate.get(date)!,
          })),
        }],
        axis_config: {
          categories,
          x_label: "日付",
          y_label: "強度",
        },
      },
    },
    {
      type: "data_table",
      block_id: "weekly-anger-records",
      caption,
      page_size: 7,
      row_header_column_index: 0,
      rows,
    },
  ];
}
