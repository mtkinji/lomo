import { KWILT_TOOL_CONTRACTS } from './kwiltToolContracts';
import { toStrictToolInputSchema } from './strictToolSchema';

describe('KWILT_TOOL_CONTRACTS strict wire compatibility', () => {
  test.each(KWILT_TOOL_CONTRACTS.map((tool) => [tool.id, tool.inputSchema] as const))(
    '%s has a strict-compatible input schema',
    (_toolId, schema) => {
      expect(() => toStrictToolInputSchema(schema)).not.toThrow();
    },
  );
});
