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
});
