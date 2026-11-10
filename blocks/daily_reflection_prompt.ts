/**
 * 日次の振り返り案内メッセージ、入力モーダル、および感情・アンガーマネジメント選択肢と
 * 入力値検証関数を定義するモジュール。
 */

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

/** 怒りの強さ（1〜10）の選択肢定義 */
export const ANGER_LEVEL_OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

/** 怒りの対象に関する重要度・変えられるかの4分類選択肢定義 */
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
/** 記録時に選択できる13種類の感情コードと表示名の定義 */
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

/** 感情の固定コード型 */
export type EmotionValue = (typeof EMOTION_OPTIONS)[number]["value"];

/** 怒りの重要度・制御可能性の固定コード型 */
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

/**
 * 指定された値が定義済みの感情コード（`EmotionValue`）であるか判定する。
 */
export function isValidEmotion(value: unknown): value is EmotionValue {
  return typeof value === "string" && EMOTION_LABEL_MAP.has(value);
}

/**
 * 感情コードに対応する日本語の表示名を返す。未定義のコードの場合は `undefined` を返す。
 */
export function getEmotionLabel(emotion: string): string | undefined {
  return EMOTION_LABEL_MAP.get(emotion);
}

/**
 * 指定された値が有効な怒りの強さ（1〜10の整数または文字列）であるか判定する。
 */
export function isValidAngerLevel(value: unknown): boolean {
  return (typeof value === "string" || typeof value === "number") &&
    ANGER_LEVEL_VALUE_SET.has(String(value));
}

/**
 * 指定された値が定義済みの怒りの重要度コード（`AngerPriorityValue`）であるか判定する。
 */
export function isValidAngerPriority(
  value: unknown,
): value is AngerPriorityValue {
  return typeof value === "string" && ANGER_PRIORITY_LABEL_MAP.has(value);
}

/**
 * 怒りの重要度コードに対応する日本語の表示名を返す。未定義のコードの場合は `undefined` を返す。
 */
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

/**
 * 毎朝の振り返り案内DMに表示するBlock Kit配列（「記録する」ボタン付き）を生成する。
 *
 * @param userId メンション先となるSlackユーザーID
 */
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

/**
 * モーダル送信後、元の案内DMを上書き更新するための保存完了Block Kit配列を生成する。
 *
 * @param userId メンション先となるSlackユーザーID
 */
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

/**
 * 出来事と感情を入力するSlackモーダルビューを生成する。
 * 感情として `"anger"`（怒り）が選択されている場合は、冒頭の説明文を差し替え、
 * アンガーマネジメントのヒント・怒りの強さ（1〜10）・重要度の入力欄を動的に追加する。
 *
 * @param privateMetadata 元のDMの `channelId` と `messageTs` を保持するJSON文字列
 * @param selectedEmotion 現在選択されている感情コード（未選択時は省略）
 */
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

/**
 * 感情で「怒り」を選択した際にモーダルへ追加表示するアンガーマネジメント案内と専用入力欄を返す。
 */
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
