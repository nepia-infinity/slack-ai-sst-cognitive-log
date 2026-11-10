/**
 * 週次感情レポート（直近7日間の感情内訳の円グラフと記録一覧表）のBlock Kit配列を生成するモジュール。
 */

import {
  EMOTION_OPTIONS,
  getEmotionLabel,
  isValidEmotion,
} from "./daily_reflection_prompt.ts";
import {
  currentWeekWindow,
  jstDateTime,
  MAX_TABLE_RECORDS,
  shorten,
} from "./report_utils.ts";

export { currentWeekWindow };

// Slack APIが新しいグラフ・表ブロックを検証するため、SDK側の古いBlock型は使わない。
// deno-lint-ignore no-explicit-any
type WeeklyEmotionBlocks = any[];

/** `daily_reflections` Datastoreから取得される1件分の振り返り記録レコード */
export type ReflectionRecord = {
  id: string;
  user_id: string;
  reflection: string;
  emotion: string;
  recorded_at: number;
};

/**
 * 指定ユーザー・集計期間内の振り返り記録から、感情内訳の円グラフと一覧表のBlock Kit配列を生成する。
 * 円グラフには期間内の全有効回答を集計し、一覧表には新しい順で最大100件を表示する。
 * 対象期間内の有効な記録が0件の場合は空配列 `[]` を返し、配信をスキップできるようにする。
 *
 * @param records Datastoreから取得した振り返り記録の配列
 * @param window 集計期間（`start` 以上 `end` 未満のUnixミリ秒）
 * @param userId 対象ユーザーのSlackメンバーID
 * @returns 週次感情レポートのBlock Kit配列（該当なしの場合は空配列）
 */
export function weeklyEmotionBlocks(
  records: ReflectionRecord[],
  window: { start: number; end: number },
  userId: string,
): WeeklyEmotionBlocks {
  const selected = records.filter((record) =>
    record.user_id === userId &&
    record.recorded_at >= window.start &&
    record.recorded_at < window.end &&
    isValidEmotion(record.emotion) &&
    Boolean(record.reflection?.trim())
  ).sort((a, b) => b.recorded_at - a.recorded_at || a.id.localeCompare(b.id));

  if (selected.length === 0) return [];

  const counts = new Map<string, number>();
  for (const record of selected) {
    counts.set(record.emotion, (counts.get(record.emotion) ?? 0) + 1);
  }
  const segments = EMOTION_OPTIONS.filter(({ value }) => counts.has(value)).map(
    ({ value, label }) => ({ label, value: counts.get(value)! }),
  );

  const rows = [
    ["記録日時", "感情", "入力内容"].map((text) => ({
      type: "raw_text",
      text,
    })),
    ...selected.slice(0, MAX_TABLE_RECORDS).map((record, index) =>
      [
        `${jstDateTime(record.recorded_at)} (#${index + 1})`,
        getEmotionLabel(record.emotion)!,
        shorten(record.reflection),
      ].map((text) => ({ type: "raw_text", text }))
    ),
  ];
  const period = `${jstDateTime(window.start)}〜${
    jstDateTime(window.end)
  }（日本時間）`;
  const tableCaption = selected.length > MAX_TABLE_RECORDS
    ? `直近7日間の感情記録（最新${MAX_TABLE_RECORDS}件／全${selected.length}件）`
    : `直近7日間の感情記録（${selected.length}件）`;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `認知の歪みや自動思考、反芻に気付くための振り返りです。\n集計期間: ${period}`,
      },
    },
    {
      type: "data_visualization",
      block_id: "weekly-emotion-distribution",
      title: "直近7日間に記録した感情の内訳",
      chart: { type: "pie", segments },
    },
    {
      type: "data_table",
      block_id: "weekly-emotion-records",
      caption: tableCaption,
      page_size: 7,
      row_header_column_index: 0,
      rows,
    },
  ];
}
