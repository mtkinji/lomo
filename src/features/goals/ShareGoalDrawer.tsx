import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Share, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Heading, Input, Text, VStack } from '../../ui/primitives';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from '../../ui/layout/BottomDrawerHeader';
import { colors, spacing } from '../../theme';
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

type Step = 'kind' | 'channel' | 'email' | 'sent';

export function ShareGoalDrawer(props: { visible: boolean; onClose: () => void; goalId: string; goalTitle: string }) {
  const { visible, onClose, goalId, goalTitle } = props;
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('kind');
  const [inviteKind, setInviteKind] = useState<InviteKind>('buddy');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [tapUrl, setTapUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [altUrl, setAltUrl] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setStep('kind');
      setShareMessage('');
      setInviteCode('');
      setReferralCode('');
      setTapUrl('');
      setShareUrl('');
      setAltUrl('');
      setRecipientEmail('');
      return;
    }
    capture(AnalyticsEvent.ShareGoalDrawerOpened, { goalId });
    // Generate (or reuse) inviter referral code for this install so the recipient can
    // earn credits and the inviter gets credited when they redeem.
    createReferralCode()
      .then((code) => setReferralCode(code))
      .catch(() => setReferralCode(''));
    return () => {
      capture(AnalyticsEvent.ShareGoalDrawerClosed, { goalId });
    };
  }, [visible]);

  const withRef = useCallback(
    (rawUrl: string): string => {
      const ref = referralCode.trim();
      if (!rawUrl) return rawUrl;
      if (!ref) return rawUrl;
      try {
        const u = new URL(rawUrl);
        // Preserve existing params; only add if missing.
        if (!(u.searchParams.get('ref') ?? '').trim()) {
          u.searchParams.set('ref', ref);
        }
        return u.toString();
      } catch {
        // If URL parsing fails, fall back to a simple append.
        const joiner = rawUrl.includes('?') ? '&' : '?';
        return `${rawUrl}${joiner}ref=${encodeURIComponent(ref)}`;
      }
    },
    [referralCode],
  );

  const description = useMemo(
    () =>
      'Invite a buddy (1 person) or start a squad (2–6).\n\nBy default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.',
    [],
  );

  const buildAndSetInvite = useCallback(
    async (kind: InviteKind) => {
      setInviteKind(kind);
      capture(AnalyticsEvent.ShareInviteKindSelected, { goalId, kind });
      setBusy(true);
      try {
        const isExpoGo = Constants.appOwnership === 'expo';
        const { inviteUrl, inviteRedirectUrl, inviteLandingUrl } = await createGoalInvite({ goalId, goalTitle, kind });
        const code = extractInviteCode(inviteUrl);
        setInviteCode(code);
        const open = buildInviteOpenUrl(code);
        const fallbackTapUrl = inviteRedirectUrl
          ? isExpoGo
            ? `${inviteRedirectUrl}?exp=${encodeURIComponent(open.primary)}`
            : inviteRedirectUrl
          : open.primary;
        // Share-sheet preview needs OG metadata; our Edge Function (`inviteRedirectUrl`) provides it.
        const shareUrlBase = inviteRedirectUrl ?? inviteLandingUrl ?? fallbackTapUrl;

        // Tap/open URL for humans: prefer the landing host when available.
        const tapUrlBase = inviteLandingUrl ?? fallbackTapUrl;
        const tapUrl = withRef(tapUrlBase);
        const shareUrl = withRef(shareUrlBase);
        setTapUrl(tapUrl);
        setShareUrl(shareUrl);
        setAltUrl(open.alt);

        const message =
          `${kind === 'squad' ? 'Join my shared goal squad' : 'Join my goal'} in Kwilt: “${goalTitle}”.\n\n` +
          `Tap to open: ${tapUrl}\n\n` +
          `Default sharing: signals only (check-ins + cheers). Activity titles stay private unless we choose to share them.\n\n` +
          `Plus: we’ll both get +25 AI credits when you join.\n\n` +
          `If needed, copy/paste: ${open.alt}`;

        setShareMessage(message);
        setStep('channel');
      } finally {
        setBusy(false);
      }
    },
    [goalId, goalTitle],
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
          androidAppendUrl: false, // shareMessage already contains links
        }).catch(() => {});
      } else {
        await Share.share({ message: shareMessage }).catch(() => {});
      }
      return;
    }
    await Linking.openURL(smsUrl);
    capture(AnalyticsEvent.ShareInviteSmsComposerOpened, { goalId, kind: inviteKind });
    showToast({ message: 'Message ready', variant: 'success', durationMs: 2200 });
    onClose();
  }, [altUrl, capture, goalId, goalTitle, inviteKind, onClose, shareMessage, showToast, tapUrl]);

  const shareMore = useCallback(async () => {
    const url = (shareUrl || tapUrl || altUrl).trim();
    if (!shareMessage || !url) return;
    await shareUrlWithPreview({
      url,
      message: shareMessage,
      subject: `Join my goal in Kwilt: “${goalTitle}”`,
      androidDialogTitle: 'Share goal invite',
      androidAppendUrl: false, // shareMessage already contains links
    }).catch(() => {});
  }, [altUrl, goalTitle, shareMessage, shareUrl, tapUrl]);

  const copyInviteLink = useCallback(async () => {
    const link = tapUrl || altUrl;
    if (!link) return;
    await Clipboard.setStringAsync(link);
    capture(AnalyticsEvent.ShareInviteCopyLink, { goalId, kind: inviteKind });
    showToast({ message: 'Link copied', variant: 'success', durationMs: 2000 });
  }, [altUrl, capture, goalId, inviteKind, showToast, tapUrl]);

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
  }, [capture, goalId, goalTitle, inviteCode, inviteKind, recipientEmail]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['52%', '82%']}
      initialSnapIndex={0}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.surface}>
        <BottomDrawerHeader
          title="Share goal"
          rightAction={<BottomDrawerHeaderClose onPress={onClose} />}
          titleStyle={styles.headerTitle}
        />

        {step === 'kind' ? (
          <VStack space="md">
            <Text style={styles.body}>{description}</Text>
            <Button onPress={() => void buildAndSetInvite('buddy')} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.canvas} /> : 'Invite buddy'}
            </Button>
            <Button onPress={() => void buildAndSetInvite('squad')} disabled={busy} variant="secondary">
              {busy ? <ActivityIndicator color={colors.textPrimary} /> : 'Start squad'}
            </Button>
          </VStack>
        ) : step === 'channel' ? (
          <VStack space="md">
            <Text style={styles.body}>
              Invite ready ({inviteKind === 'squad' ? 'squad' : 'buddy'}). How do you want to send it?
            </Text>
            <Button onPress={() => void openSms()} disabled={busy || !shareMessage} fullWidth>
              Send by text
            </Button>
            <Button onPress={startEmail} disabled={busy} variant="secondary" fullWidth>
              Send by email
            </Button>
            <Button onPress={() => void copyInviteLink()} disabled={busy || (!tapUrl && !altUrl)} variant="outline" fullWidth>
              Copy link
            </Button>
            <Button onPress={() => void shareMore()} disabled={busy || !shareMessage || (!tapUrl && !altUrl)} variant="ghost" fullWidth>
              More…
            </Button>
            <Button onPress={() => setStep('kind')} variant="ghost" disabled={busy} fullWidth>
              Back
            </Button>
          </VStack>
        ) : step === 'email' ? (
          <VStack space="md">
            <Text style={styles.body}>Send an invite email (we’ll email a link that opens the app).</Text>
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
            <Button onPress={() => setStep('channel')} variant="ghost" disabled={busy} fullWidth>
              Back
            </Button>
          </VStack>
        ) : (
          <VStack space="md">
            <Text style={styles.body}>Invite sent. Want to send another?</Text>
            <Button
              onPress={() => {
                setStep('channel');
                setRecipientEmail('');
              }}
              variant="secondary"
              fullWidth
            >
              Send another
            </Button>
            <Button
              onPress={() => {
                showToast({ message: 'Invite sent', variant: 'success', durationMs: 2200 });
                onClose();
              }}
              fullWidth
            >
              Done
            </Button>
          </VStack>
        )}
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
    color: colors.textSecondary,
  },
});


