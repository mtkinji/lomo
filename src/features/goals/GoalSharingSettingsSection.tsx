import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Text, VStack } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import {
  type GoalSharingItem,
} from '../../services/sharedGoals';
import { declineTargetedGoalInvite } from '../../services/invites';
import { useJoinSharedGoalDrawerStore } from '../../store/useJoinSharedGoalDrawerStore';
import { KwiltLoader } from '../../ui/KwiltLoader';
import { sharingActions } from '../account/actions/sharingActionsBoundary';
import { sharingReviewReferenceForGoalShare } from '../account/actions/sharingActions';

export function GoalSharingSettingsSection() {
  const [items, setItems] = useState<GoalSharingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await sharingActions.loadNativeGoalShares());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byYou = useMemo(() => items.filter((item) => item.direction === 'by_you'), [items]);
  const withYou = useMemo(() => items.filter((item) => item.direction === 'with_you'), [items]);

  const runAction = useCallback(async (key: string, action: () => Promise<unknown>) => {
    setWorkingKey(key);
    try {
      await action();
      await load();
    } catch {
      Alert.alert('Couldn’t update sharing', 'Please try again.');
    } finally {
      setWorkingKey(null);
    }
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <KwiltLoader size="small" color={colors.muted} />
        <Text style={styles.secondary}>Loading Goal sharing…</Text>
      </View>
    );
  }

  if (byYou.length === 0 && withYou.length === 0) return null;

  return (
    <VStack space="lg">
      {byYou.length > 0 ? (
        <SharingGroup
          title="Shared by you"
          items={byYou}
          workingKey={workingKey}
          onReview={() => undefined}
          onDecline={() => undefined}
          onRevoke={(item) => {
            if (!item.inviteId) return;
            Alert.alert(
              'Revoke invitation?',
              `${item.counterpartName} will no longer be able to accept this invitation.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke',
                  style: 'destructive',
                  onPress: () => void runAction(
                    `invite:${item.inviteId}`,
                    () => sharingActions.revoke(sharingReviewReferenceForGoalShare(item)),
                  ),
                },
              ],
            );
          }}
          onRemove={(item) => {
            if (!item.counterpartUserId) return;
            Alert.alert(
              'Remove Goal access?',
              `${item.counterpartName} will stop seeing check-ins and can no longer cheer. This does not change your Household or friendship.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove access',
                  style: 'destructive',
                  onPress: () => void runAction(
                    `member:${item.goalId}:${item.counterpartUserId}`,
                    () => sharingActions.revoke(sharingReviewReferenceForGoalShare(item)),
                  ),
                },
              ],
            );
          }}
          onLeave={() => undefined}
        />
      ) : null}

      {withYou.length > 0 ? (
        <SharingGroup
          title="Shared with you"
          items={withYou}
          workingKey={workingKey}
          onReview={(item) => {
            if (!item.inviteCode || item.accessState === 'expired') return;
            useJoinSharedGoalDrawerStore.getState().open({ inviteCode: item.inviteCode, source: 'sharing' });
          }}
          onDecline={(item) => {
            if (!item.inviteCode) return;
            Alert.alert(
              item.accessState === 'expired' ? 'Dismiss invitation?' : 'Decline invitation?',
              `${item.counterpartName} will see that this invitation is no longer pending.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: item.accessState === 'expired' ? 'Dismiss' : 'Decline',
                  style: 'destructive',
                  onPress: () => void runAction(`invite:${item.inviteId}`, () => declineTargetedGoalInvite(item.inviteCode!)),
                },
              ],
            );
          }}
          onRevoke={() => undefined}
          onRemove={() => undefined}
          onLeave={(item) => {
            Alert.alert(
              'Leave shared Goal?',
              `You will stop seeing check-ins for “${item.goalTitle}”. Your Household or friendship will not change.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave Goal',
                  style: 'destructive',
                  onPress: () => void runAction(
                    `goal:${item.goalId}`,
                    () => sharingActions.revoke(sharingReviewReferenceForGoalShare(item)),
                  ),
                },
              ],
            );
          }}
        />
      ) : null}
    </VStack>
  );
}

function SharingGroup(props: {
  title: string;
  items: GoalSharingItem[];
  workingKey: string | null;
  onReview: (item: GoalSharingItem) => void;
  onDecline: (item: GoalSharingItem) => void;
  onRevoke: (item: GoalSharingItem) => void;
  onRemove: (item: GoalSharingItem) => void;
  onLeave: (item: GoalSharingItem) => void;
}) {
  return (
    <VStack space="sm">
      <Text style={styles.sectionLabel}>{props.title}</Text>
      <Card style={styles.card}>
        {props.items.map((item, index) => {
          const pending = item.accessState === 'pending' || item.accessState === 'expired';
          const key = item.inviteId ? `invite:${item.inviteId}` : `goal:${item.goalId}`;
          const busy = props.workingKey === key
            || props.workingKey === `member:${item.goalId}:${item.counterpartUserId}`;
          return (
            <View key={`${item.direction}:${item.goalId}:${item.inviteId ?? item.counterpartUserId ?? index}`}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                {item.counterpartAvatarUrl ? (
                  <Image source={{ uri: item.counterpartAvatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.initial}>{item.counterpartName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <VStack flex={1} space="xs">
                  <Text style={styles.goalTitle}>{item.goalTitle}</Text>
                  <Text style={styles.secondary}>
                    {item.direction === 'by_you'
                      ? pending
                        ? `${item.accessState === 'expired' ? 'Expired for' : 'Waiting for'} ${item.counterpartName}`
                        : `${item.counterpartName} has access`
                      : pending
                        ? `${item.counterpartName} invited you${item.accessState === 'expired' ? ' · Expired' : ''}`
                        : `Shared by ${item.counterpartName}`}
                  </Text>
                  <View style={styles.actions}>
                    {item.direction === 'by_you' && pending ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        accessibilityLabel={`Revoke invitation for ${item.counterpartName}`}
                        disabled={busy}
                        onPress={() => props.onRevoke(item)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                    {item.direction === 'by_you' && !pending ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        accessibilityLabel={`Remove ${item.counterpartName} from ${item.goalTitle}`}
                        disabled={busy}
                        onPress={() => props.onRemove(item)}
                      >
                        Remove access
                      </Button>
                    ) : null}
                    {item.direction === 'with_you' && pending && item.accessState !== 'expired' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        accessibilityLabel={`Review invitation to ${item.goalTitle}`}
                        disabled={busy}
                        onPress={() => props.onReview(item)}
                      >
                        Review
                      </Button>
                    ) : null}
                    {item.direction === 'with_you' && pending ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        accessibilityLabel={`${item.accessState === 'expired' ? 'Dismiss' : 'Decline'} invitation to ${item.goalTitle}`}
                        disabled={busy}
                        onPress={() => props.onDecline(item)}
                      >
                        {item.accessState === 'expired' ? 'Dismiss' : 'Decline'}
                      </Button>
                    ) : null}
                    {item.direction === 'with_you' && !pending ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        accessibilityLabel={`Leave shared Goal ${item.goalTitle}`}
                        disabled={busy}
                        onPress={() => props.onLeave(item)}
                      >
                        Leave Goal
                      </Button>
                    ) : null}
                  </View>
                </VStack>
              </View>
            </View>
          );
        })}
      </Card>
    </VStack>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  initial: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  goalTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  secondary: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
