import { readFileSync } from 'fs';
import path from 'path';
import './MoneyCategoryDetailScreen';

describe('MoneyCategoryDetailScreen drawer headers', () => {
  it('uses one shared heading without eyebrow labels', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source.match(/<BottomDrawerHeader/g)).toHaveLength(3);
    expect(source).toContain('title="How this forecast works"');
    expect(source).toContain('title={`${category.name} settings`}');
    expect(source).toContain('title="Forecast settings"');
    expect(source).not.toContain('styles.drawerEyebrow');
    expect(source).not.toContain('drawerEyebrow:');
    expect(source).not.toContain('titleVariant="lg"');
  });

  it('uses persisted covers and exposes cover editing without category-name image guesses', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('label="Edit cover"');
    expect(source).toContain('cover={category.coverImage}');
    expect(source).toContain('extendArtworkBehindSheetCorners');
    expect(source).toContain('attributionBottomInset={CATEGORY_MEDIA_GEOMETRY.sheetRadius}');
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
      'Edit cover',
    ]);
    expect(source).toContain('title={`${category.name} settings`}');
  });

  it('keeps floating controls fixed while the compact detail sheet scrolls over the cover', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<ObjectPageHeader');
    expect(source.indexOf('<KwiltRefreshFrame')).toBeLessThan(source.indexOf('<ObjectPageHeader'));
    expect(source.indexOf('<ObjectPageHeader')).toBeLessThan(source.indexOf('<Animated.ScrollView'));
    expect(source).toContain('showFullWidthBackground={false}');
    expect(source).toContain('<ObjectDetailMediaHero');
    expect(source).toContain('motionVariant="standard"');
    expect(source).toContain('<ObjectDetailMediaSheet variant="compact">');
    expect(source).toContain('const CATEGORY_MEDIA_GEOMETRY = resolveObjectDetailMediaGeometry(\'compact\');');
    expect(source).toContain('extendArtworkBehindSheetCorners');
    expect(source).toContain('attributionBottomInset={CATEGORY_MEDIA_GEOMETRY.sheetRadius}');
    expect(source.match(/materialVariant="floatingWhite"/g)).toHaveLength(2);
    expect(source).toContain('style={styles.categoryTitle}>{category.name}</Text>');
    expect(source).not.toContain('styles.heroHeader');
  });

  it('refreshes the real Money snapshot behind the branded pull interaction', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('useKwiltRefresh');
    expect(source).toContain('const refreshHeaderTranslateY = scrollY.interpolate({');
    expect(source).toContain("extrapolateLeft: 'extend',\n    extrapolateRight: 'clamp',");
    expect(source).toContain('style={[styles.refreshHeader, { height: headerTotalHeight, transform: [{ translateY: refreshHeaderTranslateY }] }]}');
    expect(source).toContain("refreshHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },");
    expect(source).not.toContain('style={{ transform: [{ translateY: refreshHeaderTranslateY }] }}');
    expect(source).toContain('refreshControl={refreshControl}');
    expect(source.indexOf('<ObjectPageHeader')).toBeLessThan(source.indexOf('<Animated.ScrollView'));
    expect(source.indexOf('<ObjectDetailMediaHero')).toBeGreaterThan(source.indexOf('<Animated.ScrollView'));
    expect(source.indexOf('<ObjectDetailMediaSheet')).toBeLessThan(source.indexOf('<View style={styles.summarySection}>'));
    expect(source).toContain('contentContainerStyle={styles.scrollContent}');
    expect(source).toContain('<View style={styles.refreshPage}>');
    expect(source).toContain("refreshPage: {\n    flexGrow: 1,\n    position: 'relative',");
    expect(source).not.toContain('refreshHeaderStyle');
    expect(source).not.toContain("key={refreshing ? 'refreshing' : 'pulling'}");
    expect(source).toContain('<KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing} style={styles.refreshBackdrop}>');
    expect(source).toContain('refreshBackdrop: { backgroundColor: colors.parchment },');
    expect(source).toContain('detailSheetInner: { gap: spacing.xl, paddingTop: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 80 },');
    expect(source).not.toContain('{refreshIndicator}');
    expect(source).not.toContain('refreshReveal');
    expect(source).not.toContain('<KwiltPullToRefresh');
  });

  it('shows one plain rebalance consequence and commits the preview that was displayed', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<RebalanceConsequence');
    expect(source).toContain('accessibilityLabel={`Open ${category.name} settings`}');
    expect(source).toContain('<Text style={styles.categorySettingsText}>Category settings</Text>');
    expect(source).toContain('categorySettingsText: { color: colors.textPrimary');
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

    expect(source.match(/keyboardBehavior="extend"/g)).toHaveLength(1);
    expect(source.match(/keyboardBehavior="resize"/g)).toHaveLength(1);
    expect(source.match(/automaticallyAdjustKeyboardInsets/g)).toHaveLength(2);
    expect(source.match(/style=\{styles\.drawerFixedHeader\}/g)).toHaveLength(2);
    expect(source).toContain('visible={settingsOpen}');
    expect(source).toContain('visible={forecastSettingsOpen}');
  });

  it('uses grouped neutral settings with one fixed save action and an app-controls offer', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<SettingsGroup title="CATEGORY">');
    expect(source).toContain('title="COUNTS AS"');
    expect(source).toContain('<SettingsGroup title="FUNDING RHYTHM">');
    expect(source.match(/<SettingsChoiceRow/g)).toHaveLength(4);
    expect(source).toContain('bottomAccessoryPlacement="phoneFloating"');
    expect(source).toContain('loadingLabel="Saving…"');
    expect(source).toContain('Save changes');
    expect(source).toContain('title="FOLLOW THROUGH"');
    expect(source).toContain('title="App controls"');
    expect(source).not.toContain('<DetailMenuItem icon="shield" label="App controls"');
    expect(source).not.toContain('<Button fullWidth variant="outline"');
  });

  it('keeps settlement status out of category activity metadata', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).not.toContain("transaction.pending ? 'Pending'");
    expect(source).toContain("transaction.reviewState === 'needs_review' ? 'Needs review' : transaction.accountName");
    expect(source).not.toContain('Temporary hold');
  });

  it('groups dated activity rows in the inventory surface and keeps the exit neutral', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyCategoryDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<View style={styles.activityInventory}>');
    expect(source).toContain('<View style={styles.activityRows}>');
    expect(source).toContain('activityInventory: { gap: spacing.md, padding: spacing.sm, borderRadius: radii.card, backgroundColor: colors.fieldFill }');
    expect(source).toContain('activityRows: { overflow: \'hidden\', borderRadius: radii.card, backgroundColor: colors.card }');
    expect(source).toContain('showDivider={index < group.transactions.length - 1}');
    expect(source).toContain('transactionRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }');
    expect(source).toContain('viewAllText: { color: colors.textPrimary');
    expect(source).toContain('<Icon name="chevronRight" size={18} color={colors.textSecondary} />');
    expect(source).not.toContain('viewAllText: { color: colors.pine700');
  });
});
