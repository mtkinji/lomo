import { getAccessToken } from '../../../services/backend/auth';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../../../services/edgeFunctions';
import { uploadFileToSignedUrl } from '../../../services/files/uploadFileToSignedUrl';
import { getSupabasePublishableKey } from '../../../utils/getEnv';

export type HouseholdAvatarSource = 'account' | 'dependent' | 'initials';
export type ResolvedAvatar = { avatarSource: HouseholdAvatarSource; avatarUrl: string | null };
export type HouseholdAvatarMap = Record<string, ResolvedAvatar>;
type MutableAvatarSource = Exclude<HouseholdAvatarSource, 'initials'>;

function isDisplayUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function parseResolvedAvatar(value: unknown, message = 'Invalid avatar response'): ResolvedAvatar {
  if (!value || typeof value !== 'object') throw new Error(message);
  const candidate = value as { avatarSource?: unknown; avatarUrl?: unknown };
  if (!['account', 'dependent', 'initials'].includes(String(candidate.avatarSource))) throw new Error(message);
  if (!(candidate.avatarUrl === null || isDisplayUrl(candidate.avatarUrl))) throw new Error(message);
  if (candidate.avatarSource === 'initials' && candidate.avatarUrl !== null) throw new Error(message);
  return {
    avatarSource: candidate.avatarSource as HouseholdAvatarSource,
    avatarUrl: candidate.avatarUrl as string | null,
  };
}

async function headers(): Promise<Headers> {
  const key = getSupabasePublishableKey()?.trim();
  const token = (await getAccessToken())?.trim();
  if (!key || !token) throw new Error('Sign in to update photos');
  const result = new Headers({
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${token}`,
    'x-kwilt-client': 'kwilt-mobile',
  });
  return result;
}

async function post(body: Record<string, unknown>): Promise<unknown> {
  const candidates = getEdgeFunctionUrlCandidates('household-avatars');
  const fallback = getEdgeFunctionUrl('household-avatars');
  const urls = candidates.length ? candidates : fallback ? [fallback] : [];
  if (!urls.length) throw new Error('Photo service is not configured');
  let lastError: Error | null = null;
  for (const url of urls) {
    const response = await fetch(url, { method: 'POST', headers: await headers(), body: JSON.stringify(body) });
    const text = await response.text().catch(() => '');
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (response.ok) return data;
    const message = typeof (data as { error?: { message?: unknown } } | null)?.error?.message === 'string'
      ? String((data as { error: { message: string } }).error.message)
      : `Photo request failed (${response.status})`;
    lastError = new Error(message);
    if (response.status !== 404) break;
  }
  throw lastError ?? new Error('Photo request failed');
}

export async function resolveSelfAvatar(): Promise<ResolvedAvatar> {
  return parseResolvedAvatar(await post({ action: 'resolve-self' }));
}

export async function resolveHouseholdAvatars(): Promise<HouseholdAvatarMap> {
  const data = await post({ action: 'resolve-household' });
  const members = (data as { members?: unknown } | null)?.members;
  if (!Array.isArray(members)) throw new Error('Invalid Household avatar response');
  const result: HouseholdAvatarMap = {};
  for (const row of members) {
    if (!row || typeof row !== 'object' || typeof (row as { membershipId?: unknown }).membershipId !== 'string') {
      throw new Error('Invalid Household avatar response');
    }
    const id = (row as { membershipId: string }).membershipId.trim();
    if (!id || result[id]) throw new Error('Invalid Household avatar response');
    result[id] = parseResolvedAvatar(row, 'Invalid Household avatar response');
  }
  return result;
}

export async function uploadAvatar(input: {
  source: MutableAvatarSource;
  membershipId?: string | null;
  fileUri: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ResolvedAvatar> {
  const membershipId = input.membershipId?.trim() || null;
  const init = await post({
    action: 'init-upload', source: input.source, membershipId,
    mimeType: input.mimeType, sizeBytes: input.sizeBytes,
  }) as { uploadId?: unknown; upload?: { signedUrl?: unknown } };
  const uploadId = typeof init?.uploadId === 'string' ? init.uploadId : '';
  const signedUrl = typeof init?.upload?.signedUrl === 'string' ? init.upload.signedUrl : '';
  if (!uploadId || !isDisplayUrl(signedUrl)) {
    throw new Error('Invalid avatar upload response');
  }
  await uploadFileToSignedUrl({ signedUrl, fileUri: input.fileUri, mimeType: input.mimeType });
  return parseResolvedAvatar(await post({
    action: 'confirm-upload', source: input.source, membershipId, uploadId,
  }));
}

export async function removeAvatar(input: {
  source: MutableAvatarSource;
  membershipId?: string | null;
}): Promise<ResolvedAvatar> {
  return parseResolvedAvatar(await post({
    action: 'remove', source: input.source, membershipId: input.membershipId?.trim() || null,
  }));
}
