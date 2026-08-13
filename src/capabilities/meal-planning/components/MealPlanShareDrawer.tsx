import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { colors, fonts, radii, spacing } from '../../../theme';
import { BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import { Icon, type IconName } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { shareUrlWithPreview } from '../../../utils/share';
import {
  getHouseholdSnapshot,
  type HouseholdMember,
} from '../../../features/household/data/household';
import { createMealPlanningRepository, type GuestMealFeedbackSummary } from '../data/mealPlanningRepository';

type InviteChannel = 'sms' | 'email' | 'copy' | 'more';

export function MealPlanShareDrawer(props: {
  visible: boolean;
  planId: string;
  planVersion: number;
  onClose(): void;
  onShared?(): void;
}) {
  const { visible, planId, planVersion, onClose, onShared } = props;
  const authIdentity = useAppStore((state) => state.authIdentity);
  const showToast = useToastStore((state) => state.showToast);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [guestInvite, setGuestInvite] = useState<{ inviteId: string; token: string; expiresAt: string } | null>(null);
  const [guestSummary, setGuestSummary] = useState<GuestMealFeedbackSummary | null>(null);

  useEffect(() => {
    if (!visible) {
      setMembers([]);
      setSelected([]);
      setLoading(false);
      setBusy(false);
      setGuestInvite(null);
      setGuestSummary(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void createMealPlanningRepository().getGuestFeedbackSummary(planId)
      .then((summary) => { if (!cancelled) setGuestSummary(summary); })
      .catch(() => { if (!cancelled) setGuestSummary(null); });
    void getHouseholdSnapshot(getSupabaseClient())
      .then((snapshot) => {
        if (cancelled) return;
        const activeChildren = new Set(
          snapshot.activations
            .filter((activation) => (
              activation.capabilityId === 'meal-planning' && activation.state === 'active'
            ))
            .map((activation) => activation.childMembershipId),
        );
        setMembers(snapshot.members.filter((member) => (
          member.id !== snapshot.currentMembershipId
          && (member.role !== 'child' || activeChildren.has(member.id))
        )));
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, visible]);

  const activeGuestInviteIds = useMemo(() => [...new Set([
    ...(guestSummary?.invites.filter((invite) => invite.state === 'active').map((invite) => invite.id) ?? []),
    ...(guestInvite ? [guestInvite.inviteId] : []),
  ])], [guestInvite, guestSummary]);
  const revokeActiveGuestInvites = useCallback(async () => {
    if (busy || !activeGuestInviteIds.length) return;
    setBusy(true);
    try {
      const repository = createMealPlanningRepository();
      await Promise.all(activeGuestInviteIds.map((inviteId) => repository.revokeGuestFeedbackInvite(inviteId)));
      setGuestSummary((current) => current ? {
        ...current,
        invites: current.invites.map((invite) => invite.state === 'active' ? { ...invite, state: 'revoked' } : invite),
      } : current);
      setGuestInvite(null);
      showToast({ message: 'Sharing link turned off', variant: 'success', durationMs: 2000 });
    } catch (error) {
      Alert.alert('Could not turn off link', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [activeGuestInviteIds, busy, showToast]);

  const askSelectedPeople = useCallback(async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await createMealPlanningRepository().openRound({
        planId,
        expectedVersion: planVersion,
        participantMembershipIds: selected,
        closesAt: null,
      });
      onShared?.();
      onClose();
    } catch (error) {
      Alert.alert(
        'Could not ask these people',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onClose, onShared, planId, planVersion, selected]);

  const openExternalInvite = useCallback(async (channel: InviteChannel) => {
    if (busy) return;
    setBusy(true);
    try {
      const invitation = guestInvite ?? await createMealPlanningRepository().createGuestFeedbackInvite({
        planId,
        expectedVersion: planVersion,
        expiresAt: null,
      });
      if (!guestInvite) {
        setGuestInvite(invitation);
        onShared?.();
      }
      const inviteUrl = `https://go.kwilt.app/meal-plan/${encodeURIComponent(invitation.token)}`;
      const taskCopy = 'Choose the meals you’d eat or suggest one that’s missing.';
      const message = `${authIdentity?.name || 'Someone'} would like your help with a meal plan.\n\n${taskCopy}\n\n${inviteUrl}`;
      if (channel === 'copy') {
        await Clipboard.setStringAsync(inviteUrl);
        showToast({ message: 'Link copied', variant: 'success', durationMs: 2000 });
        return;
      }
      if (channel === 'more') {
        await shareUrlWithPreview({
          url: inviteUrl,
          message: message.replace(`\n\n${inviteUrl}`, ''),
          subject: 'Help with our meal plan',
          androidDialogTitle: 'Share Household Plan',
        });
        onClose();
        return;
      }
      const body = encodeURIComponent(channel === 'sms'
        ? `Help with our meal plan. ${taskCopy}\n\n${inviteUrl}`
        : message);
      const composerUrl = channel === 'sms'
        ? Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`
        : `mailto:?subject=${encodeURIComponent('Help with our meal plan')}&body=${body}`;
      const canOpenComposer = await Linking.canOpenURL(composerUrl).catch(() => false);
      if (canOpenComposer) {
        await Linking.openURL(composerUrl);
      } else {
        await Share.share({
          message,
          title: 'Help with our meal plan',
        });
      }
      onClose();
    } catch (error) {
      Alert.alert(
        'Could not create sharing link',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }, [authIdentity?.name, busy, guestInvite, onClose, onShared, planId, planVersion, showToast]);

  const selectedCount = selected.length;
  const askLabel = selectedCount === 1 ? 'Ask 1 person' : `Ask ${selectedCount} people`;

  return (
    <BottomGuide
      visible={visible}
      onClose={onClose}
      snapPoints={['56%']}
      scrim="light"
      layout="floating"
      showDragHandle={false}
      dynamicSizing
    >
      <View style={styles.surface}>
        <BottomDrawerHeader
          variant="withClose"
          titleVariant="sm"
          title="Share Plan"
          onClose={onClose}
          closeAccessibilityLabel="Close Share Plan"
        />
        <BottomDrawerScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading || members.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>People in your Household</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text tone="secondary">Finding your people…</Text>
              </View>
              ) : (
              <View style={styles.card}>
                {members.map((member, index) => {
                  const included = selected.includes(member.id);
                  return (
                    <View key={member.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${included ? 'Exclude' : 'Include'} ${member.displayName}`}
                        accessibilityState={{ checked: included }}
                        onPress={() => setSelected((current) => (
                          included
                            ? current.filter((membershipId) => membershipId !== member.id)
                            : [...current, member.id]
                        ))}
                        style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.personCopy}>
                          <Text style={styles.personName}>{member.displayName}</Text>
                          <Text tone="secondary">{member.role === 'child' ? 'Household child' : 'Household'}</Text>
                        </View>
                        <View style={[styles.checkbox, included && styles.checkboxSelected]}>
                          {included ? <Icon name="check" size={15} color={colors.canvas} /> : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
              {!loading ? (
              <Button
                accessibilityLabel={askLabel}
                disabled={!selectedCount || busy}
                fullWidth
                onPress={() => void askSelectedPeople()}
              >
                {busy && selectedCount ? 'Sending…' : askLabel}
              </Button>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Share outside your Household</Text>
            <View style={styles.destinationRow}>
              <ShareDestination
                icon="messageSquare"
                iconColor={colors.communicationText}
                iconTestID="plan-share-channel-sms-icon"
                label="Messages"
                disabled={busy}
                onPress={() => void openExternalInvite('sms')}
              />
              <ShareDestination
                icon="mail"
                iconColor={colors.communicationEmail}
                iconTestID="plan-share-channel-email-icon"
                label="Email"
                disabled={busy}
                onPress={() => void openExternalInvite('email')}
              />
            </View>
            <View style={styles.card}>
              <ChannelRow
                icon="link"
                label="Copy link"
                disabled={busy}
                onPress={() => void openExternalInvite('copy')}
              />
              <View style={styles.divider} />
              <ChannelRow
                icon="share"
                label="More options"
                disabled={busy}
                onPress={() => void openExternalInvite('more')}
              />
              {activeGuestInviteIds.length ? (
                <>
                  <View style={styles.divider} />
                  <ChannelRow
                    icon="link"
                    label="Turn off guest link"
                    disabled={busy}
                    onPress={() => void revokeActiveGuestInvites()}
                  />
                </>
              ) : null}
            </View>
            <Text tone="secondary" style={styles.privacyCopy}>
              Anyone with the link can respond until it expires. They won’t join your Household.
            </Text>
          </View>

          {guestSummary?.invites.some((invite) => invite.responseCount > 0) ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Guest feedback</Text>
              <View style={styles.card}>
                {guestSummary.invites.filter((invite) => invite.responseCount > 0).map((invite, index) => (
                  <View key={invite.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.feedbackRow}>
                      <Text style={styles.personName}>
                        {invite.responseCount === 1 ? '1 response' : `${invite.responseCount} responses`}
                      </Text>
                      {invite.responses.slice(0, 3).map((response) => {
                        const pickedTitles = response.selectedCandidateIds
                          .map((candidateId) => guestSummary.candidates.find((candidate) => candidate.id === candidateId)?.title)
                          .filter((title): title is string => Boolean(title));
                        return (
                          <View key={response.id} style={styles.responseBlock}>
                            <Text tone="secondary" style={styles.responseCopy}>
                              {response.displayName || 'Guest'} · {pickedTitles.length ? pickedTitles.join(', ') : 'Suggested a meal'}
                            </Text>
                            {response.suggestion ? (
                              <Text tone="secondary" style={styles.suggestionCopy}>“{response.suggestion}”</Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </BottomDrawerScrollView>
      </View>
    </BottomGuide>
  );
}

function ChannelRow(props: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [styles.channelRow, pressed && !props.disabled && styles.pressed]}
    >
      <View style={styles.channelIcon}>
        <Icon
          name={props.icon}
          size={18}
          color={props.disabled ? colors.muted : colors.textPrimary}
        />
      </View>
      <Text style={[styles.channelLabel, props.disabled && styles.disabledLabel]}>{props.label}</Text>
      <Icon name="chevronRight" size={16} color={props.disabled ? colors.muted : colors.textSecondary} />
    </Pressable>
  );
}

function ShareDestination(props: {
  icon: IconName;
  iconColor: string;
  iconTestID: string;
  label: string;
  disabled: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [styles.destination, pressed && !props.disabled && styles.pressed]}
    >
      <View style={styles.destinationIcon}>
        <Icon
          testID={props.iconTestID}
          name={props.icon}
          size={24}
          color={props.disabled ? colors.muted : props.iconColor}
        />
      </View>
      <Text style={[styles.destinationLabel, props.disabled && styles.disabledLabel]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: { width: '100%' },
  content: { gap: spacing.lg, paddingBottom: spacing.md },
  section: { width: '100%', alignItems: 'stretch', gap: spacing.sm },
  sectionLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.card,
  },
  destinationRow: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.xs },
  destination: { width: 68, alignItems: 'center', gap: spacing.xs },
  destinationIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  destinationLabel: { fontSize: 13, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58, backgroundColor: colors.border },
  loadingRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.secondary },
  avatarText: { fontFamily: fonts.semibold },
  personCopy: { flex: 1, minWidth: 0 },
  personName: { fontFamily: fonts.semibold },
  checkbox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999 },
  checkboxSelected: { borderColor: colors.textPrimary, backgroundColor: colors.textPrimary },
  channelRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  channelIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.secondary },
  channelLabel: { flex: 1, fontFamily: fonts.semibold },
  disabledLabel: { color: colors.muted },
  privacyCopy: { fontSize: 13, lineHeight: 18 },
  feedbackRow: { minHeight: 68, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  responseBlock: { marginTop: spacing.xs },
  responseCopy: { fontSize: 13 },
  suggestionCopy: { marginTop: 1, fontSize: 13, fontStyle: 'italic' },
  pressed: { opacity: 0.64 },
});
