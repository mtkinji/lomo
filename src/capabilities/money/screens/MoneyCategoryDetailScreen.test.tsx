import { readFileSync } from 'fs';
import path from 'path';
import './MoneyCategoryDetailScreen';

describe('MoneyCategoryDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source.match(/<BottomDrawerHeader/g)).toHaveLength(3);
    expect(source).toContain('title="How this forecast works"');
    expect(source).toContain('title="Category settings"');
    expect(source).toContain('title="Forecast settings"');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
  });
});
