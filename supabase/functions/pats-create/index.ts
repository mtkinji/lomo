// Kwilt PAT issuance (Supabase Edge Function)
//
// POST / -> { token, tokenPrefix, patId }
//
// - Requires Supabase user JWT (verify_jwt=true)
// - Generates a new random token and stores ONLY a SHA-256 hash in `kwilt_pats`
// - Returns the raw token once (caller must store it securely)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
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
  if (!token) return { ok: false, response: json(401, { error: { message: 'Missing Authorization' } }) };
  const anon = getSupabaseAnon();
  if (!anon) return { ok: false, response: json(503, { error: { message: 'Auth unavailable' } }) };
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false, response: json(401, { error: { message: 'Unauthorized' } }) };
  return { ok: true, userId: String(data.user.id) };
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64Url(bytes: Uint8Array): string {
  // btoa expects binary string
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

type Body = { label?: unknown };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: { message: 'Service unavailable' } });

  const who = await requireUser(req);
  if (!who.ok) return who.response;

  const body = (await req.json().catch(() => null)) as Body | null;
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 80) : null;

  // Token format: kwilt_pat_<random>
  const raw = new Uint8Array(24);
  crypto.getRandomValues(raw);
  const token = `kwilt_pat_${base64Url(raw)}`;
  const tokenHash = await sha256Hex(token);

  const { data, error } = await admin
    .from('kwilt_pats')
    .insert({
      owner_id: who.userId,
      label,
      token_hash: tokenHash,
    })
    .select('id')
    .maybeSingle();
  if (error || !data) return json(500, { error: { message: 'Unable to create token' } });

  const patId = String((data as any).id);
  return json(200, { token, tokenPrefix: token.slice(0, 12), patId });
});




