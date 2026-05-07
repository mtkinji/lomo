import { useCallback, useEffect, useState } from 'react';
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
  sendGoalInviteEmail,
  type InviteKind,
} from '../../services/invites';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useToastStore } from '../../store/useToastStore';
import { createReferralCode } from '../../services/referrals';

type Step = 'offer' | 'email' | 'sent';

export function ShareGoalDrawer(props: {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
  isShared?: boolean;
  memberCount?: number;
  onSendUpdate?: () => void;
  onManageSharing?: () => void;
  onInviteCreated?: () => void;
}) {
  const {
    visible,
    onClose,
    goalId,
    goalTitle,
    isShared = false,
    memberCount = 0,
    onSendUpdate,
    onManageSharing,
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

  const inviteReady = shareMessage.length > 0;

  // Pre-generate invite when drawer opens so channel taps are immediate.
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
      return;
    }
    capture(AnalyticsEvent.ShareGoalDrawerOpened, { goalId });
    capture(AnalyticsEvent.ShareDrawerOpened, { goalId, isShared, memberCount });

    let cancelled = false;
    setPreparing(true);

    (async () => {
      try {
        const code = await createReferralCode({ kind: 'shared_goal_invite' }).catch(() => '');
        if (cancelled) return;
        setReferralCode(code);

        const isExpoGo = Constants.appOwnership === 'expo';
        const { inviteUrl, inviteRedirectUrl, inviteLandingUrl } = await createGoalInvite({
          goalId,
          goalTitle,
          kind: 'people',
        });
        if (cancelled) return;

        const codeFromUrl = extractInviteCode(inviteUrl);
        setInviteCode(codeFromUrl);
        const open = buildInviteOpenUrl(codeFromUrl);
        const fallbackTapUrl = inviteRedirectUrl
          ? isExpoGo
            ? `${inviteRedirectUrl}?exp=${encodeURIComponent(open.primary)}`
            : inviteRedirectUrl
          : open.primary;
        const tapUrlBase = inviteLandingUrl ?? fallbackTapUrl;

        const ref = (code ?? '').trim();
        const addRef = (raw: string): string => {
          if (!raw || !ref) return raw;
          try {
            const u = new URL(raw);
            if (!(u.searchParams.get('ref') ?? '').trim()) {
              u.searchParams.set('ref', ref);
            }
            return u.toString();
          } catch {
            const j = raw.includes('?') ? '&' : '?';
            return `${raw}${j}ref=${encodeURIComponent(ref)}`;
          }
        };
        const tapU = addRef(tapUrlBase);
        setTapUrl(tapU);
        setAltUrl(open.alt);

        const message =
          `Hey 👋 I’m using an app called Kwilt to stay on track with a goal: ` +
          `“${goalTitle}”\n\n` +
          `Would you be my accountability partner? I’ll send occasional check-ins, and you can cheer me on or encourage me if I go quiet.\n\n` +
          `${tapU}`;
        setShareMessage(message);
      } catch {
        // Leave inviteReady false; rows show a retry hint via disabled state.
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
      capture(AnalyticsEvent.ShareGoalDrawerClosed, { goalId });
    };
  }, [capture, goalId, goalTitle, isShared, memberCount, visible]);

  const markSent = useCallback(
    (channel: string) => {
      capture(AnalyticsEvent.ShareInviteSent, { goalId, channel, kind: inviteKind });
      onInviteCreated?.();
    },
    [capture, goalId, inviteKind, onInviteCreated],
  );

  const openSms = useCallback(async () => {
    if (!shareMessage) return;
    capture(AnalyticsEvent.ShareInviteChannelSelected, { goalId, kind: inviteKind, channel: 'sms' });
    const body = encodeURIComponent(shareMessage);
    const smsUrl = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    const can = await Linking.canOpenURL(smsUrl).catch(() => false);
    if (!can) {
      const url = (tapUrl || altUrl).trim();
      if (url) {
        await shareUrlWithPreview({
          url,
          message: shareMessage,
          subject: `Join my goal in Kwilt: “${goalTitle}”`,
          androidDialogTitle: 'Share goal invite',
          androidAppendUrl: false,
        }).catch(() => {});
      } else {
        await Share.share({ message: shareMessage }).catch(() => {});
      }
      markSent('sms_fallback');
      return;
    }
    await Linking.openURL(smsUrl);
    capture(AnalyticsEvent.ShareInviteSmsComposerOpened, { goalId, kind: inviteKind });
    markSent('sms');
    showToast({ message: 'Message ready', variant: 'success', durationMs: 2200 });
    onClose();
  }, [
    altUrl,
    capture,
    goalId,
    goalTitle,
    inviteKind,
    markSent,
    onClose,
    shareMessage,
    showToast,
    tapUrl,
  ]);

  const copyInviteLink = useCallback(async () => {
    const link = tapUrl || altUrl;
    if (!link) return;
    await Clipboard.setStringAsync(link);
    capture(AnalyticsEvent.ShareInviteCopyLink, { goalId, kind: inviteKind });
    markSent('copy_link');
    showToast({ message: 'Link copied', variant: 'success', durationMs: 2000 });
  }, [altUrl, capture, goalId, inviteKind, markSent, showToast, tapUrl]);

  const startEmail = useCallback(() => {
    capture(AnalyticsEvent.ShareInviteChannelSelected, { goalId, kind: inviteKind, channel: 'email' });
    setStep('email');
  }, [capture, goalId, inviteKind]);

  const sendEmail = useCallback(async () => {
    const email = recipientEmail.trim();
    if (!email) {
      Alert.alert('Email required', 'Enter an email address to send the invite.');
      return;
    }
    setBusy(true);
    capture(AnalyticsEvent.ShareInviteEmailSendAttempted, { goalId, kind: inviteKind });
    try {
      await sendGoalInviteEmail({
        goalId,
        goalTitle,
        kind: inviteKind,
        recipientEmail: email,
        inviteCode: inviteCode || null,
        referralCode: referralCode || null,
      });
      capture(AnalyticsEvent.ShareInviteEmailSendSucceeded, { goalId, kind: inviteKind });
      markSent('email');
      setStep('sent');
    } catch (e: any) {
      capture(AnalyticsEvent.ShareInviteEmailSendFailed, {
        goalId,
        kind: inviteKind,
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
    inviteCode,
    inviteKind,
    markSent,
    recipientEmail,
    referralCode,
  ]);

  const offerHeadline = isShared
    ? memberCount > 1
      ? 'Keep your partners in the loop'
      : 'Keep your partner in the loop'
    : 'Invite a partner to cheer you on';

  const showAccountabilityInfo = useCallback(() => {
    Alert.alert(
      'Why invite a partner?',
      'Accountability partners can make goals easier to return to because someone else can notice progress, celebrate wins, and nudge you when a goal gets quiet. In Kwilt, they support from the side: they can see your updates and cheer or reply, but they cannot edit your to-dos.',
    );
  }, []);

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
          title={step === 'email' ? 'Email invite' : step === 'sent' ? 'Invite sent' : 'Share goal'}
          rightAction={<BottomDrawerHeaderClose onPress={onClose} />}
          titleStyle={styles.headerTitle}
        />

        <GoalContext title={goalTitle} />

        {step === 'offer' ? (
          <VStack space="lg">
            <View style={styles.stepsList}>
              <StepRow
                index={1}
                title={offerHeadline}
                subtitle="A partner can celebrate wins and help you return when this goal gets quiet."
                onInfoPress={showAccountabilityInfo}
              />
              <StepRow
                index={2}
                title={
                  isShared
                    ? 'They follow your check-ins'
                    : 'They get a simple link'
                }
                subtitle="They can see check-ins, cheer, and reply. You’ll see their support in your goal feed."
              />
            </View>

            {isShared && onSendUpdate ? (
              <PrimaryRow
                icon="send"
                title="Send a check-in update"
                subtitle={
                  memberCount > 1
                    ? `Tell your ${memberCount} partners how it’s going`
                    : 'Tell your partner how it’s going'
                }
                onPress={onSendUpdate}
              />
            ) : null}

            {isShared ? <Text style={styles.sectionLabel}>Invite another partner</Text> : null}

            <View style={styles.channelCard}>
              <ChannelRow
                icon="messageSquare"
                label="Text message"
                onPress={() => void openSms()}
                disabled={!inviteReady}
                loading={preparing && !inviteReady}
              />
              <View style={styles.divider} />
              <ChannelRow
                icon="mail"
                label="Email"
                onPress={startEmail}
                disabled={busy || !inviteReady}
                loading={preparing && !inviteReady}
              />
              <View style={styles.divider} />
              <ChannelRow
                icon="link"
                label="Copy link"
                onPress={() => void copyInviteLink()}
                disabled={!tapUrl && !altUrl}
                loading={preparing && !tapUrl && !altUrl}
              />
            </View>

            <Text style={styles.privacyLine}>
              Your to-dos stay private — partners can’t edit them.
            </Text>

            {isShared && onManageSharing ? (
              <Pressable
                onPress={onManageSharing}
                style={({ pressed }) => [styles.manageRow, pressed && styles.manageRowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Manage who can see this goal"
              >
                <Icon name="users" size={16} color={colors.textSecondary} />
                <Text style={styles.manageRowText}>Manage who can see this goal</Text>
                <Icon name="chevronRight" size={14} color={colors.muted} />
              </Pressable>
            ) : null}
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
              <Text style={styles.successTitle}>Invite on its way</Text>
              <Text style={styles.successBody}>
                We’ll let you know when they cheer or reply.
              </Text>
            </View>
            <Button
              onPress={() => {
                setStep('offer');
                setRecipientEmail('');
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

function GoalContext(props: { title: string }) {
  return (
    <View style={styles.goalContext}>
      <Text style={styles.goalLabel}>Goal</Text>
      <View style={styles.goalWell}>
        <Text style={styles.goalTitleInline} numberOfLines={2}>
          {props.title}
        </Text>
      </View>
    </View>
  );
}

function StepRow(props: {
  index: number;
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{props.index}</Text>
      </View>
      <View style={styles.stepTextWrap}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>{props.title}</Text>
          {props.onInfoPress ? (
            <Pressable
              onPress={props.onInfoPress}
              accessibilityRole="button"
              accessibilityLabel="Learn why accountability partners help"
              hitSlop={8}
              style={({ pressed }) => [styles.infoButton, pressed && styles.infoButtonPressed]}
            >
              <Icon name="info" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        {props.subtitle ? <Text style={styles.stepSubtitle}>{props.subtitle}</Text> : null}
      </View>
    </View>
  );
}

function PrimaryRow(props: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.title}
      style={({ pressed }) => [styles.primaryRow, pressed && styles.primaryRowPressed]}
    >
      <View style={styles.primaryRowIcon}>
        <Icon name={props.icon} size={18} color={colors.canvas} />
      </View>
      <View style={styles.primaryRowText}>
        <Text style={styles.primaryRowTitle}>{props.title}</Text>
        <Text style={styles.primaryRowSubtitle}>{props.subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.canvas} />
    </Pressable>
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
  goalContext: {
    gap: spacing.xs,
  },
  goalLabel: {
    ...typography.caption,
    color: colors.muted,
    fontFamily: fonts.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  goalWell: {
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalTitleInline: {
    ...typography.body,
    color: colors.textPrimary,
  },
  stepsList: {
    gap: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  stepTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepTitle: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  infoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  infoButtonPressed: {
    opacity: 0.65,
  },
  stepSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: -spacing.xs,
  },
  // Primary action row (shared state, "Send update")
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  primaryRowPressed: {
    opacity: 0.85,
  },
  primaryRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRowText: {
    flex: 1,
    minWidth: 0,
  },
  primaryRowTitle: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.semibold,
  },
  primaryRowSubtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },
  // Channel rows card
  channelCard: {
    backgroundColor: colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
  // Manage row
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  manageRowPressed: {
    opacity: 0.6,
  },
  manageRowText: {
    flex: 1,
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
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
