// Kwilt: delete the signed-in user's account.
//
// POST / -> { ok: true }
//
// Requires Authorization: Bearer <Supabase access token>. The function verifies
// the token, removes user-owned storage objects where Supabase has no FK
// cascade, then deletes the auth user via the service-role Admin API.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
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
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

async function removeStoragePrefix(admin: any, bucket: string, prefix: string): Promise<void> {
  const paths: string[] = [];

  async function walk(path: string): Promise<void> {
    const { data, error } = await admin.storage.from(bucket).list(path, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const name = String(item.name ?? '').trim();
      if (!name) continue;
      const childPath = path ? `${path}/${name}` : name;
      if ((item as { id?: string | null }).id) {
        paths.push(childPath);
      } else {
        await walk(childPath);
      }
    }
  }

  await walk(prefix);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
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
    return json(503, { error: { message: 'Account deletion service unavailable', code: 'provider_unavailable' } });
  }

  const token = getBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id ? String(userData.user.id) : '';
  if (userErr || !userId) {
    return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => null);
  if (body?.confirm !== true) {
    return json(400, { error: { message: 'Missing deletion confirmation', code: 'bad_request' } });
  }

  const { data: attachments } = await admin
    .from('activity_attachments')
    .select('storage_path')
    .eq('owner_id', userId);
  const attachmentPaths = (attachments ?? [])
    .map((row: { storage_path?: unknown }) => (typeof row.storage_path === 'string' ? row.storage_path.trim() : ''))
    .filter((path: string) => path.length > 0);
  for (let i = 0; i < attachmentPaths.length; i += 100) {
    await admin.storage.from('activity_attachments').remove(attachmentPaths.slice(i, i + 100));
  }

  await removeStoragePrefix(admin, 'hero_images', userId);
  await admin.from('kwilt_install_identities').delete().eq('user_id', userId);

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return json(500, {
      error: {
        message: deleteErr.message || 'Unable to delete account',
        code: 'delete_failed',
      },
    });
  }

  return json(200, { ok: true });
});
