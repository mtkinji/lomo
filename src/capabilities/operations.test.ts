import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { KWILT_OPERATION_REGISTRY } from './operations';

describe('KWILT_OPERATION_REGISTRY', () => {
  test('is the product projection of the one canonical capability manifest', () => {
    expect(KWILT_OPERATION_REGISTRY).toEqual(
      KWILT_CAPABILITY_MANIFEST.map(({ id, owner }) => ({ id, owner })),
    );
    expect(new Set(KWILT_CAPABILITY_MANIFEST.map((operation) => operation.id)).size)
      .toBe(KWILT_CAPABILITY_MANIFEST.length);
  });
});
