import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Text, VStack } from '../../ui/primitives';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from '../../ui/layout/BottomDrawerHeader';
import { colors, spacing, typography } from '../../theme';
import { acceptGoalInvite, previewGoalInvite } from '../../services/invites';
import { useJoinSharedGoalDrawerStore } from '../../store/useJoinSharedGoalDrawerStore';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { useToastStore } from '../../store/useToastStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

export function JoinSharedGoalDrawerHost() {
  const { capture } = useAnalytics();
  const visible = useJoinSharedGoalDrawerStore((s) => s.visible);
  const inviteCode = useJoinSharedGoalDrawerStore((s) => s.inviteCode);
  const close = useJoinSharedGoalDrawerStore((s) => s.close);

  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);

  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<{
    goalId: string;
    goalTitle?: string | null;
    inviter?: { userId: string; name?: string | null; avatarUrl?: string | null } | null;
    canJoin?: boolean;
    inviteState?: 'active' | 'expired' | 'consumed';
  } | null>(null);

  const effectiveInviteCode = (inviteCode ?? '').trim();

  useEffect(() => {
    if (!visible) return;
    capture(AnalyticsEvent.JoinGoalDrawerOpened, { source: useJoinSharedGoalDrawerStore.getState().source ?? 'unknown' });
    return () => capture(AnalyticsEvent.JoinGoalDrawerClosed, {});
  }, [capture, visible]);

  useEffect(() => {
    let cancelled = false;
    if (!visible) return;
    if (!effectiveInviteCode) return;
    setPreviewBusy(true);
    previewGoalInvite(effectiveInviteCode)
      .then((p) => {
        if (cancelled) return;
        setPreview(p);
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
      })
      .finally(() => {
        if (cancelled) return;
        setPreviewBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveInviteCode, visible]);

  const previewTitle = useMemo(() => {
    const title = (preview?.goalTitle ?? '').trim();
    return title || 'Shared goal';
  }, [preview?.goalTitle]);

  const inviterLabel = useMemo(() => {
    const name = (preview?.inviter?.name ?? '').trim();
    return name || null;
  }, [preview?.inviter?.name]);

  const alreadyHasGoal = useMemo(() => {
    const goalId = (preview?.goalId ?? '').trim();
    if (!goalId) return false;
    return goals.some((g) => g.id === goalId);
  }, [goals, preview?.goalId]);

  // If we already have the goal locally, skip join UI entirely.
  useEffect(() => {
    if (!visible) return;
    if (!alreadyHasGoal) return;
    const goalId = (preview?.goalId ?? '').trim();
    if (!goalId) return;
    capture(AnalyticsEvent.JoinGoalAlreadyMember, { goalId });
    useToastStore.getState().showToast({
      message: 'You’re already a member',
      variant: 'success',
      durationMs: 2200,
    });
    close();
    rootNavigationRef.navigate('MainTabs', {
      screen: 'GoalsTab',
      params: {
        screen: 'GoalDetail',
        params: { goalId, entryPoint: 'goalsTab', initialTab: 'details' },
      },
    } as any);
  }, [alreadyHasGoal, close, preview?.goalId, visible]);

  const requestNewInvite = useCallback(async () => {
    const inviter = inviterLabel ? `${inviterLabel}` : 'the person who sent it';
    const goalLabel = previewTitle || 'this goal';
    const message =
      `Hey — I tried to join ${goalLabel} in Kwilt, but the invite link didn’t work.\n\n` +
      `Can you send me a fresh invite link?\n` +
      `Invite code: ${effectiveInviteCode}\n` +
      `Reason: ${(preview?.inviteState ?? 'unknown').toString()}`;
    await Share.share({ message }).catch(() => {});
    Alert.alert('Sent', `Ask ${inviter} for a fresh invite.`);
  }, [effectiveInviteCode, inviterLabel, preview?.inviteState, previewTitle]);

  const handleJoin = useCallback(async () => {
    if (!effectiveInviteCode) {
      Alert.alert('Invalid invite', 'This invite link is missing a code.');
      return;
    }
    try {
      setBusy(true);
      capture(AnalyticsEvent.JoinGoalAttempted, { goalId: preview?.goalId ?? undefined });
      const { goalId, goalTitle } = await acceptGoalInvite(effectiveInviteCode);

      const already = goals.some((g) => g.id === goalId);
      if (!already) {
        const now = new Date().toISOString();
        addGoal({
          id: goalId,
          arcId: null,
          title: goalTitle?.trim() || 'Shared goal',
          description: undefined,
          status: 'planned',
          qualityState: 'draft',
          forceIntent: defaultForceLevels(0),
          metrics: [],
          createdAt: now,
          updatedAt: now,
        });
      }

      close();
      rootNavigationRef.navigate('MainTabs', {
        screen: 'GoalsTab',
        params: {
          screen: 'GoalDetail',
          params: { goalId, entryPoint: 'goalsTab', initialTab: 'details' },
        },
      } as any);
      capture(AnalyticsEvent.JoinGoalSucceeded, { goalId });
      useToastStore.getState().showToast({
        message: 'Joined shared goal',
        variant: 'success',
        durationMs: 2200,
      });
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      capture(AnalyticsEvent.JoinGoalFailed, { code: code || undefined, status: typeof e?.status === 'number' ? e.status : undefined });
      if (code === 'invite_consumed' || preview?.inviteState === 'consumed') {
        Alert.alert('Invite already used', 'Ask the sender for a fresh invite link.', [
          { text: 'Ask for new invite', onPress: () => void requestNewInvite() },
          { text: 'OK', style: 'cancel' },
        ]);
        return;
      }
      if (code === 'invite_expired' || preview?.inviteState === 'expired') {
        Alert.alert('Invite expired', 'Ask the sender for a fresh invite link.', [
          { text: 'Ask for new invite', onPress: () => void requestNewInvite() },
          { text: 'OK', style: 'cancel' },
        ]);
        return;
      }
      if (code === 'not_found') {
        Alert.alert('Invalid invite', 'This invite link doesn’t look valid. Ask the sender for a new link.');
        return;
      }
      Alert.alert(
        'Unable to join',
        'Please try again. If this keeps happening, ask the sender for a fresh invite link.',
      );
    } finally {
      setBusy(false);
    }
  }, [addGoal, close, effectiveInviteCode, goals, preview?.inviteState, requestNewInvite]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['55%', '85%']}
      initialSnapIndex={0}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.surface}>
        <BottomDrawerHeader
          title="Join shared goal"
          rightAction={<BottomDrawerHeaderClose onPress={close} />}
          titleStyle={styles.headerTitle}
        />

        {previewBusy ? (
          <Text style={styles.subtle}>Loading invite details…</Text>
        ) : preview ? (
          <Text style={styles.body}>
            {inviterLabel ? (
              <>
                <Text style={styles.bold}>{inviterLabel}</Text> invited you to{' '}
              </>
            ) : (
              'You’ve been invited to '
            )}
            <Text style={styles.bold}>“{previewTitle}”</Text>.
          </Text>
        ) : null}

        <Text style={styles.body}>
          By default you share <Text style={styles.bold}>signals only</Text> (check-ins + cheers). Activity titles stay
          private unless you choose to share them.
        </Text>

        <Text style={styles.subtle}>Invite code: {effectiveInviteCode || '—'}</Text>

        <View style={styles.ctaRow}>
          <Button onPress={handleJoin} disabled={busy || previewBusy || alreadyHasGoal}>
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.canvas} />
                <Text style={styles.busyLabel}>Joining…</Text>
              </View>
            ) : (
              'Join'
            )}
          </Button>
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
  },
  handleContainer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
  },
  handle: {
    backgroundColor: colors.border,
  },
  surface: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerTitle: {
    textAlign: 'left',
  },
  body: {
    color: colors.textPrimary,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtle: {
    color: colors.textSecondary,
  },
  ctaRow: {
    marginTop: spacing.md,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  busyLabel: {
    color: colors.canvas,
    fontWeight: '600',
  },
});


