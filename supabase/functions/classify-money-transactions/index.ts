import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import {
  nextMoneyClassificationRetryIso,
  resolveDeterministicMoneyCategory,
  type DeterministicCategoryDecision,
} from '../_shared/moneyTransactionCategorization.ts';
import {
  buildMoneyTransactionClassifierRequest,
  MONEY_TRANSACTION_CLASSIFIER_LIMIT,
  MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
  validateMoneyTransactionClassifications,
} from '../_shared/moneyTransactionClassifier.ts';
import { isMoneyClassifierCandidate } from './classificationPolicy.ts';

const CANDIDATE_SCAN_LIMIT = 100;
const HISTORY_SCAN_LIMIT = 1000;
type AuthenticatedSupabase = Awaited<ReturnType<typeof getAuthenticatedUser>>['supabase'];

type CandidateRow = {
  id: string;
  name: string;
  merchant_name: string | null;
  original_description: string | null;
  pending: boolean;
  direction: string;
  budget_id: string | null;
  budget_match_source: string | null;
  budget_assignment_source: string | null;
  budget_assignment_governed: boolean;
  money_meaning: string | null;
  personal_finance_category_primary: string | null;
  personal_finance_category_detailed: string | null;
  personal_finance_category_confidence: string | null;
  classification_attempt_count: number;
};

type CategoryRow = {
  id: string;
  legacy_budget_id: string | null;
  slug: string;
  name: string;
  mapping_tags: string[] | null;
};

type HistoryRow = {
  merchant_name: string | null;
  name: string;
  original_description: string | null;
  budget_id: string;
  pending: boolean;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const nowIso = new Date().toISOString();

    const { error: foundationError } = await supabase.rpc('reconcile_governed_household_money_foundation', {
      p_user_id: user.id,
    });
    if (foundationError) throw foundationError;

    const { data: transactionRows, error: transactionError } = await supabase
      .from('budget_transactions')
      .select('id,name,merchant_name,original_description,pending,direction,budget_id,budget_match_source,budget_assignment_source,budget_assignment_governed,money_meaning,personal_finance_category_primary,personal_finance_category_detailed,personal_finance_category_confidence,classification_attempt_count')
      .eq('user_id', user.id)
      .eq('direction', 'outflow')
      .is('budget_id', null)
      .is('budget_match_source', null)
      .is('budget_assignment_source', null)
      .eq('budget_assignment_governed', false)
      .or(`classification_policy_version.is.null,classification_policy_version.neq.${MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION},classification_next_retry_at.is.null,classification_next_retry_at.lte.${nowIso}`)
      .order('classification_attempt_count', { ascending: true })
      .order('classification_attempted_at', { ascending: true, nullsFirst: true })
      .order('date', { ascending: false })
      .order('id', { ascending: true })
      .limit(CANDIDATE_SCAN_LIMIT);
    if (transactionError) throw transactionError;

    const ids = (transactionRows ?? []).map((row) => row.id);
    const allocationResult = ids.length
      ? await supabase.from('budget_transaction_allocations').select('transaction_id').in('transaction_id', ids)
      : { data: [], error: null };
    if (allocationResult.error) throw allocationResult.error;
    const allocatedIds = new Set((allocationResult.data ?? []).map((row) => row.transaction_id));
    const candidates = ((transactionRows ?? []) as CandidateRow[]).filter((row) =>
      isMoneyClassifierCandidate({ ...row, hasAllocation: allocatedIds.has(row.id) })
    );
    if (candidates.length === 0) return Response.json(emptyReceipt(), { headers: corsHeaders });

    const [categoryResult, pointerResult, historyResult] = await Promise.all([
      supabase.from('budget_categories').select('id,legacy_budget_id,slug,name,mapping_tags').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('budget_active_living_plans').select('plan_version_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('budget_transactions')
        .select('merchant_name,name,original_description,budget_id,pending')
        .eq('user_id', user.id)
        .eq('direction', 'outflow')
        .eq('pending', false)
        .not('budget_id', 'is', null)
        .order('date', { ascending: false })
        .limit(HISTORY_SCAN_LIMIT),
    ]);
    if (categoryResult.error || pointerResult.error || historyResult.error) {
      throw categoryResult.error ?? pointerResult.error ?? historyResult.error;
    }
    const categories = (categoryResult.data ?? []) as CategoryRow[];
    const categoryByAlias = new Map<string, CategoryRow>();
    categories.forEach((category) => {
      [category.id, category.slug, category.legacy_budget_id].filter(Boolean).forEach((alias) => categoryByAlias.set(alias!, category));
    });
    const history = ((historyResult.data ?? []) as HistoryRow[]).flatMap((row) => {
      const category = categoryByAlias.get(row.budget_id);
      return category ? [{ merchant: merchantFor(row), categoryId: category.id, pending: row.pending }] : [];
    });
    const deterministicCategories = categories.map((category) => ({
      id: category.id,
      aliases: [category.id, category.slug, category.legacy_budget_id ?? '', category.name],
      mappingTags: category.mapping_tags ?? [],
    }));

    let deterministicAssignedCount = 0;
    const unresolvedCandidates: CandidateRow[] = [];
    for (const candidate of candidates) {
      const decision = resolveDeterministicMoneyCategory({
        candidate: {
          merchant: merchantFor(candidate),
          providerPrimary: candidate.personal_finance_category_primary,
          providerDetailed: candidate.personal_finance_category_detailed,
          providerConfidence: candidate.personal_finance_category_confidence,
        },
        categories: deterministicCategories,
        history,
      });
      if (decision.outcome === 'assigned') {
        deterministicAssignedCount += await assignCandidate(supabase, user.id, candidate, decision, nowIso);
      } else {
        unresolvedCandidates.push(candidate);
      }
    }

    const componentResult = pointerResult.data?.plan_version_id
      ? await supabase.from('budget_living_plan_components').select('category_id,fixed_cents,override_cents').eq('plan_version_id', pointerResult.data.plan_version_id)
      : { data: [], error: null };
    if (componentResult.error) throw componentResult.error;
    const componentByAlias = new Map((componentResult.data ?? []).map((row) => [row.category_id, row]));
    const allowedCategories = categories.flatMap((category) => {
      const component = [category.id, category.legacy_budget_id, category.slug]
        .filter(Boolean)
        .map((key) => componentByAlias.get(key!))
        .find(Boolean);
      if (!component) return [];
      return [{
        id: category.id,
        name: category.name,
        economicRole: component.fixed_cents > 0 || component.override_cents > 0
          ? 'protected_spending' as const
          : 'flexible_spending' as const,
      }];
    });
    const aiCandidates = unresolvedCandidates.slice(0, MONEY_TRANSACTION_CLASSIFIER_LIMIT);
    const deferredCandidates = unresolvedCandidates.slice(MONEY_TRANSACTION_CLASSIFIER_LIMIT);
    let aiAssignedCount = 0;
    let unresolvedCount = 0;
    let retryableCount = 0;

    if (aiCandidates.length > 0 && allowedCategories.length > 0) {
      const classifierInput = {
        transactions: aiCandidates.map((row) => ({
          id: row.id,
          merchant: merchantFor(row),
          providerPrimary: row.personal_finance_category_primary,
          providerDetailed: row.personal_finance_category_detailed,
        })),
        categories: allowedCategories,
      };
      try {
        const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
        if (!openAiKey) throw new Error('Classifier is not configured.');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildMoneyTransactionClassifierRequest(classifierInput)),
        });
        if (!response.ok) throw new Error('Classifier request failed.');
        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        const classifications = validateMoneyTransactionClassifications(JSON.parse(content), classifierInput);
        const classificationById = new Map(classifications.map((row) => [row.transactionId, row]));
        for (const candidate of aiCandidates) {
          const result = classificationById.get(candidate.id);
          if (result?.confidence === 'high' && result.categoryId
            && (result.economicRole === 'protected_spending' || result.economicRole === 'flexible_spending')) {
            aiAssignedCount += await assignCandidate(supabase, user.id, candidate, {
              outcome: 'assigned', categoryId: result.categoryId, source: 'ai_classifier', confidence: 'high', reasonCode: 'ai_supported_evidence',
            }, nowIso);
          } else {
            unresolvedCount += await markAttempt(supabase, user.id, candidate, 'unresolved', nowIso);
          }
        }
      } catch {
        for (const candidate of aiCandidates) {
          retryableCount += await markAttempt(supabase, user.id, candidate, 'retryable_failure', nowIso);
        }
      }
    } else {
      for (const candidate of aiCandidates) {
        unresolvedCount += await markAttempt(supabase, user.id, candidate, 'unresolved', nowIso);
      }
    }
    for (const candidate of deferredCandidates) {
      retryableCount += await markAttempt(supabase, user.id, candidate, 'retryable_failure', nowIso);
    }

    const consideredCount = deterministicAssignedCount + aiAssignedCount + unresolvedCount + retryableCount;
    return Response.json({
      policyVersion: MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
      consideredCount,
      assignedCount: deterministicAssignedCount + aiAssignedCount,
      deterministicAssignedCount,
      aiAssignedCount,
      unresolvedCount,
      retryableCount,
    }, { headers: corsHeaders });
  } catch (error) {
    const status = isAuthenticationError(error) ? 401 : 500;
    return Response.json({ error: status === 401 ? 'Unauthorized' : 'Classification unavailable' }, { status, headers: corsHeaders });
  }
});

function emptyReceipt() {
  return {
    policyVersion: MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
    consideredCount: 0,
    assignedCount: 0,
    deterministicAssignedCount: 0,
    aiAssignedCount: 0,
    unresolvedCount: 0,
    retryableCount: 0,
  };
}

function merchantFor(row: { merchant_name: string | null; name: string; original_description: string | null }): string {
  return row.merchant_name || row.name || row.original_description || 'unknown';
}

async function assignCandidate(
  supabase: AuthenticatedSupabase,
  userId: string,
  candidate: CandidateRow,
  decision: DeterministicCategoryDecision | {
    outcome: 'assigned'; categoryId: string; source: 'ai_classifier'; confidence: 'high'; reasonCode: 'ai_supported_evidence';
  },
  nowIso: string,
): Promise<number> {
  if (decision.outcome !== 'assigned') return 0;
  const reason = decision.reasonCode === 'high_confidence_provider_mapping'
    ? 'Supported by high-confidence provider category evidence.'
    : decision.reasonCode === 'consistent_household_history'
      ? 'Supported by consistent reviewed household merchant history.'
      : 'Supported by bounded merchant and provider category evidence.';
  const { data, error } = await supabase.rpc('apply_money_transaction_classification_attempt', {
    p_user_id: userId,
    p_transaction_id: candidate.id,
    p_expected_attempt_count: candidate.classification_attempt_count,
    p_outcome: 'assigned',
    p_category_id: decision.categoryId,
    p_assignment_source: decision.source,
    p_assignment_reason: reason,
    p_policy_version: MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
    p_attempted_at: nowIso,
    p_next_retry_at: null,
  });
  if (error) throw error;
  return data === true ? 1 : 0;
}

async function markAttempt(
  supabase: AuthenticatedSupabase,
  userId: string,
  candidate: CandidateRow,
  outcome: 'unresolved' | 'retryable_failure',
  nowIso: string,
): Promise<number> {
  const nextAttemptCount = candidate.classification_attempt_count + 1;
  const { data, error } = await supabase.rpc('apply_money_transaction_classification_attempt', {
    p_user_id: userId,
    p_transaction_id: candidate.id,
    p_expected_attempt_count: candidate.classification_attempt_count,
    p_outcome: outcome,
    p_category_id: null,
    p_assignment_source: null,
    p_assignment_reason: null,
    p_policy_version: MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
    p_attempted_at: nowIso,
    p_next_retry_at: nextMoneyClassificationRetryIso(nowIso, nextAttemptCount, outcome),
  });
  if (error) throw error;
  return data === true ? 1 : 0;
}
