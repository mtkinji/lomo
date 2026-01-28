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

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHaptics'>;

export function HapticsSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const enabled = useAppStore((s) => s.hapticsEnabled);
  const setEnabled = useAppStore((s) => s.setHapticsEnabled);

  const subtitle = enabled
    ? 'Haptics are on. You’ll feel subtle feedback for key moments (success, error, focus, selections).'
    : 'Haptics are off. Kwilt will stay silent even on success/error moments.';

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Haptics" onPressBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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
});


