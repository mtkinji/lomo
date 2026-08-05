import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { sendSharedDeliveryPush } from '../_shared/expoPush.ts';
import {
  insertSharedDelivery,
  sharedHomeRecipientEnabled,
} from '../_shared/sharedHomeDelivery.ts';
import {
  publishGoalCheckin,
  PublishGoalCheckinError,
  type GoalCheckinPublisherRepository,
} from './publishGoalCheckin.ts';

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
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(request: Request): string | null {
  const match = /^bearer\s+(.+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
  return match?.[1]?.trim() || null;
}

function publisherRepository(admin: SupabaseClient): GoalCheckinPublisherRepository {
  return {
    async getCheckin(checkinId) {
      const result = await admin
        .from('goal_checkins')
        .select('id, goal_id, user_id, preset, text')
        .eq('id', checkinId)
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return null;
      return {
        id: String(result.data.id),
        goalId: String(result.data.goal_id),
        userId: String(result.data.user_id),
        preset: typeof result.data.preset === 'string' ? result.data.preset : null,
        text: typeof result.data.text === 'string' ? result.data.text : null,
      };
    },

    async isActiveGoalMember(goalId, userId) {
      const result = await admin
        .from('kwilt_memberships')
        .select('id')
        .eq('entity_type', 'goal')
        .eq('entity_id', goalId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (result.error) throw result.error;
      return Boolean(result.data?.id);
    },

    async listActiveGoalMemberIds(goalId) {
      const result = await admin
        .from('kwilt_memberships')
        .select('user_id')
        .eq('entity_type', 'goal')
        .eq('entity_id', goalId)
        .eq('status', 'active');
      if (result.error) throw result.error;
      return (result.data ?? [])
        .map((row: { user_id?: unknown }) => typeof row.user_id === 'string' ? row.user_id : '')
        .filter(Boolean);
    },

    async getActorDisplayName(userId) {
      const result = await admin
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      if (result.error) return null;
      return typeof result.data?.display_name === 'string' ? result.data.display_name : null;
    },

    async getGoalTitle(goalId) {
      const result = await admin
        .from('kwilt_invites')
        .select('payload')
        .eq('entity_type', 'goal')
        .eq('entity_id', goalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (result.error) return null;
      const payload = result.data?.payload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
      const title = (payload as Record<string, unknown>).goalTitle;
      return typeof title === 'string' ? title : null;
    },

    insert: (row) => insertSharedDelivery(admin, row),
    push: (recipientUserId, deliveryId) => sendSharedDeliveryPush(admin, recipientUserId, deliveryId),
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
  const callerUserId = userResult.data?.user?.id;
  if (userResult.error || !callerUserId) {
    return json(401, { error: { code: 'unauthorized' } });
  }

  const body = await request.json().catch(() => null);
  const checkinId = typeof body?.checkinId === 'string' ? body.checkinId.trim() : '';
  if (!checkinId || checkinId.length > 240) {
    return json(400, { error: { code: 'invalid_checkin_id' } });
  }

  try {
    const result = await publishGoalCheckin(
      { callerUserId, checkinId },
      publisherRepository(admin),
      (recipientUserId) => sharedHomeRecipientEnabled(recipientUserId),
    );
    return json(200, result);
  } catch (error) {
    if (error instanceof PublishGoalCheckinError) {
      const status = error.code === 'checkin_not_found' ? 404 : 403;
      return json(status, { error: { code: error.code } });
    }
    console.error('[shared-home-publish-goal-checkin] publish failed', error);
    return json(500, { error: { code: 'publish_failed' } });
  }
});
