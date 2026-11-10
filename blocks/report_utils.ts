/**
 * 週次レポートの集計期間・日本時間の日時整形・トリガーの次回配信時刻算出・
 * 長文テキストの省略を行う共通ユーティリティモジュール。
 */

/** UTCから日本時間（JST: UTC+9）へ変換するためのミリ秒オフセット */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 1日あたりのミリ秒数 */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 1週間（7日間）あたりのミリ秒数 */
export const WEEK_MS = 7 * DAY_MS;

/** 週次レポートの表（`data_table`）に表示する最大レコード件数 */
export const MAX_TABLE_RECORDS = 100;

/** 週次レポートの表セル内に表示する振り返り本文の最大文字数 */
export const MAX_REFLECTION_LENGTH = 100;

/**
 * 現在時刻を基準に、直近の「日本時間の日曜20:00」を終端とする7日間の集計期間（Unixミリ秒）を返す。
 * 配信が数分遅れた場合でも期間がずれないよう、直近の日曜20:00（JST）に揃えて算出する。
 *
 * @param now 基準となる現在日時
 * @returns 集計開始時刻 `start`（以上）と集計終了時刻 `end`（未満）のUnixミリ秒ペア
 */
export function currentWeekWindow(now: Date): { start: number; end: number } {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  let end = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate() - jst.getUTCDay(),
    20,
  ) - JST_OFFSET_MS;
  if (end > now.getTime()) end -= WEEK_MS;
  return { start: end - WEEK_MS, end };
}

/**
 * Unixミリ秒を日本時間の `YYYY-MM-DD HH:mm` 形式の文字列に変換する。
 *
 * @param timestamp Unixミリ秒
 */
export function jstDateTime(timestamp: number): string {
  return new Date(timestamp + JST_OFFSET_MS).toISOString().slice(0, 16)
    .replace("T", " ");
}

/**
 * テキストの前後の空白を除去し、サロゲートペアを考慮した文字数が上限（100文字）を超える場合は末尾を `…` で省略する。
 *
 * @param text 対象の文字列
 */
export function shorten(text: string): string {
  const characters = Array.from(text.trim());
  return characters.length > MAX_REFLECTION_LENGTH
    ? characters.slice(0, MAX_REFLECTION_LENGTH).join("") + "…"
    : characters.join("");
}

/**
 * 定時トリガー登録用に、現在時刻より後の最初の「日本時間 08:00」をISO 8601文字列（UTC）で返す。
 *
 * @param now 基準日時（省略時は現在時刻）
 */
export function nextEightAmJst(now = new Date()): string {
  const nowInJst = new Date(now.getTime() + JST_OFFSET_MS);
  let targetUtc = Date.UTC(
    nowInJst.getUTCFullYear(),
    nowInJst.getUTCMonth(),
    nowInJst.getUTCDate(),
    8,
  ) - JST_OFFSET_MS;

  if (targetUtc <= now.getTime()) {
    targetUtc += DAY_MS;
  }

  return new Date(targetUtc).toISOString();
}

/**
 * 週次定時トリガー登録用に、現在時刻より後の最初の「日本時間 日曜20:00」をISO 8601文字列（UTC）で返す。
 *
 * @param now 基準日時（省略時は現在時刻）
 */
export function nextSundayEightPmJst(now = new Date()): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const daysUntilSunday = (7 - jst.getUTCDay()) % 7;
  let targetUtc = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate() + daysUntilSunday,
    20,
  ) - JST_OFFSET_MS;
  if (targetUtc <= now.getTime()) {
    targetUtc += WEEK_MS;
  }
  return new Date(targetUtc).toISOString();
}
