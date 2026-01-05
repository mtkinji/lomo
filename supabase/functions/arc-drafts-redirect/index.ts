// ArcDraft redirect endpoint (public)
//
// Routes:
// - GET /arc-drafts-redirect/c/<draftId>?token=<token>      -> HTML + best-effort app handoff
// - GET /arc-drafts-redirect/c/<draftId>?token=<token>&exp=<exp_url> -> 302 -> <exp_url> (Expo Go)
//
// This is analogous to invite-redirect: it enables share-sheet previews (OG metadata)
// and provides a fallback page when the app is not installed.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
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

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildArcDraftHtml(args: { kwiltUrl: string; canonicalUrl: string; draftId: string }): string {
  const ogTitle = 'Create your Arc in Kwilt';
  const description =
    'Tap to open your Arc draft in Kwilt and continue with goal creation.';

  const safeOgTitle = escapeHtml(ogTitle);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(args.canonicalUrl);
  const safeKwiltUrl = escapeHtml(args.kwiltUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeOgTitle}</title>
    <meta name="description" content="${safeDescription}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Kwilt" />
    <meta property="og:title" content="${safeOgTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeCanonical}" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${safeOgTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
  </head>
  <body style="font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #111;">
    <h1 style="font-size: 20px; margin: 0 0 8px 0;">${safeOgTitle}</h1>
    <p style="margin: 0 0 16px 0; color: #444; line-height: 1.35;">${safeDescription}</p>
    <p style="margin: 0 0 16px 0;">
      <a href="${safeKwiltUrl}" style="display:inline-block; padding: 12px 14px; background:#1F5226; color:#fff; text-decoration:none; border-radius: 10px;">
        Open in Kwilt
      </a>
    </p>
    <p style="margin: 0; color:#666; font-size: 13px;">Draft id: <code>${escapeHtml(args.draftId)}</code></p>
    <script>
      // Best-effort handoff for browsers that didn't trigger Universal Links/App Links.
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
  // Expect .../arc-drafts-redirect/c/<draftId>
  const cIdx = parts.lastIndexOf('c');
  const draftId = cIdx >= 0 ? (parts[cIdx + 1] ?? '').trim() : '';
  const token = (url.searchParams.get('token') ?? '').trim();
  if (!draftId || !token) {
    return new Response('Missing draftId/token', { status: 400, headers: corsHeaders });
  }

  const expUrl = (url.searchParams.get('exp') ?? '').trim();
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

  const kwiltUrl = `kwilt://arc-draft?draftId=${encodeURIComponent(draftId)}&token=${encodeURIComponent(token)}`;
  const canonicalUrl = url.toString();
  const html = buildArcDraftHtml({ kwiltUrl, canonicalUrl, draftId });
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
});


