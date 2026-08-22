import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View, type AppStateStatus } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Heading, Text } from '../../../ui/Typography';
import { getMoneyPrivacyPresentation, shouldRequestMoneyUnlock } from '../domain/privacyLockState';
import {
  authenticateMoneyPrivacyLock,
  MONEY_PRIVACY_RELOCK_AFTER_MS,
  useMoneyPrivacyLockSettings,
} from './moneyPrivacyLock';

export function MoneyPrivacyGate({ children }: { children: ReactNode }) {
  const { settings, loaded } = useMoneyPrivacyLockSettings();
  const initialized = useRef(false);
  const inactiveAt = useRef<number | null>(null);
  const attempted = useRef(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [automaticUnlockPending, setAutomaticUnlockPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded || !settings.enabled) {
      if (loaded) initialized.current = true;
      attempted.current = false;
      setLocked(false);
      setCovered(false);
      setAutomaticUnlockPending(false);
      return;
    }
    if (!initialized.current) {
      initialized.current = true;
      attempted.current = false;
      setLocked(true);
    }
  }, [loaded, settings.enabled]);

  useEffect(() => {
    const handleStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const backgroundedAt = inactiveAt.current;
        inactiveAt.current = null;
        if (settings.enabled && backgroundedAt && Date.now() - backgroundedAt >= MONEY_PRIVACY_RELOCK_AFTER_MS) {
          attempted.current = false;
          setLocked(true);
        }
        setCovered(false);
        return;
      }
      inactiveAt.current = Date.now();
      if (settings.enabled) setCovered(true);
    };
    const subscription = AppState.addEventListener('change', handleStateChange);
    return () => subscription.remove();
  }, [settings.enabled]);

  const unlock = useCallback(async () => {
    if (unlocking) return;
    setUnlocking(true);
    setMessage(null);
    try {
      const result = await authenticateMoneyPrivacyLock();
      if (result.success) setLocked(false);
      else if (!['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error)) {
        setMessage('Kwilt Money could not unlock. Try your device authentication again.');
      }
    } catch {
      setMessage('Device authentication is unavailable right now.');
    } finally {
      setUnlocking(false);
    }
  }, [unlocking]);

  useEffect(() => {
    if (!settings.enabled || !shouldRequestMoneyUnlock({
      locked, covered, unlocking, attempted: attempted.current,
    })) return;
    attempted.current = true;
    setAutomaticUnlockPending(true);
    void unlock().finally(() => setAutomaticUnlockPending(false));
  }, [covered, locked, settings.enabled, unlock, unlocking]);

  if (!settings.enabled && loaded) return <>{children}</>;
  const presentation = getMoneyPrivacyPresentation({ loaded, covered, locked, automaticUnlockPending });
  if (presentation === 'content') return <>{children}</>;
  if (presentation === 'loading') {
    return <View style={styles.loadingCover} testID="money-privacy-loading-cover" />;
  }
  if (presentation === 'privacy-cover') {
    return <View style={styles.privacyCover} testID="money-privacy-cover" />;
  }

  return (
    <View style={[styles.cover, styles.unlockCover]}>
      <View style={styles.panel}>
        <View style={styles.lockIcon}><Icon name="lock" size={28} color={colors.canvas} /></View>
        <Heading variant="md" tone="inverse">Kwilt Money is locked</Heading>
        <Text tone="inverse" style={styles.centeredText}>Unlock to view accounts, transactions, and plan details.</Text>
        <Button disabled={unlocking} onPress={() => void unlock()} variant="inverse">
          {unlocking ? 'Unlocking…' : 'Unlock'}
        </Button>
        {message ? <Text tone="inverse" style={styles.centeredText}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingCover: { flex: 1, backgroundColor: colors.canvas },
  privacyCover: { flex: 1, backgroundColor: colors.canvas },
  unlockCover: { backgroundColor: colors.pine900 },
  panel: { width: '100%', maxWidth: 360, alignItems: 'center', gap: spacing.md },
  lockIcon: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  centeredText: { textAlign: 'center', opacity: 0.82 },
});
