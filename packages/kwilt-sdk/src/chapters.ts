import type { KwiltSupabaseClient } from './client';
import type { Chapter } from './types';

export async function listChaptersForGoal(
  supabase: KwiltSupabaseClient,
  goalId: string,
): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('kwilt_chapters')
    .select('id,template_id,period_start,period_end,output_json,status,created_at,updated_at')
    .contains('output_json', { goalIds: [goalId] })
    .order('period_start', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    templateId: row.template_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    ...(row.output_json ?? {}),
  }));
}
