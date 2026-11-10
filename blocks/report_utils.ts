export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const MAX_TABLE_RECORDS = 100;
export const MAX_REFLECTION_LENGTH = 100;

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

export function jstDateTime(timestamp: number): string {
  return new Date(timestamp + JST_OFFSET_MS).toISOString().slice(0, 16)
    .replace("T", " ");
}

export function shorten(text: string): string {
  const characters = Array.from(text.trim());
  return characters.length > MAX_REFLECTION_LENGTH
    ? characters.slice(0, MAX_REFLECTION_LENGTH).join("") + "…"
    : characters.join("");
}

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
