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
    expect(source).not.toContain('titleVariant="lg"');
  });

  it('uses persisted covers and exposes cover editing without category-name image guesses', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('label="Edit cover"');
    expect(source).toContain('<MoneyCategoryCover cover={category.coverImage} />');
    expect(source).toContain('accessibilityLabel={`Edit ${category.name} cover`}');
    expect(source).toContain('<MoneyCategoryCoverDrawer');
    expect(source).not.toContain('getCategoryCover(');
  });

  it('keeps category settings discoverable and places cover editing last in the menu', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');
    const menuLabels = [...source.matchAll(/<DetailMenuItem[^>]+label="([^"]+)"/g)]
      .map((match) => match[1]);

    expect(menuLabels).toEqual([
      'Category settings',
      'Forecast settings',
      'App controls',
      'Edit cover',
    ]);
    expect(source).toContain('title="Category settings"');
  });

  it('keeps the floating controls owned by the scroll-linked hero treatment', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('const CATEGORY_HERO_HEIGHT = 168;');
    expect(source).toContain('style={[styles.heroHeader, { height: headerTotalHeight, paddingTop: insets.top }]}');
    expect(source).not.toContain('<ObjectPageHeader');
    expect(source.match(/materialVariant="floatingWhite"/g)).toHaveLength(2);
    expect(source).toContain('heroParallaxTranslateY');
    expect(source).toContain('heroOpacity');
    expect(source).toContain('style={styles.categoryTitle}>{category.name}</Text>');
    expect(source).not.toContain('styles.headerSurface');
  });

  it('refreshes the real Money snapshot behind the branded pull interaction', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('useKwiltRefresh');
    expect(source).toContain('refreshControl={refreshControl}');
    expect(source.indexOf('style={[styles.heroHeader')).toBeGreaterThan(source.indexOf('<Animated.ScrollView'));
    expect(source.indexOf('style={[styles.heroHeader')).toBeGreaterThan(source.indexOf('<View style={styles.heroStage}>'));
    expect(source.indexOf('style={[styles.heroHeader')).toBeLessThan(source.indexOf('<View style={styles.summarySection}>'));
    expect(source).toContain('contentContainerStyle={styles.scrollContent}');
    expect(source).toContain('<View style={styles.refreshPage}>');
    expect(source).toContain("refreshPage: {\n    flexGrow: 1,\n    position: 'relative',");
    expect(source).not.toContain('refreshHeaderStyle');
    expect(source).not.toContain("key={refreshing ? 'refreshing' : 'pulling'}");
    expect(source).toContain('<KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing} style={styles.refreshBackdrop}>');
    expect(source).toContain('refreshBackdrop: { backgroundColor: colors.parchment },');
    expect(source).toContain('backgroundColor: colors.canvas,');
    expect(source).not.toContain('{refreshIndicator}');
    expect(source).not.toContain('refreshReveal');
    expect(source).not.toContain('<KwiltPullToRefresh');
  });

  it('shows one plain rebalance consequence and commits the preview that was displayed', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<RebalanceConsequence');
    expect(source).toContain('accessibilityLabel={`Change ${category.name} plan`}');
    expect(source).toContain('<Text style={styles.changePlanText}>Change plan</Text>');
    expect(source).toContain('This stays within your ${livingPercent}% living limit');
    expect(source).toContain('preview?.outcome === \'ready\' ? preview : undefined');
    expect(source).toContain("accessibilityLabel={expanded ? 'Hide changes' : 'See changes'}");
    expect(source).not.toContain('styles.impactBox');
    expect(source).not.toContain('impactBox:');
  });

  it('separates category plan role from funding rhythm and persists the role', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('COUNTS AS');
    expect(source).toContain('FUNDING RHYTHM');
    expect(source).toContain('Keep this amount aside before flexible spending.');
    expect(source).toContain('Count spending here against flexible room.');
    expect(source).toContain("updateCategoryPlan(category.sourceId, { planRole: planRoleDraft })");
  });

  it('keeps editable drawers bottom-attached while their forms reveal focused inputs', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source.match(/keyboardBehavior="extend"/g)).toHaveLength(2);
    expect(source.match(/automaticallyAdjustKeyboardInsets/g)).toHaveLength(2);
    expect(source.match(/style=\{styles\.drawerFixedHeader\}/g)).toHaveLength(2);
    expect(source).toContain('visible={settingsOpen}');
    expect(source).toContain('visible={forecastSettingsOpen}');
  });

  it('keeps settlement status out of category activity metadata', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).not.toContain("transaction.pending ? 'Pending'");
    expect(source).toContain("transaction.reviewState === 'needs_review' ? 'Needs review' : transaction.accountName");
    expect(source).not.toContain('Temporary hold');
  });
});
