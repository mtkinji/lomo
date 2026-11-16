import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCategorySettingsRequest, parseCategorySettingsResult, UNKNOWN_CATEGORY_SAVE, type CategorySettingsRequest, type CategorySettingsReceipt, type CategorySettingsOutcome } from '../domain/categorySettingsCommand';

export type CategorySettingsRemote = {
  send: (request: CategorySettingsRequest) => Promise<CategorySettingsOutcome>;
  findReceipt: (request: CategorySettingsRequest) => Promise<CategorySettingsReceipt | Extract<CategorySettingsOutcome, { outcome: 'rejected' }> | null>;
};

export function createCategorySettingsRepository(client: SupabaseClient): CategorySettingsRemote & {
  findOperation(actorUserId: string, requestId: string): Promise<{ request: CategorySettingsRequest; result: CategorySettingsOutcome } | null>;
} {
  const checkActor = async (request: Pick<CategorySettingsRequest, 'actorUserId'>) => {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== request.actorUserId || data.user.is_anonymous) {
      throw new Error('Sign in to the account that started this save before checking it again.');
    }
  };
  return {
    async findOperation(actorUserId, requestId) {
      await checkActor({ actorUserId });
      const { data, error } = await client.rpc('get_budget_category_settings_receipt', { p_expected_actor_user_id: actorUserId, p_request_id: requestId });
      if (error) throw error;
      if (data === null) return null;
      const request = parseCategorySettingsRequest(data?.request);
      if (request.actorUserId !== actorUserId || request.requestId !== requestId) throw new Error('The saved request did not match this operation.');
      return { request, result: parseCategorySettingsResult(data, request) };
    },
    async send(request) {
      try {
        await checkActor(request);
        const { data, error } = await client.rpc('save_budget_category_settings', {
          p_expected_actor_user_id: request.actorUserId, p_request_id: request.requestId, p_category_id: request.categoryId,
          p_expected_category_updated_at: request.expectedCategoryUpdatedAt,
          p_expected_plan_updated_at: request.expectedPlanUpdatedAt,
          p_settings: request.settings, p_governance: request.governance,
        });
        if (error) {
          const code = error.code ?? '';
          if (/^(22|23|40)/.test(code) || ['42501', 'P0001', 'P0002', 'PGRST202', 'PGRST204'].includes(code)) {
            const message = code === 'PGRST202' || code === 'PGRST204'
              ? 'Category settings are temporarily unavailable. Your changes have not been saved.'
              : code === '40001' || error.message.includes('active living plan changed')
                ? 'The category or Money plan changed since you reviewed it. Reopen settings and review your change.'
                : error.message || 'These settings could not be saved.';
            return { outcome: 'rejected', message };
          }
          return { outcome: 'unknown', message: UNKNOWN_CATEGORY_SAVE };
        }
        return parseCategorySettingsResult(data, request);
      } catch {
        // A missing/invalid response is not evidence that the transaction rolled back.
        return { outcome: 'unknown', message: UNKNOWN_CATEGORY_SAVE };
      }
    },
    async findReceipt(request) {
      await checkActor(request);
      const { data, error } = await client.rpc('get_budget_category_settings_receipt', { p_expected_actor_user_id: request.actorUserId, p_request_id: request.requestId });
      if (error) throw error;
      if (data === null) return null;
      const result = parseCategorySettingsResult(data, request);
      if (result.outcome === 'unknown') throw new Error(UNKNOWN_CATEGORY_SAVE);
      return result.outcome === 'confirmed' ? result.receipt : result;
    },
  };
}
