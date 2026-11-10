export const START_REFLECTION_ACTION_ID = "start_daily_reflection";
export const DAILY_REFLECTION_MODAL_CALLBACK_ID = "daily_reflection_modal";
export const REFLECTION_INPUT_BLOCK_ID = "daily_reflection";
export const REFLECTION_INPUT_ACTION_ID = "reflection_text";
export const EMOTION_INPUT_BLOCK_ID = "primary_emotion";
export const EMOTION_INPUT_ACTION_ID = "primary_emotion_select";
export const ANGER_LEVEL_BLOCK_ID = "anger_level";
export const ANGER_LEVEL_ACTION_ID = "anger_level_select";
export const ANGER_PRIORITY_BLOCK_ID = "anger_priority";
export const ANGER_PRIORITY_ACTION_ID = "anger_priority_select";

export const ANGER_LEVEL_OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));
export const ANGER_PRIORITY_OPTIONS = [
  { value: "important_changeable", label: "重要かつ自分で変えることができる" },
  { value: "important_unchangeable", label: "重要だが自分で変えられない" },
  {
    value: "less_important_later",
    label: "重要ではないので余力がある時に取り組む",
  },
  { value: "less_important_leave", label: "重要ではないので放っておく" },
] as const;

// 値は集計時に使うため固定し、表示名だけを変更できるようにします。
export const EMOTION_OPTIONS = [
  { value: "anger", label: "怒り" },
  { value: "sadness", label: "悲しみ" },
  { value: "anxiety", label: "不安" },
  { value: "fear", label: "恐怖" },
  { value: "impatience", label: "焦り" },
  { value: "jealousy", label: "嫉妬" },
  { value: "frustration", label: "悔しさ" },
  { value: "self_loathing", label: "自己嫌悪" },
  { value: "confusion", label: "戸惑い" },
  { value: "boredom", label: "退屈" },
  { value: "joy", label: "喜び" },
  { value: "relief", label: "安心" },
  { value: "achievement", label: "達成感" },
] as const;

export type EmotionValue = (typeof EMOTION_OPTIONS)[number]["value"];
export type AngerPriorityValue =
  (typeof ANGER_PRIORITY_OPTIONS)[number]["value"];

const EMOTION_LABEL_MAP = new Map<string, string>(
  EMOTION_OPTIONS.map(({ value, label }) => [value, label] as const),
);

const ANGER_PRIORITY_LABEL_MAP = new Map<string, string>(
  ANGER_PRIORITY_OPTIONS.map(({ value, label }) => [value, label] as const),
);

const ANGER_LEVEL_VALUE_SET = new Set<string>(
  ANGER_LEVEL_OPTIONS.map(({ value }) => value),
);

export function isValidEmotion(value: unknown): value is EmotionValue {
  return typeof value === "string" && EMOTION_LABEL_MAP.has(value);
}

export function getEmotionLabel(emotion: string): string | undefined {
  return EMOTION_LABEL_MAP.get(emotion);
}

export function isValidAngerLevel(value: unknown): boolean {
  return (typeof value === "string" || typeof value === "number") &&
    ANGER_LEVEL_VALUE_SET.has(String(value));
}

export function isValidAngerPriority(
  value: unknown,
): value is AngerPriorityValue {
  return typeof value === "string" && ANGER_PRIORITY_LABEL_MAP.has(value);
}

export function getAngerPriorityLabel(priority: string): string | undefined {
  return ANGER_PRIORITY_LABEL_MAP.get(priority);
}

const PURPOSE_TEXT =
  "認知の歪み、自動思考に気付くために日々の出来事を記録します。";
const ANGER_PURPOSE_TEXT =
  "怒りで後悔しないことがアンガーマネジメントです。\n問題になる怒り（強度、持続性、頻度、攻撃性）などに気を付けましょう。";
function mentionBlocks(userId?: string) {
  return userId
    ? [{
      type: "section",
      text: { type: "mrkdwn", text: `<@${userId}>` },
    }]
    : [];
}

// Block Kitの型はSlack API側で検証されるため、再利用しやすい配列として返します。
// deno-lint-ignore no-explicit-any
export function dailyReflectionMessageBlocks(userId?: string): any[] {
  return [
    ...mentionBlocks(userId),
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "出来事の振り返り",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: PURPOSE_TEXT,
      },
    },
    {
      type: "actions",
      block_id: "daily_reflection_actions",
      elements: [
        {
          type: "button",
          action_id: START_REFLECTION_ACTION_ID,
          style: "primary",
          text: {
            type: "plain_text",
            text: "記録する",
            emoji: true,
          },
        },
      ],
    },
  ];
}

// 保存後も最初のメンションを残し、同じメッセージを更新します。
// deno-lint-ignore no-explicit-any
export function savedReflectionMessageBlocks(userId?: string): any[] {
  return [
    ...mentionBlocks(userId),
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "出来事の振り返り",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: PURPOSE_TEXT,
      },
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: ":white_check_mark: 本日の出来事を記録しました。",
      }],
    },
  ];
}

export function dailyReflectionModal(
  privateMetadata: string,
  selectedEmotion?: string,
) {
  return {
    type: "modal",
    callback_id: DAILY_REFLECTION_MODAL_CALLBACK_ID,
    notify_on_close: true,
    private_metadata: privateMetadata,
    title: {
      type: "plain_text",
      text: "出来事の振り返り",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "記録する",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "キャンセル",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: selectedEmotion === "anger" ? ANGER_PURPOSE_TEXT : PURPOSE_TEXT,
        },
      },
      {
        type: "input",
        block_id: EMOTION_INPUT_BLOCK_ID,
        dispatch_action: true,
        element: {
          type: "static_select",
          action_id: EMOTION_INPUT_ACTION_ID,
          placeholder: {
            type: "plain_text",
            text: "感情を1つ選択してください",
          },
          options: EMOTION_OPTIONS.map(({ value, label }) => ({
            text: { type: "plain_text", text: label },
            value,
          })),
          ...(selectedEmotion && {
            initial_option: {
              text: {
                type: "plain_text",
                text: getEmotionLabel(selectedEmotion) ?? selectedEmotion,
              },
              value: selectedEmotion,
            },
          }),
        },
        label: {
          type: "plain_text",
          text: "今の気持ちに一番近いものは？",
        },
        optional: false,
      },
      ...(selectedEmotion === "anger" ? angerManagementBlocks() : []),
      {
        type: "input",
        block_id: REFLECTION_INPUT_BLOCK_ID,
        element: {
          type: "plain_text_input",
          action_id: REFLECTION_INPUT_ACTION_ID,
          multiline: true,
          placeholder: {
            type: "plain_text",
            text:
              "今日の出来事を振り返って、思ったことや感じたことを自由に記述してください。",
          },
        },
        label: {
          type: "plain_text",
          text: "出来事の振り返り",
          emoji: true,
        },
        optional: false,
      },
    ],
  };
}

// deno-lint-ignore no-explicit-any
function angerManagementBlocks(): any[] {
  return [
    {
      type: "rich_text",
      elements: [{
        type: "rich_text_list",
        style: "bullet",
        elements: [
          "～すべきのように考えていませんか？",
          "物事を白黒で考え過ぎていませんか？",
          "売り言葉に、買い言葉に気を付けよう",
          "衝動、思考、行動のコントロール",
          "DESC法でアサーティブに言い換えてみる",
          "原因思考ではなく解決思考で考えてみる",
        ].map((text) => ({
          type: "rich_text_section",
          elements: [{ type: "text", text }],
        })),
      }],
    },
    {
      type: "input",
      block_id: ANGER_LEVEL_BLOCK_ID,
      element: {
        type: "static_select",
        action_id: ANGER_LEVEL_ACTION_ID,
        placeholder: { type: "plain_text", text: "1〜10から選択" },
        options: ANGER_LEVEL_OPTIONS.map(({ value, label }) => ({
          text: { type: "plain_text", text: label },
          value,
        })),
      },
      label: { type: "plain_text", text: "怒りの大きさを数値化すると" },
      optional: false,
    },
    {
      type: "input",
      block_id: ANGER_PRIORITY_BLOCK_ID,
      element: {
        type: "static_select",
        action_id: ANGER_PRIORITY_ACTION_ID,
        placeholder: { type: "plain_text", text: "当てはまるものを選択" },
        options: ANGER_PRIORITY_OPTIONS.map(({ value, label }) => ({
          text: { type: "plain_text", text: label },
          value,
        })),
      },
      label: { type: "plain_text", text: "それはどのくらい重要ですか？" },
      optional: false,
    },
  ];
}
