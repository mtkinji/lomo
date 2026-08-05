import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Input, Text, VStack } from '../../ui/primitives';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from '../../ui/layout/BottomDrawerHeader';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, fonts, spacing, typography } from '../../theme';
import { shareUrlWithPreview } from '../../utils/share';
import {
  buildInviteOpenUrl,
  createGoalInvite,
  extractInviteCode,
  listGoalShareRecipients,
  sendGoalInviteEmail,
  type GoalShareRecipient,
  type InviteKind,
} from '../../services/invites';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useToastStore } from '../../store/useToastStore';
import { createReferralCode } from '../../services/referrals';
import { selectGoalInviteDestinationUrls } from './goalInviteDestinationUrl';
import { appendGoalInviteReferralCode } from './goalInviteReferralUrl';

type Step = 'offer' | 'recipient' | 'email' | 'sent';
type PreparedGenericInvite = {
  inviteCode: string;
  referralCode: string;
  tapUrl: string;
  altUrl: string;
  shareMessage: string;
};

const GOAL_SIGNALS_VISIBILITY_CONTRACT = 'goal-signals-v1';

export function ShareGoalDrawer(props: {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
  goalImageUrl?: string | null;
  onInviteCreated?: () => void;
}) {
  const {
    visible,
    onClose,
    goalId,
    goalTitle,
    goalImageUrl,
    onInviteCreated,
  } = props;
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [step, setStep] = useState<Step>('offer');
  const [inviteKind] = useState<InviteKind>('people');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [tapUrl, setTapUrl] = useState<string>('');
  const [altUrl, setAltUrl] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipients, setRecipients] = useState<GoalShareRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<GoalShareRecipient | null>(null);

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setPreparing(false);
      setStep('offer');
      setShareMessage('');
      setInviteCode('');
      setReferralCode('');
      setTapUrl('');
      setAltUrl('');
      setRecipientEmail('');
      setRecipients([]);
      setRecipientsLoading(false);
      setSelectedRecipient(null);
      return;
    }
    capture(AnalyticsEvent.ShareGoalDrawerOpened, {
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });
    capture(AnalyticsEvent.ShareDrawerOpened, {
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });

    return () => {
      capture(AnalyticsEvent.ShareGoalDrawerClosed, {
        visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
      });
    };
  }, [capture, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setRecipientsLoading(true);
    listGoalShareRecipients()
      .then((next) => {
        if (!cancelled) setRecipients(next);
      })
      .catch(() => {
        if (!cancelled) setRecipients([]);
      })
      .finally(() => {
        if (!cancelled) setRecipientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const prepareGenericInvite = useCallback(async (): Promise<PreparedGenericInvite> => {
    if (inviteCode && tapUrl && shareMessage) {
      return { inviteCode, referralCode, tapUrl, altUrl, shareMessage };
    }

    setPreparing(true);
    try {
      const [nextReferralCode, invitation] = await Promise.all([
        createReferralCode({ kind: 'shared_goal_invite' }).catch(() => ''),
        createGoalInvite({ goalId, goalTitle, kind: 'people' }),
      ]);
      const nextInviteCode = extractInviteCode(invitation.inviteUrl);
      if (!nextInviteCode) throw new Error('Invite response missing code');
      const open = buildInviteOpenUrl(nextInviteCode);
      const { tapUrl: tapUrlBase } = selectGoalInviteDestinationUrls({
        primaryOpenUrl: open.primary,
        inviteRedirectUrl: invitation.inviteRedirectUrl,
        inviteLandingUrl: invitation.inviteLandingUrl,
        isExpoGo: Constants.appOwnership === 'expo',
      });
      const nextTapUrl = appendGoalInviteReferralCode(tapUrlBase, nextReferralCode);
      const nextMessage =
        `I'm working on a goal in Kwilt: ` +
        `"${goalTitle}"\n\n` +
        `I'll share what I finish here. You can cheer me on or nudge me if I go quiet — no app install required.\n\n` +
        `${nextTapUrl}`;

      setInviteCode(nextInviteCode);
      setReferralCode(nextReferralCode);
      setTapUrl(nextTapUrl);
      setAltUrl(open.alt);
      setShareMessage(nextMessage);
      return {
        inviteCode: nextInviteCode,
        referralCode: nextReferralCode,
        tapUrl: nextTapUrl,
        altUrl: open.alt,
        shareMessage: nextMessage,
      };
    } finally {
      setPreparing(false);
    }
  }, [altUrl, goalId, goalTitle, inviteCode, referralCode, shareMessage, tapUrl]);

  const markSent = useCallback(
    (channel: string) => {
      capture(AnalyticsEvent.ShareInviteSent, {
        channel,
        kind: inviteKind,
        visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
      });
      onInviteCreated?.();
    },
    [capture, inviteKind, onInviteCreated],
  );

  const openSms = useCallback(async () => {
    setBusy(true);
    let prepared: PreparedGenericInvite;
    try {
      prepared = await prepareGenericInvite();
    } catch {
      Alert.alert('Couldn’t create invitation', 'Please try again.');
      setBusy(false);
      return;
    }
    capture(AnalyticsEvent.ShareInviteChannelSelected, {
      kind: inviteKind,
      channel: 'sms',
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });
    const body = encodeURIComponent(prepared.shareMessage);
    const smsUrl = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    const can = await Linking.canOpenURL(smsUrl).catch(() => false);
    if (!can) {
      const url = (prepared.tapUrl || prepared.altUrl).trim();
      if (url) {
        await shareUrlWithPreview({
          url,
          message: prepared.shareMessage,
          subject: `Join my goal in Kwilt: “${goalTitle}”`,
          androidDialogTitle: 'Share goal invite',
          androidAppendUrl: false,
        }).catch(() => {});
      } else {
        await Share.share({ message: prepared.shareMessage }).catch(() => {});
      }
      markSent('sms_fallback');
      setBusy(false);
      return;
    }
    await Linking.openURL(smsUrl);
    capture(AnalyticsEvent.ShareInviteSmsComposerOpened, {
      kind: inviteKind,
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });
    markSent('sms');
    showToast({ message: 'Message ready', variant: 'success', durationMs: 2200 });
    setBusy(false);
    onClose();
  }, [
    capture,
    goalTitle,
    inviteKind,
    markSent,
    onClose,
    prepareGenericInvite,
    showToast,
  ]);

  const copyInviteLink = useCallback(async () => {
    setBusy(true);
    try {
      const prepared = await prepareGenericInvite();
      const link = prepared.tapUrl || prepared.altUrl;
      if (!link) throw new Error('Invite response missing link');
      await Clipboard.setStringAsync(link);
      capture(AnalyticsEvent.ShareInviteCopyLink, {
        kind: inviteKind,
        visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
      });
      markSent('copy_link');
      showToast({ message: 'Link copied', variant: 'success', durationMs: 2000 });
    } catch {
      Alert.alert('Couldn’t create invitation', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [capture, inviteKind, markSent, prepareGenericInvite, showToast]);

  const startEmail = useCallback(() => {
    capture(AnalyticsEvent.ShareInviteChannelSelected, {
      kind: inviteKind,
      channel: 'email',
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });
    setStep('email');
  }, [capture, inviteKind]);

  const sendEmail = useCallback(async () => {
    const email = recipientEmail.trim();
    if (!email) {
      Alert.alert('Email required', 'Enter an email address to send the invite.');
      return;
    }
    setBusy(true);
    capture(AnalyticsEvent.ShareInviteEmailSendAttempted, {
      kind: inviteKind,
      visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
    });
    try {
      const prepared = await prepareGenericInvite();
      await sendGoalInviteEmail({
        goalId,
        goalTitle,
        kind: inviteKind,
        recipientEmail: email,
        inviteCode: prepared.inviteCode,
        referralCode: prepared.referralCode || null,
      });
      capture(AnalyticsEvent.ShareInviteEmailSendSucceeded, {
        kind: inviteKind,
        visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
      });
      markSent('email');
      setStep('sent');
    } catch (e: any) {
      capture(AnalyticsEvent.ShareInviteEmailSendFailed, {
        kind: inviteKind,
        visibilityContract: GOAL_SIGNALS_VISIBILITY_CONTRACT,
        status: typeof e?.status === 'number' ? e.status : undefined,
        code: typeof e?.code === 'string' ? e.code : undefined,
      });
      Alert.alert('Couldn’t send email', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [
    capture,
    goalId,
    goalTitle,
    inviteKind,
    markSent,
    prepareGenericInvite,
    recipientEmail,
  ]);

  const sendTargetedInvite = useCallback(async () => {
    if (!selectedRecipient) return;
    setBusy(true);
    try {
      const { inviteUrl, inviteRedirectUrl, inviteLandingUrl } = await createGoalInvite({
        goalId,
        goalTitle,
        goalImageUrl: goalImageUrl ?? undefined,
        kind: 'people',
        recipient: {
          kind: selectedRecipient.kind,
          relationshipId: selectedRecipient.relationshipId,
        },
      });
      const code = extractInviteCode(inviteUrl);
      const open = buildInviteOpenUrl(code);
      const { tapUrl: targetUrl } = selectGoalInviteDestinationUrls({
        primaryOpenUrl: open.primary,
        inviteRedirectUrl,
        inviteLandingUrl,
        isExpoGo: Constants.appOwnership === 'expo',
      });
      const message =
        `I invited you to my Goal “${goalTitle}” in Kwilt. ` +
        `Only ${selectedRecipient.displayName} can accept this invitation. ` +
        `It shares this Goal's check-ins and cheers; to-dos and everything else in Kwilt stay private.\n\n` +
        targetUrl;
      await Share.share({
        message,
        url: Platform.OS === 'ios' ? targetUrl : undefined,
        title: `Goal invitation for ${selectedRecipient.displayName}`,
      });
      markSent('known_recipient');
      setStep('sent');
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : '';
      if (code === 'already_has_access') {
        Alert.alert('Already shared', `${selectedRecipient.displayName} already has access to this Goal.`);
      } else if (code === 'recipient_unavailable') {
        Alert.alert('Person unavailable', 'This relationship is no longer available for sharing.');
        setStep('offer');
        setSelectedRecipient(null);
        setRecipients((current) => current.filter((recipient) => recipient.relationshipId !== selectedRecipient.relationshipId));
      } else {
        Alert.alert('Couldn’t create invitation', 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [goalId, goalImageUrl, goalTitle, markSent, selectedRecipient]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['94%']}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.surface}>
        <BottomDrawerHeader
          title={
            step === 'email'
              ? 'Email invite'
              : step === 'recipient'
                ? selectedRecipient ? `Invite ${selectedRecipient.displayName}?` : 'Invite someone?'
              : step === 'sent'
                ? selectedRecipient ? 'Invitation ready' : 'Invite sent'
                : 'Share this goal'
          }
          rightAction={<BottomDrawerHeaderClose onPress={onClose} />}
          titleStyle={styles.headerTitle}
        />

        <GoalContext title={goalTitle} imageUrl={goalImageUrl} />

        {step === 'offer' ? (
          <VStack space="lg">
            {recipientsLoading || recipients.length > 0 ? (
              <VStack space="sm">
                <Text style={styles.sectionLabel}>People in Kwilt</Text>
                <View style={styles.channelCard}>
                  {recipientsLoading ? (
                    <View style={styles.recipientLoadingRow}>
                      <ActivityIndicator size="small" color={colors.muted} />
                      <Text style={styles.recipientKind}>Finding your people…</Text>
                    </View>
                  ) : recipients.map((recipient, index) => (
                    <View key={`${recipient.kind}:${recipient.relationshipId}`}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <RecipientRow
                        recipient={recipient}
                        onPress={() => {
                          setSelectedRecipient(recipient);
                          setStep('recipient');
                        }}
                      />
                    </View>
                  ))}
                </View>
              </VStack>
            ) : null}

            <Text style={styles.sectionLabel}>{recipients.length > 0 ? 'Other ways' : 'Share with'}</Text>

            <View style={styles.channelCard}>
              <ChannelRow
                icon="messageSquare"
                label="Text message"
                onPress={() => void openSms()}
                disabled={busy}
                loading={preparing}
              />
              <View style={styles.divider} />
              <ChannelRow
                icon="mail"
                label="Email"
                onPress={startEmail}
                disabled={busy}
                loading={preparing}
              />
              <View style={styles.divider} />
              <ChannelRow
                icon="link"
                label="Copy link"
                onPress={() => void copyInviteLink()}
                disabled={busy}
                loading={preparing}
              />
            </View>

            <Text style={styles.privacyLine}>
              Partners can see check-ins. Your to-dos stay private.
            </Text>
          </VStack>
        ) : step === 'recipient' && selectedRecipient ? (
          <VStack space="md">
            <View style={styles.recipientBoundaryCard}>
              <Text style={styles.successTitle}>One Goal, one decision</Text>
              <Text style={styles.body}>
                {selectedRecipient.displayName} will be invited to this Goal only. They can see check-ins and cheers after accepting. Your to-dos, other Goals, chats, Money, and Activities stay private.
              </Text>
              <Text style={styles.body}>
                Being {selectedRecipient.kind === 'household' ? 'in your Household' : 'Friends'} does not share anything by itself.
              </Text>
            </View>
            <Button onPress={() => void sendTargetedInvite()} disabled={busy} fullWidth>
              {busy ? <ActivityIndicator color={colors.canvas} /> : `Invite ${selectedRecipient.displayName}`}
            </Button>
            <Button
              onPress={() => {
                setSelectedRecipient(null);
                setStep('offer');
              }}
              variant="ghost"
              disabled={busy}
              fullWidth
            >
              Back
            </Button>
          </VStack>
        ) : step === 'email' ? (
          <VStack space="md">
            <Text style={styles.body}>
              Send the invite to their inbox. They’ll get a link that opens Kwilt.
            </Text>
            <Input
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email address"
              editable={!busy}
            />
            <Button onPress={() => void sendEmail()} disabled={busy} fullWidth>
              {busy ? <ActivityIndicator color={colors.canvas} /> : 'Send email invite'}
            </Button>
            <Button onPress={() => setStep('offer')} variant="ghost" disabled={busy} fullWidth>
              Back
            </Button>
          </VStack>
        ) : (
          <VStack space="md">
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Icon name="checkCircle" size={20} color={colors.canvas} />
              </View>
              <Text style={styles.successTitle}>{selectedRecipient ? 'Invitation created' : 'Invite on its way'}</Text>
              <Text style={styles.successBody}>
                {selectedRecipient
                  ? `${selectedRecipient.displayName} can also find it in Sharing. Only their account can accept it.`
                  : 'We’ll let you know when they cheer or reply.'}
              </Text>
            </View>
            <Button
              onPress={() => {
                setStep('offer');
                setRecipientEmail('');
                setSelectedRecipient(null);
              }}
              variant="secondary"
              fullWidth
            >
              Invite someone else
            </Button>
            <Button onPress={onClose} fullWidth>
              Done
            </Button>
          </VStack>
        )}
      </View>
    </BottomDrawer>
  );
}

function RecipientRow(props: { recipient: GoalShareRecipient; onPress: () => void }) {
  const { recipient, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Share with ${recipient.displayName}, ${recipient.kind === 'household' ? 'Household' : 'Friend'}`}
      style={({ pressed }) => [styles.recipientRow, pressed && styles.channelRowPressed]}
    >
      {recipient.avatarUrl ? (
        <Image source={{ uri: recipient.avatarUrl }} style={styles.recipientAvatar} />
      ) : (
        <View style={styles.recipientAvatarFallback}>
          <Text style={styles.recipientInitial}>{recipient.displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.recipientText}>
        <Text style={styles.recipientName}>{recipient.displayName}</Text>
        <Text style={styles.recipientKind}>{recipient.kind === 'household' ? 'Household' : 'Friend'}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

function GoalContext(props: { title: string; imageUrl?: string | null }) {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalCardIcon}>
        {props.imageUrl ? (
          <Image source={{ uri: props.imageUrl }} style={styles.goalCardImage} />
        ) : (
          <Icon name="target" size={16} color={colors.accent} />
        )}
      </View>
      <View style={styles.goalCardText}>
        <Text style={styles.goalTitleInline} numberOfLines={2}>
          {props.title}
        </Text>
      </View>
    </View>
  );
}

function ChannelRow(props: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { icon, label, onPress, disabled, loading } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.channelRow,
        pressed && !disabled && styles.channelRowPressed,
      ]}
    >
      <View style={[styles.channelIconWrap, disabled && styles.channelIconWrapDisabled]}>
        <Icon name={icon} size={18} color={disabled ? colors.muted : colors.textPrimary} />
      </View>
      <Text style={[styles.channelLabel, disabled && styles.channelLabelDisabled]}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.muted} />
      ) : (
        <Icon name="chevronRight" size={16} color={disabled ? colors.muted : colors.textSecondary} />
      )}
    </Pressable>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerTitle: {
    textAlign: 'left',
  },
  body: {
    color: colors.textSecondary,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  goalCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  goalCardImage: {
    width: '100%',
    height: '100%',
  },
  goalCardText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  goalTitleInline: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: -spacing.xs,
  },
  // Channel rows card
  channelCard: {
    backgroundColor: colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recipientLoadingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  recipientRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recipientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  recipientAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientInitial: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  recipientText: {
    flex: 1,
    gap: 2,
  },
  recipientName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  recipientKind: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recipientBoundaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
    padding: spacing.lg,
    gap: spacing.md,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  channelRowPressed: {
    backgroundColor: colors.shellAlt,
  },
  channelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconWrapDisabled: {
    opacity: 0.55,
  },
  channelLabel: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  channelLabelDisabled: {
    color: colors.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 0,
  },
  privacyLine: {
    ...typography.bodySm,
    color: colors.muted,
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  // Success state
  successCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  successIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  successTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  successBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
