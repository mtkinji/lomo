// Private avatar broker for Kwilt accounts and Household dependents.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  avatarExtensionForMimeType,
  parseAvatarAction,
  parseAvatarSource,
  resolveAvatarSource,
  validateAvatarObject,
} from '../_shared/householdAvatarPolicy.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type AvatarRow = {
  membership_id?: unknown;
  avatar_source?: unknown;
  storage_path?: unknown;
  avatar_url?: unknown;
};

const BUCKET = 'household-avatars';
const SIGNED_URL_SECONDS = 60 * 60;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function getAdmin() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bearer(req: Request): string | null {
  const match = /^Bearer\s+(.+)$/i.exec((req.headers.get('authorization') ?? '').trim());
  return match?.[1]?.trim() || null;
}

function membershipId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error('invalid_membership_id');
  return value;
}

async function signPath(admin: ReturnType<typeof getAdmin>, storagePath: string | null): Promise<string | null> {
  if (!admin || !storagePath) return null;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function displayAvatarUrl(admin: ReturnType<typeof getAdmin>, row: AvatarRow): Promise<string | null> {
  const source = row.avatar_source === 'account' || row.avatar_source === 'dependent'
    ? row.avatar_source : 'initials';
  const storagePath = typeof row.storage_path === 'string' ? row.storage_path : null;
  const providerUrl = typeof row.avatar_url === 'string' ? row.avatar_url : null;
  const resolved = resolveAvatarSource(
    source === 'account' ? storagePath : null,
    providerUrl,
    source === 'dependent' ? storagePath : null,
  );
  return resolved.storagePath ? signPath(admin, resolved.storagePath) : resolved.avatarUrl;
}

function safeError(error: unknown): { status: number; message: string; code: string } {
  const raw = error instanceof Error ? error.message : 'avatar_request_failed';
  const known = new Set([
    'authentication_required', 'household_owner_required', 'household_member_not_found',
    'connected_account_photo_owned_by_member', 'invalid_avatar_target', 'invalid_avatar_action',
    'invalid_avatar_source', 'invalid_membership_id', 'unsupported_avatar_type',
    'invalid_avatar_size', 'avatar_too_large', 'invalid_avatar_storage_path',
  ]);
  const code = known.has(raw) ? raw : 'avatar_request_failed';
  const status = code === 'authentication_required' ? 401
    : code === 'household_owner_required' || code === 'connected_account_photo_owned_by_member' ? 403
      : code === 'avatar_request_failed' ? 500 : 400;
  return { status, message: code === 'avatar_request_failed' ? 'Unable to update photo' : code, code };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });

  const admin = getAdmin();
  if (!admin) return json(503, { error: { message: 'Photo service unavailable', code: 'provider_unavailable' } });
  const token = bearer(req);
  if (!token) return json(401, { error: { message: 'Unauthorized', code: 'authentication_required' } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const userId = userData?.user?.id ? String(userData.user.id) : '';
  if (userError || !userId || userData.user.is_anonymous) {
    return json(401, { error: { message: 'Unauthorized', code: 'authentication_required' } });
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = parseAvatarAction(body?.action);

    if (action === 'resolve-self') {
      const { data, error } = await admin.rpc('kwilt_resolve_self_avatar', { p_actor_user_id: userId });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] as AvatarRow | undefined : undefined;
      const source = row?.avatar_source === 'account' ? 'account' : 'initials';
      return json(200, { avatarSource: source, avatarUrl: row ? await displayAvatarUrl(admin, row) : null });
    }

    if (action === 'resolve-household') {
      const { data, error } = await admin.rpc('kwilt_resolve_household_avatars', { p_actor_user_id: userId });
      if (error) throw new Error(error.message);
      const rows = Array.isArray(data) ? data as AvatarRow[] : [];
      const members = await Promise.all(rows.flatMap((row) => {
        const id = typeof row.membership_id === 'string' && uuidPattern.test(row.membership_id)
          ? row.membership_id : null;
        if (!id) return [];
        const source = row.avatar_source === 'account' || row.avatar_source === 'dependent'
          ? row.avatar_source : 'initials';
        return [displayAvatarUrl(admin, row)
          .then((avatarUrl) => ({ membershipId: id, avatarSource: source, avatarUrl }))];
      }));
      return json(200, { members });
    }

    const source = parseAvatarSource(body?.source);
    const targetMembershipId = membershipId(body?.membershipId);

    if (action === 'init-upload') {
      const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
      const sizeBytes = body?.sizeBytes;
      validateAvatarObject({ mimeType, sizeBytes });
      const { error: authorityError } = await admin.rpc('kwilt_avatar_upload_authority', {
        p_actor_user_id: userId, p_source: source, p_membership_id: targetMembershipId,
      });
      if (authorityError) throw new Error(authorityError.message);
      const extension = avatarExtensionForMimeType(mimeType);
      const storagePath = `${source}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const { data: intent, error: intentError } = await admin.from('kwilt_avatar_upload_intents').insert({
        actor_user_id: userId,
        source,
        target_membership_id: targetMembershipId,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: sizeBytes,
      }).select('id').single();
      if (intentError || !intent?.id) throw new Error('avatar_request_failed');
      const { data: upload, error: uploadError } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
      if (uploadError || !upload?.signedUrl) {
        await admin.from('kwilt_avatar_upload_intents').delete().eq('id', intent.id);
        throw new Error('avatar_request_failed');
      }
      return json(200, { upload: { signedUrl: upload.signedUrl }, uploadId: intent.id });
    }

    if (action === 'confirm-upload') {
      const uploadId = membershipId(body?.uploadId);
      if (!uploadId) throw new Error('invalid_avatar_target');
      const { data: intent, error: intentError } = await admin
        .from('kwilt_avatar_upload_intents')
        .select('id,source,target_membership_id,storage_path,mime_type,size_bytes')
        .eq('id', uploadId)
        .eq('actor_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (intentError || !intent) throw new Error('invalid_avatar_target');
      const intentSource = parseAvatarSource(intent.source);
      const intentMembershipId = membershipId(intent.target_membership_id);
      const storagePath = String(intent.storage_path ?? '');
      try {
        const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(storagePath);
        if (downloadError || !blob) throw new Error('avatar_request_failed');
        validateAvatarObject({ mimeType: blob.type, sizeBytes: blob.size });
        if (blob.type !== intent.mime_type || blob.size !== intent.size_bytes) throw new Error('avatar_request_failed');
        const { data, error } = await admin.rpc('kwilt_confirm_avatar_upload', {
          p_actor_user_id: userId,
          p_source: intentSource,
          p_membership_id: intentMembershipId,
          p_storage_path: storagePath,
        });
        if (error) throw new Error(error.message);
        await admin.from('kwilt_avatar_upload_intents').update({
          status: 'confirmed', consumed_at: new Date().toISOString(),
        }).eq('id', uploadId).eq('status', 'pending');
        const previousPath = typeof data?.previousStoragePath === 'string' ? data.previousStoragePath : null;
        if (previousPath && previousPath !== storagePath) {
          await admin.storage.from(BUCKET).remove([previousPath]).catch(() => undefined);
          await admin.from('kwilt_avatar_deletion_queue').delete().eq('storage_path', previousPath);
        }
        return json(200, {
          avatarSource: intentSource,
          avatarUrl: await signPath(admin, storagePath),
          membershipId: intentMembershipId,
        });
      } catch (error) {
        await admin.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
        await admin.from('kwilt_avatar_upload_intents').update({
          status: 'discarded', consumed_at: new Date().toISOString(),
        }).eq('id', uploadId).eq('status', 'pending');
        throw error;
      }
    }

    const { data, error } = await admin.rpc('kwilt_remove_avatar', {
      p_actor_user_id: userId, p_source: source, p_membership_id: targetMembershipId,
    });
    if (error) throw new Error(error.message);
    const previousPath = typeof data?.previousStoragePath === 'string' ? data.previousStoragePath : null;
    if (previousPath) {
      await admin.storage.from(BUCKET).remove([previousPath]).catch(() => undefined);
      await admin.from('kwilt_avatar_deletion_queue').delete().eq('storage_path', previousPath);
    }
    return json(200, { avatarSource: 'initials', avatarUrl: null, membershipId: targetMembershipId });
  } catch (error) {
    const safe = safeError(error);
    return json(safe.status, { error: { message: safe.message, code: safe.code } });
  }
});
