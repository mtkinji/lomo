import { foodAuthorityForOperation } from '../foodAuthorityPolicy';
import { FOOD_OPERATION_EVAL_CASES } from './foodOperationEvalCases';

describe('Food operation routing evaluation specification', () => {
  it('covers every authority class plus clarification and stale-version behavior', () => {
    expect(new Set(FOOD_OPERATION_EVAL_CASES.map((item) => item.expectedAuthority))).toEqual(new Set([
      'direct', 'reviewed', 'explicit_consequential', 'native_handoff', 'excluded', 'clarify',
    ]));
    expect(FOOD_OPERATION_EVAL_CASES.some((item) => item.expectedOutcome === 'version_conflict')).toBe(true);
  });

  it('matches the executable operation authority catalog', () => {
    for (const item of FOOD_OPERATION_EVAL_CASES) {
      if (item.expectedOperationId) {
        expect(foodAuthorityForOperation(item.expectedOperationId)).toBe(item.expectedAuthority);
      }
      expect(item.prompt.trim()).not.toBe('');
      expect(item.requiredTruth.trim()).not.toBe('');
    }
  });

  it('covers identity ambiguity, child participation, publishing, coupons, checkout, and receipts', () => {
    expect(FOOD_OPERATION_EVAL_CASES.map((item) => item.id)).toEqual(expect.arrayContaining([
      'ambiguous-recipe-owner', 'open-child-choice', 'publish-public-recipe', 'claim-coupon-application',
      'autonomous-checkout', 'receipt-realized-savings',
    ]));
  });
});
