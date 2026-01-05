import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../theme';
import { VStack, Text } from '../../ui/primitives';
import { useAppStore } from '../../store/useAppStore';
import { HapticsService } from '../../services/HapticsService';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { getEnvVar } from '../../utils/getEnv';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHaptics'>;

export function HapticsSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const enabled = useAppStore((s) => s.hapticsEnabled);
  const setEnabled = useAppStore((s) => s.setHapticsEnabled);

  const appEnvironment = getEnvVar<string>('environment') ?? (__DEV__ ? 'development' : 'production');
  const easBuildProfile = getEnvVar<string>('easBuildProfile');
  const isProductionBuild = (easBuildProfile?.startsWith('production') ?? false) || appEnvironment === 'production';
  const showTestHaptics = !isProductionBuild;

  const subtitle = useMemo(
    () =>
      enabled
        ? 'Haptics are on. You’ll feel subtle feedback for key moments (success, error, focus, selections).'
        : 'Haptics are off. Kwilt will stay silent even on success/error moments.',
    [enabled],
  );

  const debugState = useMemo(() => (showTestHaptics ? HapticsService.getDebugState() : null), [enabled, showTestHaptics]);
  const debugLines = useMemo(() => {
    if (!__DEV__) return null;
    if (!debugState) return null;
    const lines = [
      `expo-haptics module: ${debugState.expoHapticsModuleAvailable ? 'available' : 'missing'}`,
      `reduce motion: ${
        debugState.reduceMotionEnabled === null ? 'unknown' : debugState.reduceMotionEnabled ? 'on' : 'off'
      }`,
      `app haptics: ${debugState.enabled ? 'enabled' : 'disabled'}`,
    ];
    return lines.join('\n');
  }, [debugState]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Haptics" onPressBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Haptics make important actions feel more physical and immersive. Kwilt uses them sparingly—mostly for
              outcomes like success and error.
            </Text>
          </View>

          <View style={styles.card}>
            <VStack space="xs">
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Enable haptics</Text>
                  <Text style={styles.rowSubtitle}>{subtitle}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(next) => {
                    setEnabled(next);
                    HapticsService.setEnabled(next);
                    if (next) {
                      void HapticsService.trigger('outcome.success');
                    }
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>
            </VStack>
          </View>

          {showTestHaptics ? (
            <View style={styles.card}>
              <VStack space="sm">
                <Text style={styles.rowTitle}>Test haptics</Text>
                <Text style={styles.sectionBody}>
                  If you don’t feel these on a physical device, something is suppressing haptics (system settings,
                  Reduce Motion, or a missing native module in your installed build).
                </Text>
                <View style={styles.testRow}>
                  <Button
                    size="small"
                    variant="ghost"
                    haptic={false}
                    onPress={() => void HapticsService.trigger('canvas.selection')}
                  >
                    <ButtonLabel size="sm">Test selection</ButtonLabel>
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    haptic={false}
                    onPress={() => void HapticsService.trigger('outcome.success')}
                  >
                    <ButtonLabel size="sm">Test success</ButtonLabel>
                  </Button>
                </View>
                {debugLines ? <Text style={styles.debugText}>{debugLines}</Text> : null}
              </VStack>
            </View>
          ) : null}

          <Text style={styles.helperText}>
            If you enable “Reduce Motion” in system settings, Kwilt will automatically suppress decorative haptics
            (like navigation/selection), while still allowing confirmations/outcomes.
          </Text>
        </ScrollView>
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
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.md,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowSubtitle: {
    marginTop: 2,
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  debugText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: typography.mono.fontFamily,
  },
});


