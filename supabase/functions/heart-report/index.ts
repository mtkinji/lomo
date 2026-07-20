// Weekly founder-facing Google HEART report for Kwilt.
//
// Intended usage:
// - Scheduled GET from Supabase Cron with `x-kwilt-cron: weekly`.
// - Manual/dry-run GET or POST with `x-kwilt-cron: manual`.
//
// The report deliberately excludes Andrew's accounts, identities linked to
// those devices, and automated @kwilt.app test accounts. It is an internal,
// transactional founder report sent through the existing Resend plumbing.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type User } from 'npm:@supabase/supabase-js@2';
import { sendEmailViaResend } from '../_shared/emailSend.ts';
import {
  buildHeartReport,
  renderHeartReportHtml,
  renderHeartReportText,
  resolveHeartReportExclusions,
  type HeartReportMetrics,
} from '../_shared/heartReport.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const DEFAULT_FOUNDER_EMAILS = ['mtkinji@gmail.com', 'andy@kwilt.app'];
const DEFAULT_RECIPIENT = 'mtkinji@gmail.com';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-cron',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

function configuredFounderEmails(): string[] {
  const configured = (Deno.env.get('KWILT_HEART_REPORT_EXCLUDED_EMAILS') ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_FOUNDER_EMAILS;
}

function reportEnabled(): boolean {
  const raw = (Deno.env.get('KWILT_HEART_REPORT_ENABLED') ?? '').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

function hasCronMarker(req: Request): boolean {
  const marker = (req.headers.get('x-kwilt-cron') ?? '').trim().toLowerCase();
  return marker === 'weekly' || marker === 'manual';
}

async function listAllUsers(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }
  if (!hasCronMarker(req)) {
    return json(401, { error: { message: 'Missing cron marker', code: 'unauthorized' } });
  }
  if (!reportEnabled()) {
    return json(200, { ok: true, skipped: true, reason: 'disabled' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Supabase not configured', code: 'provider_unavailable' } });
  }

  const requestUrl = new URL(req.url);
  const dryRun = requestUrl.searchParams.get('dry_run') === '1';
  const asOfRaw = (requestUrl.searchParams.get('as_of') ?? '').trim();
  const asOf = asOfRaw && !Number.isNaN(Date.parse(asOfRaw)) ? new Date(asOfRaw) : new Date();

  try {
    const [users, identitiesResult] = await Promise.all([
      listAllUsers(admin),
      admin.from('kwilt_install_identities').select('user_id,install_id'),
    ]);
    if (identitiesResult.error) throw identitiesResult.error;

    const identities = (identitiesResult.data ?? []).map((identity: Record<string, unknown>) => ({
      userId: typeof identity.user_id === 'string' ? identity.user_id : null,
      installId: typeof identity.install_id === 'string' ? identity.install_id : '',
    })).filter((identity) => identity.installId.length > 0);
    const founderEmails = configuredFounderEmails();
    const exclusions = resolveHeartReportExclusions({
      users: users.map((user) => ({ id: user.id, email: user.email ?? null })),
      identities,
      founderEmails,
    });

    const { data: metricData, error: metricError } = await admin.rpc('kwilt_heart_report', {
      p_excluded_user_ids: exclusions.userIds,
      p_excluded_install_ids: exclusions.installIds,
      p_as_of: asOf.toISOString(),
    });
    if (metricError) throw metricError;

    const metrics = metricData as HeartReportMetrics;
    const report = buildHeartReport(metrics);
    const text = renderHeartReportText(report);
    const html = renderHeartReportHtml(report);

    if (dryRun) {
      return json(200, {
        ok: true,
        dryRun: true,
        report: report as unknown as JsonValue,
        text,
      });
    }

    const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
    const from = (Deno.env.get('KWILT_HEART_REPORT_EMAIL_FROM') ?? '').trim() ||
      (Deno.env.get('KWILT_DRIP_EMAIL_FROM') ?? '').trim() ||
      (Deno.env.get('INVITE_EMAIL_FROM') ?? '').trim() ||
      'hello@mail.kwilt.app';
    const recipient = (Deno.env.get('KWILT_HEART_REPORT_RECIPIENT') ?? DEFAULT_RECIPIENT).trim().toLowerCase();
    if (!resendKey || !from || !recipient) {
      return json(503, { error: { message: 'Email delivery not configured', code: 'provider_unavailable' } });
    }

    const recipientUser = users.find((user) => (user.email ?? '').trim().toLowerCase() === recipient);
    if (!recipientUser) {
      return json(503, { error: { message: 'Report recipient account not found', code: 'provider_unavailable' } });
    }

    const reportDate = asOf.toISOString().slice(0, 10);
    const messageKey = `heart_report_${reportDate}`;
    const { data: priorSend } = await admin
      .from('kwilt_email_cadence')
      .select('id')
      .eq('user_id', recipientUser.id)
      .eq('message_key', messageKey)
      .maybeSingle();
    if (priorSend) {
      return json(200, { ok: true, skipped: true, reason: 'already_sent', reportDate });
    }

    const outcome = await sendEmailViaResend({
      resendKey,
      from,
      to: recipient,
      subject: `Kwilt HEART — ${report.overall.headline}`,
      text,
      html,
      campaign: 'heart_report',
      idempotencyKey: `heart-report/${reportDate}`,
      extraTags: [{ name: 'kind', value: 'heart_report' }],
    });
    if (!outcome.ok) {
      return json(503, {
        error: { message: 'Unable to send HEART report', code: outcome.reason },
      });
    }

    const { error: ledgerError } = await admin.from('kwilt_email_cadence').insert({
      user_id: recipientUser.id,
      message_key: messageKey,
      metadata: {
        resend_id: outcome.resendId,
        campaign: 'heart_report',
        overall_status: report.overall.status,
        excluded_accounts: metrics.excludedAccounts,
        excluded_installs: metrics.excludedInstalls,
      },
    });
    if (ledgerError) console.warn('[heart-report] sent but unable to write cadence ledger', ledgerError.message);

    return json(200, {
      ok: true,
      sent: true,
      reportDate,
      overallStatus: report.overall.status,
      resendId: outcome.resendId,
    });
  } catch (error) {
    console.error('[heart-report] failed', error);
    return json(503, {
      error: {
        message: 'Unable to build HEART report',
        code: 'provider_unavailable',
        ...(dryRun ? { detail: error instanceof Error ? error.message : JSON.stringify(error) } : {}),
      },
    });
  }
});
