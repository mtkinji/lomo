// Kwilt: Hero images init upload (Arc/Goal/Activity banner images)
//
// POST / -> { storagePath, upload: { signedUrl, token? } }
//
// This function:
// - verifies the caller (Supabase JWT)
// - returns a signed upload URL for a private storage object in bucket `hero_images`
//
// Notes:
// - We intentionally avoid a separate metadata table; the canonical reference is persisted
//   in the domain object itself (e.g. Arc.heroImageMeta.uploadStoragePath) and synced via
//   `kwilt_*` domain tables.

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

type Body = {
  entityType?: unknown; // 'arc' | 'goal' | 'activity'
  entityId?: unknown;
  mimeType?: unknown;
};

function safeExtFromMimeType(mimeType: string | null): string {
  const mt = (mimeType ?? '').trim().toLowerCase();
  if (mt === 'image/png') return 'png';
  if (mt === 'image/webp') return 'webp';
  // Treat HEIC as jpg for path stability; some clients still upload the original bytes.
  if (mt === 'image/heic' || mt === 'image/heif') return 'jpg';
  return 'jpg';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Hero images service unavailable', code: 'provider_unavailable' } });
  }

  const who = await requireUser(req);
  if (!who.ok) return who.response;

  const body = (await req.json().catch(() => null)) as Body | null;
  const entityType = typeof body?.entityType === 'string' ? body.entityType.trim().toLowerCase() : '';
  const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim() : null;

  if (!entityType || !entityId) {
    return json(400, { error: { message: 'Missing required fields', code: 'bad_request' } });
  }
  if (!['arc', 'goal', 'activity'].includes(entityType)) {
    return json(400, { error: { message: 'Invalid entityType', code: 'bad_request' } });
  }

  const ext = safeExtFromMimeType(mimeType);
  const storagePath = `${who.userId}/${entityType}/${entityId}.${ext}`;

  const { data: upload, error: uploadError } = await admin
    .storage
    .from('hero_images')
    // `createSignedUploadUrl` returns { signedUrl, token } in supabase-js v2.
    .createSignedUploadUrl(storagePath);

  if (uploadError || !upload?.signedUrl) {
    return json(500, {
      error: {
        message: 'Unable to init upload',
        code: 'server_error',
        details: typeof (uploadError as any)?.message === 'string' ? (uploadError as any).message : null,
      },
    });
  }

  return json(200, {
    storagePath,
    upload: {
      signedUrl: upload.signedUrl,
      token: (upload as any).token ?? null,
    },
  });
});


