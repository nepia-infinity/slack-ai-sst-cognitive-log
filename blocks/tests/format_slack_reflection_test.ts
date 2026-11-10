import { formatSlackReflection } from "../format_slack_reflection.ts";

function check(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`期待した表示と異なります: ${actual}`);
  }
}

Deno.test("一般的なMarkdownリンクをSlackのリンクに変換する", () => {
  check(
    formatSlackReflection(
      "日本労働弁護団 [公式サイト](https://roudou-bengodan.com/)",
    ),
    "日本労働弁護団 <https://roudou-bengodan.com/|公式サイト>",
  );
});

Deno.test("AIの箇条書きに入ったバックスラッシュを取り除く", () => {
  check(
    formatSlackReflection("1\\. 相談する\n\\- 状況を整理する"),
    "1. 相談する\n- 状況を整理する",
  );
});
