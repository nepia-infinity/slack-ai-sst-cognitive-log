// Slack表示用の項目をAIから安定して受け取るための契約。
export const ACTION_ICONS = [
  "clipboard",
  "lightbulb",
  "user",
  "save",
  "calendar",
  "heart",
] as const;
export const REFLECTION_RESPONSE_FORMAT = {
  type: "json_schema",
  name: "cognitive_reflection",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["reflection", "urgent"] },
      message: { type: "string" },
      event: { type: "string" },
      cognition: { type: "string" },
      emotion: { type: "string" },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            body: { type: "string" },
            icon: { type: "string", enum: ACTION_ICONS },
          },
          required: ["title", "subtitle", "body", "icon"],
        },
      },
    },
    required: ["kind", "message", "event", "cognition", "emotion", "actions"],
  },
} as const;
