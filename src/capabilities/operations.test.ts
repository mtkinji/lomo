import fs from 'node:fs';
import path from 'node:path';
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

  test('is declared independently instead of mapping the Chat manifest at runtime', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/capabilities/operations.ts'), 'utf8');
    expect(source).not.toContain('KWILT_CAPABILITY_MANIFEST.map');
    expect(Object.isFrozen(KWILT_OPERATION_REGISTRY)).toBe(true);
  });
});
