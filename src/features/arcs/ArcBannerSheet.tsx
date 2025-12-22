import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Heading, Input, KeyboardAwareScrollView } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { colors, fonts, spacing, typography } from '../../theme';
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

const logArcBannerSheetDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcBannerSheet] ${event}`, payload);
    } else {
      console.log(`[arcBannerSheet] ${event}`);
    }
  }
};

export type ArcBannerSheetProps = {
  visible: boolean;
  onClose: () => void;
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
  heroGradientColors: string[];
  heroGradientDirection: ArcGradientDirection;
  heroTopoSizes: number[];
  showTopography: boolean;
  showGeoMosaic: boolean;
  onGenerate: () => void;
  onUpload: () => void;
  onRemove: () => void;
  onSelectCurated: (image: ArcHeroImage) => void;
  onSelectUnsplash: (photo: UnsplashPhoto) => void;
};

type HeroImageSourceTab = 'curated' | 'unsplash' | 'upload';
const DEFAULT_SOURCE_TAB: HeroImageSourceTab = 'unsplash';

export function ArcBannerSheet({
  visible,
  onClose,
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
}: ArcBannerSheetProps) {
  const shouldShowTopography = showTopography && !thumbnailUrl;
  const shouldShowGeoMosaic = showGeoMosaic && !thumbnailUrl;
  const showRefreshAction = !thumbnailUrl;

  const defaultTab: HeroImageSourceTab = canUseUnsplash ? DEFAULT_SOURCE_TAB : 'curated';
  const [sourceTab, setSourceTab] = useState<HeroImageSourceTab>(defaultTab);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);
  const [gridWidth, setGridWidth] = useState(0);
  const hasAutoSearchedRef = useRef(false);

  const performUnsplashSearch = useCallback(
    async (explicitQuery?: string) => {
      if (!canUseUnsplash) {
        setUnsplashError('Image library search is a Pro feature.');
        return;
      }
      const query = (explicitQuery ?? unsplashQuery).trim() || arcName.trim();
      if (!query) {
        return;
      }
      try {
        setUnsplashLoading(true);
        setUnsplashError(null);
        // Don't force landscape here; masonry feels better with mixed orientations.
        const results = await searchUnsplashPhotos(query, { perPage: 30, page: 1 });
        if (!results || results.length === 0) {
          setUnsplashError('No results found for that query.');
        }
        setUnsplashResults(results ?? []);
      } catch (err) {
        if (err instanceof UnsplashError) {
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
        setUnsplashError('Unable to load image library results right now.');
      } finally {
        setUnsplashLoading(false);
      }
    },
    [arcName, canUseUnsplash, unsplashQuery]
  );

  useEffect(() => {
    logArcBannerSheetDebug('visible-prop-changed', { visible });
    if (!visible) {
      setSourceTab(defaultTab);
      setUnsplashQuery('');
      setUnsplashError(null);
      setUnsplashResults([]);
      setUnsplashLoading(false);
      setGridWidth(0);
      hasAutoSearchedRef.current = false;
      return;
    }

    // Default to image search (Pro) or Curated (Free).
    setSourceTab(defaultTab);
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
            arcName,
            arcNarrative,
            goalTitles: arcGoalTitles,
          })) ?? '';
        if (cancelled) return;
        const initialQuery = (vibeQuery || arcName).trim();
        if (!initialQuery) return;
        setUnsplashQuery(initialQuery);
        void performUnsplashSearch(initialQuery);
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [arcGoalTitles, arcName, arcNarrative, canUseUnsplash, defaultTab, performUnsplashSearch, visible]);

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
    void performUnsplashSearch();
  }, [performUnsplashSearch]);

  const handleRemove = useCallback(() => {
    if (!hasHero || loading) return;
    Alert.alert('Remove banner image?', 'This will remove the current image for this Arc.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: onRemove,
      },
    ]);
  }, [hasHero, loading, onRemove]);

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['100%']}>
      <View style={styles.heroModalContainer}>
        <View style={styles.modalContent}>
          <Heading style={[styles.modalTitle, { marginBottom: spacing.md }]}>Arc Banner</Heading>
          <SegmentedControl<HeroImageSourceTab>
            value={sourceTab}
            onChange={(next) => {
              if (next === 'unsplash' && !canUseUnsplash) {
                onRequestUpgrade?.();
                setSourceTab('curated');
                return;
              }
              setSourceTab(next);
            }}
            options={[
              { value: 'curated', label: 'Curated' },
              { value: 'unsplash', label: canUseUnsplash ? 'Search' : 'Search · Pro' },
              { value: 'upload', label: 'Upload' },
            ]}
            style={styles.heroModalSourceTabs}
          />

          <View style={styles.heroModalCard}>
            <KeyboardAwareScrollView
              style={styles.heroModalScroll}
              contentContainerStyle={styles.heroModalScrollContent}
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

                <View style={styles.heroModalControls}>
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
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  {sourceTab === 'upload' && (
                    <View style={styles.heroModalUploadContainer}>
                      <Button
                        variant="outline"
                        disabled={loading}
                        onPress={onUpload}
                        style={styles.heroModalUpload}
                      >
                        <Icon name="image" size={18} color={colors.textPrimary} />
                        <Text style={styles.buttonTextAlt}>Upload</Text>
                      </Button>
                    </View>
                  )}
                </View>
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
                              style={[
                                styles.masonryTile,
                                { width: masonryColumnWidth, height },
                                isSelected && styles.masonryTileSelected,
                              ]}
                              activeOpacity={0.88}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
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
                              style={[
                                styles.masonryTile,
                                { width: masonryColumnWidth, height },
                                isSelected && styles.masonryTileSelected,
                              ]}
                              activeOpacity={0.88}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => {
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
                                style={[
                                  styles.masonryTile,
                                  { width: masonryColumnWidth, height },
                                  isSelected && styles.masonryTileSelected,
                                ]}
                                activeOpacity={0.88}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  onSelectUnsplash(photo);
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
                                style={[
                                  styles.masonryTile,
                                  { width: masonryColumnWidth, height },
                                  isSelected && styles.masonryTileSelected,
                                ]}
                                activeOpacity={0.88}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  onSelectUnsplash(photo);
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
            </KeyboardAwareScrollView>
          </View>

          <View style={styles.sheetFooter}>
            <Button variant="accent" onPress={onClose} style={styles.saveButton}>
              <Text style={styles.saveButtonLabel}>Save</Text>
            </Button>
          </View>
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
  },
  modalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
    paddingBottom: spacing.lg,
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
    aspectRatio: 3 / 1,
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
  sheetFooter: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  saveButton: {
    alignSelf: 'stretch',
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


