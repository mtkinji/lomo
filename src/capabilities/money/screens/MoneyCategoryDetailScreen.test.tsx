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

  it('uses persisted covers and exposes cover editing without category-name image guesses', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('label="Edit cover"');
    expect(source).toContain('<MoneyCategoryCover cover={category.coverImage} />');
    expect(source).toContain('<MoneyCategoryCoverDrawer');
    expect(source).not.toContain('getCategoryCover(');
  });

  it('uses the shared floating object header and compact scroll-linked cover treatment', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('const CATEGORY_HERO_HEIGHT = 168;');
    expect(source).toContain('<ObjectPageHeader');
    expect(source).toContain('showFullWidthBackground={false}');
    expect(source.match(/materialVariant="floatingWhite"/g)).toHaveLength(2);
    expect(source).toContain('heroParallaxTranslateY');
    expect(source).toContain('heroOpacity');
    expect(source).toContain('style={styles.categoryTitle}>{category.name}</Text>');
    expect(source).not.toContain('styles.headerSurface');
  });
});
