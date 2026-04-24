import type { KwiltSupabaseClient } from './client';
import type { Arc, ArcSummary, DomainSyncRow } from './types';
import { unwrapDomainData } from './types';

const ARC_SELECT = 'id,user_id,data,created_at,updated_at';

export async function listArcSummaries(
  supabase: KwiltSupabaseClient,
): Promise<ArcSummary[]> {
  const { data, error } = await supabase
    .from('kwilt_arcs')
    .select(ARC_SELECT)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DomainSyncRow<Arc>[]).map((row) => {
    const arc = unwrapDomainData(row);
    return {
      id: arc.id,
      name: arc.name,
      status: arc.status,
      createdAt: arc.createdAt,
      updatedAt: arc.updatedAt,
    };
  });
}

export async function getArcDetail(
  supabase: KwiltSupabaseClient,
  id: string,
): Promise<Arc | null> {
  const { data, error } = await supabase
    .from('kwilt_arcs')
    .select(ARC_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? unwrapDomainData(data as DomainSyncRow<Arc>) : null;
}
