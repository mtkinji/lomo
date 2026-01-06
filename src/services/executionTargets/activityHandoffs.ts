import { getSupabaseClient } from '../backend/supabaseClient';

/**
 * Explicitly hands off an Activity to an installed execution target.
 *
 * This creates/updates a row in `kwilt_activity_handoffs` so MCP executors
 * (e.g. Cursor) can list and consume the work packet.
 */
export async function handoffActivityToExecutionTarget(args: {
  activityId: string;
  executionTargetId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const activityId = String(args.activityId ?? '').trim();
  const executionTargetId = String(args.executionTargetId ?? '').trim();
  if (!activityId || !executionTargetId) {
    return { ok: false, message: 'Missing destination information.' };
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Prefer insert; if already exists, patch the existing row.
  const insertRes = await supabase.from('kwilt_activity_handoffs').insert({
    activity_id: activityId,
    execution_target_id: executionTargetId,
    handed_off: true,
    handed_off_at: now,
    status: 'READY',
  });

  if (!insertRes.error) {
    return { ok: true };
  }

  // Unique violation => update.
  const code = (insertRes.error as any)?.code;
  if (code === '23505') {
    const updateRes = await supabase
      .from('kwilt_activity_handoffs')
      .update({
        handed_off: true,
        handed_off_at: now,
        status: 'READY',
        updated_at: now,
      })
      .eq('activity_id', activityId)
      .eq('execution_target_id', executionTargetId);
    if (!updateRes.error) {
      return { ok: true };
    }
    return { ok: false, message: updateRes.error.message ?? 'Unable to hand off activity.' };
  }

  return { ok: false, message: insertRes.error.message ?? 'Unable to hand off activity.' };
}


