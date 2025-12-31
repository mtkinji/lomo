import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';
import { Heading, Text, VStack } from '../../ui/primitives';
import { colors, spacing } from '../../theme';
import { acceptGoalInvite, previewGoalInvite } from '../../services/invites';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import type { JoinSharedGoalRouteParams } from '../../navigation/routeParams';
import { useToastStore } from '../../store/useToastStore';

type JoinSharedGoalRouteProp = RouteProp<{ JoinSharedGoal: JoinSharedGoalRouteParams }, 'JoinSharedGoal'>;

export function JoinSharedGoalScreen() {
  const route = useRoute<JoinSharedGoalRouteProp>();
  const navigation = useNavigation<any>();
  const inviteCode = (route.params?.inviteCode ?? '').trim();

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

  useEffect(() => {
    let cancelled = false;
    if (!inviteCode) return;
    setPreviewBusy(true);
    previewGoalInvite(inviteCode)
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
  }, [inviteCode]);

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

  useEffect(() => {
    // If the user is already a member (or owner) and we have the goal locally,
    // never show the join affordance again — jump directly to the goal.
    if (!alreadyHasGoal) return;
    const goalId = (preview?.goalId ?? '').trim();
    if (!goalId) return;
    useToastStore.getState().showToast({
      message: 'You’re already a member',
      variant: 'success',
      durationMs: 2200,
    });
    // Replace so back doesn't return to the join surface.
    navigation.replace('GoalDetail', { goalId, entryPoint: 'goalsTab', initialTab: 'details' });
  }, [alreadyHasGoal, navigation, preview?.goalId]);

  const handleJoin = useCallback(async () => {
    if (!inviteCode) {
      Alert.alert('Invalid invite', 'This invite link is missing a code.');
      return;
    }
    try {
      setBusy(true);

      // If we already have this goal locally, treat this screen as an "open"
      // affordance instead of re-consuming the invite.
      if (alreadyHasGoal && preview?.goalId) {
        navigation.navigate('GoalDetail', { goalId: preview.goalId, entryPoint: 'goalsTab', initialTab: 'details' });
        return;
      }

      const { goalId, goalTitle } = await acceptGoalInvite(inviteCode);

      const alreadyHasGoal = goals.some((g) => g.id === goalId);
      if (!alreadyHasGoal) {
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

      // Replace so back doesn't return to the join surface.
      navigation.replace('GoalDetail', { goalId, entryPoint: 'goalsTab', initialTab: 'details' });
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      const previewState = preview?.inviteState;
      const effectiveCode = code || (previewState === 'expired' ? 'invite_expired' : previewState === 'consumed' ? 'invite_consumed' : '');

      const goalLabel = (previewTitle ?? '').trim() || 'this goal';
      const inviter = inviterLabel ? `${inviterLabel}` : 'the person who sent it';

      const requestNewInvite = async () => {
        const message =
          `Hey — I tried to join ${goalLabel} in Kwilt, but the invite link didn’t work (${effectiveCode || 'invite_error'}).\n\n` +
          `Can you send me a fresh invite link?\n` +
          `Invite code: ${inviteCode}`;
        await Share.share({ message }).catch(() => {});
      };

      if (effectiveCode === 'invite_consumed') {
        Alert.alert(
          'Invite already used',
          `This invite link has already been used up.\n\nAsk ${inviter} to send a fresh invite link.`,
          [
            { text: 'Ask for new invite', onPress: () => void requestNewInvite() },
            { text: 'OK', style: 'cancel' },
          ],
        );
        return;
      }

      if (effectiveCode === 'invite_expired') {
        Alert.alert(
          'Invite expired',
          `This invite link has expired.\n\nAsk ${inviter} to send a fresh invite link.`,
          [
            { text: 'Ask for new invite', onPress: () => void requestNewInvite() },
            { text: 'OK', style: 'cancel' },
          ],
        );
        return;
      }

      if (effectiveCode === 'not_found') {
        Alert.alert('Invalid invite', 'This invite link doesn’t look valid. Ask the sender for a new link.');
        return;
      }

      Alert.alert('Unable to join', 'Please try again. If this keeps happening, ask the sender for a fresh invite link.');
    } finally {
      setBusy(false);
    }
  }, [addGoal, alreadyHasGoal, goals, inviteCode, inviterLabel, navigation, preview?.goalId, preview?.inviteState, previewTitle]);

  return (
    <AppShell>
      <View style={styles.container}>
        <VStack space="md">
          <Heading style={styles.title}>Join shared goal</Heading>
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
            By default you share <Text style={styles.bold}>signals only</Text> (check-ins + cheers). Activity titles
            stay private unless you choose to share them.
          </Text>
          <Text style={styles.subtle}>Invite code: {inviteCode || '—'}</Text>

          <Button onPress={handleJoin} disabled={busy || previewBusy}>
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.canvas} />
                <Text style={styles.busyLabel}>Joining…</Text>
              </View>
            ) : (
              alreadyHasGoal ? 'Open goal' : 'Join'
            )}
          </Button>
        </VStack>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    marginTop: spacing.md,
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
    marginTop: spacing.sm,
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


