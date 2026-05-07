import { getSupabaseClient } from './backend/supabaseClient';

export type SubmitCheckinReplyParams = {
  goalId: string;
  targetEventId: string;
  text: string;
};

export async function submitCheckinReply(params: SubmitCheckinReplyParams): Promise<void> {
  const text = params.text.trim();
  if (!text) {
    throw new Error('Reply cannot be empty');
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to reply');
  }

  const { error } = await supabase.from('kwilt_feed_events').insert({
    entity_type: 'goal',
    entity_id: params.goalId,
    actor_id: user.id,
    type: 'checkin_reply',
    payload: {
      targetEventId: params.targetEventId,
      text,
    },
  });

  if (error) {
    if (error.code === '42501' || error.message?.includes('policy')) {
      throw new Error('You must be a member of this shared goal to reply');
    }
    throw new Error(`Failed to send reply: ${error.message}`);
  }
}
