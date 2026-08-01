import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import {
  buildMoneyTransactionClassifierRequest,
  MONEY_TRANSACTION_CLASSIFIER_LIMIT,
  MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
  validateMoneyTransactionClassifications,
} from '../_shared/moneyTransactionClassifier.ts';
import { isMoneyClassifierCandidate } from './classificationPolicy.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const { data: transactionRows, error: transactionError } = await supabase
      .from('budget_transactions')
      .select('id,name,merchant_name,original_description,pending,direction,budget_id,budget_match_source,budget_assignment_source,budget_assignment_governed,money_meaning,personal_finance_category_primary,personal_finance_category_detailed')
      .eq('user_id', user.id)
      .eq('direction', 'outflow')
      .eq('pending', false)
      .is('budget_id', null)
      .is('budget_match_source', null)
      .is('budget_assignment_source', null)
      .eq('budget_assignment_governed', false)
      .limit(MONEY_TRANSACTION_CLASSIFIER_LIMIT);
    if (transactionError) throw transactionError;
    const ids = (transactionRows ?? []).map((row) => row.id);
    const allocationResult = ids.length
      ? await supabase.from('budget_transaction_allocations').select('transaction_id').in('transaction_id', ids)
      : { data: [], error: null };
    if (allocationResult.error) throw allocationResult.error;
    const allocatedIds = new Set((allocationResult.data ?? []).map((row) => row.transaction_id));
    const candidates = (transactionRows ?? []).filter((row) => isMoneyClassifierCandidate({ ...row, hasAllocation: allocatedIds.has(row.id) }));
    if (candidates.length === 0) return Response.json({ consideredCount: 0, assignedCount: 0, unresolvedCount: 0 }, { headers: corsHeaders });

    const [{ data: categories, error: categoriesError }, { data: pointer, error: pointerError }] = await Promise.all([
      supabase.from('budget_categories').select('id,legacy_budget_id,slug,name').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('budget_active_living_plans').select('plan_version_id').eq('user_id', user.id).maybeSingle(),
    ]);
    if (categoriesError || pointerError) throw categoriesError ?? pointerError;
    const componentResult = pointer?.plan_version_id
      ? await supabase.from('budget_living_plan_components').select('category_id,fixed_cents,override_cents').eq('plan_version_id', pointer.plan_version_id)
      : { data: [], error: null };
    if (componentResult.error) throw componentResult.error;
    const componentByAlias = new Map((componentResult.data ?? []).map((row) => [row.category_id, row]));
    const classifierInput = {
      transactions: candidates.map((row) => ({
        id: row.id,
        merchant: row.merchant_name || row.name || row.original_description || 'unknown',
        providerPrimary: row.personal_finance_category_primary,
        providerDetailed: row.personal_finance_category_detailed,
      })),
      categories: (categories ?? []).flatMap((category) => {
        const component = [category.id, category.legacy_budget_id, category.slug].filter(Boolean).map((key) => componentByAlias.get(key)).find(Boolean);
        if (!component) return [];
        return [{ id: category.id, name: category.name, economicRole: component.fixed_cents > 0 || component.override_cents > 0 ? 'protected_spending' as const : 'flexible_spending' as const }];
      }),
    };
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
    let assignedCount = 0;
    for (const result of classifications) {
      if (result.confidence !== 'high' || !result.categoryId || (result.economicRole !== 'protected_spending' && result.economicRole !== 'flexible_spending')) continue;
      const { data, error } = await supabase.from('budget_transactions').update({
        budget_id: result.categoryId,
        budget_assignment_source: 'ai_classifier',
        budget_assignment_policy_version: MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION,
        budget_assignment_governed: false,
        budget_assignment_confidence: result.confidence,
        budget_assignment_reason: 'Supported by merchant and provider category evidence.',
      }).eq('user_id', user.id).eq('id', result.transactionId).is('budget_id', null).is('budget_match_source', null).is('budget_assignment_source', null).eq('budget_assignment_governed', false).select('id');
      if (error) throw error;
      assignedCount += data?.length ?? 0;
    }
    return Response.json({ consideredCount: candidates.length, assignedCount, unresolvedCount: candidates.length - assignedCount }, { headers: corsHeaders });
  } catch (error) {
    const status = isAuthenticationError(error) ? 401 : 500;
    return Response.json({ error: status === 401 ? 'Unauthorized' : 'Classification unavailable' }, { status, headers: corsHeaders });
  }
});
