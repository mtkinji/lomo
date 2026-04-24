import type { KwiltSupabaseClient } from './client';
import type { Activity, ActivitySummary, DomainSyncRow } from './types';
import { unwrapDomainData } from './types';

const ACTIVITY_SELECT = 'id,user_id,data,created_at,updated_at';

export async function listActivitySummaries(
  supabase: KwiltSupabaseClient,
): Promise<ActivitySummary[]> {
  const { data, error } = await supabase
    .from('kwilt_activities')
    .select(ACTIVITY_SELECT)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DomainSyncRow<Activity>[]).map((row) => {
    const activity = unwrapDomainData(row);
    return {
      id: activity.id,
      title: activity.title,
      goalId: activity.goalId ?? null,
      type: activity.type,
      status: activity.status,
      scheduledDate: activity.scheduledDate ?? null,
      scheduledAt: activity.scheduledAt ?? null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  });
}

export async function getActivityDetail(
  supabase: KwiltSupabaseClient,
  id: string,
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('kwilt_activities')
    .select(ACTIVITY_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? unwrapDomainData(data as DomainSyncRow<Activity>) : null;
}

export async function updateActivity(
  supabase: KwiltSupabaseClient,
  activity: Activity,
): Promise<Activity> {
  const updatedAt = new Date().toISOString();
  const next = { ...activity, updatedAt };
  const { error } = await supabase
    .from('kwilt_activities')
    .update({ data: next, updated_at: updatedAt })
    .eq('id', activity.id);

  if (error) throw error;
  return next;
}
