import assert from 'node:assert/strict';
import test from 'node:test';

import { reviewedScalingForRecipe } from './reviewed-scaling.mjs';

test('reviews breakfast burritos for whole-batch scaling from 6 to 12 or 18', () => {
  const classification = reviewedScalingForRecipe('BR010', 13);

  assert.equal(classification.scalingState, undefined);
  assert.deepEqual(
    Object.values(classification.scalingReview),
    Array.from({ length: 13 }, () => ({ kind: 'multiply' })),
  );
});
