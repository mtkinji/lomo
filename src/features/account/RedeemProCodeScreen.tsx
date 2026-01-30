import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { Input, KeyboardAwareScrollView, Text, VStack } from '../../ui/primitives';
import { spacing, cardSurfaceStyle, typography, colors } from '../../theme';
import { redeemProCode } from '../../services/proCodes';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsRedeemProCode'>;

export function RedeemProCodeScreen() {
  const navigation = useNavigation<Nav>();
  const isPro = useEntitlementsStore((s) => s.isPro);

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim().length > 0 && !isSubmitting;

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Redeem code" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.body}>
              Enter a Pro access code to unlock Kwilt Pro on this device. Your current tier is{' '}
              <Text style={styles.strong}>{isPro ? 'Pro' : 'Free'}</Text>.
            </Text>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Input
                label="Pro code"
                placeholder="ABCDE-FGHIJ-KLMNO-PQRST"
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  if (error) setError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                variant="outline"
                errorText={error ?? undefined}
              />

              <Button
                disabled={!canSubmit}
                onPress={() => {
                  if (!canSubmit) return;
                  setIsSubmitting(true);
                  setError(null);
                  redeemProCode(code)
                    .then(({ alreadyRedeemed }) => {
                      Alert.alert(
                        alreadyRedeemed ? 'Already redeemed' : 'Unlocked',
                        alreadyRedeemed
                          ? 'This code was already redeemed on this device.'
                          : 'Kwilt Pro is now active.',
                      );
                      navigation.goBack();
                    })
                    .catch((e: any) => {
                      const msg =
                        typeof e?.message === 'string' ? e.message : 'We could not redeem that code right now.';
                      setError(msg);
                    })
                    .finally(() => setIsSubmitting(false));
                }}
              >
                <Text style={styles.buttonLabel}>{isSubmitting ? 'Redeeming…' : 'Redeem'}</Text>
              </Button>
            </VStack>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  strong: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  card: {
    ...(cardSurfaceStyle as any),
    padding: spacing.lg,
    gap: spacing.md,
  },
  buttonLabel: {
    ...typography.body,
    color: colors.canvas,
  },
});












