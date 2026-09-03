import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendEmailViaResend } from '../_shared/emailSend.ts';
import { parseUgcReportRequest } from '../_shared/ugcSafety.ts';
import {
  resolveModerationEmail,
  submitUgcReport,
  chooseSafetyFollowup,
  UgcReportError,
  type ResolvedReportTarget,
  type UgcSafetyFollowup,
  type UgcReportRepository,
} from './report.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function adminClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bearerToken(request: Request): string | null {
  const match = /^bearer\s+(.+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
  return match?.[1]?.trim() || null;
}

async function resolveSafetyFollowup(
  admin: SupabaseClient,
  reporterUserId: string,
  reportedUserId: string,
): Promise<{ followup: UgcSafetyFollowup; relationshipBoundary: 'peer' | 'same_household' }> {
  const bindings = await admin.from('kwilt_person_auth_bindings').select('person_id,user_id')
    .in('user_id', [reporterUserId, reportedUserId]).eq('status', 'active');
  if (bindings.error) throw bindings.error;
  const reporterPersonId = bindings.data?.find((row) => row.user_id === reporterUserId)?.person_id;
  const reportedPersonId = bindings.data?.find((row) => row.user_id === reportedUserId)?.person_id;
  if (!reporterPersonId || !reportedPersonId) {
    return { followup: { kind: 'peer_block' }, relationshipBoundary: 'peer' };
  }
  const memberships = await admin.from('kwilt_household_memberships').select('household_id,person_id,role')
    .in('person_id', [reporterPersonId, reportedPersonId]).eq('status', 'active');
  if (memberships.error) throw memberships.error;
  const toBoundary = (row: { household_id: unknown; role: unknown }) => ({
    householdId: String(row.household_id),
    role: row.role as 'owner' | 'caregiver' | 'child',
  });
  return chooseSafetyFollowup(
    (memberships.data ?? []).filter((row) => row.person_id === reporterPersonId).map(toBoundary),
    (memberships.data ?? []).filter((row) => row.person_id === reportedPersonId).map(toBoundary),
  );
}

async function withSafetyFollowup(
  admin: SupabaseClient,
  reporterUserId: string,
  target: Omit<ResolvedReportTarget, 'followup'>,
): Promise<ResolvedReportTarget> {
  if (!target.reportedUserId) throw new Error('reported_user_required');
  const boundary = await resolveSafetyFollowup(admin, reporterUserId, target.reportedUserId);
  return {
    ...target,
    followup: boundary.followup,
    snapshot: { ...target.snapshot, relationshipBoundary: boundary.relationshipBoundary },
  };
}

async function resolveUserContext(
  admin: SupabaseClient,
  reporterUserId: string,
  reportedUserId: string,
): Promise<ResolvedReportTarget | null> {
  if (reporterUserId === reportedUserId) return null;
  const [friendship, follows, sharedMembership] = await Promise.all([
    admin.from('kwilt_friendships').select('id, status')
      .or(`and(user_a.eq.${reporterUserId},user_b.eq.${reportedUserId}),and(user_a.eq.${reportedUserId},user_b.eq.${reporterUserId})`)
      .in('status', ['pending', 'active', 'blocked']).limit(1).maybeSingle(),
    admin.from('kwilt_follows').select('id')
      .or(`and(follower_id.eq.${reporterUserId},followed_id.eq.${reportedUserId}),and(follower_id.eq.${reportedUserId},followed_id.eq.${reporterUserId})`)
      .limit(1).maybeSingle(),
    admin.from('kwilt_memberships').select('entity_id, user_id')
      .eq('status', 'active').in('user_id', [reporterUserId, reportedUserId]),
  ]);
  const memberships = sharedMembership.data ?? [];
  const reporterEntities = new Set(memberships.filter((row) => row.user_id === reporterUserId).map((row) => String(row.entity_id)));
  const shareEntity = memberships.some((row) => row.user_id === reportedUserId && reporterEntities.has(String(row.entity_id)));
  if (!friendship.data && !follows.data && !shareEntity) return null;
  const profile = await admin.from('profiles').select('display_name').eq('id', reportedUserId).maybeSingle();
  return withSafetyFollowup(admin, reporterUserId, {
    reportedUserId,
    reportedPersonId: null,
    snapshot: {
      targetKind: 'user',
      displayName: typeof profile.data?.display_name === 'string' ? profile.data.display_name : null,
      relationship: friendship.data ? 'friendship' : follows.data ? 'follow' : 'shared_membership',
    },
  });
}

function repository(admin: SupabaseClient): UgcReportRepository {
  return {
    async resolveTarget(reporterUserId, targetKind, targetId) {
      if (targetKind === 'user') return resolveUserContext(admin, reporterUserId, targetId);

      if (targetKind === 'household_member') {
        const targetMembership = await admin.from('kwilt_household_memberships')
          .select('id, household_id, person_id, role, status')
          .eq('id', targetId).eq('status', 'active').maybeSingle();
        if (targetMembership.error || !targetMembership.data) return null;
        const reporterBinding = await admin.from('kwilt_person_auth_bindings')
          .select('person_id').eq('user_id', reporterUserId).eq('status', 'active').maybeSingle();
        if (reporterBinding.error || !reporterBinding.data?.person_id) return null;
        const reporterMembership = await admin.from('kwilt_household_memberships')
          .select('id, role').eq('household_id', targetMembership.data.household_id)
          .eq('person_id', reporterBinding.data.person_id).eq('status', 'active').maybeSingle();
        if (reporterMembership.error || !reporterMembership.data
          || reporterMembership.data.id === targetMembership.data.id) return null;
        const [targetBinding, person] = await Promise.all([
          admin.from('kwilt_person_auth_bindings').select('user_id')
            .eq('person_id', targetMembership.data.person_id).eq('status', 'active').maybeSingle(),
          admin.from('kwilt_people').select('display_name, kind')
            .eq('id', targetMembership.data.person_id).maybeSingle(),
        ]);
        if (targetBinding.error || person.error || !person.data) return null;
        const reporterRole = reporterMembership.data.role as 'owner' | 'caregiver' | 'child';
        return {
          reportedUserId: targetBinding.data?.user_id ? String(targetBinding.data.user_id) : null,
          reportedPersonId: String(targetMembership.data.person_id),
          snapshot: {
            relationshipBoundary: 'same_household',
            householdId: targetMembership.data.household_id,
            membershipId: targetMembership.data.id,
            displayName: person.data.display_name,
            personKind: person.data.kind,
            reportedRole: targetMembership.data.role,
            reporterRole,
          },
          followup: reporterRole === 'child'
            ? { kind: 'household_help', reporterRole: 'child' }
            : { kind: 'manage_household', reporterRole },
        };
      }

      if (targetKind === 'meal_reaction') {
        const reaction = await admin.from('kwilt_meal_candidate_reactions')
          .select('id, candidate_id, person_id, reaction, reason, created_at')
          .eq('id', targetId).maybeSingle();
        if (reaction.error || !reaction.data?.reason) return null;
        const candidate = await admin.from('kwilt_meal_plan_candidates')
          .select('id, plan_id, title').eq('id', reaction.data.candidate_id).maybeSingle();
        if (candidate.error || !candidate.data) return null;
        const plan = await admin.from('kwilt_meal_plans')
          .select('id, household_id').eq('id', candidate.data.plan_id).maybeSingle();
        if (plan.error || !plan.data?.household_id) return null;
        const reporterBinding = await admin.from('kwilt_person_auth_bindings')
          .select('person_id').eq('user_id', reporterUserId).eq('status', 'active').maybeSingle();
        if (reporterBinding.error || !reporterBinding.data?.person_id
          || reporterBinding.data.person_id === reaction.data.person_id) return null;
        const reporterMembership = await admin.from('kwilt_household_memberships')
          .select('role').eq('household_id', plan.data.household_id)
          .eq('person_id', reporterBinding.data.person_id).eq('status', 'active').maybeSingle();
        if (reporterMembership.error || !reporterMembership.data) return null;
        const [reportedMembership, reportedBinding, person] = await Promise.all([
          admin.from('kwilt_household_memberships').select('role').eq('household_id', plan.data.household_id)
            .eq('person_id', reaction.data.person_id).eq('status', 'active').maybeSingle(),
          admin.from('kwilt_person_auth_bindings').select('user_id').eq('person_id', reaction.data.person_id)
            .eq('status', 'active').maybeSingle(),
          admin.from('kwilt_people').select('display_name, kind').eq('id', reaction.data.person_id).maybeSingle(),
        ]);
        if (reportedMembership.error || !reportedMembership.data || reportedBinding.error || person.error || !person.data) return null;
        const reporterRole = reporterMembership.data.role as 'owner' | 'caregiver' | 'child';
        return {
          reportedUserId: reportedBinding.data?.user_id ? String(reportedBinding.data.user_id) : null,
          reportedPersonId: String(reaction.data.person_id),
          snapshot: {
            relationshipBoundary: 'same_household', householdId: plan.data.household_id,
            planId: plan.data.id, candidateId: candidate.data.id, mealTitle: candidate.data.title,
            reaction: reaction.data.reaction, reason: reaction.data.reason, createdAt: reaction.data.created_at,
            displayName: person.data.display_name, personKind: person.data.kind,
            reportedRole: reportedMembership.data.role, reporterRole,
          },
          followup: reporterRole === 'child'
            ? { kind: 'household_help', reporterRole: 'child' }
            : { kind: 'manage_household', reporterRole },
        };
      }

      if (targetKind === 'guest_meal_feedback') {
        const response = await admin.from('kwilt_guest_meal_feedback_responses')
          .select('id, invite_id, display_name, selected_candidate_ids, passed, suggestion, created_at, updated_at')
          .eq('id', targetId).maybeSingle();
        if (response.error || !response.data?.suggestion) return null;
        const invite = await admin.from('kwilt_guest_meal_feedback_invites')
          .select('id, plan_id, state').eq('id', response.data.invite_id).maybeSingle();
        if (invite.error || !invite.data) return null;
        const plan = await admin.from('kwilt_meal_plans').select('id, household_id')
          .eq('id', invite.data.plan_id).maybeSingle();
        if (plan.error || !plan.data?.household_id) return null;
        const reporterBinding = await admin.from('kwilt_person_auth_bindings').select('person_id')
          .eq('user_id', reporterUserId).eq('status', 'active').maybeSingle();
        if (reporterBinding.error || !reporterBinding.data?.person_id) return null;
        const reporterMembership = await admin.from('kwilt_household_memberships').select('role')
          .eq('household_id', plan.data.household_id).eq('person_id', reporterBinding.data.person_id)
          .eq('status', 'active').maybeSingle();
        if (reporterMembership.error || !reporterMembership.data
          || !['owner', 'caregiver'].includes(String(reporterMembership.data.role))) return null;
        return {
          reportedUserId: null,
          reportedPersonId: null,
          snapshot: {
            relationshipBoundary: 'guest_invite', householdId: plan.data.household_id,
            planId: plan.data.id, inviteId: invite.data.id, inviteState: invite.data.state,
            displayName: response.data.display_name, suggestion: response.data.suggestion,
            selectedCandidateIds: response.data.selected_candidate_ids, passed: response.data.passed,
            createdAt: response.data.created_at, updatedAt: response.data.updated_at,
          },
          followup: { kind: 'guest_scope' },
        };
      }

      if (targetKind === 'shared_delivery') {
        const result = await admin.from('kwilt_shared_deliveries')
          .select('id, recipient_user_id, actor_user_id, event_kind, source_capability, source_entity_type, source_entity_id, actor_display_name, title, body, created_at')
          .eq('id', targetId).eq('recipient_user_id', reporterUserId).maybeSingle();
        if (result.error || !result.data?.actor_user_id) return null;
        return withSafetyFollowup(admin, reporterUserId, {
          reportedUserId: String(result.data.actor_user_id),
          reportedPersonId: null,
          snapshot: {
            eventKind: result.data.event_kind,
            sourceCapability: result.data.source_capability,
            sourceEntityType: result.data.source_entity_type,
            sourceEntityId: result.data.source_entity_id,
            actorDisplayName: result.data.actor_display_name,
            title: result.data.title,
            body: result.data.body,
            createdAt: result.data.created_at,
          },
        });
      }

      const event = await admin.from('kwilt_feed_events')
        .select('id, entity_type, entity_id, actor_id, type, payload, created_at')
        .eq('id', targetId).eq('entity_type', 'goal').maybeSingle();
      if (event.error || !event.data?.actor_id) return null;
      const membership = await admin.from('kwilt_memberships').select('id')
        .eq('entity_type', 'goal').eq('entity_id', event.data.entity_id)
        .eq('user_id', reporterUserId).eq('status', 'active').maybeSingle();
      if (!membership.data) return null;
      let payload = event.data.payload;
      if (event.data.type === 'checkin_submitted' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const checkinId = (payload as Record<string, unknown>).checkinId;
        if (typeof checkinId === 'string') {
          const checkin = await admin.from('goal_checkins').select('preset, text')
            .eq('id', checkinId).eq('goal_id', event.data.entity_id).maybeSingle();
          payload = { ...(payload as Record<string, unknown>), checkin: checkin.data ?? null };
        }
      }
      return withSafetyFollowup(admin, reporterUserId, {
        reportedUserId: String(event.data.actor_id),
        reportedPersonId: null,
        snapshot: {
          entityType: event.data.entity_type,
          entityId: event.data.entity_id,
          type: event.data.type,
          payload,
          createdAt: event.data.created_at,
        },
      });
    },

    async insert(row) {
      const result = await admin.from('kwilt_ugc_reports').insert(row).select('id').single();
      if (result.error || !result.data?.id) throw result.error ?? new Error('report_insert_failed');
      return { id: String(result.data.id) };
    },

    async alert(row) {
      const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
      const to = resolveModerationEmail(Deno.env.get('UGC_MODERATION_EMAIL'));
      if (!resendKey) return;
      const from = (Deno.env.get('INVITE_EMAIL_FROM') ?? 'no-reply@mail.kwilt.app').trim();
      const subject = `[${row.priority.toUpperCase()}] Kwilt UGC report ${row.id}`;
      const text = [
        'A new contextual UGC report is ready for review.',
        `Report: ${row.id}`,
        `Reason: ${row.reason}`,
        `Priority: ${row.priority}`,
        `Response due: ${row.response_due_at}`,
        'Open the private moderation queue in Supabase. Reporter details and content are intentionally omitted from email.',
      ].join('\n');
      await sendEmailViaResend({
        resendKey,
        from,
        to,
        subject,
        text,
        html: `<p>A new contextual UGC report is ready for review.</p><p><strong>Report:</strong> ${row.id}</p><p><strong>Reason:</strong> ${row.reason}</p><p><strong>Priority:</strong> ${row.priority}</p><p><strong>Response due:</strong> ${row.response_due_at}</p><p>Open the private moderation queue in Supabase. Reporter details and content are intentionally omitted from email.</p>`,
        campaign: 'ugc_moderation',
        idempotencyKey: `ugc-report:${row.id}`,
      });
    },
  };
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: { code: 'method_not_allowed' } });
  const admin = adminClient();
  if (!admin) return json(503, { error: { code: 'provider_unavailable' } });
  const token = bearerToken(request);
  if (!token) return json(401, { error: { code: 'unauthorized' } });
  const userResult = await admin.auth.getUser(token);
  const user = userResult.data?.user;
  if (userResult.error || !user?.id || user.is_anonymous === true) {
    return json(401, { error: { code: 'unauthorized' } });
  }
  try {
    const parsed = parseUgcReportRequest(await request.json().catch(() => null));
    const receipt = await submitUgcReport(user.id, parsed, repository(admin));
    return json(200, receipt);
  } catch (error) {
    if (error instanceof UgcReportError) return json(404, { error: { code: error.code } });
    if (error instanceof Error && error.message === 'invalid_request') {
      return json(400, { error: { code: 'invalid_request' } });
    }
    console.error('[ugc-report] intake failed', error);
    return json(500, { error: { code: 'report_failed' } });
  }
});
