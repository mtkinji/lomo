import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Input } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { colors, floatingControl, fonts, spacing, typography, type ScrimToken } from '../../theme';
import { ARC_HERO_LIBRARY, type ArcHeroImage } from './arcHeroLibrary';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  type ArcGradientDirection,
  getArcMosaicCell,
} from './thumbnailVisuals';
import { searchUnsplashPhotos, UnsplashError, type UnsplashPhoto } from '../../services/unsplash';
import { generateArcBannerVibeQuery } from '../../services/ai';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import type { VisualSearchObjectKind } from '../../services/arcBannerImageSearchTerms';

export type ArcBannerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Human-friendly label for the object owning this banner.
   * Defaults to "Arc" (historical behavior).
   */
  objectLabel?: string;
  objectKind?: VisualSearchObjectKind;
  arcName: string;
  arcNarrative?: string;
  arcGoalTitles?: string[];
  canUseUnsplash?: boolean;
  onRequestUpgrade?: () => void;
  heroSeed: string;
  hasHero: boolean;
  loading: boolean;
  error: string;
  thumbnailUrl?: string;
  heroGradientColors: [string, string, ...string[]];
  heroGradientDirection: ArcGradientDirection;
  heroTopoSizes: number[];
  showTopography: boolean;
  showGeoMosaic: boolean;
  onGenerate: () => void;
  onUpload: () => void;
  onRemove: () => void;
  onSelectCurated: (image: ArcHeroImage) => void;
  onSelectUnsplash: (photo: UnsplashPhoto) => void;
  /** Optional explicit commit action for callers that stage image changes. */
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  /**
   * Optional BottomDrawer overrides for nested surfaces (e.g. Goal creation drawer).
   */
  presentation?: 'modal' | 'inline';
  hideBackdrop?: boolean;
  scrimToken?: ScrimToken;
  /**
   * Override the legacy "{objectLabel} Banner" heading for consumers whose
   * product vocabulary uses "cover" instead.
   */
  title?: string;
  /**
   * Limit the established cover manager to sources the owning data model can
   * persist. Defaults to Kwilt's complete Curated/Search/Upload system.
   */
  sourceTabs?: readonly HeroImageSourceTab[];
  /** User-facing noun used by destructive confirmation copy. */
  imageLabel?: string;
};

export type HeroImageSourceTab = 'curated' | 'unsplash' | 'upload';
const DEFAULT_SOURCE_TAB: HeroImageSourceTab = 'unsplash';
const DEFAULT_SOURCE_TABS: readonly HeroImageSourceTab[] = ['curated', 'unsplash', 'upload'];

function hashSearchQuery(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function ArcBannerSheet({
  visible,
  onClose,
  objectLabel = 'Arc',
  objectKind,
  arcName,
  arcNarrative,
  arcGoalTitles,
  canUseUnsplash = true,
  onRequestUpgrade,
  heroSeed,
  hasHero,
  loading,
  error,
  thumbnailUrl,
  heroGradientColors,
  heroGradientDirection,
  heroTopoSizes,
  showTopography,
  showGeoMosaic,
  onGenerate,
  onUpload,
  onRemove,
  onSelectCurated,
  onSelectUnsplash,
  onConfirm,
  confirmLabel = 'Save',
  confirmDisabled = false,
  presentation,
  hideBackdrop,
  scrimToken,
  title,
  sourceTabs = DEFAULT_SOURCE_TABS,
  imageLabel = 'banner image',
}: ArcBannerSheetProps) {
  const shouldShowTopography = showTopography && !thumbnailUrl;
  const shouldShowGeoMosaic = showGeoMosaic && !thumbnailUrl;
  const showRefreshAction = !thumbnailUrl;
  const imageSearchObjectKind = objectKind ?? 'arc';

  const availableSourceTabs = sourceTabs.length > 0 ? sourceTabs : DEFAULT_SOURCE_TABS;
  const defaultTab: HeroImageSourceTab = canUseUnsplash && availableSourceTabs.includes(DEFAULT_SOURCE_TAB)
    ? DEFAULT_SOURCE_TAB
    : availableSourceTabs[0] ?? 'curated';
  const [sourceTab, setSourceTab] = useState<HeroImageSourceTab>(defaultTab);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);
  const [gridWidth, setGridWidth] = useState(0);
  const hasAutoSearchedRef = useRef(false);
  const latestSearchRef = useRef<{ queryHash: string; source: 'auto' | 'manual' | 'fallback' } | null>(null);
  const { capture } = useAnalytics();

  const performUnsplashSearch = useCallback(
    async (explicitQuery?: string, source: 'auto' | 'manual' | 'fallback' = explicitQuery ? 'auto' : 'manual') => {
      if (!canUseUnsplash) {
        setUnsplashError('Image library search is a Pro feature.');
        return;
      }
      const query = (explicitQuery ?? unsplashQuery).trim() || arcName.trim();
      if (!query) {
        return;
      }
      const queryHash = hashSearchQuery(query.toLowerCase());
      latestSearchRef.current = { queryHash, source };
      try {
        setUnsplashLoading(true);
        setUnsplashError(null);
        // Don't force landscape here; masonry feels better with mixed orientations.
        const results = await searchUnsplashPhotos(query, { perPage: 30, page: 1 });
        if (!results || results.length === 0) {
          setUnsplashError('No results found for that query.');
        }
        setUnsplashResults(results ?? []);
        capture(AnalyticsEvent.ArcBannerImageSearchPerformed, {
          objectLabel,
          queryHash,
          queryLength: query.length,
          resultCount: results?.length ?? 0,
          source,
        });
      } catch (err) {
        let didCaptureFailure = false;
        if (err instanceof UnsplashError) {
          capture(AnalyticsEvent.ArcBannerImageSearchFailed, {
            objectLabel,
            queryHash,
            queryLength: query.length,
            source,
            errorCode: err.code,
            status: err.status ?? null,
          });
          didCaptureFailure = true;
          if (err.code === 'missing_access_key') {
            setUnsplashError(
              __DEV__
                ? 'Image library search is not configured. Set `UNSPLASH_ACCESS_KEY` and ensure `extra.unsplashAccessKey` is provided in `app.config.ts`.'
                : 'Image library search is not available right now.'
            );
            return;
          }
          if (err.code === 'http_error') {
            setUnsplashError(
              __DEV__
                ? `Image library request failed (${err.status ?? 'unknown'}). ${err.message}`
                : 'Unable to load image library results right now.'
            );
            return;
          }
        }
        if (!didCaptureFailure) {
          capture(AnalyticsEvent.ArcBannerImageSearchFailed, {
            objectLabel,
            queryHash,
            queryLength: query.length,
            source,
            errorCode: 'unknown',
          });
        }
        setUnsplashError('Unable to load image library results right now.');
      } finally {
        setUnsplashLoading(false);
      }
    },
    [arcName, canUseUnsplash, capture, objectLabel, unsplashQuery]
  );

  useEffect(() => {
    if (!visible) {
      setSourceTab((current) => (current === defaultTab ? current : defaultTab));
      setUnsplashQuery((current) => (current === '' ? current : ''));
      setUnsplashError((current) => (current === null ? current : null));
      setUnsplashResults((current) => (current.length === 0 ? current : []));
      setUnsplashLoading((current) => (current === false ? current : false));
      setGridWidth((current) => (current === 0 ? current : 0));
      hasAutoSearchedRef.current = false;
      return;
    }

    // Default to image search (Pro) or Curated (Free).
    setSourceTab((current) => (current === defaultTab ? current : defaultTab));
    if (!canUseUnsplash) {
      hasAutoSearchedRef.current = true;
      return;
    }
    if (!hasAutoSearchedRef.current) {
      hasAutoSearchedRef.current = true;
      let cancelled = false;

      (async () => {
        const vibeQuery =
          (await generateArcBannerVibeQuery({
            objectKind: imageSearchObjectKind,
            arcName,
            arcNarrative,
            goalTitles: arcGoalTitles,
          })) ?? '';
        if (cancelled) return;
        const initialQuery = (vibeQuery || arcName).trim();
        if (!initialQuery) return;
        setUnsplashQuery(initialQuery);
        void performUnsplashSearch(initialQuery, vibeQuery ? 'auto' : 'fallback');
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [arcGoalTitles, arcName, arcNarrative, canUseUnsplash, defaultTab, imageSearchObjectKind, performUnsplashSearch, visible]);

  const masonryColumnWidth = useMemo(() => {
    if (gridWidth <= 0) return 0;
    return (gridWidth - spacing.sm) / 2;
  }, [gridWidth]);

  const unsplashMasonryColumns = useMemo(() => {
    type MasonryItem = { photo: UnsplashPhoto; height: number };
    const left: MasonryItem[] = [];
    const right: MasonryItem[] = [];
    if (masonryColumnWidth <= 0) {
      return { left, right };
    }

    const estimateHeight = (photo: UnsplashPhoto) => {
      const ratio =
        photo.width && photo.height && photo.width > 0 ? photo.height / photo.width : 0.66;
      const raw = masonryColumnWidth * ratio;
      // Keep the grid feeling consistent; avoid extreme slivers.
      return Math.max(88, Math.min(raw, 420));
    };

    let leftTotal = 0;
    let rightTotal = 0;
    for (const photo of unsplashResults) {
      const h = estimateHeight(photo);
      if (leftTotal <= rightTotal) {
        left.push({ photo, height: h });
        leftTotal += h;
      } else {
        right.push({ photo, height: h });
        rightTotal += h;
      }
    }
    return { left, right };
  }, [masonryColumnWidth, unsplashResults]);

  const curatedMasonryColumns = useMemo(() => {
    type CuratedItem = { image: ArcHeroImage; height: number };
    const left: CuratedItem[] = [];
    const right: CuratedItem[] = [];
    if (masonryColumnWidth <= 0) {
      return { left, right };
    }

    // Curated banners have similar aspect ratios; introduce a small deterministic
    // variance so the grid still reads "masonry" while remaining scannable.
    const base = Math.max(92, Math.min(masonryColumnWidth * 0.6, 140));
    const heightFor = (id: string) => {
      const last = id.charCodeAt(id.length - 1) || 0;
      const bucket = last % 3; // 0..2
      return base + bucket * 18; // 0 / +18 / +36
    };

    let leftTotal = 0;
    let rightTotal = 0;
    for (const image of ARC_HERO_LIBRARY) {
      const tileHeight = heightFor(image.id);
      if (leftTotal <= rightTotal) {
        left.push({ image, height: tileHeight });
        leftTotal += tileHeight;
      } else {
        right.push({ image, height: tileHeight });
        rightTotal += tileHeight;
      }
    }
    return { left, right };
  }, [masonryColumnWidth]);

  const handleGridLayout = useCallback((width: number) => {
    if (Number.isFinite(width) && width > 0 && width !== gridWidth) {
      setGridWidth(width);
    }
  }, [gridWidth]);

  const handleSearchUnsplash = useCallback(() => {
    void performUnsplashSearch(undefined, 'manual');
  }, [performUnsplashSearch]);

  const handleSelectUnsplash = useCallback(
    (photo: UnsplashPhoto) => {
      const index = unsplashResults.findIndex((candidate) => candidate.id === photo.id);
      capture(AnalyticsEvent.ArcBannerImageSelected, {
        objectLabel,
        source: latestSearchRef.current?.source ?? 'unknown',
        queryHash: latestSearchRef.current?.queryHash ?? 'unknown',
        resultIndex: index >= 0 ? index : null,
      });
      Keyboard.dismiss();
      onSelectUnsplash(photo);
    },
    [capture, objectLabel, onSelectUnsplash, unsplashResults]
  );

  const handleRemove = useCallback(() => {
    if (!hasHero || loading) return;
    if (onConfirm) {
      onRemove();
      return;
    }
    const objectLower = objectLabel.toLowerCase();
    Alert.alert(`Remove ${imageLabel}?`, `This will remove the current image for this ${objectLower}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: onRemove,
      },
    ]);
  }, [hasHero, imageLabel, loading, objectLabel, onConfirm, onRemove]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      keyboardAvoidanceEnabled={false}
      presentation={presentation}
      hideBackdrop={hideBackdrop}
      scrimToken={scrimToken}
    >
      <View style={styles.heroModalContainer}>
        <View style={styles.modalContent}>
          <BottomDrawerHeader
            closeAccessibilityLabel={`Close ${title ?? `${objectLabel} banner`}`}
            onClose={onClose}
            title={title ?? `${objectLabel} Banner`}
            variant="withClose"
          />
          {availableSourceTabs.length > 1 ? (
            <SegmentedControl<HeroImageSourceTab>
              value={sourceTab}
              onChange={(next) => {
                if (next === 'unsplash' && !canUseUnsplash) {
                  onRequestUpgrade?.();
                  setSourceTab(availableSourceTabs[0] ?? 'curated');
                  return;
                }
                setSourceTab(next);
              }}
              options={availableSourceTabs.map((value) => ({
                value,
                label: value === 'curated'
                  ? 'Curated'
                  : value === 'unsplash'
                    ? (canUseUnsplash ? 'Search' : 'Search · Pro')
                    : 'Upload',
              }))}
              style={styles.heroModalSourceTabs}
            />
          ) : null}

          <View style={styles.heroModalCard}>
            <BottomDrawerScrollView
              style={styles.heroModalScroll}
              contentContainerStyle={styles.heroModalScrollContent}
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroModalPreviewSection}>
                <View style={styles.heroModalPreviewColumn}>
                  <View style={styles.heroModalPreviewFrame}>
                    <View style={styles.heroModalPreviewInner}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={styles.heroModalPreviewImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={heroGradientColors}
                          start={heroGradientDirection.start}
                          end={heroGradientDirection.end}
                          style={styles.heroModalPreviewImage}
                        />
                      )}
                      {shouldShowTopography && (
                        <View style={styles.arcHeroTopoLayer}>
                          <View style={styles.arcHeroTopoGrid}>
                            {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                              <View
                                // eslint-disable-next-line react/no-array-index-key
                                key={`hero-modal-topo-row-${rowIndex}`}
                                style={styles.arcHeroTopoRow}
                              >
                                {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                                  const cellIndex = rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                                  const rawSize = heroTopoSizes[cellIndex] ?? 0;
                                  const isHidden = rawSize < 0;
                                  const dotSize = isHidden ? 0 : rawSize;
                                  return (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <View
                                      key={`hero-modal-topo-cell-${rowIndex}-${colIndex}`}
                                      style={[
                                        styles.arcHeroTopoDot,
                                        (dotSize === 0 || isHidden) && styles.arcHeroTopoDotSmall,
                                        dotSize === 1 && styles.arcHeroTopoDotMedium,
                                        dotSize === 2 && styles.arcHeroTopoDotLarge,
                                        isHidden && styles.arcHeroTopoDotHidden,
                                      ]}
                                    />
                                  );
                                })}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                      {shouldShowGeoMosaic && (
                        <View style={styles.arcHeroMosaicLayer}>
                          {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                            <View
                              // eslint-disable-next-line react/no-array-index-key
                              key={`hero-modal-mosaic-row-${rowIndex}`}
                              style={styles.arcHeroMosaicRow}
                            >
                              {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                                const cell = getArcMosaicCell(heroSeed, rowIndex, colIndex);
                                if (cell.shape === 0) {
                                  return (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <View
                                      key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                                      style={styles.arcHeroMosaicCell}
                                    />
                                  );
                                }

                                let shapeStyle: StyleProp<ViewStyle> = styles.arcHeroMosaicCircle;
                                if (cell.shape === 2) {
                                  shapeStyle = styles.arcHeroMosaicPillVertical;
                                } else if (cell.shape === 3) {
                                  shapeStyle = styles.arcHeroMosaicPillHorizontal;
                                }

                                return (
                                  // eslint-disable-next-line react/no-array-index-key
                                  <View
                                    key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                                    style={styles.arcHeroMosaicCell}
                                  >
                                    <View
                                      style={[
                                        styles.arcHeroMosaicShapeBase,
                                        shapeStyle,
                                        { backgroundColor: cell.color },
                                      ]}
                                    />
                                  </View>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {(sourceTab === 'upload' || (availableSourceTabs.length === 1 && hasHero) || error) && (
                  <View style={styles.heroModalControls}>
                    {sourceTab === 'upload' && (
                      <>
                        <View style={styles.heroModalActionRow}>
                          <View style={styles.heroModalAction}>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!showRefreshAction || loading}
                              onPress={onGenerate}
                              style={styles.heroModalActionButton}
                              accessibilityLabel="Generate banner image"
                            >
                              {loading ? (
                                <ActivityIndicator color={colors.textPrimary} />
                              ) : (
                                <Icon
                                  name="refresh"
                                  size={20}
                                  color={showRefreshAction ? colors.textPrimary : colors.textSecondary}
                                />
                              )}
                            </Button>
                            <Text
                              style={[
                                styles.heroModalActionLabel,
                                !showRefreshAction && { color: colors.textSecondary },
                              ]}
                            >
                              Generate
                            </Text>
                          </View>
                          <View style={styles.heroModalAction}>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!hasHero || loading}
                              onPress={handleRemove}
                              style={styles.heroModalActionButton}
                              accessibilityLabel="Remove image"
                            >
                              <Icon
                                name="trash"
                                size={20}
                                color={hasHero ? colors.destructive : colors.textSecondary}
                                style={{ opacity: hasHero ? 1 : 0.4 }}
                              />
                            </Button>
                            <Text
                              style={[
                                styles.heroModalActionLabel,
                                !hasHero && { color: colors.textSecondary, opacity: 0.5 },
                                hasHero && { color: colors.destructive },
                              ]}
                            >
                              Remove
                            </Text>
                          </View>
                        </View>

                        <View style={styles.heroModalUploadContainer}>
                          <Button
                            variant="outline"
                            disabled={loading}
                            onPress={onUpload}
                            style={styles.heroModalUpload}
                          >
                            <View style={styles.heroModalUploadButtonContent}>
                              <Icon name="image" size={18} color={colors.textPrimary} />
                              <Text style={styles.buttonTextAlt}>Upload</Text>
                            </View>
                          </Button>
                        </View>
                      </>
                    )}
                    {sourceTab !== 'upload' && hasHero ? (
                      <View style={styles.heroModalAction}>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={loading}
                          onPress={handleRemove}
                          style={styles.heroModalActionButton}
                          accessibilityLabel="Remove image"
                        >
                          <Icon name="trash" size={20} color={colors.destructive} />
                        </Button>
                        <Text style={[styles.heroModalActionLabel, { color: colors.destructive }]}>Remove</Text>
                      </View>
                    ) : null}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  </View>
                )}
              </View>

              {sourceTab === 'curated' && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.heroModalSupportText}>Curated banners</Text>
                  <View
                    style={styles.masonryOuter}
                    onLayout={(event) => {
                      handleGridLayout(event.nativeEvent.layout.width);
                    }}
                  >
                    <View style={styles.masonryRow}>
                      <View style={styles.masonryColumn}>
                        {curatedMasonryColumns.left.map(({ image, height }) => {
                          const isSelected = thumbnailUrl === image.uri;
                          return (
                            <TouchableOpacity
                              key={image.id}
                              testID={`e2e.arcBanner.curated.${image.id}`}
                              style={[
                                styles.masonryTile,
                                { width: masonryColumnWidth, height },
                                isSelected && styles.masonryTileSelected,
                              ]}
                              activeOpacity={0.88}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
                                Keyboard.dismiss();
                                onSelectCurated(image);
                              }}
                            >
                              <Image
                                source={{ uri: image.uri }}
                                style={styles.masonryImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <View style={[styles.masonryColumn, styles.masonryColumnRight]}>
                        {curatedMasonryColumns.right.map(({ image, height }) => {
                          const isSelected = thumbnailUrl === image.uri;
                          return (
                            <TouchableOpacity
                              key={image.id}
                              testID={`e2e.arcBanner.curated.${image.id}`}
                              style={[
                                styles.masonryTile,
                                { width: masonryColumnWidth, height },
                                isSelected && styles.masonryTileSelected,
                              ]}
                              activeOpacity={0.88}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
                                Keyboard.dismiss();
                                onSelectCurated(image);
                              }}
                            >
                              <Image
                                source={{ uri: image.uri }}
                                style={styles.masonryImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {sourceTab === 'unsplash' && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.heroModalSupportText}>Search the image library</Text>
                  <View style={styles.heroUnsplashSearchRow}>
                    <View style={styles.heroUnsplashInputWrapper}>
                      <Input
                        size="sm"
                        elevation="elevated"
                        placeholder={`Try "${arcName}" or "sunrise"…`}
                        value={unsplashQuery}
                        onChangeText={setUnsplashQuery}
                        onSubmitEditing={handleSearchUnsplash}
                        returnKeyType="search"
                        containerStyle={styles.heroUnsplashInputContainer}
                        inputStyle={styles.heroUnsplashInputText}
                      />
                    </View>
                    <Button
                      variant="outline"
                      size="small"
                      onPress={() => {
                        void handleSearchUnsplash();
                      }}
                      disabled={unsplashLoading}
                    >
                      {unsplashLoading ? (
                        <ActivityIndicator color={colors.textPrimary} />
                      ) : (
                        <Text style={styles.heroUnsplashSearchLabel}>Search</Text>
                      )}
                    </Button>
                  </View>
                  {unsplashError ? <Text style={styles.errorText}>{unsplashError}</Text> : null}
                  {unsplashResults.length > 0 && (
                    <View
                      style={styles.masonryOuter}
                      onLayout={(event) => {
                        handleGridLayout(event.nativeEvent.layout.width);
                      }}
                    >
                      <View style={styles.masonryRow}>
                        <View style={styles.masonryColumn}>
                          {unsplashMasonryColumns.left.map(({ photo, height }) => {
                            const isSelected = thumbnailUrl === photo.urls.regular;
                            return (
                              <TouchableOpacity
                                key={photo.id}
                                testID={`e2e.arcBanner.unsplash.${photo.id}`}
                                style={[
                                  styles.masonryTile,
                                  { width: masonryColumnWidth, height },
                                  isSelected && styles.masonryTileSelected,
                                ]}
                                activeOpacity={0.88}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  handleSelectUnsplash(photo);
                                }}
                              >
                                <Image
                                  source={{ uri: photo.urls.small }}
                                  style={styles.masonryImage}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={[styles.masonryColumn, styles.masonryColumnRight]}>
                          {unsplashMasonryColumns.right.map(({ photo, height }) => {
                            const isSelected = thumbnailUrl === photo.urls.regular;
                            return (
                              <TouchableOpacity
                                key={photo.id}
                                testID={`e2e.arcBanner.unsplash.${photo.id}`}
                                style={[
                                  styles.masonryTile,
                                  { width: masonryColumnWidth, height },
                                  isSelected && styles.masonryTileSelected,
                                ]}
                                activeOpacity={0.88}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  handleSelectUnsplash(photo);
                                }}
                              >
                                <Image
                                  source={{ uri: photo.urls.small }}
                                  style={styles.masonryImage}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </BottomDrawerScrollView>
          </View>

          {onConfirm ? (
            <View pointerEvents="box-none" style={styles.floatingDoneContainer}>
              <Button
                accessibilityLabel={confirmLabel}
                disabled={confirmDisabled}
                onPress={() => void onConfirm()}
                style={styles.floatingDoneButton}
                variant="primary"
              >
                <Text style={styles.saveButtonLabel}>{confirmLabel}</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  heroModalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    position: 'relative',
  },
  heroModalSourceTabs: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  heroModalCard: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.sm,
  },
  heroModalScroll: {
    flex: 1,
  },
  heroModalScrollContent: {
    paddingBottom: spacing['3xl'] + spacing.xl,
  },
  heroModalPreviewSection: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  heroModalPreviewColumn: {
    flexBasis: '50%',
    flexGrow: 1,
    minWidth: 220,
  },
  heroModalPreviewFrame: {
    width: '100%',
    aspectRatio: 12 / 5,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroModalPreviewInner: {
    flex: 1,
  },
  heroModalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  heroModalControls: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 220,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  heroModalAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroModalActionButton: {
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroModalActionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  heroModalSupportText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  heroModalUploadContainer: {
    width: '100%',
  },
  heroModalUpload: {
    width: '100%',
  },
  heroModalUploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonTextAlt: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.destructive,
    textAlign: 'center',
  },
  heroUnsplashSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroUnsplashInputWrapper: {
    flex: 1,
  },
  heroUnsplashInputContainer: {
    minHeight: 40,
  },
  heroUnsplashInputText: {
    flex: 1,
    color: colors.textPrimary,
  },
  heroUnsplashSearchLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  floatingDoneContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  floatingDoneButton: {
    minWidth: 160,
    maxWidth: 280,
    alignSelf: 'center',
    paddingHorizontal: spacing['2xl'],
    ...floatingControl.shadow,
  },
  saveButtonLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
    fontFamily: fonts.semibold,
  },
  masonryOuter: {
    marginTop: spacing.sm,
    width: '100%',
  },
  masonryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },
  masonryColumnRight: {
    marginLeft: spacing.sm,
  },
  masonryTile: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  masonryTileSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  masonryImage: {
    width: '100%',
    height: '100%',
  },
  arcHeroTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  arcHeroTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroTopoDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  arcHeroTopoDotSmall: {
    width: 3,
    height: 3,
  },
  arcHeroTopoDotMedium: {
    width: 5,
    height: 5,
  },
  arcHeroTopoDotLarge: {
    width: 7,
    height: 7,
  },
  arcHeroTopoDotHidden: {
    opacity: 0,
  },
  arcHeroMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  arcHeroMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroMosaicCell: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroMosaicShapeBase: {
    opacity: 0.85,
  },
  arcHeroMosaicCircle: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  arcHeroMosaicPillVertical: {
    width: 8,
    height: 14,
    borderRadius: 999,
  },
  arcHeroMosaicPillHorizontal: {
    width: 14,
    height: 8,
    borderRadius: 999,
  },
});
