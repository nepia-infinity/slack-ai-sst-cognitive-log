import {
  jstDateTime,
  nextEightAmJst,
  nextSundayEightPmJst,
  shorten,
} from "../report_utils.ts";

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("日本時間8時と日曜20時の次回実行時刻を正しく算出する", () => {
  // 日本時間 2026-09-27（日）07:59 -> 当日 08:00 JST (2026-09-26T23:00:00.000Z)
  check(
    nextEightAmJst(new Date("2026-09-26T22:59:00.000Z")) ===
      "2026-09-26T23:00:00.000Z",
    "8時前は当日の8時",
  );
  // 日本時間 2026-09-27（日）08:00 -> 翌日 08:00 JST (2026-09-27T23:00:00.000Z)
  check(
    nextEightAmJst(new Date("2026-09-26T23:00:00.000Z")) ===
      "2026-09-27T23:00:00.000Z",
    "8時ちょうどは翌日の8時",
  );

  // 日本時間 2026-09-27（日）19:59 -> 当日 20:00 JST (2026-09-27T11:00:00.000Z)
  check(
    nextSundayEightPmJst(new Date("2026-09-27T10:59:00.000Z")) ===
      "2026-09-27T11:00:00.000Z",
    "日曜20時前は当日の20時",
  );
  // 日本時間 2026-09-27（日）20:00 -> 翌週日曜 20:00 JST (2026-10-04T11:00:00.000Z)
  check(
    nextSundayEightPmJst(new Date("2026-09-27T11:00:00.000Z")) ===
      "2026-10-04T11:00:00.000Z",
    "日曜20時ちょうどは翌週日曜の20時",
  );
});

Deno.test("日時整形と100文字を超えるテキストの省略を行う", () => {
  check(
    jstDateTime(Date.parse("2026-09-27T11:00:00.000Z")) === "2026-09-27 20:00",
    "JST日時表記",
  );
  const longText = "あ".repeat(101);
  check(shorten(longText) === "あ".repeat(100) + "…", "100文字で省略");
  check(shorten("  短い文  ") === "短い文", "前後の空白を除去");
});
