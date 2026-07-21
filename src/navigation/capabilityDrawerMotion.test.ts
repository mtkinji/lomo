import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('capability drawer dependency patch', () => {
  it('keeps the drawer spring responsive without overriding Reduce Motion', () => {
    const patch = readFileSync(
      join(process.cwd(), 'patches/react-native-drawer-layout+4.2.0.patch'),
      'utf8',
    );

    expect(patch.match(/^\+\s+damping: 100,?$/gm) ?? []).toHaveLength(2);
    expect(patch.match(/^\+\s+mass: 1,?$/gm) ?? []).toHaveLength(2);
    expect(patch.match(/^\+\s+reduceMotion: ReduceMotion\.System,?$/gm) ?? []).toHaveLength(2);
  });
});
