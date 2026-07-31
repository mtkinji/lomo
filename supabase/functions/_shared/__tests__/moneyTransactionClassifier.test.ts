import { buildMoneyTransactionClassifierRequest, validateMoneyTransactionClassifications } from '../moneyTransactionClassifier.ts';

const input = {
  transactions: [{ id: 't1', merchant: 'Costco #123', providerPrimary: 'GENERAL_MERCHANDISE', providerDetailed: null }],
  categories: [
    { id: 'home', name: 'Home', economicRole: 'protected_spending' as const },
    { id: 'food', name: 'Food', economicRole: 'flexible_spending' as const },
  ],
};

Deno.test('classifier request contains only bounded permitted evidence and strict output', () => {
  const request = buildMoneyTransactionClassifierRequest(input);
  const body = JSON.stringify(request);
  if (!body.includes('Do not create a category')) throw new Error('missing bounded instruction');
  if (!body.includes('additionalProperties') || !body.includes('maxItems')) throw new Error('missing strict schema');
  if (/amount|balance|institution|household|date/i.test(request.messages[1].content)) throw new Error('financial context leaked');
});

Deno.test('classifier validation accepts only supplied category-role pairs', () => {
  const valid = validateMoneyTransactionClassifications({ classifications: [{
    transactionId: 't1', categoryId: 'food', economicRole: 'flexible_spending', confidence: 'high', evidenceKeys: ['merchant'],
  }] }, input);
  if (valid[0]?.categoryId !== 'food') throw new Error('valid assignment rejected');
  const invalid = [
    { transactionId: 'other', categoryId: 'food', economicRole: 'flexible_spending', confidence: 'high', evidenceKeys: ['merchant'] },
    { transactionId: 't1', categoryId: 'new', economicRole: 'flexible_spending', confidence: 'high', evidenceKeys: ['merchant'] },
    { transactionId: 't1', categoryId: 'food', economicRole: 'protected_spending', confidence: 'high', evidenceKeys: ['merchant'] },
    { transactionId: 't1', categoryId: null, economicRole: 'outside_plan', confidence: 'high', evidenceKeys: ['merchant'] },
    { transactionId: 't1', categoryId: 'food', economicRole: 'flexible_spending', confidence: 'certain', evidenceKeys: ['merchant'] },
    { transactionId: 't1', categoryId: 'food', economicRole: 'flexible_spending', confidence: 'high', evidenceKeys: [] },
  ];
  for (const row of invalid) {
    let rejected = false;
    try { validateMoneyTransactionClassifications({ classifications: [row] }, input); } catch { rejected = true; }
    if (!rejected) throw new Error(`invalid result accepted: ${JSON.stringify(row)}`);
  }
});
