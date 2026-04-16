// Email unsubscribe endpoint (Supabase Edge Function).
//
// Phase 7.1 of docs/email-system-ga-plan.md.
//
// Routes:
//   POST /unsubscribe                       (RFC 8058 one-click)
//     Form body: "List-Unsubscribe=One-Click"
//     URL query: ?t=<hmac-token>
//     → flips the preference off, returns 200 with an empty body.
//     Invoked directly by Gmail / Yahoo / Apple Mail when the user clicks
//     the inbox-native unsubscribe button.
//
//   POST /unsubscribe                       (browser confirmation path)
//     JSON body: { token: string, action: 'unsubscribe' | 'resubscribe' }
//     → flips the preference, returns JSON with the updated category label.
//     Invoked by the kwilt-site /unsubscribe page after the user clicks
//     "Confirm".
//
//   GET /unsubscribe?t=<token>
//     → 302 redirect to the kwilt-site /unsubscribe page. This keeps email
//     link-scanners from prematurely unsubscribing users (scanners follow
//     GETs but don't replay POSTs with form bodies).
//
// Why the `List-Unsubscribe` header URL points here instead of kwilt-site:
// Gmail / Yahoo POST the one-click form body with no CSRF — we need to
// receive it with service-role DB access (to flip the preference for a
// user who isn't logged in). That's exactly what an edge function is for.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  getSupabaseAdmin,
  json,
  corsHeaders,
} from '../_shared/calendarUtils.ts';
import {
  categoryLabel,
  decodeUnsubscribeToken,
  type EmailPreferenceCategory,
} from '../_shared/emailUnsubscribe.ts';

type Action = 'unsubscribe' | 'resubscribe';

async function applyPreferenceUpdate(params: {
  userId: string;
  category: EmailPreferenceCategory;
  action: Action;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'admin_unavailable' };

  const enabled = params.action === 'resubscribe';
  const nowIso = new Date().toISOString();

  // Upsert so a user who's never written the row before still gets a
  // properly-initialized entry with the one category toggled. The defaults
  // for all OTHER columns are `true` (per the migration), so a fresh upsert
  // leaves the other categories opted-in.
  const { error } = await admin.from('kwilt_email_preferences').upsert(
    {
      user_id: params.userId,
      [params.category]: enabled,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function handleOneClickPost(req: Request, token: string): Promise<Response> {
  // RFC 8058 defines the form body as exactly `List-Unsubscribe=One-Click`.
  // We accept the header being present; the body is a defensive check only.
  let bodyText = '';
  try {
    bodyText = await req.text();
  } catch {
    /* ignore — some clients may send empty body */
  }
  // Gmail / Yahoo's implementations sometimes send the content type as
  // application/x-www-form-urlencoded or text/plain. Don't be picky.
  if (bodyText.trim() && !/List-Unsubscribe\s*=\s*One-Click/i.test(bodyText)) {
    return json(400, { error: { message: 'Unexpected body', code: 'bad_request' } });
  }

  const decoded = await decodeUnsubscribeToken(token);
  if (!decoded) {
    return json(400, { error: { message: 'Invalid token', code: 'bad_token' } });
  }

  const update = await applyPreferenceUpdate({
    userId: decoded.uid,
    category: decoded.cat,
    action: 'unsubscribe',
  });
  if (!update.ok) {
    return json(503, {
      error: { message: 'Unable to update preferences', code: 'provider_unavailable' },
    });
  }

  // RFC 8058: response SHOULD be 200; body is not rendered to any user.
  return new Response('OK', {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
  });
}

async function handleConfirmedPost(req: Request): Promise<Response> {
  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { message: 'Invalid JSON', code: 'bad_request' } });
  }
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const actionRaw = typeof body?.action === 'string' ? body.action.trim() : 'unsubscribe';
  const action: Action = actionRaw === 'resubscribe' ? 'resubscribe' : 'unsubscribe';

  if (!token) {
    return json(400, { error: { message: 'Missing token', code: 'bad_request' } });
  }
  const decoded = await decodeUnsubscribeToken(token);
  if (!decoded) {
    return json(400, { error: { message: 'Invalid token', code: 'bad_token' } });
  }

  const update = await applyPreferenceUpdate({
    userId: decoded.uid,
    category: decoded.cat,
    action,
  });
  if (!update.ok) {
    return json(503, {
      error: { message: 'Unable to update preferences', code: 'provider_unavailable' },
    });
  }

  return json(200, {
    ok: true,
    action,
    category: decoded.cat,
    categoryLabel: categoryLabel(decoded.cat),
  });
}

function getKwiltSiteOrigin(): string {
  const env = (Deno.env.get('KWILT_EMAIL_UNSUBSCRIBE_BASE_URL') ?? '').trim();
  if (!env) return 'https://kwilt.app/unsubscribe';
  return env.replace(/\/+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('t') ?? url.searchParams.get('token') ?? '';

  if (req.method === 'GET') {
    // Browser-initiated click. Bounce to kwilt-site for the confirmation UI.
    // This keeps email link-scanners (which follow GETs but don't replay
    // form POSTs) from silently unsubscribing users.
    if (!token) {
      return json(400, { error: { message: 'Missing token', code: 'bad_request' } });
    }
    const target = `${getKwiltSiteOrigin()}?t=${encodeURIComponent(token)}`;
    return Response.redirect(target, 302);
  }

  if (req.method === 'POST') {
    const contentType = (req.headers.get('content-type') ?? '').toLowerCase();

    // RFC 8058 one-click: Gmail/Yahoo POST form data AND pass the token in
    // the URL. Detect this path by the presence of the URL token param + a
    // form-encoded body.
    if (
      token &&
      (contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('text/plain') ||
        // Some implementations send no content-type at all.
        contentType === '')
    ) {
      return await handleOneClickPost(req, token);
    }

    // Browser confirmation path: JSON body.
    if (contentType.includes('application/json')) {
      return await handleConfirmedPost(req);
    }

    return json(415, {
      error: { message: 'Unsupported content type', code: 'unsupported_media_type' },
    });
  }

  return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
});
