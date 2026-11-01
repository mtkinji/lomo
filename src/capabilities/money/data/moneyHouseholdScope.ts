import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve once per read operation; never cache household authority across sessions. */
export async function resolveMoneyHouseholdScope(client: SupabaseClient, expectedActorUserId: string) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.is_anonymous || data.user.id !== expectedActorUserId) {
    throw new Error('Sign in to the account that opened these settings before reviewing changes.');
  }
  const owner = await resolveMoneyOwnerUserId(client);
  return { actorUserId: data.user.id, ownerUserId: owner };
}

/** The authenticated RPC is the authority. Reuse its result only within one read;
 * callers that already verified the actor need not fetch auth again. */
export async function resolveMoneyOwnerUserId(client: SupabaseClient): Promise<string> {
  const { data: owner, error: ownerError } = await client.rpc('budget_effective_owner_user_id');
  if (ownerError) throw ownerError;
  if (typeof owner !== 'string' || !owner) throw new Error('An authorized household adult is required.');
  return owner;
}
