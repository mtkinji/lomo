import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data:
    | { type: 'sharedDelivery'; deliveryId: string }
    | { type: 'mealPlanAttention'; planId: string };
};

type ExpoPushTicket = {
  status?: 'ok' | 'error';
  details?: { error?: string };
};

type SharedDeliveryPushCopy = { title: string; body: string };

export function buildMealPlanAttentionPushMessages(
  tokens: string[],
  planId: string,
  copy: SharedDeliveryPushCopy = {
    title: 'Meal Plan',
    body: 'There are new meal ideas in Plan.',
  },
): ExpoPushMessage[] {
  const id = planId.trim();
  if (!id) return [];
  return tokens
    .map((token) => token.trim())
    .filter(Boolean)
    .map((to) => ({
      to,
      title: copy.title.trim().slice(0, 80) || 'Meal Plan',
      body: copy.body.trim().slice(0, 180) || 'There are new meal ideas in Plan.',
      sound: 'default' as const,
      data: { type: 'mealPlanAttention' as const, planId: id },
    }));
}

export function buildExpoPushMessages(
  tokens: string[],
  deliveryId: string,
  copy: SharedDeliveryPushCopy = {
    title: 'Kwilt',
    body: 'Something shared in Kwilt is ready for you.',
  },
): ExpoPushMessage[] {
  const id = deliveryId.trim();
  if (!id) return [];
  return tokens
    .map((token) => token.trim())
    .filter(Boolean)
    .map((to) => ({
      to,
      title: copy.title.trim().slice(0, 80) || 'Kwilt',
      body: copy.body.trim().slice(0, 180) || 'Something shared in Kwilt is ready for you.',
      sound: 'default' as const,
      data: { type: 'sharedDelivery' as const, deliveryId: id },
    }));
}

export async function sendSharedDeliveryPush(
  admin: SupabaseClient,
  recipientUserId: string,
  deliveryId: string,
  fetchImpl: typeof fetch = fetch,
  copy?: SharedDeliveryPushCopy,
): Promise<{ attempted: number; accepted: number; rejected: number }> {
  const tokenResult = await admin
    .from('kwilt_push_tokens')
    .select('token')
    .eq('user_id', recipientUserId);
  if (tokenResult.error) throw tokenResult.error;

  const tokens = (tokenResult.data ?? [])
    .map((row: { token?: unknown }) => typeof row.token === 'string' ? row.token : '')
    .filter(Boolean);
  const messages = buildExpoPushMessages(tokens, deliveryId, copy);
  return sendExpoMessages(admin, messages, fetchImpl);
}

export async function sendMealPlanAttentionPush(
  admin: SupabaseClient,
  recipientUserId: string,
  planId: string,
  fetchImpl: typeof fetch = fetch,
  copy?: SharedDeliveryPushCopy,
): Promise<{ attempted: number; accepted: number; rejected: number }> {
  const tokenResult = await admin
    .from('kwilt_push_tokens')
    .select('token')
    .eq('user_id', recipientUserId);
  if (tokenResult.error) throw tokenResult.error;

  const tokens = (tokenResult.data ?? [])
    .map((row: { token?: unknown }) => typeof row.token === 'string' ? row.token : '')
    .filter(Boolean);
  const messages = buildMealPlanAttentionPushMessages(tokens, planId, copy);
  const receipt = await sendExpoMessages(admin, messages, fetchImpl);
  if (receipt.attempted > 0 && receipt.accepted === 0) {
    throw new Error('meal_plan_push_rejected');
  }
  return receipt;
}

async function sendExpoMessages(
  admin: SupabaseClient,
  messages: ExpoPushMessage[],
  fetchImpl: typeof fetch,
): Promise<{ attempted: number; accepted: number; rejected: number }> {
  if (messages.length === 0) return { attempted: 0, accepted: 0, rejected: 0 };

  let response: Response;
  try {
    response = await fetchImpl(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch {
    return { attempted: messages.length, accepted: 0, rejected: messages.length };
  }
  if (!response.ok) {
    return { attempted: messages.length, accepted: 0, rejected: messages.length };
  }

  const payload = await response.json().catch(() => null) as { data?: ExpoPushTicket[] } | null;
  const tickets = Array.isArray(payload?.data) ? payload.data : [];
  const invalidTokens: string[] = [];
  let accepted = 0;
  messages.forEach((message, index) => {
    const ticket = tickets[index];
    if (ticket?.status === 'ok') accepted += 1;
    if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      invalidTokens.push(message.to);
    }
  });

  if (invalidTokens.length > 0) {
    await admin.from('kwilt_push_tokens').delete().in('token', invalidTokens);
  }

  return {
    attempted: messages.length,
    accepted,
    rejected: messages.length - accepted,
  };
}
