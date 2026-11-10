/**
 * AIの応答テキストをSlackの `mrkdwn` 表記に整形するモジュール。
 */

/**
 * AIが一般的なMarkdownリンク `[表示名](URL)` やバックスラッシュエスケープを返した場合でも、
 * SlackのDM上で正しく読める表記（`<URL|表示名>` など）に整える。
 *
 * @param text AIから返された生テキスト
 * @returns Slack `mrkdwn` 向けに整形されたテキスト
 */
// AIが一般的なMarkdownを返しても、Slackで読める表記に整えます。
export function formatSlackReflection(text: string): string {
  return text
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, "<$2|$1>")
    .replace(/\\([.)(-])/g, "$1");
}
