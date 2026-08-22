import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';

export function resolveMealPlanPushEnabled(preferences: {
  notificationsEnabled: boolean;
  allowHouseholdMealPlanPush?: boolean;
}): boolean {
  return preferences.notificationsEnabled && preferences.allowHouseholdMealPlanPush !== false;
}

export function createMealPlanAttentionRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getAttentionStatus(): Promise<{ needsAttention: boolean; planId: string | null }> {
      const { data, error } = await client.rpc('get_kwilt_meal_plan_attention_status');
      if (error) throw new Error(error.message || 'Unable to load Meal Plan attention.');
      const row = Array.isArray(data) ? data[0] : data;
      const planId = typeof row?.plan_id === 'string' && row.plan_id.trim()
        ? row.plan_id.trim()
        : null;
      return {
        needsAttention: row?.needs_attention === true,
        planId,
      };
    },

    async markPlanViewed(planId: string): Promise<void> {
      const { error } = await client.rpc('mark_kwilt_meal_plan_viewed', {
        p_plan_id: planId,
      });
      if (error) throw new Error(error.message || 'Unable to record the Plan view.');
    },

    async getPushEnabled(): Promise<boolean> {
      const { data, error } = await client.rpc('get_kwilt_meal_plan_push_enabled');
      if (error) throw new Error(error.message || 'Unable to load the meal planning notification preference.');
      return data !== false;
    },

    async setPushEnabled(enabled: boolean): Promise<void> {
      const { error } = await client.rpc('set_kwilt_meal_plan_push_enabled', {
        p_enabled: enabled,
      });
      if (error) throw new Error(error.message || 'Unable to save the meal planning notification preference.');
    },
  };
}
