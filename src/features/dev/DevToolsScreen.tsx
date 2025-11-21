import { ScrollView, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { Heading, Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography, fonts } from '../../theme';
import { Button } from '../../ui/Button';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

export function DevToolsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const isFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const lastTriggeredAt = useFirstTimeUxStore((state) => state.lastTriggeredAt);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);

  const handleTriggerFirstTimeUx = () => {
    resetOnboardingAnswers();
    startFlow();
  };

  const lastTriggeredLabel = lastTriggeredAt
    ? new Date(lastTriggeredAt).toLocaleString()
    : 'Never';

  return (
    <AppShell>
      <PageHeader
        title="Dev mode"
        iconName="dev"
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <Text style={[styles.screenSubtitle, { paddingTop: spacing.lg }]}>
          Utilities for testing and development. Only visible in
          development builds.
        </Text>
      </PageHeader>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stack}>
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>First-time UX</Text>
            {/* <Heading style={styles.cardTitle}>Trigger onboarding flow</Heading> */}
            {/* <Text style={styles.cardBody}>
              Launches the first-time experience overlay immediately, even if it was already
              completed.
            </Text> */}
            <Button onPress={handleTriggerFirstTimeUx}>
              <Text style={styles.primaryButtonLabel}>Trigger first-time UX</Text>
            </Button>
            {isFlowActive && (
              <Button variant="secondary" onPress={dismissFlow}>
                <Text style={styles.secondaryButtonLabel}>Force dismiss</Text>
              </Button>
            )}
            <Text style={styles.meta}>
              Triggered {triggerCount} {triggerCount === 1 ? 'time' : 'times'} • Last:{' '}
              {lastTriggeredLabel}
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  stack: {
    gap: spacing.lg,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardEyebrow: {
    ...typography.label,
    color: colors.muted,
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.semibold,
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});


