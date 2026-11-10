import {
  deliverWeeklyReport,
  fetchEnabledRecipients,
  SlackDeliveryClient,
} from "../delivery_helpers.ts";

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("配信対象取得はカーソルページネーションを辿り、有効なユーザーを返す", async () => {
  const client: SlackDeliveryClient = {
    apps: {
      datastore: {
        query: ({ cursor }: { cursor?: string }) => {
          if (!cursor) {
            return Promise.resolve({
              ok: true,
              items: [
                { slack_member_id: "U1", dm_channel_id: "D1" },
                { slack_member_id: "" },
              ],
              response_metadata: { next_cursor: "page2" },
            });
          }
          return Promise.resolve({
            ok: true,
            items: [{ slack_member_id: "U2" }],
            response_metadata: {},
          });
        },
      },
    },
    conversations: {
      open: () => Promise.resolve({ ok: true }),
    },
    chat: {
      postMessage: () => Promise.resolve({ ok: true }),
    },
  };

  const result = await fetchEnabledRecipients(client);
  check(result.ok, "取得成功");
  if (result.ok) {
    check(result.recipients.length === 2, "有効な2名を取得");
    check(
      result.recipients[0].userId === "U1" &&
        result.recipients[0].dmChannelId === "D1",
      "1人目のIDとDMチャンネル",
    );
    check(result.recipients[1].userId === "U2", "2ページ目のユーザー");
  }
});

Deno.test("週次レポート配信は記録があるユーザーにのみDMを送信する", async () => {
  const posted: Array<{ channel: string; text: string }> = [];
  const client: SlackDeliveryClient = {
    apps: {
      datastore: {
        query: ({
          datastore,
          expression_values,
        }: {
          datastore: string;
          expression_values: Record<string, unknown>;
        }) => {
          if (datastore === "slack_user_profiles") {
            return Promise.resolve({
              ok: true,
              items: [
                { slack_member_id: "U_ACTIVE" },
                { slack_member_id: "U_EMPTY" },
              ],
            });
          }
          const user = expression_values[":user"];
          return Promise.resolve({
            ok: true,
            items: user === "U_ACTIVE" ? [{ id: "1" }] : [],
          });
        },
      },
    },
    conversations: {
      open: ({ users }: { users: string }) =>
        Promise.resolve({ ok: true, channel: { id: `DM_${users}` } }),
    },
    chat: {
      postMessage: (args: { channel: string; text: string }) => {
        posted.push(args);
        return Promise.resolve({ ok: true });
      },
    },
  };

  const result = await deliverWeeklyReport<{ id: string }>(client, {
    datastore: "daily_reflections",
    text: "週次レポート",
    recordErrorLabel: "記録",
    deliveryErrorLabel: "週次レポート",
    buildBlocks: (records) => (records.length > 0 ? [{ type: "section" }] : []),
    now: new Date("2026-10-04T11:00:00.000Z"),
  });

  check("outputs" in result, "正常終了");
  check(posted.length === 1, "記録のある1人にだけ送信");
  check(posted[0].channel === "DM_U_ACTIVE", "送信先DMチャンネル");
});
