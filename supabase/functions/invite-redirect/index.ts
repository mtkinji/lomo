// Invite redirect endpoint (public)
//
// Routes:
// - GET /invite-redirect/i/<code>                 -> 302 -> kwilt://invite?code=<code>
// - GET /invite-redirect/i/<code>?exp=<exp_url>   -> 302 -> <exp_url> (exp://... opens Expo Go)
//
// Why redirect directly to exp:// for Expo Go?
// - `expo.dev/--/to-exp` no longer exists (404), so we can't rely on Expo's universal link handoff.
// - Supabase Edge Functions responses are served with a restrictive sandbox policy that forces
//   `text/plain` for HTML-ish payloads, which prevents rendering a nice landing page UI.
// - A 302 to `exp://...` triggers the system handoff prompt when the user taps the invite URL.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function isAllowedExpScheme(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'exp:' || u.protocol === 'exps:';
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // Expect .../invite-redirect/i/<code>
  const iIdx = parts.lastIndexOf('i');
  const code = iIdx >= 0 ? (parts[iIdx + 1] ?? '').trim() : '';

  if (!code) {
    return new Response('Missing invite code', { status: 400, headers: corsHeaders });
  }

  const kwiltUrl = `kwilt://invite?code=${encodeURIComponent(code)}`;
  const expUrl = (url.searchParams.get('exp') ?? '').trim();

  // If an exp:// URL is provided, redirect directly so iOS can hand off into Expo Go.
  // Validate scheme to avoid open-redirecting to arbitrary http(s) targets.
  if (expUrl && isAllowedExpScheme(expUrl)) {
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: expUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Default: redirect to the app scheme.
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: kwiltUrl,
      'Cache-Control': 'no-store',
    },
  });
});


