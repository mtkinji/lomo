// Invite redirect endpoint (public)
//
// Routes:
// - GET /invite-redirect/i/<code>                 -> HTML w/ OG meta + "Open in app" handoff
// - GET /invite-redirect/i/<code>?exp=<exp_url>   -> 302 -> <exp_url> (exp://... opens Expo Go)
//
// Why keep the exp:// redirect for Expo Go?
// - `expo.dev/--/to-exp` no longer exists (404), so we can't rely on Expo's universal link handoff.
// - A 302 to `exp://...` triggers the system handoff prompt when the user taps the invite URL.
//
// Why serve HTML for non-Expo invites?
// - iOS share sheets / iMessage link previews use Open Graph metadata from the URL to render
//   a rich preview card (Airbnb-style). A pure 302 generally produces a poor preview.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isAllowedExpScheme(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'exp:' || u.protocol === 'exps:';
  } catch {
    return false;
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildInviteHtml(args: {
  code: string;
  kwiltUrl: string;
  canonicalUrl: string;
  goalTitle?: string | null;
  goalImageUrl?: string | null;
}): string {
  // For iOS share previews, the OG title should be the goal name (Airbnb-style).
  // Keep the "Join..." phrasing for the on-page header/body copy instead.
  const goalName = args.goalTitle?.trim() ? args.goalTitle.trim() : '';
  const ogTitle = goalName || 'Shared goal';
  const pageTitle = goalName ? `Join “${goalName}” in Kwilt` : 'Join a shared goal in Kwilt';
  const description =
    'Tap to open the invite in Kwilt. By default you share signals only (check-ins + cheers); activity titles stay private unless you choose to share them.';
  // Prefer the goal's own image when provided. Must be a publicly reachable URL.
  const imageUrl = args.goalImageUrl?.trim() ? args.goalImageUrl.trim() : null;

  const safeOgTitle = escapeHtml(ogTitle);
  const safePageTitle = escapeHtml(pageTitle);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(args.canonicalUrl);
  const safeImage = imageUrl ? escapeHtml(imageUrl) : null;
  const safeKwiltUrl = escapeHtml(args.kwiltUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safePageTitle}</title>
    <meta name="description" content="${safeDescription}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Kwilt" />
    <meta property="og:title" content="${safeOgTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeCanonical}" />
    ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
    ${safeImage ? `<meta property="og:image:alt" content="${safeOgTitle}" />` : ''}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeOgTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}

    ${safeImage ? `<link rel="icon" href="${safeImage}" />` : ''}
    ${safeImage ? `<link rel="apple-touch-icon" href="${safeImage}" />` : ''}
  </head>
  <body style="font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #111;">
    <h1 style="font-size: 20px; margin: 0 0 8px 0;">${safePageTitle}</h1>
    <p style="margin: 0 0 16px 0; color: #444; line-height: 1.35;">${safeDescription}</p>
    <p style="margin: 0 0 16px 0;">
      <a href="${safeKwiltUrl}" style="display:inline-block; padding: 12px 14px; background:#1F5226; color:#fff; text-decoration:none; border-radius: 10px;">
        Open in Kwilt
      </a>
    </p>
    <p style="margin: 0; color:#666; font-size: 13px;">Invite code: <code>${escapeHtml(args.code)}</code></p>
    <script>
      // Best-effort handoff for browsers that didn't trigger Universal Links/App Links.
      // Keep delay small so humans rarely see this page when everything is configured correctly.
      setTimeout(function () { window.location.href = ${JSON.stringify(args.kwiltUrl)}; }, 50);
    </script>
  </body>
</html>`;
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

  // Default: return HTML with OG metadata (for share sheet previews) + best-effort app handoff.
  // If the invite link is being served behind a universal-link host (e.g. go.kwilt.app/i/<code>),
  // this HTML is what iOS will fetch to build the preview card.
  const admin = getSupabaseAdmin();
  let goalTitle: string | null = null;
  let goalImageUrl: string | null = null;
  if (admin) {
    try {
      const { data } = await admin
        .from('kwilt_invites')
        .select('payload')
        .eq('code', code)
        .maybeSingle();
      const payload = (data as any)?.payload ?? null;
      goalTitle = typeof payload?.goalTitle === 'string' ? payload.goalTitle.trim() : null;
      // Optional: allow payload to carry a public image URL for rich preview cards.
      const rawImage = typeof payload?.goalImageUrl === 'string' ? payload.goalImageUrl.trim() : '';
      if (rawImage) {
        try {
          const u = new URL(rawImage);
          if (u.protocol === 'https:' || u.protocol === 'http:') {
            goalImageUrl = u.toString();
          }
        } catch {
          // ignore
        }
      }
    } catch {
      goalTitle = null;
    }
  }

  const canonicalUrl = url.toString();
  const html = buildInviteHtml({ code, kwiltUrl, canonicalUrl, goalTitle, goalImageUrl });
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      // Some Supabase deployments may coerce this, but we still provide the right intent.
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
});


