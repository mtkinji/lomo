type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

/** Old logs are an audit trail, not proof that a generic action executed. */
export function projectExternalAuditReplay(
  row: { object_type?: string; object_id?: string; result_summary?: string; structured_result?: JsonObject } | null,
  operation: string,
): JsonObject | null {
  if (!row || row.object_type === 'proposal' || row.object_type === 'client_action') return null;
  if (row.structured_result) return { ...row.structured_result, idempotent_replay: true };
  if (!row.object_type || !row.object_id) return null;
  const verifiedLegacyObject = ['arc', 'goal', 'activity', 'goal_checkin', 'chapter_note'].includes(row.object_type);
  return {
    receipt_id: null, operation, status: verifiedLegacyObject ? 'completed' : 'unavailable',
    result_references: verifiedLegacyObject ? [{ kind: row.object_type, id: row.object_id }] : [],
    confirmation: null, handoff: null, idempotent_replay: true,
    summary: verifiedLegacyObject ? row.result_summary ?? 'Already completed.'
      : 'The previous outcome could not be verified. Inspect the target before submitting another write.',
  };
}
