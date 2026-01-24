import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation as useRootNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { fonts } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { Card } from '../../ui/Card';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ArcsStackParamList, RootDrawerParamList } from '../../navigation/RootNavigator';
import { openRootDrawer } from '../../navigation/openDrawer';
import type { Arc, Goal } from '../../domain/types';
import { canCreateArc } from '../../domain/limits';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { ArcListCard } from '../../ui/ArcListCard';
import { EmptyState, KeyboardAwareScrollView } from '../../ui/primitives';
import { ensureArcDevelopmentInsights } from './arcDevelopmentInsights';
import { ensureArcBannerPrefill } from './arcBannerPrefill';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { HapticsService } from '../../services/HapticsService';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { EditableField } from '../../ui/EditableField';
import { LongTextField } from '../../ui/LongTextField';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';
import { buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { LinearGradient } from 'expo-linear-gradient';
import { buildArcThumbnailSeed, getArcGradient } from './thumbnailVisuals';
import { openPaywallInterstitial } from '../../services/paywall';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { FloatingActionButton } from '../../ui/FloatingActionButton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';

const logArcsDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcs] ${event}`, payload);
    } else {
      console.log(`[arcs] ${event}`);
    }
  }
};

export function ArcsScreen() {
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const drawerNavigation = useRootNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [newArcModalVisible, setNewArcModalVisible] = useState(false);
  const [showArchived, setShowArchived] = useState(true);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const visibleArcs = useMemo(() => arcs.filter((arc) => arc.status !== 'archived'), [arcs]);
  const archivedArcs = useMemo(() => arcs.filter((arc) => arc.status === 'archived'), [arcs]);

  const handleOpenNewArc = () => {
    const canCreate = canCreateArc({ isPro, arcs });
    if (!canCreate.ok) {
      openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'arcs_create' });
      return;
    }
    setNewArcModalVisible(true);
  };

  const arcCreationWorkflow = useMemo(
    () => getWorkflowLaunchConfig('arcCreation'),
    []
  );

  const goalCountByArc = useMemo(
    () =>
      goals.reduce<Record<string, number>>((acc, goal) => {
        if (!goal.arcId) return acc;
        acc[goal.arcId] = (acc[goal.arcId] ?? 0) + 1;
        return acc;
      }, {}),
    [goals]
  );

  const listTopPadding = headerHeight ? headerHeight : spacing['2xl'];
  const fabClearancePx = insets.bottom + spacing.lg + 56 + spacing.lg;
  const listBottomPadding = fabClearancePx;

  return (
    <AppShell>
      <View style={styles.screen}>
        <View
          style={styles.fixedHeader}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            setHeaderHeight((prev) =>
              Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight,
            );
          }}
        >
          <PageHeader
            title="Arcs"
            menuOpen={menuOpen}
            onPressMenu={() => openRootDrawer(drawerNavigation)}
            rightElement={
              <DropdownMenu>
                <DropdownMenuTrigger accessibilityLabel="Arc list options">
                  <View pointerEvents="none">
                    <IconButton
                      accessibilityRole="button"
                      accessibilityLabel="Arc list options"
                      variant="outline"
                    >
                      <Icon name="more" size={18} color={colors.textPrimary} />
                    </IconButton>
                  </View>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                  <DropdownMenuCheckboxItem
                    checked={showArchived}
                    onCheckedChange={(next) => {
                      const resolved = Boolean(next);
                      setShowArchived(resolved);
                      if (!resolved) setArchivedExpanded(false);
                    }}
                  >
                    <Text style={typography.bodySm}>Show archived</Text>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </View>
        <View style={styles.listContainer}>
          <FlatList
            style={styles.list}
            data={visibleArcs}
            keyExtractor={(arc) => arc.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: listTopPadding, paddingBottom: listBottomPadding },
              visibleArcs.length === 0 ? styles.listEmptyContent : null,
            ]}
            renderItem={({ item }) => (
              <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}>
                <ArcListCard arc={item} goalCount={goalCountByArc[item.id] ?? 0} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              archivedArcs.length > 0 ? (
                <EmptyState
                  title="No active arcs"
                  instructions="Your archived arcs are below."
                  primaryAction={{
                    label: 'Create Arc',
                    variant: 'accent',
                    onPress: handleOpenNewArc,
                    accessibilityLabel: 'Create a new Arc',
                  }}
                  style={styles.emptyState}
                />
              ) : (
                <EmptyState
                  title="No arcs yet"
                  instructions="Create an Arc to define a meaningful direction."
                  primaryAction={{
                    label: 'Create Arc',
                    variant: 'accent',
                    onPress: handleOpenNewArc,
                    accessibilityLabel: 'Create a new Arc',
                  }}
                  style={styles.emptyState}
                />
              )
            }
            ListFooterComponent={
              showArchived && archivedArcs.length > 0 ? (
                <View style={styles.archivedSection}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={archivedExpanded ? 'Hide archived arcs' : 'Show archived arcs'}
                    onPress={() => setArchivedExpanded((prev) => !prev)}
                    style={styles.archivedToggle}
                  >
                    <View style={styles.archivedToggleRow}>
                      <Text style={styles.archivedTitle}>{`Archived (${archivedArcs.length})`}</Text>
                      <Icon
                        name={archivedExpanded ? 'chevronDown' : 'chevronRight'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {archivedExpanded ? (
                    <>
                      <View style={{ height: spacing.md }} />
                      {archivedArcs.map((arc, idx) => (
                        <View key={arc.id}>
                          <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: arc.id })}>
                            <ArcListCard arc={arc} goalCount={goalCountByArc[arc.id] ?? 0} />
                          </Pressable>
                          {idx < archivedArcs.length - 1 ? <View style={styles.separator} /> : null}
                        </View>
                      ))}
                    </>
                  ) : null}
                  <View style={{ height: spacing['2xl'] }} />
                </View>
              ) : (
                <View style={{ height: spacing['2xl'] }} />
              )
            }
          />
        </View>

        <FloatingActionButton
          accessibilityLabel="Create a new Arc"
          onPress={() => {
            logArcsDebug('newArc:create-pressed');
            handleOpenNewArc();
          }}
          icon={<Icon name="plus" size={22} color={colors.aiForeground} />}
        />

        <NewArcModal visible={newArcModalVisible} onClose={() => setNewArcModalVisible(false)} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Let card shadows render naturally without clipping at the screen edges.
    overflow: 'visible',
  },
  listContainer: {
    flex: 1,
    // Clip vertical overscroll so Arc cards never appear inside the top
    // safe-area / header band when you pull down on the list.
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    // Let the list inherit the app shell / canvas background so it doesn’t look like a separate panel
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  listContent: {
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
  archivedSection: {
    paddingHorizontal: 0,
    paddingTop: spacing.xl,
  },
  archivedTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  archivedToggle: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  archivedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  arcCard: {
    // Use the shared card surface style so Arc rows feel like proper cards
    // sitting on the canvas (and remain visible without Tailwind styles).
    ...cardSurfaceStyle,
    // Symmetric padding; let the content determine height so the card can grow
    // naturally with longer titles while preserving padding.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    // Let the app shell define horizontal gutters so cards align with the header.
    marginHorizontal: 0,
    // Use the base card vertical spacing so lists stay consistent across screens.
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
  },
  arcThumbnail: {
    width: '100%',
    height: '100%',
  },
  arcThumbnailInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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
    padding: spacing.sm,
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
    width: 3,
    height: 3,
  },
  arcTopoDotMedium: {
    width: 5,
    height: 5,
  },
  arcTopoDotLarge: {
    width: 7,
    height: 7,
  },
  arcTopoDotHidden: {
    opacity: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.lg,
    marginTop: spacing.xs,
  },
  arcMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
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
    height: spacing.sm,
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
  headerSideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
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
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 44,
  },
  manualNarrativeInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  manualFieldsStack: {
    marginTop: spacing.sm,
  },
  manualPrimaryActionContainer: {
    marginTop: spacing.xl,
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
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  segmentedOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  segmentedOptionActive: {
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentedOptionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedOptionLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  headerModeSwitcher: {
    marginLeft: spacing.md,
  },
  segmentedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  modeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  modeLabelText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  modeLabelInfoIcon: {
    marginLeft: spacing.sm,
  },
  manualFormContainer: {
    flex: 1,
    // Let the BottomDrawer define the primary horizontal gutters so this form
    // aligns with other canvases. Horizontal padding is handled by the sheet,
    // not this ScrollView.
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  manualInner: {
    // The inner wrapper exists only to provide vertical spacing so the Card
    // can run full-width inside the sheet gutters.
    paddingTop: spacing.sm,
  },
  manualCard: {
    width: '100%',
  },
  manualHeroContainer: {
    // Let the Card's padding handle the top gutter so the hero banner has
    // consistent spacing on all sides.
    marginTop: 0,
    marginBottom: spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  manualHeroImage: {
    width: '100%',
    aspectRatio: 12 / 5,
  },
});

type NewArcModalProps = {
  visible: boolean;
  onClose: () => void;
};

function ArcInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['55%']}>
      <Text style={styles.infoTitle}>What is an Arc?</Text>
      <Text style={styles.infoBody}>
        An Arc is a long-horizon identity direction—like Discipleship, Craft, or Family Stewardship.
        It names a future version of you that feels worth becoming, then gives your goals and
        activities something meaningful to aim at.
      </Text>
      <Text style={styles.infoBody}>
        When your goals and daily actions sit inside a clear Arc, your effort stops feeling random
        and starts feeling like real progress toward a life that fits you. Capture a few Arcs to
        frame the next few months—you can add or archive them as your story shifts.
      </Text>
      <Button style={{ marginTop: spacing.lg }} onPress={onClose}>
        <Text style={styles.buttonText}>Got it</Text>
      </Button>
    </BottomDrawer>
  );
}

function NewArcModal({ visible, onClose }: NewArcModalProps) {
  const addArc = useAppStore((state) => state.addArc);
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const userProfile = useAppStore((state) => state.userProfile);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const { capture } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [manualName, setManualName] = useState('');
  const [manualNarrative, setManualNarrative] = useState('');
  const [isArcInfoVisible, setIsArcInfoVisible] = useState(false);

  const arcCreationWorkflow = useMemo(
    () => getWorkflowLaunchConfig('arcCreation'),
    []
  );

  const workspaceSnapshot = useMemo(
    () => buildArcCoachLaunchContext(arcs, goals),
    [arcs, goals]
  );

  const heroSeed = useMemo(
    () => buildArcThumbnailSeed('new-arc', manualName || 'New Arc', null),
    [manualName]
  );

  const { colors: headerGradientColors, direction: headerGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed]
  );

  useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setManualName('');
      setManualNarrative('');
    }
  }, [visible]);

  const handleCreateManualArc = () => {
    const canCreate = canCreateArc({ isPro, arcs });
    if (!canCreate.ok) {
      // Avoid stacked RN Modals: close this Arc creation drawer first, then open the global paywall.
      onClose();
      setTimeout(() => {
        openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'arcs_create' });
      }, 360);
      return;
    }

    const trimmedName = manualName.trim();
    const trimmedNarrative = manualNarrative.trim();
    if (!trimmedName) {
      return;
    }
    const timestamp = new Date().toISOString();
    const id = `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const arc: Arc = {
      id,
      name: trimmedName,
      narrative: trimmedNarrative.length > 0 ? trimmedNarrative : undefined,
      status: 'active',
      startDate: timestamp,
      endDate: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Note: Creating arcs no longer counts as "showing up" for streaks.
    addArc(arc);
    showToast({ message: 'Arc created', variant: 'success', durationMs: 2200 });
    void HapticsService.trigger('outcome.success');
    capture(AnalyticsEvent.ArcCreated, {
      source: 'manual',
      arc_id: arc.id,
    });
    void ensureArcBannerPrefill(arc, {
      fallbackCurated: { userFocusAreas: userProfile?.focusAreas },
    });
    void ensureArcDevelopmentInsights(id);
    onClose();
    navigation.navigate('ArcDetail', { arcId: id });
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      // AgentWorkspace/AiChatScreen implements its own keyboard strategy (padding + scroll-to-focus).
      // Leaving BottomDrawer's KeyboardAvoidingView on causes double-adjustment where the
      // step-card input can be pushed off-screen when the keyboard opens.
      keyboardAvoidanceEnabled={false}
    >
      <View style={styles.drawerKeyboardContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={setActiveTab}
          objectLabel="Arc"
          onPressInfo={() => setIsArcInfoVisible(true)}
          infoAccessibilityLabel="Show context for Arc AI"
        />

        {/* Keep both panes mounted so switching between AI and Manual preserves state. */}
        <View
          style={[
            styles.drawerContent,
            activeTab !== 'ai' && { display: 'none' },
          ]}
        >
          <AgentWorkspace
            mode={arcCreationWorkflow.mode}
            launchContext={{
              source: 'arcsScreenNewArc',
              intent: 'arcCreation',
            }}
            workspaceSnapshot={workspaceSnapshot}
            workflowDefinitionId={arcCreationWorkflow.workflowDefinitionId}
            // Object creation flows should always start from a clean thread
            // instead of resuming any previously saved Arc draft.
            resumeDraft={false}
            hideBrandHeader
            hidePromptSuggestions
            hostBottomInsetAlreadyApplied
            onConfirmArc={(proposal) => {
              const canCreate = canCreateArc({ isPro, arcs });
              if (!canCreate.ok) {
                // Avoid stacked RN Modals: close this Arc creation drawer first, then open the global paywall.
                onClose();
                setTimeout(() => {
                  openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'arcs_create' });
                }, 360);
                return;
              }

              const timestamp = new Date().toISOString();
              const id = `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

              const arc: Arc = {
                id,
                name: proposal.name.trim(),
                narrative: proposal.narrative,
                status: proposal.status ?? 'active',
                startDate: timestamp,
                endDate: null,
                createdAt: timestamp,
                updatedAt: timestamp,
              };

              // Note: Creating arcs no longer counts as "showing up" for streaks.
              addArc(arc);
              showToast({ message: 'Arc created', variant: 'success', durationMs: 2200 });
              void HapticsService.trigger('outcome.success');
              capture(AnalyticsEvent.ArcCreated, {
                source: 'ai',
                arc_id: arc.id,
              });
              void ensureArcBannerPrefill(arc, {
                fallbackCurated: { userFocusAreas: userProfile?.focusAreas },
              });
              void ensureArcDevelopmentInsights(id);
              onClose();
              navigation.navigate('ArcDetail', { arcId: id });
            }}
          />
        </View>

        <View style={[{ flex: 1 }, activeTab !== 'manual' && { display: 'none' }]}>
          <KeyboardAwareScrollView
            style={styles.manualFormContainer}
            contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.manualInner}>
              <Card padding="sm" style={styles.manualCard}>
                <View style={styles.manualHeroContainer}>
                  <LinearGradient
                    colors={headerGradientColors}
                    start={headerGradientDirection.start}
                    end={headerGradientDirection.end}
                    style={styles.manualHeroImage}
                  />
                </View>
                <View style={styles.manualFieldsStack}>
                  <EditableField
                    label="Name"
                    value={manualName}
                    variant="title"
                    autoFocusOnEdit={false}
                    onChange={setManualName}
                    placeholder="Name this Arc"
                    validate={(next) => {
                      if (!next.trim()) {
                        return 'Name cannot be empty';
                      }
                      return null;
                    }}
                  />
                  <View style={{ marginTop: spacing.sm }}>
                    <LongTextField
                      label="Description"
                      value={manualNarrative}
                      placeholder="Add a short note about this Arc…"
                      onChange={setManualNarrative}
                      // Manual creation lives inside a BottomDrawer already; keep this editor a bit smaller.
                      snapPoints={['75%']}
                    />
                  </View>
                </View>
                <View style={styles.manualPrimaryActionContainer}>
                  <Button
                    disabled={manualName.trim().length === 0}
                    onPress={handleCreateManualArc}
                  >
                    <Text style={styles.buttonText}>Create Arc</Text>
                  </Button>
                </View>
              </Card>
            </View>
          </KeyboardAwareScrollView>
        </View>

        <ArcInfoModal
          visible={isArcInfoVisible}
          onClose={() => setIsArcInfoVisible(false)}
        />
      </View>
    </BottomDrawer>
  );
}
