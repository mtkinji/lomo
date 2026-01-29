import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getInstallId } from './installId';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from './edgeFunctions';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getAccessToken } from './backend/auth';

const BUCKET = 'hero_images';

type SignedUrlCacheEntry = { url: string; expiresAtMs: number };
type SignedUrlCache = Record<string, SignedUrlCacheEntry>;

const SIGNED_URL_CACHE_KEY = 'kwilt.heroImages.signedUrlCache.v1';

let memoryCache: SignedUrlCache | null = null;
let memoryCacheLoaded = false;
let pendingCacheLoad: Promise<void> | null = null;

async function loadCacheOnce(): Promise<void> {
  if (memoryCacheLoaded) return;
  if (pendingCacheLoad) return await pendingCacheLoad;
  pendingCacheLoad = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SIGNED_URL_CACHE_KEY);
      if (!raw) {
        memoryCache = {};
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        memoryCache = {};
        return;
      }
      memoryCache = parsed as SignedUrlCache;
    } catch {
      memoryCache = {};
    } finally {
      memoryCacheLoaded = true;
      pendingCacheLoad = null;
    }
  })();
  await pendingCacheLoad;
}

async function persistCacheBestEffort(): Promise<void> {
  try {
    if (!memoryCache) return;
    await AsyncStorage.setItem(SIGNED_URL_CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // best-effort
  }
}

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (!supabaseKey) {
    throw new Error(
      'Missing Supabase publishable key (set extra.supabasePublishableKey / SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY)',
    );
  }
  headers.set('apikey', supabaseKey);

  try {
    const installId = await getInstallId();
    headers.set('x-kwilt-install-id', installId);
  } catch {
    // best-effort
  }

  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) throw new Error('Missing access token (not signed in)');
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function postJson<T>(fnName: string, body: Record<string, unknown>, requireAuth = true): Promise<T> {
  const candidates = getEdgeFunctionUrlCandidates(fnName);
  const base = candidates[0] ?? getEdgeFunctionUrl(fnName);
  if (!base) throw new Error(`Missing edge function URL for ${fnName}`);

  const payload = JSON.stringify(body);
  let lastError: Error | null = null;

  for (const url of candidates.length > 0 ? candidates : [base]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: await buildEdgeHeaders(requireAuth),
        body: payload,
      });
      const text = await res.text().catch(() => '');
      let json: any = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (res.ok) return (json ?? {}) as T;
      const msg =
        (typeof json?.error?.message === 'string' && json.error.message.trim()) ||
        (text?.trim() ? text.trim().slice(0, 280) : `Request failed (${res.status})`);
      lastError = new Error(`${msg}\nfnUrl=${url}`);
      // If not found, try next candidate.
      if (res.status === 404) continue;
      break;
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error('Request failed');
      continue;
    }
  }

  throw lastError ?? new Error('Request failed');
}

export async function initHeroImageUpload(params: {
  entityType: 'arc' | 'goal' | 'activity';
  entityId: string;
  mimeType?: string | null;
}): Promise<{ storagePath: string; uploadSignedUrl: string }> {
  const res = await postJson<{ storagePath?: string; upload?: { signedUrl?: string } }>(
    'hero-images-init-upload',
    {
      entityType: params.entityType,
      entityId: params.entityId,
      mimeType: params.mimeType ?? null,
    },
    true,
  );

  const storagePath = typeof res?.storagePath === 'string' ? res.storagePath : '';
  const uploadSignedUrl = typeof res?.upload?.signedUrl === 'string' ? res.upload.signedUrl : '';
  if (!storagePath || !uploadSignedUrl) throw new Error('Invalid hero upload response');
  return { storagePath, uploadSignedUrl };
}

export async function uploadHeroImageToSignedUrl(params: { signedUrl: string; fileUri: string; mimeType?: string | null }) {
  const result = await FileSystem.uploadAsync(params.signedUrl, params.fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': params.mimeType?.trim() ? params.mimeType.trim() : 'application/octet-stream',
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (status ${result.status})`);
  }
}

export async function getHeroImageSignedUrl(storagePath: string): Promise<string> {
  const key = String(storagePath ?? '').trim();
  if (!key) throw new Error('Missing storagePath');

  await loadCacheOnce();
  memoryCache ??= {};

  const cached = memoryCache[key];
  const now = Date.now();
  if (cached?.url && Number.isFinite(cached.expiresAtMs) && cached.expiresAtMs > now + 60_000) {
    return cached.url;
  }

  const res = await postJson<{ url?: string; expiresAtIso?: string }>(
    'hero-images-get-download-url',
    { storagePath: key },
    true,
  );
  const url = typeof res?.url === 'string' ? res.url : '';
  const expIso = typeof res?.expiresAtIso === 'string' ? res.expiresAtIso : '';
  const expMs = expIso && Number.isFinite(Date.parse(expIso)) ? Date.parse(expIso) : now + 5 * 60_000;
  if (!url) throw new Error('Missing signed URL');

  memoryCache[key] = { url, expiresAtMs: expMs };
  void persistCacheBestEffort();
  return url;
}

export function getHeroImagesBucket(): string {
  return BUCKET;
}


