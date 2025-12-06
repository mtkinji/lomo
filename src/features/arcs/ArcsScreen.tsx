import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useNavigation as useRootNavigation } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { fonts } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../ui/Card';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ArcsStackParamList, RootDrawerParamList } from '../../navigation/RootNavigator';
import { generateArcs, GeneratedArc } from '../../services/ai';
import type { Arc, Goal } from '../../domain/types';
import { scoreArcNarrative } from '../../domain/idealArcs';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { ARC_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { ArcListCard } from '../../ui/ArcListCard';
import { Logo } from '../../ui/Logo';
import { ensureArcDevelopmentInsights } from './arcDevelopmentInsights';

const ARC_CREATION_DRAFT_STORAGE_KEY = 'kwilt-coach-draft:arcCreation:v1';

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
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const drawerNavigation = useRootNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [headerHeight, setHeaderHeight] = useState(0);
  const [newArcModalVisible, setNewArcModalVisible] = useState(false);
  const [arcDraftMeta, setArcDraftMeta] = useState<ArcCoachDraftMeta | null>(null);

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
  const listBottomPadding = 0;

  const workspaceSnapshot = useMemo(
    () => buildArcCoachLaunchContext(arcs, goals),
    [arcs, goals]
  );

  useEffect(() => {
    let isMounted = true;
    readArcCreationDraftMeta()
      .then((meta) => {
        if (isMounted) {
          setArcDraftMeta(meta);
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[arcs] Failed to load arc creation draft meta', err);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
            iconName="arcs"
            menuOpen={menuOpen}
            onPressMenu={() => drawerNavigation.dispatch(DrawerActions.openDrawer())}
            rightElement={
              <IconButton
                accessibilityRole="button"
                accessibilityLabel="Create a new Arc"
                style={styles.newArcButton}
                onPress={() => {
                  logArcsDebug('newArc:create-pressed');
                  setNewArcModalVisible(true);
                }}
              >
                <Icon name="plus" size={18} color="#FFFFFF" />
              </IconButton>
            }
          />
        </View>
        <View style={styles.listContainer}>
          <FlatList
            style={styles.list}
            data={arcs}
            keyExtractor={(arc) => arc.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: listTopPadding, paddingBottom: listBottomPadding },
            ]}
            renderItem={({ item }) => (
              <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}>
                <ArcListCard arc={item} goalCount={goalCountByArc[item.id] ?? 0} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={
              arcDraftMeta ? (
                <ArcDraftSection
                  draft={arcDraftMeta}
                  onResume={() => {
                    logArcsDebug('draft:resume-pressed');
                    setNewArcModalVisible(true);
                  }}
                  onDiscard={() => {
                    AsyncStorage.removeItem(ARC_CREATION_DRAFT_STORAGE_KEY).catch((err) => {
                      if (__DEV__) {
                        console.warn('[arcs] Failed to discard arc draft', err);
                      }
                    });
                    setArcDraftMeta(null);
                  }}
                />
              ) : null
            }
          />
        </View>

        <NewArcModal
          visible={newArcModalVisible}
          onClose={() => setNewArcModalVisible(false)}
          workspaceSnapshot={workspaceSnapshot}
          resumeDraft
        />
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
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandWordmark: {
    ...typography.bodySm,
    fontFamily: fonts.logo,
    color: colors.accent,
    marginLeft: spacing.xs,
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});

type NewArcModalProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional workspace snapshot passed down to kwilt Coach when launched
   * from the Arcs screen. This gives the coach full context on existing
   * arcs and goals so it can suggest complementary Arcs.
   */
  workspaceSnapshot?: string;
  /**
   * Whether to resume any saved Arc Creation draft when opening the coach.
   * When false, a brand new conversation is started even if a draft exists.
   */
  resumeDraft?: boolean;
};

function ArcInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.55}>
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

function NewArcModal({ visible, onClose, workspaceSnapshot, resumeDraft = true }: NewArcModalProps) {
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [manualName, setManualName] = useState('');
  const [manualNarrative, setManualNarrative] = useState('');
  const [isArcInfoVisible, setIsArcInfoVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setManualName('');
      setManualNarrative('');
    }
  }, [visible]);

  const handleConfirmArc = (proposal: GeneratedArc) => {
    if (__DEV__) {
      const judgement = scoreArcNarrative({
        name: proposal.name,
        narrative: proposal.narrative,
      });
      // eslint-disable-next-line no-console
      console.log('[arcJudging] Generated Arc quality', {
        name: proposal.name,
        score: judgement.score,
        scoreLabel: `${judgement.score}/10`,
        components: judgement.components,
      });
    }

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
    void ensureArcDevelopmentInsights(id);
    onClose();
    navigation.navigate('ArcDetail', { arcId: id });
  };

  const handleCreateManualArc = () => {
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

    addArc(arc);
    void ensureArcDevelopmentInsights(id);
    onClose();
    navigation.navigate('ArcDetail', { arcId: id });
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <View style={styles.drawerKeyboardContainer}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.brandLockup}>
            <Logo size={24} />
            <Text style={styles.brandWordmark}>kwilt</Text>
          </View>

          <View style={styles.headerSideRight}>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentedOption,
                  activeTab === 'ai' && styles.segmentedOptionActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Arc with AI"
                onPress={() => setActiveTab('ai')}
              >
                <View style={styles.segmentedOptionContent}>
                  <Icon
                    name="sparkles"
                    size={14}
                    color={activeTab === 'ai' ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentedOptionLabel,
                      activeTab === 'ai' && styles.segmentedOptionLabelActive,
                    ]}
                  >
                    AI
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentedOption,
                  activeTab === 'manual' && styles.segmentedOptionActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Arc manually"
                onPress={() => setActiveTab('manual')}
              >
                <View style={styles.segmentedOptionContent}>
                  <Icon
                    name="edit"
                    size={14}
                    color={
                      activeTab === 'manual' ? colors.textPrimary : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.segmentedOptionLabel,
                      activeTab === 'manual' && styles.segmentedOptionLabelActive,
                    ]}
                  >
                    Manual
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {activeTab === 'ai' ? (
          <View style={styles.drawerContent}>
            <AgentWorkspace
              mode="arcCreation"
              launchContext={{
                source: 'arcsList',
                intent: 'arcCreation',
              }}
              workflowDefinitionId={ARC_CREATION_WORKFLOW_ID}
              workspaceSnapshot={workspaceSnapshot}
              resumeDraft={resumeDraft}
              hideBrandHeader
              hidePromptSuggestions
              onConfirmArc={handleConfirmArc}
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLabel}>Arc name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Family Stewardship"
                placeholderTextColor={colors.textSecondary}
                value={manualName}
                onChangeText={setManualName}
              />
              <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Short narrative</Text>
              <TextInput
                style={[styles.input, styles.manualNarrativeInput]}
                placeholder="Describe the identity direction for this Arc."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={manualNarrative}
                onChangeText={setManualNarrative}
              />
              <View style={{ marginTop: spacing.xl }}>
                <Button
                  disabled={manualName.trim().length === 0}
                  onPress={handleCreateManualArc}
                >
                  <Text style={styles.buttonText}>Create Arc</Text>
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        <ArcInfoModal
          visible={isArcInfoVisible}
          onClose={() => setIsArcInfoVisible(false)}
        />
      </View>
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
                {draft.preview ?? 'Arc draft with kwilt Coach'}
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

