import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { StyleSheet, FlatList, View, TextInput, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
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
import { CHAT_MODE_REGISTRY } from '../ai/chatRegistry';
import { AiChatPane } from '../ai/AiChatScreen';

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
  const activities = useAppStore((state) => state.activities);
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const drawerNavigation = useRootNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    if (__DEV__) {
      console.log('ArcsScreen rendered');
    }
  }, []);

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
            return (
              <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}>
                <Card style={styles.arcCard}>
                  <VStack space="sm">
                    <Heading style={styles.arcTitle}>{item.name}</Heading>
                    {item.narrative && <Text style={styles.arcNarrative}>{item.narrative}</Text>}
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
                </Card>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={!hideScrollIndicator}
        />
      </View>
      <ArcInfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      <NewArcModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
        }}
        launchContext={arcCoachLaunchContext}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    // Let the app shell define horizontal gutters so cards align with the header
    marginHorizontal: 0,
    // Use the base card vertical spacing so lists stay consistent across screens
    marginVertical: 0,
  },
  arcTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    // Use heavy weight while keeping the more compact titleSm size
    fontFamily: 'Inter_800ExtraBold',
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

function NewArcModal({ visible, onClose, launchContext }: NewArcModalProps) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <AiChatPane mode="arcCreation" launchContext={launchContext} />
    </BottomDrawer>
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
    if (arc.northStar) {
      lines.push(`North star: ${arc.northStar}`);
    }
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


