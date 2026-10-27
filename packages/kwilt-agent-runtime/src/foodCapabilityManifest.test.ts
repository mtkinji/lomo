import { FOOD_OPERATION_CONTRACTS, FOOD_OPERATION_IDS } from './foodOperationContracts';
import { KWILT_CAPABILITY_MANIFEST } from './kwiltCapabilityManifest';
import { KWILT_TOOL_CONTRACTS } from './kwiltToolContracts';

describe('canonical Food capability manifest', () => {
  test('has one complete contract for each operation', () => {
    expect(new Set(FOOD_OPERATION_IDS).size).toBe(FOOD_OPERATION_IDS.length);
    expect(FOOD_OPERATION_CONTRACTS).toHaveLength(FOOD_OPERATION_IDS.length);

    for (const contract of FOOD_OPERATION_CONTRACTS) {
      expect(contract.purpose.length).toBeGreaterThan(20);
      expect(contract.providers.length).toBeGreaterThan(0);
      expect(contract.inputSchema).toEqual(expect.objectContaining({ type: 'object' }));
      expect(contract.outputSchema).toEqual(expect.objectContaining({ type: 'object' }));
      expect(KWILT_CAPABILITY_MANIFEST.filter((entry) => entry.id === contract.id)).toHaveLength(1);
    }
  });

  test('creates callable tool contracts only for non-excluded operations', () => {
    for (const contract of FOOD_OPERATION_CONTRACTS) {
      const tools = KWILT_TOOL_CONTRACTS.filter((tool) => tool.id === contract.id);
      expect(tools).toHaveLength(contract.authority === 'excluded' ? 0 : 1);
    }
  });

  test('gives Recipe Chat writes a bounded buildable schema', () => {
    const byId = new Map(FOOD_OPERATION_CONTRACTS.map((contract) => [contract.id, contract]));
    expect(byId.get('recipes.create')?.inputSchema).toMatchObject({
      required: ['recipe'],
      properties: { recipe: { required: ['title', 'ingredients', 'instructions'] } },
    });
    expect(byId.get('recipes.update')?.inputSchema).toMatchObject({
      required: ['recipeId', 'expectedVersion', 'reviewedVersion'],
      properties: { reviewedVersion: { minProperties: 1 } },
    });
    expect(byId.get('recipes.import.approve')?.inputSchema).toMatchObject({
      required: ['draftId', 'expectedDraftVersion', 'idempotencyKey', 'reviewedVersion'],
      properties: { reviewedVersion: { required: ['title', 'ingredients', 'instructions'] } },
    });
    expect(byId.get('cook_session.control')?.inputSchema).toMatchObject({
      required: ['sessionId', 'expectedRevision', 'command'],
      properties: { command: { required: ['type'] } },
    });
  });

  test('gives Food Stock writes exact, idempotent, non-placeholder schemas', () => {
    const byId = new Map(FOOD_OPERATION_CONTRACTS.map((contract) => [contract.id, contract]));
    expect(byId.get('food_stock.observe')?.inputSchema).toMatchObject({
      required: ['observation', 'expectedObservationId', 'idempotencyKey'],
      properties: { observation: { required: ['concept', 'state', 'quantityMin', 'quantityMax', 'unit',
        'source', 'confidence', 'observedAt', 'expiresAt'] } },
    });
    expect(byId.get('food_stock.deplete')?.inputSchema).toMatchObject({
      required: ['concept', 'expectedObservationId', 'observedAt', 'idempotencyKey'],
    });
  });
});


describe('ongoing Meal cart contracts', () => {
  test('requires stable request identity and optimistic version authority for cart mutations', () => {
    const contracts = new Map(FOOD_OPERATION_CONTRACTS.map(contract => [contract.id, contract]));
    for (const id of ['meal_planning.cart.add', 'meal_planning.cart.mark_made', 'meal_planning.cart.remove'] as const) {
      const contract = contracts.get(id);
      expect(contract?.providers).toEqual(['server']);
      expect(contract?.inputSchema.required).toEqual(expect.arrayContaining(['mealPlanId', 'expectedVersion', 'candidateId', 'idempotencyKey']));
      expect(contract?.confirmation).toBe('explicit');
      expect(KWILT_CAPABILITY_MANIFEST.find(entry => entry.id === id)?.channels.mobile.state).toBe('pending_provider');
    }
    expect(contracts.get('meal_planning.cart.add')?.inputSchema).toMatchObject({ properties: { recipeScaleMultiplier: { enum: [1, 2, 3] } } });
    expect(contracts.get('meal_planning.history.read')?.effect).toBe('read');
    expect(contracts.get('meal_planning.history.read')?.confirmation).toBe('none');
  });
});
