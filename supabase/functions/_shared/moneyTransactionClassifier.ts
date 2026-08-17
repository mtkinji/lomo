export const MONEY_TRANSACTION_CLASSIFIER_POLICY_VERSION = 'money-category-v2';
export const MONEY_TRANSACTION_CLASSIFIER_LIMIT = 25;

export type MoneyClassifierRole = 'protected_spending' | 'flexible_spending' | 'not_spending' | 'unresolved';
export type MoneyTransactionClassification = {
  transactionId: string;
  categoryId: string | null;
  economicRole: MoneyClassifierRole;
  confidence: 'high' | 'medium' | 'low';
  evidenceKeys: Array<'merchant' | 'provider_primary' | 'provider_detailed'>;
};

export type MoneyClassifierInput = {
  transactions: Array<{
    id: string;
    merchant: string;
    providerPrimary: string | null;
    providerDetailed: string | null;
  }>;
  categories: Array<{
    id: string;
    name: string;
    economicRole: Extract<MoneyClassifierRole, 'protected_spending' | 'flexible_spending'>;
  }>;
};

export function buildMoneyTransactionClassifierRequest(input: MoneyClassifierInput) {
  const bounded = {
    transactions: input.transactions.slice(0, MONEY_TRANSACTION_CLASSIFIER_LIMIT).map((row) => ({
      id: row.id,
      merchant: normalizeText(row.merchant),
      provider_primary: normalizeOptional(row.providerPrimary),
      provider_detailed: normalizeOptional(row.providerDetailed),
    })),
    categories: input.categories.map((row) => ({ id: row.id, name: normalizeText(row.name), economic_role: row.economicRole })),
  };
  return {
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'Choose only from the supplied category ids and their supplied economic roles. Do not create a category, merchant rule, split, amount, or outside-plan decision. Return unresolved when the supplied evidence does not support one allowed choice.',
      },
      { role: 'user', content: JSON.stringify(bounded) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'money_transaction_classifications',
        strict: true,
        schema: {
          type: 'object', additionalProperties: false, required: ['classifications'],
          properties: {
            classifications: {
              type: 'array', maxItems: MONEY_TRANSACTION_CLASSIFIER_LIMIT,
              items: {
                type: 'object', additionalProperties: false,
                required: ['transactionId', 'categoryId', 'economicRole', 'confidence', 'evidenceKeys'],
                properties: {
                  transactionId: { type: 'string' },
                  categoryId: { type: ['string', 'null'] },
                  economicRole: { type: 'string', enum: ['protected_spending', 'flexible_spending', 'not_spending', 'unresolved'] },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                  evidenceKeys: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', enum: ['merchant', 'provider_primary', 'provider_detailed'] } },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function validateMoneyTransactionClassifications(
  value: unknown,
  input: MoneyClassifierInput,
): MoneyTransactionClassification[] {
  if (!isRecord(value) || !Array.isArray(value.classifications)) throw new Error('Classifier response is malformed.');
  const transactionById = new Map(input.transactions.slice(0, MONEY_TRANSACTION_CLASSIFIER_LIMIT).map((row) => [row.id, row]));
  const categoryById = new Map(input.categories.map((row) => [row.id, row]));
  const seen = new Set<string>();
  return value.classifications.map((candidate): MoneyTransactionClassification => {
    if (!isRecord(candidate)) throw new Error('Classifier result is malformed.');
    const transactionId = stringValue(candidate.transactionId);
    if (!transactionById.has(transactionId) || seen.has(transactionId)) throw new Error('Classifier returned an unknown or duplicate transaction.');
    seen.add(transactionId);
    const categoryId = candidate.categoryId === null ? null : stringValue(candidate.categoryId);
    const role = candidate.economicRole;
    const confidence = candidate.confidence;
    const evidenceKeys = candidate.evidenceKeys;
    if (!['protected_spending', 'flexible_spending', 'not_spending', 'unresolved'].includes(String(role))) throw new Error('Classifier returned an invalid role.');
    if (!['high', 'medium', 'low'].includes(String(confidence))) throw new Error('Classifier returned invalid confidence.');
    if (!Array.isArray(evidenceKeys) || evidenceKeys.length === 0 || evidenceKeys.some((key) => !['merchant', 'provider_primary', 'provider_detailed'].includes(String(key)))) {
      throw new Error('Classifier returned invalid evidence.');
    }
    const category = categoryId ? categoryById.get(categoryId) : null;
    if (categoryId && !category) throw new Error('Classifier returned an unknown category.');
    if (category && category.economicRole !== role) throw new Error('Classifier category and role do not match.');
    if (!category && (role === 'protected_spending' || role === 'flexible_spending')) throw new Error('Classifier role requires a category.');
    if (category && (role === 'not_spending' || role === 'unresolved')) throw new Error('Classifier unresolved result cannot assign a category.');
    return { transactionId, categoryId, economicRole: role as MoneyClassifierRole, confidence: confidence as MoneyTransactionClassification['confidence'], evidenceKeys: evidenceKeys as MoneyTransactionClassification['evidenceKeys'] };
  });
}

function normalizeText(value: string): string { return value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); }
function normalizeOptional(value: string | null): string | null { return value ? normalizeText(value) || null : null; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function stringValue(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new Error('Classifier identifier is invalid.'); return value; }
