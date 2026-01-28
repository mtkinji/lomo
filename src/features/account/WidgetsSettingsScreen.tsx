import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack, ButtonLabel, Card, Heading } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { scheduleWidgetReload } from '../../services/appleEcosystem/widgetCenter';
import { readGlanceableState } from '../../services/appleEcosystem/glanceableState';

type WidgetsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsWidgets'
>;

export function WidgetsSettingsScreen() {
  const navigation = useNavigation<WidgetsSettingsNavigationProp>();
  const { capture } = useAnalytics();
  const [lastWidgetSync, setLastWidgetSync] = useState<string | null>(null);

  useEffect(() => {
    capture(AnalyticsEvent.WidgetSetupViewed, { source: 'settings' });
  }, [capture]);

  const helpLinks = useMemo(
    () => ({
      homeScreen: 'https://support.apple.com/guide/iphone/add-widgets-to-the-home-screen-iphb8f3c8f06/ios',
    }),
    []
  );

  const handleNavigateBack = () => {
    navigation.goBack();
  };

  const handleOpenHelp = async () => {
    capture(AnalyticsEvent.WidgetSetupHelpOpened, { source: 'settings_home_screen' });
    // Apple does not provide a first-party deep link into the widget gallery.
    // Send users to the canonical support instructions.
    await Linking.openURL(helpLinks.homeScreen);
  };

  const handleRefreshWidget = async () => {
    capture(AnalyticsEvent.WidgetSetupHelpOpened, { source: 'settings_refresh' });
    scheduleWidgetReload();
    const state = await readGlanceableState().catch(() => null);
    const ms = state?.updatedAtMs;
    setLastWidgetSync(typeof ms === 'number' ? new Date(ms).toLocaleString() : null);
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Widgets" onPressBack={handleNavigateBack} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.offerWrap}>
            <LinearGradient
              colors={[colors.aiGradientStart, colors.aiGradientMid, colors.aiGradientEnd]}
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 0.9 }}
              style={styles.offerGradient}
            >
              <VStack space="sm">
                <Text style={styles.offerTitle}>Keep your next step one tap away</Text>
                <Text style={styles.offerBody}>
                  Add a Kwilt widget to your Home Screen so you can jump straight into Activities—without hunting for
                  the app.
                </Text>

                <Button variant="inverse" size="sm" fullWidth onPress={() => void handleOpenHelp()}>
                  Open Apple instructions
                </Button>
              </VStack>
            </LinearGradient>
          </View>

          <Card style={styles.card}>
            <VStack space="md">
              <HStack alignItems="center" space="sm">
                <Icon name="home" size={18} color={colors.textPrimary} />
                <Text style={styles.cardTitle}>How to add it</Text>
              </HStack>

              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.stepTitle}>Home Screen</Text>
                  <Text style={styles.step}>1) Touch and hold the Home Screen until apps jiggle.</Text>
                  <Text style={styles.step}>2) Tap the “+” button in the top corner.</Text>
                  <Text style={styles.step}>3) Search for “Kwilt”, then add the widget.</Text>
                </VStack>
              </VStack>
            </VStack>
          </Card>

          {__DEV__ ? (
            <Card style={styles.card}>
              <VStack space="md">
                <HStack alignItems="center" space="sm">
                  <Icon name="refresh" size={18} color={colors.textPrimary} />
                  <Text style={styles.cardTitle}>Debug: refresh widget</Text>
                </HStack>
                <Text style={styles.previewHint}>
                  If the widget is showing “Open Kwilt to sync…”, open the dev build once, then tap refresh.
                </Text>
                <HStack justifyContent="space-between" alignItems="center">
                  <Button onPress={() => void handleRefreshWidget()}>
                    <ButtonLabel tone="inverse">Refresh widget now</ButtonLabel>
                  </Button>
                  {lastWidgetSync ? (
                    <Text style={styles.syncMeta} numberOfLines={1}>
                      Last sync: {lastWidgetSync}
                    </Text>
                  ) : null}
                </HStack>
              </VStack>
            </Card>
          ) : null}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  offerWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  offerGradient: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.aiBorder,
  },
  offerKicker: {
    ...typography.bodySm,
    color: colors.aiForeground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  offerTitle: {
    ...typography.titleLg,
    color: colors.aiForeground,
  },
  offerBody: {
    ...typography.bodySm,
    color: colors.aiForeground,
    opacity: 0.92,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.canvas,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
  },
  step: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  previewHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  syncMeta: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
});


