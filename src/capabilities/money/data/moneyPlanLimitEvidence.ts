import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveLivingPlan } from './livingPlanRepository';

export type MoneyPlanLimitEvidence = {
  resourceBasisKind: 'user_set' | 'detected_income' | 'prior_supported_basis' | 'unknown';
  resourceBasisUpdatedAtIso: string | null;
};

type PlanningIncomeSourceRow = {
  confidence: string | null;
  planning_role: string | null;
  expected_monthly_cents: number | null;
  updated_at: string | null;
};

export async function getMoneyPlanLimitEvidence(
  client: SupabaseClient,
  active: ActiveLivingPlan,
): Promise<MoneyPlanLimitEvidence> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in to view your Money plan.');

  const [overrideResult, sourcesResult] = await Promise.all([
    client
      .from('budget_planning_basis_overrides')
      .select('monthly_basis_cents,updated_at')
      .eq('user_id', authData.user.id)
      .eq('active', true)
      .maybeSingle(),
    client
      .from('budget_planning_income_sources')
      .select('confidence,planning_role,expected_monthly_cents,updated_at')
      .eq('user_id', authData.user.id)
      .eq('active', true),
  ]);

  if (isMissingOptionalTable(overrideResult.error) || isMissingOptionalTable(sourcesResult.error)) {
    return retainedActiveBasis(active);
  }
  if (overrideResult.error) throw overrideResult.error;
  if (sourcesResult.error) throw sourcesResult.error;

  const override = overrideResult.data as { monthly_basis_cents: number; updated_at: string | null } | null;
  if (override && Number(override.monthly_basis_cents) === active.resourceBasisCents) {
    return { resourceBasisKind: 'user_set', resourceBasisUpdatedAtIso: override.updated_at };
  }

  const supportedSources = ((sourcesResult.data ?? []) as PlanningIncomeSourceRow[]).filter((source) => (
    source.confidence === 'high'
    && (source.planning_role === 'recurring_planning_income' || source.planning_role === 'irregular_planning_income')
  ));
  const detectedBasisCents = supportedSources.reduce(
    (sum, source) => sum + validCents(source.expected_monthly_cents),
    0,
  );
  if (supportedSources.length > 0 && detectedBasisCents === active.resourceBasisCents) {
    return {
      resourceBasisKind: 'detected_income',
      resourceBasisUpdatedAtIso: latestIso(supportedSources.map((source) => source.updated_at)),
    };
  }
  return retainedActiveBasis(active);
}

function isMissingOptionalTable(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (
    error.code === 'PGRST205'
    || error.code === '42P01'
    || error.message?.includes('budget_planning_basis_overrides')
    || error.message?.includes('budget_planning_income_sources')
  ));
}

function unknownEvidence(): MoneyPlanLimitEvidence {
  return { resourceBasisKind: 'unknown', resourceBasisUpdatedAtIso: null };
}

function retainedActiveBasis(active: ActiveLivingPlan): MoneyPlanLimitEvidence {
  return active.resourceBasisCents > 0
    ? { resourceBasisKind: 'prior_supported_basis', resourceBasisUpdatedAtIso: null }
    : unknownEvidence();
}

function latestIso(values: Array<string | null>): string | null {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function validCents(value: number | null): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;
}
