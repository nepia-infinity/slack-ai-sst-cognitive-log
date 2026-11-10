import { currentWeekWindow } from "../blocks/report_utils.ts";

export const SLACK_USER_PROFILES_DATASTORE = "slack_user_profiles";

export type DatastoreQueryResponse = {
  ok: boolean;
  error?: string;
  // deno-lint-ignore no-explicit-any
  items: any[];
  response_metadata?: {
    next_cursor?: string;
  };
};

export type SlackDeliveryClient = {
  apps: {
    datastore: {
      // deno-lint-ignore no-explicit-any
      query: (args: any) => Promise<DatastoreQueryResponse>;
    };
  };
  conversations: {
    open: (args: {
      users: string;
    }) => Promise<{
      ok: boolean;
      error?: string;
      channel?: { id?: string };
    }>;
  };
  chat: {
    // deno-lint-ignore no-explicit-any
    postMessage: (args: any) => Promise<{
      ok: boolean;
      error?: string;
    }>;
  };
};

export type EnabledRecipient = {
  userId: string;
  dmChannelId?: string;
};

export async function fetchEnabledRecipients(
  client: SlackDeliveryClient,
): Promise<
  { ok: true; recipients: EnabledRecipient[] } | { ok: false; error: string }
> {
  const recipients: EnabledRecipient[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.apps.datastore.query({
      datastore: SLACK_USER_PROFILES_DATASTORE,
      expression: "#survey_enabled = :enabled",
      expression_attributes: {
        "#survey_enabled": "survey_enabled",
      },
      expression_values: {
        ":enabled": true,
      },
      cursor,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `配信対象を取得できませんでした: ${response.error}`,
      };
    }

    for (const item of response.items) {
      if (item.slack_member_id) {
        recipients.push({
          userId: item.slack_member_id,
          dmChannelId: item.dm_channel_id,
        });
      }
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return { ok: true, recipients };
}

export async function postDirectMessage(
  client: SlackDeliveryClient,
  options: {
    userId: string;
    dmChannelId?: string;
    text: string;
    // deno-lint-ignore no-explicit-any
    blocks: any[];
    deliveryErrorLabel: string;
  },
): Promise<boolean> {
  const { userId, text, blocks, deliveryErrorLabel } = options;
  let channelId = options.dmChannelId;

  if (!channelId) {
    const dm = await client.conversations.open({ users: userId });
    if (!dm.ok || !dm.channel?.id) {
      console.error(
        `ユーザー ${userId} のDMを開けませんでした: ${
          dm.error ?? "unknown_error"
        }`,
      );
      return false;
    }
    channelId = dm.channel.id;
  }

  const message = await client.chat.postMessage({
    channel: channelId,
    text,
    blocks,
  });

  if (!message.ok) {
    console.error(
      `ユーザー ${userId} に${deliveryErrorLabel}を送れませんでした: ${message.error}`,
    );
    return false;
  }

  return true;
}

export async function queryUserRecordsInWindow<TRecord>(
  client: SlackDeliveryClient,
  options: {
    datastore: string;
    userId: string;
    window: { start: number; end: number };
    recordErrorLabel: string;
  },
): Promise<TRecord[] | null> {
  const { datastore, userId, window, recordErrorLabel } = options;
  const records: TRecord[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.apps.datastore.query({
      datastore,
      expression: "#user = :user AND #time BETWEEN :start AND :end",
      expression_attributes: {
        "#user": "user_id",
        "#time": "recorded_at",
      },
      expression_values: {
        ":user": userId,
        ":start": window.start,
        ":end": window.end,
      },
      cursor,
    });

    if (!response.ok) {
      console.error(
        `ユーザー ${userId} の${recordErrorLabel}を取得できませんでした: ${response.error}`,
      );
      return null;
    }

    records.push(...(response.items as TRecord[]));
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return records;
}

export async function deliverWeeklyReport<TRecord>(
  client: SlackDeliveryClient,
  options: {
    datastore: string;
    text: string;
    recordErrorLabel: string;
    deliveryErrorLabel: string;
    buildBlocks: (
      records: TRecord[],
      window: { start: number; end: number },
      userId: string,
      // deno-lint-ignore no-explicit-any
    ) => any[];
    now?: Date;
  },
): Promise<{ outputs: Record<string, never> } | { error: string }> {
  const window = currentWeekWindow(options.now ?? new Date());
  const recipientsResult = await fetchEnabledRecipients(client);
  if (!recipientsResult.ok) {
    return { error: recipientsResult.error };
  }

  for (const { userId } of recipientsResult.recipients) {
    const records = await queryUserRecordsInWindow<TRecord>(client, {
      datastore: options.datastore,
      userId,
      window,
      recordErrorLabel: options.recordErrorLabel,
    });
    if (!records) continue;

    const blocks = options.buildBlocks(records, window, userId);
    if (blocks.length === 0) continue; // 今週の記録がない人には送らない

    // 保存済みのチャンネルIDに依存せず、毎回本人とのDMを取得する。
    await postDirectMessage(client, {
      userId,
      text: options.text,
      blocks,
      deliveryErrorLabel: options.deliveryErrorLabel,
    });
  }

  return { outputs: {} };
}
