import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { FOOD_OPERATION_IDS } from './foodOperationIds';
import {
  foodAuthorityForOperation,
  foodChannelPlanForOperation,
} from './foodAuthorityPolicy';

describe('Food AI operation authority', () => {
  test('registers every planned Food operation once in the canonical manifest', () => {
    const manifestIds = KWILT_CAPABILITY_MANIFEST.map((operation) => operation.id);

    for (const operationId of FOOD_OPERATION_IDS) {
      expect(manifestIds.filter((id) => id === operationId)).toHaveLength(1);
      const operation = KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === operationId);
      expect(operation).toEqual(expect.objectContaining({
        owner: expect.stringMatching(/^(recipes|meal_planning|groceries|savings)$/),
        purpose: expect.any(String),
        inputSchema: expect.objectContaining({ type: 'object' }),
        outputSchema: expect.objectContaining({ type: 'object' }),
        providerEligibility: expect.any(Array),
        sourceRefs: expect.arrayContaining([expect.stringMatching(/^(capability|domain):/)]),
      }));
    }
  });

  test('classifies direct, reviewed, consequential, handoff, and excluded examples', () => {
    expect(foodAuthorityForOperation('recipes.search')).toBe('direct');
    expect(foodAuthorityForOperation('recipes.import.approve')).toBe('reviewed');
    expect(foodAuthorityForOperation('recipes.publication.publish')).toBe('explicit_consequential');
    expect(foodAuthorityForOperation('groceries.handoff.open')).toBe('native_handoff');
    expect(foodAuthorityForOperation('groceries.checkout')).toBe('excluded');
  });

  test('prevents consequential operations from losing confirmation', () => {
    for (const operationId of FOOD_OPERATION_IDS) {
      const authority = foodAuthorityForOperation(operationId);
      const operation = KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === operationId);
      if (!operation) throw new Error(`Missing ${operationId}`);

      if (authority === 'explicit_consequential') {
        expect(operation.consequence).toBe('consequential');
        expect(operation.confirmation).toBe('explicit');
      }
      if (authority === 'reviewed') expect(operation.confirmation).toBe('explicit');
    }
  });

  test('keeps excluded operations non-executable in every channel', () => {
    for (const operationId of FOOD_OPERATION_IDS.filter((id) => foodAuthorityForOperation(id) === 'excluded')) {
      const operation = KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === operationId);
      expect(operation?.tools).toEqual([]);
      expect(operation?.channels.mobile.state).toBe('excluded');
      expect(operation?.channels.phone.state).toBe('excluded');
      expect(operation?.returnBehavior).toBe('honest_boundary');
    }
  });

  test('reports planned coverage for native Food, Chat, Phone, and connector ingestion', () => {
    expect(foodChannelPlanForOperation('recipes.import.prepare')).toEqual({
      nativeFood: 'pending_executor',
      unifiedChat: 'pending_executor',
      phone: 'pending_provider',
      connectorIngestion: 'pending_provider',
    });
    expect(foodChannelPlanForOperation('groceries.checkout')).toEqual({
      nativeFood: 'provider_owned',
      unifiedChat: 'honest_boundary',
      phone: 'honest_boundary',
      connectorIngestion: 'honest_boundary',
    });
  });

  test('reports Food operations live only with executor, receipt, and return proof', () => {
    for (const operationId of FOOD_OPERATION_IDS) {
      const operation = KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === operationId);
      if (!operation) throw new Error(`Missing ${operationId}`);
      for (const channel of [operation.channels.mobile, operation.channels.phone]) {
        if (channel.state === 'live' || channel.state === 'confirmation_only') {
          expect(operation.tools.length).toBeGreaterThan(0);
          expect(channel.proofPaths.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
