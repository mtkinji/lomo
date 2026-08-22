import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createMealPlanAttentionRepository,
  resolveMealPlanPushEnabled,
} from './mealPlanAttentionRepository';

describe('mealPlanAttentionRepository', () => {
  it('never enables server push when the app-level notification switch is off', () => {
    expect(resolveMealPlanPushEnabled({ notificationsEnabled: false, allowHouseholdMealPlanPush: true })).toBe(false);
    expect(resolveMealPlanPushEnabled({ notificationsEnabled: true, allowHouseholdMealPlanPush: true })).toBe(true);
    expect(resolveMealPlanPushEnabled({ notificationsEnabled: true, allowHouseholdMealPlanPush: false })).toBe(false);
  });

  it('records a live Plan view through the closed RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const repository = createMealPlanAttentionRepository({ rpc } as unknown as SupabaseClient);

    await repository.markPlanViewed('plan-1');

    expect(rpc).toHaveBeenCalledWith('mark_kwilt_meal_plan_viewed', { p_plan_id: 'plan-1' });
  });

  it('reads the current recipient-owned attention destination', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ needs_attention: true, plan_id: 'plan-1' }],
      error: null,
    });
    const repository = createMealPlanAttentionRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.getAttentionStatus()).resolves.toEqual({
      needsAttention: true,
      planId: 'plan-1',
    });
    expect(rpc).toHaveBeenCalledWith('get_kwilt_meal_plan_attention_status');
  });

  it('reads and writes the server-owned push preference', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const repository = createMealPlanAttentionRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.getPushEnabled()).resolves.toBe(false);
    await repository.setPushEnabled(true);

    expect(rpc).toHaveBeenNthCalledWith(1, 'get_kwilt_meal_plan_push_enabled');
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_kwilt_meal_plan_push_enabled', { p_enabled: true });
  });
});
