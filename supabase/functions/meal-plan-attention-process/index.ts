import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { sendMealPlanAttentionPush } from '../_shared/expoPush.ts';
import {
  processMealPlanAttention,
  type MealPlanAttentionPushJob,
  type MealPlanAttentionProcessor,
} from './processMealPlanAttention.ts';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

function processor(admin: SupabaseClient): MealPlanAttentionProcessor {
  return {
    async processDue() {
      const result = await admin.rpc('process_kwilt_meal_plan_attention', { p_limit: 50 });
      if (result.error) throw result.error;
      return typeof result.data === 'number' ? result.data : 0;
    },
    async claimPushJobs() {
      const result = await admin.rpc('claim_kwilt_meal_plan_attention_push_jobs', { p_limit: 100 });
      if (result.error) throw result.error;
      return (result.data ?? []).map((row: Record<string, unknown>): MealPlanAttentionPushJob => ({
        jobId: String(row.job_id ?? ''),
        planId: String(row.plan_id ?? ''),
        recipientUserId: String(row.recipient_user_id ?? ''),
        title: String(row.title ?? 'Meal Plan'),
        body: String(row.body ?? 'There are new meal ideas in Plan.'),
      })).filter((job: MealPlanAttentionPushJob) => job.jobId && job.planId && job.recipientUserId);
    },
    sendPush(job) {
      return sendMealPlanAttentionPush(
        admin,
        job.recipientUserId,
        job.planId,
        fetch,
        { title: job.title, body: job.body },
      );
    },
    async completePush(jobId, succeeded, error) {
      const result = await admin.rpc('complete_kwilt_meal_plan_attention_push_job', {
        p_job_id: jobId,
        p_succeeded: succeeded,
        p_error: error ?? null,
      });
      if (result.error) throw result.error;
    },
  };
}

serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json(405, { error: { code: 'method_not_allowed' } });
  }
  if ((request.headers.get('x-kwilt-cron') ?? '').trim() !== 'meal-plan-attention') {
    return json(401, { error: { code: 'unauthorized' } });
  }
  const admin = adminClient();
  if (!admin) return json(503, { error: { code: 'provider_unavailable' } });

  try {
    const result = await processMealPlanAttention(processor(admin));
    return json(200, result);
  } catch (error) {
    console.error('[meal-plan-attention-process] failed', error);
    return json(500, { error: { code: 'processing_failed' } });
  }
});
