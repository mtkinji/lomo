import { buildMerchantRuleUpsert, getPartialMerchantRulePatternError } from './moneyMutations';
import { createMerchantRuleMatcher } from './moneyMerchantRules';
import type { MoneyRuleRow } from './moneySnapshot';

const description = 'Online Payment 123456789 To Taylor Example 10/23';
const rule = (extra: Partial<MoneyRuleRow> = {}): MoneyRuleRow => ({ id: 'rule', budget_id: 'household',
  merchant_contains: 'Taylor Example', merchant_match_mode: 'partial', label: 'Household', created_from_transaction_id: 'tx', ...extra });

describe('transaction rule corrections', () => {
  it('accepts words later in a bank description without truncating the entered pattern', () => {
    expect(getPartialMerchantRulePatternError(description, 'Taylor Example')).toBeNull();
    expect(buildMerchantRuleUpsert({ userId: 'owner', transactionId: 'tx', merchantName: description,
      categoryId: 'household', categoryName: 'Household', matchMode: 'partial', merchantPattern: 'To Taylor Example' }))
      .toMatchObject({ merchant_contains: 'to taylor example', match_version: 'contains_v2' });
    expect(getPartialMerchantRulePatternError(description, 'Taylor Another')).not.toBeNull();
  });
  it('matches complete new patterns while preserving existing legacy rule behavior', () => {
    const current = rule({ match_version: 'contains_v2' });
    expect(createMerchantRuleMatcher([current])(description)).toBe(current);
    expect(createMerchantRuleMatcher([rule()])(description)).toBeUndefined();
    const specific = rule({ merchant_contains: 'online payment to taylor', match_version: 'contains_v2' });
    expect(createMerchantRuleMatcher([specific])('Online Payment To Someone Else')).toBeUndefined();
  });
  it('builds an internal transfer rule without inventing a spending category', () => {
    expect(buildMerchantRuleUpsert({ userId: 'owner', transactionId: 'tx', merchantName: 'Robinhood',
      targetKind: 'transfer', matchMode: 'exact' })).toMatchObject({ budget_id: null, rule_kind: 'transfer', merchant_contains: 'robinhood' });
  });
});

it('matches bank descriptions behind a cleaned merchant name without sharing the wrong cached match', () => {
  const current = rule({ match_version: 'contains_v2' });
  const match = createMerchantRuleMatcher([current]);
  expect(match('Online Payment', description)).toBe(current);
  expect(match('Online Payment', 'To Someone Else')).toBeUndefined();
  expect(getPartialMerchantRulePatternError('Online Payment', 'Taylor Example', description)).toBeNull();
});

it('uses server precedence and skips category rules for inflows', () => {
  const partial = rule({ id: 'partial', budget_id: null, rule_kind: 'transfer', match_version: 'contains_v2', merchant_contains: 'broker' });
  const exact = rule({ id: 'exact', rule_kind: 'category', merchant_match_mode: 'exact', merchant_contains: 'broker transfer' });
  const match = createMerchantRuleMatcher([partial, exact]);
  expect(match('Broker Transfer')).toBe(exact);
  expect(match('Broker Transfer', undefined, undefined, 'inflow')).toBe(partial);
});
