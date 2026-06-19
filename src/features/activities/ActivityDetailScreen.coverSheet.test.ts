import { readFileSync } from 'fs';
import path from 'path';

describe('ActivityDetailScreen cover sheet wiring', () => {
  it('passes only a saved hero URL to the banner sheet and wires Generate to Unsplash lookup', () => {
    const source = readFileSync(path.join(__dirname, 'ActivityDetailScreen.tsx'), 'utf8');

    expect(source).toContain('const displayThumbnailUrlForSheet = resolvedHeroUrl ?? undefined;');
    expect(source).not.toContain('const displayThumbnailUrlForSheet = resolvedHeroUrl ?? defaultHeroUrl;');
    expect(source).toContain('const handleFindActivityHeroImage = useCallback(async () => {');
    expect(source).toContain('void handleFindActivityHeroImage();');
    expect(source).not.toContain('onGenerate={() => undefined}');
  });
});
