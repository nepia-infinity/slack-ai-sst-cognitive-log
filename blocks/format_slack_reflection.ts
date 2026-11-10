// AIが一般的なMarkdownを返しても、Slackで読める表記に整えます。
export function formatSlackReflection(text: string): string {
  return text
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, "<$2|$1>")
    .replace(/\\([.)(-])/g, "$1");
}
