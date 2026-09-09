import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.78.0';

export type GovernedMoneyReconciliation = {
  createdCategoryCount: number;
  assignedTransactionCount: number;
  outcome: 'created_governed_foundation' | 'reconciled_governed_foundation';
};

export async function reconcileGovernedMoney(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<GovernedMoneyReconciliation> {
  const userId = params.userId.trim();
  if (!userId) throw new Error('A permanent user is required for governed Money reconciliation.');

  const { data: userData, error: userError } = await params.supabase.auth.admin.getUserById(userId);
  const user = userData?.user;
  if (userError || !user || user.is_anonymous === true) {
    throw new Error('A permanent user is required for governed Money reconciliation.');
  }

  const { data, error } = await params.supabase.rpc(
    'reconcile_governed_household_money_foundation',
    { p_user_id: userId },
  );

  if (error) throw new Error(`Unable to reconcile governed Money: ${error.message}`);
  if (!data || typeof data !== 'object') {
    throw new Error('Unable to reconcile governed Money: the database returned no receipt.');
  }
  return data as GovernedMoneyReconciliation;
}
