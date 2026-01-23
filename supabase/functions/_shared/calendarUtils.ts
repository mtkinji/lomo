import { createClient } from 'npm:@supabase/supabase-js@2';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function requireBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') ?? '').trim();
  const m = /^bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() ?? null;
}

export async function requireUserId(req: Request): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const token = requireBearerToken(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

function toBase64Url(bytes: Uint8Array): string {
  const raw = btoa(String.fromCharCode(...bytes));
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(raw: string): Uint8Array {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(raw.length / 4) * 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const data = new TextEncoder().encode(json);
  return signState(data, secret).then((sig) => `${toBase64Url(data)}.${sig}`);
}

export async function decodeState(state: string, secret: string): Promise<Record<string, unknown> | null> {
  const [payloadB64, sig] = state.split('.');
  if (!payloadB64 || !sig) return null;
  const payload = fromBase64Url(payloadB64);
  const expected = await signState(payload, secret);
  if (expected !== sig) return null;
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function signState(payload: Uint8Array, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, payload);
  return toBase64Url(new Uint8Array(signature));
}

export type EncryptedToken = {
  ciphertext: string;
  iv: string;
  tag: string;
};

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(secret: string, plaintext: string): Promise<EncryptedToken> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
  const tag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);
  return {
    ciphertext: toBase64Url(ciphertext),
    iv: toBase64Url(iv),
    tag: toBase64Url(tag),
  };
}

export async function decryptToken(secret: string, payload: EncryptedToken): Promise<string | null> {
  const key = await deriveAesKey(secret);
  const iv = fromBase64Url(payload.iv);
  const ciphertext = fromBase64Url(payload.ciphertext);
  const tag = fromBase64Url(payload.tag);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}


