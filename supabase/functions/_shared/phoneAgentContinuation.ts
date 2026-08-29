type ReadResult = { data: unknown; error: unknown };
type Query = {
  select: (...args: unknown[]) => Query;
  eq: (...args: unknown[]) => Query;
  is: (...args: unknown[]) => Query;
  order: (...args: unknown[]) => Query;
  limit: (...args: unknown[]) => Query;
  maybeSingle: () => PromiseLike<ReadResult>;
};

type ContinuationClient = {
  from(table: string): unknown;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<ReadResult>;
};

export async function continueThreadOnPhoneAgent(input: {
  client: ContinuationClient;
  userId: string;
  threadId: string;
}) {
  const userId = input.userId.trim();
  const threadId = input.threadId.trim();
  if (!userId || !threadId || threadId.length > 200) throw new Error('invalid_phone_continuation');

  const { data, error } = await (input.client
    .from('kwilt_phone_agent_links') as Query)
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .is('opted_out_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('phone_agent_link_lookup_failed');
  const linkId = data && typeof data === 'object' && typeof (data as { id?: unknown }).id === 'string'
    ? (data as { id: string }).id : '';
  if (!linkId) throw new Error('phone_agent_not_linked');

  const result = await input.client.rpc('bind_kwilt_agent_channel_thread', {
    p_user_id: userId,
    p_channel: 'sms',
    p_phone_link_id: linkId,
    p_thread_id: threadId,
  });
  if (result.error) throw new Error('phone_agent_continuation_failed');
  return { status: 'ready' as const, channel: 'phone_agent' as const, continuation: 'next_message' as const };
}
