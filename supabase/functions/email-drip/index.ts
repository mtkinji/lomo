// Email drip cadence evaluator (Supabase Edge Function)
//
// Day 0 + Day 1 welcome emails are handled by a Resend Automation
// (trigger: user.signup, with open-tracking re-engagement branch).
// This function handles Day 3 + Day 7 which need live Supabase data
// for personalization (streak length, completed activities).
//
// Routes:
// - GET  /email-drip -> evaluate all users (cron / scheduled invocation)
// - POST /email-drip -> evaluate a single user OR fire a signup event
//   Body: { userId?: string } — evaluate one user
//   Body: { action: "signup", email: string } — fire user.signup to Resend Automation
//
// Env:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
// - RESEND_API_KEY (required)
// - KWILT_DRIP_EMAIL_FROM (optional, default: hello@mail.kwilt.app)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getSupabaseAdmin, json } from '../_shared/calendarUtils.ts';
import {
  buildWelcomeDay3Email,
  buildWelcomeDay7Email,
  buildStreakWinback1Email,
  buildStreakWinback2Email,
} from '../_shared/emailTemplates.ts';
import { buildUnsubscribeHeaders } from '../_shared/emailUnsubscribe.ts';
import { sendEmailViaResend, isEmailSendingEnabled } from '../_shared/emailSend.ts';

type DripMessage = {
  key: string;
  /** UTM campaign name — mapped to preference category by `categoryForCampaign`. */
  campaign: 'welcome_day_3' | 'welcome_day_7';
  dayThreshold: number;
  build: (ctx: UserContext, unsubscribeUrl?: string) => { subject: string; text: string; html: string };
};

type UserContext = {
  userId: string;
  email: string;
  daysSinceSignup: number;
  streakLength: number;
  activitiesCompleted: number;
};

// Day 0 + Day 1 are managed by the Resend Automation "Kwilt Welcome Drip".
// Only Day 3 and Day 7 remain here because they need real-time Supabase data.
const DRIP_MESSAGES: DripMessage[] = [
  {
    key: 'welcome_day3',
    campaign: 'welcome_day_3',
    dayThreshold: 3,
    build: (ctx, unsubscribeUrl) =>
      buildWelcomeDay3Email({ streakLength: ctx.streakLength, unsubscribeUrl }),
  },
  {
    key: 'welcome_day7',
    campaign: 'welcome_day_7',
    dayThreshold: 7,
    build: (ctx, unsubscribeUrl) =>
      buildWelcomeDay7Email({
        streakLength: ctx.streakLength,
        activitiesCompleted: ctx.activitiesCompleted,
        unsubscribeUrl,
      }),
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json(200, { ok: true });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Service unavailable', code: 'provider_unavailable' } });
  }

  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const fromEmail = (Deno.env.get('KWILT_DRIP_EMAIL_FROM') ?? 'hello@mail.kwilt.app').trim();
  if (!resendKey) {
    return json(503, { error: { message: 'Email service unavailable', code: 'provider_unavailable' } });
  }

  // Phase 7.2 kill switch — reported here so cron operators can see in logs
  // that the run was a no-op without digging into per-send outcomes.
  if (!isEmailSendingEnabled()) {
    return json(200, { ok: true, skipped: true, reason: 'kill_switch' });
  }

  const isManual = req.method === 'POST';
  let targetUserId: string | null = null;
  let body: Record<string, unknown> | null = null;

  if (isManual) {
    body = await req.json().catch(() => null);

    // Fire signup event to Resend Automation (Day 0 + Day 1 drip)
    if (body?.action === 'signup' && typeof body?.email === 'string') {
      const email = (body.email as string).trim();
      if (!email) return json(400, { error: { message: 'Missing email', code: 'bad_request' } });
      try {
        const res = await fetch('https://api.resend.com/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event: 'user.signup', email }),
        });
        const resBody = await res.text();
        return json(res.ok ? 200 : 502, { ok: res.ok, detail: resBody });
      } catch (e) {
        return json(502, { ok: false, error: { message: String(e), code: 'resend_error' } });
      }
    }

    targetUserId = typeof body?.userId === 'string' ? body.userId.trim() : null;
  }

  // Fetch eligible users. For cron: all users created in the last 8 days.
  // For manual: just the target user.
  let usersQuery = admin
    .from('auth.users' as any)
    .select('id, email, created_at');

  // auth.users isn't directly queryable via PostgREST. Use an RPC or raw query.
  // Instead, query the admin auth API for user listing.
  const now = Date.now();
  const results: Array<{ userId: string; messageKey: string; ok: boolean; error?: string | null }> = [];

  // Use admin auth API to list users (paginated, max 1000 per page).
  // For cron runs, we only need users created in the last 8 days.
  const eightDaysAgoIso = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  let users: Array<{ id: string; email: string; created_at: string }> = [];

  if (targetUserId) {
    const { data } = await admin.auth.admin.getUserById(targetUserId);
    if (data?.user?.email) {
      users.push({
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at ?? new Date().toISOString(),
      });
    }
  } else {
    // Paginate through users; filter by created_at client-side.
    let page = 1;
    const perPage = 500;
    let hasMore = true;
    while (hasMore) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage });
      const batch = data?.users ?? [];
      for (const u of batch) {
        if (u.email && u.created_at && u.created_at >= eightDaysAgoIso) {
          users.push({ id: u.id, email: u.email, created_at: u.created_at });
        }
      }
      hasMore = batch.length === perPage;
      page += 1;
      if (page > 20) break; // safety cap
    }
  }

  for (const user of users) {
    const daysSinceSignup = Math.floor((now - Date.parse(user.created_at)) / (24 * 60 * 60 * 1000));

    // Check email preferences (opt-out)
    const { data: prefs } = await admin
      .from('kwilt_email_preferences')
      .select('welcome_drip')
      .eq('user_id', user.id)
      .maybeSingle();
    if (prefs && (prefs as any).welcome_drip === false) continue;

    // Check which messages have already been sent
    const { data: sentRows } = await admin
      .from('kwilt_email_cadence')
      .select('message_key')
      .eq('user_id', user.id);
    const sentKeys = new Set((sentRows ?? []).map((r: any) => r.message_key));

    // Gather user context for template personalization
    let streakLength = 0;
    let activitiesCompleted = 0;
    try {
      const { data: milestones } = await admin
        .from('kwilt_user_milestones')
        .select('milestone_value')
        .eq('user_id', user.id)
        .eq('milestone_type', 'streak_7')
        .limit(1);
      if (milestones && milestones.length > 0) {
        streakLength = Math.max(7, Number((milestones[0] as any).milestone_value) || 0);
      }
    } catch { /* best effort */ }

    try {
      const { count } = await admin
        .from('kwilt_activities' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');
      activitiesCompleted = typeof count === 'number' ? count : 0;
    } catch { /* best effort */ }

    const ctx: UserContext = {
      userId: user.id,
      email: user.email,
      daysSinceSignup,
      streakLength,
      activitiesCompleted,
    };

    // Evaluate which drip message to send (at most one per run per user)
    for (const msg of DRIP_MESSAGES) {
      if (daysSinceSignup < msg.dayThreshold) continue;
      if (sentKeys.has(msg.key)) continue;

      // Phase 7.1: build unsubscribe headers + visible URL up front so we
      // can thread the URL into the template footer AND attach the headers
      // to the Resend request. `welcome_drip` is the preference category.
      const unsub = await buildUnsubscribeHeaders({
        userId: user.id,
        category: 'welcome_drip',
      });
      const content = msg.build(ctx, unsub?.visibleUrl);

      const outcome = await sendEmailViaResend({
        resendKey,
        from: fromEmail,
        to: user.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        campaign: msg.campaign,
        userId: user.id,
        admin,
        extraHeaders: unsub?.headers,
      });
      const sent = outcome.ok;

      if (sent) {
        await admin.from('kwilt_email_cadence').insert({
          user_id: user.id,
          message_key: msg.key,
          metadata: { days_since_signup: daysSinceSignup },
        });
      }

      results.push({
        userId: user.id,
        messageKey: msg.key,
        ok: sent,
        ...(sent ? null : { error: outcome.reason }),
      });
      break; // one message per user per run
    }
  }

  // ---------------------------------------------------------------------------
  // Win-back evaluation (streak-break / lapsed users)
  // Runs on both cron (GET) and manual POST with { action: "winback" }.
  // ---------------------------------------------------------------------------
  const runWinback = !isManual || body?.action === 'winback';
  const winbackResults: typeof results = [];

  if (runWinback) {
    // Find users who completed at least one activity but haven't been active recently.
    // "Last active" = most recent updated_at on a completed activity.
    const threeDaysAgoIso = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgoIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get users with completed activities (only those who were active in the last 30 days
    // but NOT in the last 3 days — these are the lapsed window).
    const { data: recentlyActive } = await admin
      .from('kwilt_activities' as any)
      .select('user_id, updated_at')
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgoIso)
      .order('updated_at', { ascending: false });

    // Group by user: find last activity date per user
    const lastActivityByUser = new Map<string, string>();
    for (const row of (recentlyActive ?? []) as any[]) {
      const uid = typeof row?.user_id === 'string' ? row.user_id : '';
      const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : '';
      if (!uid || !updatedAt) continue;
      if (!lastActivityByUser.has(uid)) {
        lastActivityByUser.set(uid, updatedAt);
      }
    }

    // Filter to lapsed users (last activity >= 3 days ago)
    const lapsedUserIds: string[] = [];
    const daysSinceLastActivityByUser = new Map<string, number>();
    for (const [uid, lastAt] of lastActivityByUser) {
      if (lastAt < threeDaysAgoIso) {
        lapsedUserIds.push(uid);
        daysSinceLastActivityByUser.set(uid, Math.floor((now - Date.parse(lastAt)) / (24 * 60 * 60 * 1000)));
      }
    }

    for (const userId of lapsedUserIds.slice(0, 200)) {
      // Check preferences
      const { data: prefs } = await admin
        .from('kwilt_email_preferences')
        .select('streak_winback')
        .eq('user_id', userId)
        .maybeSingle();
      if (prefs && (prefs as any).streak_winback === false) continue;

      // Get user email
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      // Check existing win-back cadence
      const { data: sentRows } = await admin
        .from('kwilt_email_cadence')
        .select('message_key, sent_at')
        .eq('user_id', userId)
        .like('message_key', 'streak_winback_%');
      const sentMap = new Map((sentRows ?? []).map((r: any) => [r.message_key, r.sent_at]));

      const lastActivity = lastActivityByUser.get(userId) ?? '';
      const wb1SentAt = sentMap.get('streak_winback_1') ?? null;
      const wb2SentAt = sentMap.get('streak_winback_2') ?? null;

      // If the user was active after the last win-back send, clear stale records
      // (allows a new win-back cycle on the next lapse).
      if (wb1SentAt && lastActivity > wb1SentAt) {
        await admin
          .from('kwilt_email_cadence')
          .delete()
          .eq('user_id', userId)
          .like('message_key', 'streak_winback_%');
        continue; // User returned — skip this cycle
      }

      // Cap: if both already sent for this lapse, skip
      if (wb1SentAt && wb2SentAt) continue;

      // Get streak data for personalization
      let streakLength = 0;
      try {
        const { data: milestones } = await admin
          .from('kwilt_user_milestones')
          .select('milestone_value')
          .eq('user_id', userId)
          .eq('milestone_type', 'streak_7')
          .limit(1);
        if (milestones && milestones.length > 0) {
          streakLength = Math.max(7, Number((milestones[0] as any).milestone_value) || 0);
        }
      } catch { /* best effort */ }

      const daysSinceLastActivity = daysSinceLastActivityByUser.get(userId) ?? 3;

      // Phase 7.1: build unsubscribe headers up front (streak_winback category).
      const unsub = await buildUnsubscribeHeaders({
        userId,
        category: 'streak_winback',
      });

      // Determine which message to send
      let messageKey: string | null = null;
      let campaign: 'winback_1' | 'winback_2' | null = null;
      let content: { subject: string; text: string; html: string } | null = null;

      if (!wb1SentAt && daysSinceLastActivity >= 3) {
        messageKey = 'streak_winback_1';
        campaign = 'winback_1';
        content = buildStreakWinback1Email({
          streakLength,
          unsubscribeUrl: unsub?.visibleUrl,
        });
      } else if (wb1SentAt && !wb2SentAt && daysSinceLastActivity >= 7) {
        messageKey = 'streak_winback_2';
        campaign = 'winback_2';
        content = buildStreakWinback2Email({
          streakLength,
          unsubscribeUrl: unsub?.visibleUrl,
        });
      }

      if (!messageKey || !content || !campaign) continue;

      const outcome = await sendEmailViaResend({
        resendKey,
        from: fromEmail,
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        campaign,
        userId,
        admin,
        extraHeaders: unsub?.headers,
      });
      const sent = outcome.ok;

      if (sent) {
        // Upsert (the unique constraint is on user_id + message_key)
        await admin.from('kwilt_email_cadence').upsert(
          {
            user_id: userId,
            message_key: messageKey,
            metadata: { days_since_last_activity: daysSinceLastActivity, streak_length: streakLength },
          },
          { onConflict: 'user_id,message_key' },
        );
      }

      winbackResults.push({ userId, messageKey, ok: sent });
    }
  }

  return json(200, {
    ok: true,
    mode: isManual ? 'manual' : 'scheduled',
    evaluated: users.length,
    sent: results.filter((r) => r.ok).length,
    results,
    winback: runWinback ? {
      evaluated: winbackResults.length,
      sent: winbackResults.filter((r) => r.ok).length,
      results: winbackResults,
    } : undefined,
  });
});
