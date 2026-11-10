import {
  ANGER_LEVEL_BLOCK_ID,
  ANGER_PRIORITY_BLOCK_ID,
  ANGER_PRIORITY_OPTIONS,
  dailyReflectionModal,
  EMOTION_INPUT_BLOCK_ID,
  getAngerPriorityLabel,
  getEmotionLabel,
  isValidAngerLevel,
  isValidAngerPriority,
  isValidEmotion,
  REFLECTION_INPUT_BLOCK_ID,
} from "../daily_reflection_prompt.ts";

function inputBlocks(emotion?: string) {
  return dailyReflectionModal("metadata", emotion).blocks.filter(
    // deno-lint-ignore no-explicit-any
    (block: any) => block.type === "input",
  );
}

Deno.test("怒りだけに専用項目を表示し、元の入力欄を維持する", () => {
  for (const emotion of [undefined, "sadness", "anger", "joy"]) {
    const blocks = inputBlocks(emotion);
    const ids = blocks.map((block: { block_id: string }) => block.block_id);
    if (
      !ids.includes(EMOTION_INPUT_BLOCK_ID) ||
      !ids.includes(REFLECTION_INPUT_BLOCK_ID)
    ) {
      throw new Error("共通の入力欄がありません");
    }
    const angerFields = ids.includes(ANGER_LEVEL_BLOCK_ID) &&
      ids.includes(ANGER_PRIORITY_BLOCK_ID);
    if (angerFields !== (emotion === "anger")) {
      throw new Error(`怒り専用欄の表示が不正です: ${emotion}`);
    }
  }
});

Deno.test("怒りの強さは1〜10、重要度の保存値は4種類", () => {
  const blocks = inputBlocks("anger");
  const level = blocks.find((block: { block_id: string }) =>
    block.block_id === ANGER_LEVEL_BLOCK_ID
  );
  const values = level.element.options.map((option: { value: string }) =>
    option.value
  );
  if (values.join(",") !== "1,2,3,4,5,6,7,8,9,10") {
    throw new Error("怒りの強さの選択肢が不正です");
  }
  if (
    new Set(ANGER_PRIORITY_OPTIONS.map((option) => option.value)).size !== 4
  ) {
    throw new Error("重要度の保存値が重複しています");
  }
});

Deno.test("怒りの時だけモーダル冒頭の説明文を差し替える", () => {
  const anger = dailyReflectionModal("metadata", "anger");
  const sadness = dailyReflectionModal("metadata", "sadness");
  const angerDescription = anger.blocks.filter((block: { type: string }) =>
    block.type === "section"
  );
  if (
    angerDescription.length !== 1 ||
    angerDescription[0].text.text !==
      "怒りで後悔しないことがアンガーマネジメントです。\n問題になる怒り（強度、持続性、頻度、攻撃性）などに気を付けましょう。"
  ) {
    throw new Error("怒り用の説明文が重複しているか、指定文と異なります");
  }
  if (
    sadness.blocks[0].text.text !==
      "認知の歪み、自動思考に気付くために日々の出来事を記録します。"
  ) {
    throw new Error("通常の説明文が変わっています");
  }
});

Deno.test("感情・怒りの強さ・重要度の検証と表示名取得を共通関数で行える", () => {
  if (!isValidEmotion("anger") || isValidEmotion("unknown")) {
    throw new Error("感情コードの検証が不正です");
  }
  if (getEmotionLabel("anger") !== "怒り") {
    throw new Error("感情の表示名取得が不正です");
  }
  if (
    !isValidAngerLevel("1") || !isValidAngerLevel(10) ||
    isValidAngerLevel(0) || isValidAngerLevel(11) || isValidAngerLevel("bad")
  ) {
    throw new Error("怒りの強さの検証が不正です");
  }
  if (
    !isValidAngerPriority("important_changeable") ||
    isValidAngerPriority("invalid")
  ) {
    throw new Error("怒りの重要度の検証が不正です");
  }
  if (
    getAngerPriorityLabel("important_changeable") !==
      "重要かつ自分で変えることができる"
  ) {
    throw new Error("怒りの重要度の表示名取得が不正です");
  }
});
