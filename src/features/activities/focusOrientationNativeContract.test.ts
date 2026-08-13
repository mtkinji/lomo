import fs from 'node:fs';
import path from 'node:path';

describe('Focus orientation native contract', () => {
  it('lets an active Expo orientation lock override nested react-native-screens masks', () => {
    const patch = fs.readFileSync(
      path.resolve(process.cwd(), 'patches/expo-screen-orientation+55.0.18.patch'),
      'utf8',
    );
    const addedLines = patch
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .join('\n');

    const registryOverride = patch.indexOf('let mask = screenOrientationRegistry.requiredOrientationMask()');
    const screenFallback = patch.indexOf('if let vc = vcWithRNScreenOrientation()');

    expect(registryOverride).toBeGreaterThan(-1);
    expect(screenFallback).toBeGreaterThan(registryOverride);
    expect(addedLines).toContain('if !mask.isEmpty');
    expect(addedLines).toContain('return mask');
    expect(addedLines).toContain('return defaultOrientationMask');
  });
});
