// Kwilt: Attachments init upload
//
// POST / -> { attachment, upload: { signedUrl, token? } }
//
// This function:
// - verifies the caller (Supabase JWT)
// - creates an `activity_attachments` row
// - returns a signed upload URL for the storage object

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAnon() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const anon =
    (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim() ||
    (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

async function requireUser(req: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const anon = getSupabaseAnon();
  if (!anon) {
    return { ok: false, response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }) };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }

  return { ok: true, userId: String(data.user.id) };
}

type InitUploadBody = {
  activityId?: unknown;
  goalId?: unknown;
  kind?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  durationSeconds?: unknown;
  sharedWithGoalMembers?: unknown;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Attachments service unavailable', code: 'provider_unavailable' } });
  }

  const who = await requireUser(req);
  if (!who.ok) return who.response;

  const body = (await req.json().catch(() => null)) as InitUploadBody | null;
  const activityId = typeof body?.activityId === 'string' ? body.activityId.trim() : '';
  const goalId = typeof body?.goalId === 'string' ? body.goalId.trim() : null;
  const kind = typeof body?.kind === 'string' ? body.kind.trim() : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim() : null;
  const sizeBytes = typeof body?.sizeBytes === 'number' && Number.isFinite(body.sizeBytes) ? Math.max(0, Math.floor(body.sizeBytes)) : null;
  const durationSeconds =
    typeof body?.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) ? Math.max(0, Math.floor(body.durationSeconds)) : null;
  const sharedWithGoalMembers = Boolean(body?.sharedWithGoalMembers);

  if (!activityId || !kind || !fileName) {
    return json(400, { error: { message: 'Missing required fields', code: 'bad_request' } });
  }
  if (!['photo', 'video', 'document', 'audio'].includes(kind)) {
    return json(400, { error: { message: 'Invalid kind', code: 'bad_request' } });
  }

  // Soft limits (server-side safety rail; client enforces canonical UX).
  const MAX_BYTES = 25 * 1024 * 1024;
  if (sizeBytes != null && sizeBytes > MAX_BYTES) {
    return json(413, { error: { message: 'Attachment too large', code: 'payload_too_large' } });
  }

  // Create metadata row first so we can enforce access via DB.
  const { data: inserted, error: insertError } = await admin
    .from('activity_attachments')
    .insert({
      activity_id: activityId,
      goal_id: goalId,
      owner_id: who.userId,
      kind,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      duration_seconds: durationSeconds,
      shared_with_goal_members: Boolean(goalId && sharedWithGoalMembers),
      // Placeholder; updated below once we have the attachment id.
      storage_path: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    return json(500, { error: { message: 'Unable to create attachment', code: 'server_error' } });
  }

  const attachmentId = String((inserted as any).id);
  const storagePath = `${who.userId}/${activityId}/${attachmentId}`;

  const { error: updateError } = await admin
    .from('activity_attachments')
    .update({ storage_path: storagePath })
    .eq('id', attachmentId);
  if (updateError) {
    // Best-effort cleanup: remove the row to avoid dangling attachments.
    await admin.from('activity_attachments').delete().eq('id', attachmentId);
    return json(500, { error: { message: 'Unable to create attachment', code: 'server_error' } });
  }

  const { data: upload, error: uploadError } = await admin
    .storage
    .from('activity_attachments')
    // `createSignedUploadUrl` returns { signedUrl, token } in supabase-js v2.
    .createSignedUploadUrl(storagePath);

  if (uploadError || !upload?.signedUrl) {
    await admin.from('activity_attachments').delete().eq('id', attachmentId);
    return json(500, {
      error: {
        message: 'Unable to init upload',
        code: 'server_error',
        details: typeof (uploadError as any)?.message === 'string' ? (uploadError as any).message : null,
      },
    });
  }

  // Return the full row for convenience.
  const { data: row } = await admin
    .from('activity_attachments')
    .select('*')
    .eq('id', attachmentId)
    .maybeSingle();

  return json(200, {
    attachment: row ?? {
      id: attachmentId,
      activity_id: activityId,
      goal_id: goalId,
      owner_id: who.userId,
      kind,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      duration_seconds: durationSeconds,
      storage_path: storagePath,
      shared_with_goal_members: Boolean(goalId && sharedWithGoalMembers),
    },
    upload: {
      signedUrl: upload.signedUrl,
      token: (upload as any).token ?? null,
    },
  });
});


