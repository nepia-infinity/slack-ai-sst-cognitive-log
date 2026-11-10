import { formatSlackReflection } from "./format_slack_reflection.ts";
import { ACTION_ICONS } from "../prompts/reflection_response_format.ts";

const DISCLAIMER =
  "※AIメンタルケアは医療行為ではありません。\n必要に応じて医療機関や専門家に相談してください。";

export type AiReflection = {
  kind: "reflection" | "urgent";
  message: string;
  event: string;
  cognition: string;
  emotion: string;
  actions: Array<
    { title: string; subtitle: string; body: string; icon: string }
  >;
};

export function parseAiReflection(value: unknown): AiReflection {
  if (!value || typeof value !== "object") {
    throw new Error("AIの回答形式が正しくありません。");
  }
  const item = value as Record<string, unknown>;
  if (
    (item.kind !== "reflection" && item.kind !== "urgent") ||
    !["message", "event", "cognition", "emotion"].every((key) =>
      typeof item[key] === "string"
    ) ||
    !Array.isArray(item.actions) ||
    !item.actions.every((action: unknown) =>
      action !== null && typeof action === "object" &&
      ["title", "subtitle", "body", "icon"].every((key) =>
        typeof (action as Record<string, unknown>)[key] === "string"
      )
    )
  ) {
    throw new Error("AIの回答形式が正しくありません。");
  }
  return item as unknown as AiReflection;
}

function section(text: string) {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function header(text: string) {
  return { type: "header", text: { type: "plain_text", text }, level: 2 };
}

function context() {
  return {
    type: "context",
    elements: [{ type: "plain_text", text: DISCLAIMER, emoji: true }],
  };
}

// Slack SDK 2.15.1のBlock型にはcardやheader.levelがまだないため、
// 投稿時の検証はSlack APIに委ねます。
// deno-lint-ignore no-explicit-any
type AiReflectionBlock = any;

export function aiReflectionBlocks(
  result: AiReflection,
  userId?: string,
): AiReflectionBlock[] {
  const mention = userId ? [section(`<@${userId}>`)] : [];
  if (result.kind === "urgent") {
    if (!result.message.trim()) throw new Error("緊急時の案内が空です。");
    return [
      ...mention,
      header("安全を優先してください"),
      section(formatSlackReflection(result.message.trim())),
      context(),
    ];
  }

  const blocks: AiReflectionBlock[] = [...mention, header("記載内容の整理")];
  const summaryFields = [
    ["出来事", result.event],
    ["認知", result.cognition],
    ["感情", result.emotion],
  ] as const;

  for (const [label, value] of summaryFields) {
    if (value.trim()) {
      blocks.push(
        section(`*${label}：* ${formatSlackReflection(value.trim())}`),
      );
    }
  }
  if (result.message.trim()) {
    const message = formatSlackReflection(result.message.trim());
    if (message.length > 200) {
      blocks.push(section(message));
    } else {
      blocks.push({
        type: "card",
        slack_icon: { type: "icon", name: "comment" },
        title: { type: "plain_text", text: "AIとの振り返り" },
        body: { type: "mrkdwn", text: message, verbatim: false },
      });
    }
  }

  const actions = result.actions.slice(0, 3).filter((action) =>
    action.title.trim() && action.body.trim()
  );
  if (actions.length) {
    blocks.push({ type: "divider" });
    blocks.push(header("次に向けた具体的な行動"));
    for (const action of actions) {
      const title = action.title.trim();
      const subtitle = action.subtitle.trim();
      const body = formatSlackReflection(action.body.trim());
      if (title.length > 150 || subtitle.length > 150 || body.length > 200) {
        blocks.push(section(
          `*${title}*${subtitle ? ` — ${subtitle}` : ""}\n${body}`,
        ));
        continue;
      }
      blocks.push({
        type: "card",
        slack_icon: {
          type: "icon",
          name:
            ACTION_ICONS.includes(action.icon as typeof ACTION_ICONS[number])
              ? action.icon
              : "lightbulb",
        },
        title: { type: "plain_text", text: title },
        ...(subtitle
          ? { subtitle: { type: "plain_text", text: subtitle } }
          : {}),
        body: { type: "mrkdwn", text: body, verbatim: false },
      });
    }
  }
  blocks.push(context());
  return blocks;
}

export function aiReflectionFallback(
  result: AiReflection,
  userId?: string,
): string {
  const mention = userId ? `<@${userId}>\n` : "";
  if (result.kind === "urgent") {
    return `${mention}安全を優先してください\n${result.message}\n${DISCLAIMER}`;
  }
  const summary = [
    userId && `<@${userId}>`,
    "AIとの振り返り",
    result.event && `出来事: ${result.event}`,
    result.cognition && `認知: ${result.cognition}`,
    result.emotion && `感情: ${result.emotion}`,
    result.message,
    ...result.actions.slice(0, 3).map((action) => action.title),
    DISCLAIMER,
  ];
  return summary.filter(Boolean).join("\n");
}
