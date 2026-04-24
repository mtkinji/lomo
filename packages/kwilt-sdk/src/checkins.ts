import type { KwiltSupabaseClient } from './client';
import type { CheckIn } from './types';

export async function listCheckinsForGoal(
  supabase: KwiltSupabaseClient,
  goalId: string,
): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('goal_checkins')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    goalId: row.goal_id,
    text: row.text ?? row.body ?? row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row,
  }));
}
