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
    capture(AnalyticsEvent.ShareDrawerOpened, { goalId });

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
          `I'm working on a goal in Kwilt: ` +
          `"${goalTitle}"\n\n` +
          `I'll share what I finish here. You can cheer me on or nudge me if I go quiet — no app install required.\n\n` +
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
  }, [capture, goalId, goalTitle, visible]);

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
              : step === 'sent'
                ? 'Invite sent'
                : 'Share this goal'
          }
          rightAction={<BottomDrawerHeaderClose onPress={onClose} />}
          titleStyle={styles.headerTitle}
        />

        <GoalContext title={goalTitle} imageUrl={goalImageUrl} />

        {step === 'offer' ? (
          <VStack space="lg">
            <Text style={styles.sectionLabel}>Share with</Text>

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
              Partners can see check-ins. Your to-dos stay private.
            </Text>
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
