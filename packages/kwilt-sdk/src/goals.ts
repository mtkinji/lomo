import type { KwiltSupabaseClient } from './client';
import type { DomainSyncRow, Goal, GoalSummary } from './types';
import { unwrapDomainData } from './types';

const GOAL_SELECT = 'id,user_id,data,created_at,updated_at';

export async function listGoalSummaries(
  supabase: KwiltSupabaseClient,
): Promise<GoalSummary[]> {
  const { data, error } = await supabase
    .from('kwilt_goals')
    .select(GOAL_SELECT)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DomainSyncRow<Goal>[]).map((row) => {
    const goal = unwrapDomainData(row);
    return {
      id: goal.id,
      title: goal.title,
      name: goal.name,
      arcId: goal.arcId ?? null,
      status: goal.status,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  });
}

export async function getGoalDetail(
  supabase: KwiltSupabaseClient,
  id: string,
): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('kwilt_goals')
    .select(GOAL_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? unwrapDomainData(data as DomainSyncRow<Goal>) : null;
}

export async function updateGoal(
  supabase: KwiltSupabaseClient,
  goal: Goal,
): Promise<Goal> {
  const updatedAt = new Date().toISOString();
  const next = { ...goal, updatedAt };
  const { error } = await supabase
    .from('kwilt_goals')
    .update({ data: next, updated_at: updatedAt })
    .eq('id', goal.id);

  if (error) throw error;
  return next;
}
