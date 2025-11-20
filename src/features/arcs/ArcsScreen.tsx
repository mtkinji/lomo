import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useNavigation as useRootNavigation } from '@react-navigation/native';
import { VStack, Heading, Text, Icon as GluestackIcon, HStack, Pressable } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../ui/Icon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ArcsStackParamList, RootDrawerParamList } from '../../navigation/RootNavigator';
import { generateArcs, GeneratedArc } from '../../services/ai';
import { Button } from '../../ui/Button';
import { LomoBottomSheet } from '../../ui/BottomSheet';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Card } from '../../ui/Card';
import { Logo } from '../../ui/Logo';
import type { Arc, Goal } from '../../domain/types';
import { AiChatPane } from '../ai/AiChatScreen';

const ARC_CREATION_DRAFT_STORAGE_KEY = 'lomo-coach-draft:arcCreation:v1';

type ArcCoachDraftMeta = {
  id: string;
  lastUpdatedAt: string;
  preview: string | null;
};

const logArcsDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcs] ${event}`, payload);
    } else {
      console.log(`[arcs] ${event}`);
    }
  }
};

// Palette + hashing helpers for rich, pseudo-random Arc thumbnails.
// These mirror the hero palettes in ArcDetail so the list and detail views
// feel like the same visual system.
const ARC_THUMBNAIL_PALETTES: [string, string][] = [
  ['#DCFCE7', '#86EFAC'],
  ['#E0F2FE', '#7DD3FC'],
  ['#FEF3C7', '#FACC15'],
  ['#FCE7F3', '#F472B6'],
  ['#EDE9FE', '#A855F7'],
  ['#F1F5F9', '#CBD5F5'],
];

const ARC_THUMBNAIL_DIRECTIONS = [
  { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
  { start: { x: 0.1, y: 0 }, end: { x: 1, y: 0.8 } },
  { start: { x: 0, y: 0.2 }, end: { x: 0.9, y: 1 } },
];

const hashStringToIndex = (value: string, modulo: number): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash);
  return modulo === 0 ? 0 : normalized % modulo;
};

const getArcInitial = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase();
};

// Abstract topography model: 8x8 grid of dots whose sizes are driven by a hash
// of the Arc id / name. This gives a rough "terrain" impression while staying
// cheap and deterministic.
const ARC_TOPO_GRID_SIZE = 8;
const ARC_TOPO_CELL_COUNT = ARC_TOPO_GRID_SIZE * ARC_TOPO_GRID_SIZE;

const getArcTopoSizes = (seed: string): number[] => {
  if (!seed) {
    return Array(ARC_TOPO_CELL_COUNT).fill(1);
  }
  const sizes: number[] = [];
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < ARC_TOPO_CELL_COUNT; i += 1) {
    const twoBits = (value >> ((i * 2) % 30)) & 0b11; // 0–3
    const size = twoBits % 3; // 0 = small, 1 = medium, 2 = large
    sizes.push(size);
  }
  return sizes;
};

// Geo mosaic model: 3x4 grid of bold geometric tiles (circles and pills)
// inspired by modernist patterns. All shapes are deterministic from the
// Arc id / name and rendered on top of the gradient / hero image.
const ARC_MOSAIC_ROWS = 3;
const ARC_MOSAIC_COLS = 4;
const ARC_MOSAIC_COLORS = ['#F97373', '#0F3C5D', '#FACC15', '#F9E2AF', '#E5E7EB'];

type ArcMosaicCell = {
  shape: 0 | 1 | 2 | 3; // 0=empty,1=circle,2=vertical pill,3=horizontal pill
  color: string;
};

const getArcMosaicCell = (seed: string, row: number, col: number): ArcMosaicCell => {
  const base = hashStringToIndex(`${seed}:${row}:${col}`, 1024);
  const shape = (base % 4) as ArcMosaicCell['shape'];
  const colorIndex = (base >> 2) % ARC_MOSAIC_COLORS.length;
  return { shape, color: ARC_MOSAIC_COLORS[colorIndex] };
};

const formatRelativeDate = (iso: string | undefined): string => {
  if (!iso) return 'just now';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'just now';

    const diffMs = Date.now() - date.getTime();
    if (diffMs <= 0) return 'just now';

    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) {
      return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} h${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } catch {
    return 'just now';
  }
};

async function readArcCreationDraftMeta(): Promise<ArcCoachDraftMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      messages?: { role?: string; content?: string }[];
      input?: string;
      updatedAt?: string;
    };
    if (!parsed || !Array.isArray(parsed.messages)) {
      return null;
    }

    const updatedAt =
      typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString();

    let preview: string | null = null;
    const userMessages = parsed.messages.filter(
      (m) => m && m.role === 'user' && typeof m.content === 'string',
    );
    const lastUser = userMessages[userMessages.length - 1];
    if (lastUser && lastUser.content) {
      const trimmed = lastUser.content.trim();
      if (trimmed.length > 0) {
        preview = trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
      }
    }

    if (!preview && typeof parsed.input === 'string') {
      const trimmed = parsed.input.trim();
      if (trimmed.length > 0) {
        preview = trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
      }
    }

    return {
      id: 'arc-creation',
      lastUpdatedAt: updatedAt,
      preview,
    };
  } catch (err) {
    if (__DEV__) {
      console.warn('[arcs] Failed to read arc coach draft meta', err);
    }
    return null;
  }
}

export function ArcsScreen() {
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const drawerNavigation = useRootNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resumeDraftOnOpen, setResumeDraftOnOpen] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [arcCoachDraft, setArcCoachDraft] = useState<ArcCoachDraftMeta | null>(null);
  const thumbnailStyles = useAppStore((state) => {
    const visuals = state.userProfile?.visuals;
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  });
  useEffect(() => {
    if (__DEV__) {
      console.log('ArcsScreen rendered');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const meta = await readArcCreationDraftMeta();
      setArcCoachDraft(meta);
    })();
  }, []);

  // When the Arc Creation coach drawer is dismissed after a conversation,
  // re-read any saved draft so it appears in the "In-progress Arc drafts" section
  // without requiring a full navigation away and back to this screen.
  useEffect(() => {
    if (isModalVisible) {
      return;
    }
    (async () => {
      const meta = await readArcCreationDraftMeta();
      setArcCoachDraft(meta);
    })();
  }, [isModalVisible]);

  const empty = arcs.length === 0;

  const arcCoachLaunchContext = useMemo(
    () => buildArcCoachLaunchContext(arcs, goals),
    [arcs, goals]
  );

  const goalCountByArc = useMemo(() => {
    return goals.reduce<Record<string, number>>((acc, goal) => {
      acc[goal.arcId] = (acc[goal.arcId] ?? 0) + 1;
      return acc;
    }, {});
  }, [goals]);

  const activityCountByArc = useMemo(() => {
    const counts: Record<string, number> = {};
    const goalArcLookup = goals.reduce<Record<string, string>>((acc, goal) => {
      acc[goal.id] = goal.arcId;
      return acc;
    }, {});
    activities.forEach((activity) => {
      const arcId = activity.goalId ? goalArcLookup[activity.goalId] : undefined;
      if (!arcId) return;
      counts[arcId] = (counts[arcId] ?? 0) + 1;
    });
    return counts;
  }, [activities, goals]);
  const listTopPadding = headerHeight ? headerHeight + spacing.md : spacing['2xl'];
  const hideScrollIndicator = arcs.length <= 5;

  return (
    <AppShell>
      <View style={styles.screen}>
        <View
          style={styles.fixedHeader}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          <PageHeader
            title="Arcs"
            iconName="arcs"
            menuOpen={menuOpen}
            onPressMenu={() => drawerNavigation.dispatch(DrawerActions.openDrawer())}
            onPressInfo={() => setInfoVisible(true)}
            rightElement={
              <Button
                size="icon"
                accessibilityRole="button"
                accessibilityLabel="Ask LOMO to create a new Arc"
                style={styles.newArcButton}
                onPress={() => {
                  logArcsDebug('newArc:open-pressed');
                  setResumeDraftOnOpen(false);
                  setIsModalVisible(true);
                }}
              >
                <GluestackIcon as={() => <Icon name="plus" size={16} color="#FFFFFF" />} />
              </Button>
            }
          />
        </View>
        <FlatList
          style={styles.list}
          data={arcs}
          keyExtractor={(arc) => arc.id}
          ItemSeparatorComponent={() => <VStack style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: spacing.md,
              paddingTop: listTopPadding,
            },
            empty && styles.listEmptyContent,
          ]}
          ListEmptyComponent={
            <VStack space="sm" style={styles.emptyState}>
              <Heading style={styles.emptyTitle}>No arcs yet</Heading>
              <Text style={styles.emptyBody}>
                Arcs are long-horizon identity directions like Discipleship, Family Stewardship, or
                Making &amp; Embodied Creativity. We&apos;ll use AI to help you define them.
              </Text>
            </VStack>
          }
          renderItem={({ item }) => {
            const goalCount = goalCountByArc[item.id] ?? 0;
            const activityCount = activityCountByArc[item.id] ?? 0;
            const paletteIndex = hashStringToIndex(
              item.id || item.name,
              ARC_THUMBNAIL_PALETTES.length
            );
            const [startColor, endColor] = ARC_THUMBNAIL_PALETTES[paletteIndex];
            const direction =
              ARC_THUMBNAIL_DIRECTIONS[
                hashStringToIndex(`${item.id || item.name}:dir`, ARC_THUMBNAIL_DIRECTIONS.length)
              ];
            const seed = item.id || item.name;
            const topoSizes = getArcTopoSizes(seed);
            const styleIndex =
              thumbnailStyles.length > 0
                ? hashStringToIndex(seed, thumbnailStyles.length)
                : 0;
            const thumbnailStyle = thumbnailStyles[styleIndex] ?? 'topographyDots';
            const showTopography = thumbnailStyle === 'topographyDots';
            const showGeoMosaic = thumbnailStyle === 'geoMosaic';

            return (
              <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}>
                <Card style={styles.arcCard}>
                  <View style={styles.arcCardContent}>
                    <View style={styles.arcThumbnailWrapper}>
                      <View style={styles.arcThumbnailPlaceholder}>
                        {item.thumbnailUrl ? (
                          <Image
                            source={{ uri: item.thumbnailUrl }}
                            style={styles.arcThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={[startColor, endColor]}
                            start={direction.start}
                            end={direction.end}
                            style={styles.arcThumbnailGradient}
                          />
                        )}
                        {showTopography && (
                          <View style={styles.arcTopoLayer}>
                            <View style={styles.arcTopoGrid}>
                              {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                                <View
                                  // eslint-disable-next-line react/no-array-index-key
                                  key={`topo-row-${rowIndex}`}
                                  style={styles.arcTopoRow}
                                >
                                  {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                                    const cellIndex =
                                      rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                                    const size = topoSizes[cellIndex] ?? 1;
                                    return (
                                      // eslint-disable-next-line react/no-array-index-key
                                      <View
                                        key={`topo-cell-${rowIndex}-${colIndex}`}
                                        style={[
                                          styles.arcTopoDot,
                                          size === 0 && styles.arcTopoDotSmall,
                                          size === 1 && styles.arcTopoDotMedium,
                                          size === 2 && styles.arcTopoDotLarge,
                                        ]}
                                      />
                                    );
                                  })}
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                        {showGeoMosaic && (
                          <View style={styles.arcMosaicLayer}>
                            {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                              <View
                                // eslint-disable-next-line react/no-array-index-key
                                key={`mosaic-row-${rowIndex}`}
                                style={styles.arcMosaicRow}
                              >
                                {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                                  const cell = getArcMosaicCell(seed, rowIndex, colIndex);
                                  if (cell.shape === 0) {
                                    return (
                                      // eslint-disable-next-line react/no-array-index-key
                                      <View
                                        key={`mosaic-cell-${rowIndex}-${colIndex}`}
                                        style={styles.arcMosaicCell}
                                      />
                                    );
                                  }

                                  let shapeStyle = styles.arcMosaicCircle;
                                  if (cell.shape === 2) {
                                    shapeStyle = styles.arcMosaicPillVertical;
                                  } else if (cell.shape === 3) {
                                    shapeStyle = styles.arcMosaicPillHorizontal;
                                  }

                                  return (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <View
                                      key={`mosaic-cell-${rowIndex}-${colIndex}`}
                                      style={styles.arcMosaicCell}
                                    >
                                      <View
                                        style={[
                                          styles.arcMosaicShapeBase,
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
                    <VStack space="xs" style={styles.arcTextContainer}>
                      <Heading
                        style={styles.arcTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.name}
                      </Heading>
                      <HStack space="lg" style={styles.arcMetaRow} alignItems="center">
                        <HStack space="xs" alignItems="center">
                          <Icon name="goals" size={14} color={colors.textSecondary} />
                          <Text style={styles.arcStatValue}>{goalCount}</Text>
                          <Text style={styles.arcStatLabel}>
                            {goalCount === 1 ? 'Goal' : 'Goals'}
                          </Text>
                        </HStack>
                        <HStack space="xs" alignItems="center">
                          <Icon name="activities" size={14} color={colors.textSecondary} />
                          <Text style={styles.arcStatValue}>{activityCount}</Text>
                          <Text style={styles.arcStatLabel}>
                            {activityCount === 1 ? 'Activity' : 'Activities'}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </View>
                </Card>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={!hideScrollIndicator}
          ListFooterComponent={
            <ArcDraftSection
              draft={arcCoachDraft}
              onResume={() => {
                logArcsDebug('draft:resume-pressed');
              setResumeDraftOnOpen(true);
                setIsModalVisible(true);
              }}
              onDiscard={async () => {
                logArcsDebug('draft:discard-pressed');
                await AsyncStorage.removeItem(ARC_CREATION_DRAFT_STORAGE_KEY);
                setArcCoachDraft(null);
              }}
            />
          }
        />
      </View>
      <ArcInfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      <NewArcModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
        }}
        launchContext={arcCoachLaunchContext}
        resumeDraft={resumeDraftOnOpen}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Prevent cards from peeking above the fixed header into the safe area
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    // Let the list inherit the app shell / canvas background so it doesn’t look like a separate panel
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  listContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: 0,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    // Header floats above the Light Canvas with a subtle tint
    backgroundColor: colors.shell,
  },
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  newArcButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
    width: 36,
    height: 36,
  },
  arcCard: {
    // Symmetric padding; let the content determine height so the card can
    // grow naturally with longer titles while preserving padding.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    // Let the app shell define horizontal gutters so cards align with the header
    marginHorizontal: 0,
    // Use the base card vertical spacing so lists stay consistent across screens
    marginVertical: 0,
  },
  arcCardContent: {
    flexDirection: 'row',
    // Top-align the thumbnail and text so their top edges line up.
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  arcThumbnailWrapper: {
    // Compact square thumbnail anchored to the top of the card.
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcThumbnail: {
    width: '100%',
    height: '100%',
  },
  arcThumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arcThumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  arcTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  arcTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  arcTopoDotSmall: {
    width: 2,
    height: 2,
  },
  arcTopoDotMedium: {
    width: 4,
    height: 4,
  },
  arcTopoDotLarge: {
    width: 6,
    height: 6,
  },
  arcMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  arcMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcMosaicShapeBase: {
    borderRadius: 999,
  },
  arcMosaicCircle: {
    width: '70%',
    height: '70%',
  },
  arcMosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  arcMosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
  arcThumbnailInitial: {
    ...typography.titleSm,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 22,
  },
  arcTextContainer: {
    flex: 1,
    // Let the title sit at the top of the text column and the meta row hug
    // the bottom edge so counts visually anchor to the card baseline.
    justifyContent: 'space-between',
  },
  arcTitle: {
    ...typography.body, // Use slightly smaller size but preserve title styles below
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcMetaRow: {
    marginTop: spacing.xs,
  },
  arcStatValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  arcStatLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  drawerKeyboardContainer: {
    flex: 1,
  },
  drawerContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTextBlock: {
    flexDirection: 'column',
  },
  brandWordmark: {
    ...typography.brand,
    color: colors.textPrimary,
  },
  brandSubLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sheetHandle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  infoSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  conversationContainer: {
    flex: 1,
    marginTop: spacing.md,
  },
  conversationScroll: {
    flex: 1,
  },
  conversationContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  messageBubble: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.shellAlt,
  },
  statusBubble: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  messageText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  composerSection: {
    marginTop: spacing.lg,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickReplyButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 0,
  },
  quickReplyText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 80,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  composerSendButton: {
    minHeight: 52,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  errorBubble: {
    backgroundColor: colors.schedulePink,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  errorLabel: {
    color: colors.warning,
  },
  errorTextColor: {
    color: colors.textPrimary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  suggestionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chatSuggestionCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    flex: 1,
  },
  linkText: {
    ...typography.bodySm,
    color: colors.accent,
    fontWeight: '600',
  },
  draftSection: {
    marginTop: spacing.xl,
    paddingHorizontal: 0,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  draftSectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  draftSectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  draftToggle: {
    alignSelf: 'stretch',
    paddingVertical: spacing.xs,
  },
  draftToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  draftToggleText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  draftList: {
    marginTop: spacing.xs,
  },
  draftCard: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  draftTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  draftBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  draftBadgeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  draftPreview: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  draftMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  draftMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  draftDiscardText: {
    ...typography.bodySm,
    color: colors.accent,
    fontWeight: '600',
  },
});

type NewArcModalProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional workspace snapshot passed down to Lomo Coach when launched
   * from the Arcs screen. This gives the coach full context on existing
   * arcs and goals so it can suggest complementary Arcs.
   */
  launchContext?: string;
  /**
   * Whether to resume any saved Arc Creation draft when opening the coach.
   * When false, a brand new conversation is started even if a draft exists.
   */
  resumeDraft?: boolean;
};

function ArcInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.55}>
      <Heading style={styles.infoTitle}>What is an Arc?</Heading>
      <Text style={styles.infoBody}>
        An Arc is a long-horizon identity direction—like Discipleship, Craft, or Family Stewardship.
        Each Arc anchors the season you&apos;re in, guides your goals, and keeps your activities
        accountable to who you&apos;re becoming.
      </Text>
      <Text style={styles.infoBody}>
        Capture a few Arcs to frame the next few months. You can add or archive them as your story
        shifts.
      </Text>
      <Button style={{ marginTop: spacing.lg }} onPress={onClose}>
        <Text style={styles.buttonText}>Got it</Text>
      </Button>
    </BottomDrawer>
  );
}

function NewArcModal({ visible, onClose, launchContext, resumeDraft = true }: NewArcModalProps) {
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();

  const handleConfirmArc = (proposal: GeneratedArc) => {
    const timestamp = new Date().toISOString();
    const id = `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const arc: Arc = {
      id,
      name: proposal.name,
      narrative: proposal.narrative,
      status: proposal.status ?? 'active',
      startDate: timestamp,
      endDate: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addArc(arc);
    onClose();
    navigation.navigate('ArcDetail', { arcId: id });
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <AiChatPane
        mode="arcCreation"
        launchContext={launchContext}
        resumeDraft={resumeDraft}
        onConfirmArc={handleConfirmArc}
      />
    </BottomDrawer>
  );
}

type ArcDraftSectionProps = {
  draft: ArcCoachDraftMeta | null;
  onResume: () => void;
  onDiscard: () => void;
};

function ArcDraftSection({ draft, onResume, onDiscard }: ArcDraftSectionProps) {
  if (!draft) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const lastUpdatedLabel = formatRelativeDate(draft.lastUpdatedAt);

  return (
    <View style={styles.draftSection}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={styles.draftToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide Arc drafts' : 'Show Arc drafts'}
      >
        <View style={styles.draftToggleContent}>
          <Text style={styles.draftToggleText}>Drafts</Text>
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>
      {expanded && (
        <View style={styles.draftList}>
          <Pressable onPress={onResume}>
            <Card style={styles.draftCard}>
              <Text style={styles.draftPreview}>
                {draft.preview ?? 'Arc draft with Lomo Coach'}
              </Text>
              <View style={styles.draftMetaRow}>
                <Text style={styles.draftMetaText}>{lastUpdatedLabel}</Text>
                <Pressable
                  onPress={onDiscard}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Discard Arc draft"
                >
                  <Icon name="trash" size={14} color={colors.accent} />
                </Pressable>
              </View>
            </Card>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function buildArcCoachLaunchContext(arcs: Arc[], goals: Goal[]): string | undefined {
  if (arcs.length === 0 && goals.length === 0) {
    return undefined;
  }

  const lines: string[] = [];

  lines.push(
    'Existing workspace snapshot: the user already has the following arcs and goals. Use this to keep new Arc suggestions distinctive and complementary.'
  );
  lines.push(`Total arcs: ${arcs.length}. Total goals: ${goals.length}.`);
  lines.push('');

  arcs.forEach((arc) => {
    const arcGoals = goals.filter((goal) => goal.arcId === arc.id);

    lines.push(`Arc: ${arc.name} (status: ${arc.status}).`);
    if (arc.narrative) {
      lines.push(`Narrative: ${arc.narrative}`);
    }

    if (arcGoals.length > 0) {
      lines.push('Goals in this arc:');
      arcGoals.forEach((goal) => {
        const trimmedDescription =
          goal.description && goal.description.length > 200
            ? `${goal.description.slice(0, 197)}…`
            : goal.description;

        const base = `- ${goal.title} (status: ${goal.status})`;
        lines.push(
          trimmedDescription ? `${base} – ${trimmedDescription}` : base
        );
      });
    } else {
      lines.push('No goals are currently attached to this arc.');
    }

    lines.push(''); // spacer between arcs
  });

  return lines.join('\n');
}


