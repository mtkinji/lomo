import type { SupabaseClient } from '@supabase/supabase-js';

export type MoneyFamilyStatus = {
  householdId: string | null;
  householdName: string | null;
  role: 'owner' | 'member' | null;
  memberCount: number;
};

export async function getMoneyFamilyStatus(client: SupabaseClient): Promise<MoneyFamilyStatus> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.id) throw new Error('Sign in before loading Money household sharing.');
  const { data: member, error } = await client
    .from('budget_household_members')
    .select('household_id,role,budget_households(id,name)')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (!member) return { householdId: null, householdName: null, role: null, memberCount: 0 };
  const householdValue = member.budget_households as { id: string; name: string } | Array<{ id: string; name: string }> | null;
  const household = Array.isArray(householdValue) ? householdValue[0] : householdValue;
  const { count, error: countError } = await client
    .from('budget_household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', member.household_id)
    .eq('status', 'active');
  if (countError) throw countError;
  return {
    householdId: member.household_id,
    householdName: household?.name ?? 'Kwilt household',
    role: member.role,
    memberCount: count ?? 1,
  };
}

export async function acceptMoneyFamilyInvite(client: SupabaseClient, rawCode: string): Promise<MoneyFamilyStatus> {
  const code = normalizeMoneyFamilyInviteCode(rawCode);
  if (code.length < 6) throw new Error('Enter a valid Money household invite code.');
  const { error } = await client.functions.invoke('budget-family-accept-invite', { body: { code } });
  if (error) throw error;
  return getMoneyFamilyStatus(client);
}

export function normalizeMoneyFamilyInviteCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
