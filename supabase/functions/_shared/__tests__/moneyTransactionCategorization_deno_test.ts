import { nextMoneyClassificationRetryIso, resolveDeterministicMoneyCategory } from '../moneyTransactionCategorization.ts';

const shopping = {
  id: 'shopping',
  aliases: ['shopping', 'personal'],
  mappingTags: ['shopping', 'personal'],
};

const amazon = {
  merchant: 'AMZN Mktp US*ABC123',
  providerPrimary: 'GENERAL_MERCHANDISE',
  providerDetailed: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
  providerConfidence: 'HIGH',
};

Deno.test('high-confidence provider evidence assigns an active mapped category', () => {
  const result = resolveDeterministicMoneyCategory({
    candidate: amazon,
    categories: [shopping],
    history: [],
  });
  if (result.outcome !== 'assigned' || result.categoryId !== 'shopping' || result.source !== 'provider_policy') {
    throw new Error('high-confidence provider shopping evidence should assign Shopping');
  }
});

Deno.test('provider policy distinguishes household food and work spending', () => {
  const categories = [
    { id: 'groceries', aliases: [], mappingTags: ['food_at_home'] },
    { id: 'dining', aliases: [], mappingTags: ['food_away'] },
    { id: 'work', aliases: ['startup'], mappingTags: ['work_business'] },
  ];
  const cases = [
    ['FOOD_AND_DRINK_GROCERIES', 'groceries'],
    ['FOOD_AND_DRINK_RESTAURANT', 'dining'],
    ['GENERAL_SERVICES_BUSINESS_SERVICES', 'work'],
  ] as const;
  for (const [providerDetailed, expectedCategoryId] of cases) {
    const result = resolveDeterministicMoneyCategory({
      candidate: {
        merchant: providerDetailed,
        providerPrimary: providerDetailed.split('_').slice(0, 3).join('_'),
        providerDetailed,
        providerConfidence: 'HIGH',
      },
      categories,
      history: [],
    });
    if (result.outcome !== 'assigned' || result.categoryId !== expectedCategoryId) {
      throw new Error(`${providerDetailed} should assign ${expectedCategoryId}`);
    }
  }
});

Deno.test('consistent posted household history assigns a pending merchant when provider evidence is weak', () => {
  const result = resolveDeterministicMoneyCategory({
    candidate: { ...amazon, providerConfidence: 'MEDIUM', providerPrimary: null, providerDetailed: null },
    categories: [shopping],
    history: [
      { merchant: 'Amazon Marketplace', categoryId: 'shopping', pending: false },
      { merchant: 'AMAZON MARKETPLACE', categoryId: 'shopping', pending: false },
    ],
  });
  if (result.outcome !== 'assigned' || result.categoryId !== 'shopping' || result.source !== 'merchant_history') {
    throw new Error('consistent household history should assign Shopping');
  }
});

Deno.test('conflicting, pending-only, or inactive-category history stays unresolved', () => {
  const candidate = { ...amazon, providerConfidence: 'LOW', providerPrimary: null, providerDetailed: null };
  const cases = [
    [
      { merchant: 'Amazon', categoryId: 'shopping', pending: false },
      { merchant: 'Amazon', categoryId: 'gifts', pending: false },
    ],
    [
      { merchant: 'Amazon', categoryId: 'shopping', pending: true },
      { merchant: 'Amazon', categoryId: 'shopping', pending: true },
    ],
    [
      { merchant: 'Amazon', categoryId: 'inactive-category', pending: false },
      { merchant: 'Amazon', categoryId: 'inactive-category', pending: false },
    ],
  ];
  for (const history of cases) {
    const result = resolveDeterministicMoneyCategory({ candidate, categories: [shopping], history });
    if (result.outcome !== 'unresolved') throw new Error('ambiguous or inactive history must remain unresolved');
  }
});

Deno.test('one historical match is insufficient for automatic assignment', () => {
  const result = resolveDeterministicMoneyCategory({
    candidate: { ...amazon, providerConfidence: 'UNKNOWN', providerPrimary: null, providerDetailed: null },
    categories: [shopping],
    history: [{ merchant: 'Amazon', categoryId: 'shopping', pending: false }],
  });
  if (result.outcome !== 'unresolved') throw new Error('one historical match must remain unresolved');
});

Deno.test('classification retry uses bounded outcome-specific backoff', () => {
  const now = '2026-08-17T12:00:00.000Z';
  if (nextMoneyClassificationRetryIso(now, 1, 'retryable_failure') !== '2026-08-17T13:00:00.000Z') {
    throw new Error('first retryable failure should wait one hour');
  }
  if (nextMoneyClassificationRetryIso(now, 20, 'retryable_failure') !== '2026-08-18T12:00:00.000Z') {
    throw new Error('retryable failures should cap at one day');
  }
  if (nextMoneyClassificationRetryIso(now, 1, 'unresolved') !== '2026-08-24T12:00:00.000Z') {
    throw new Error('insufficient evidence should wait seven days');
  }
});
