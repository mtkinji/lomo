import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack, ButtonLabel, Card } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

type WidgetsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsWidgets'
>;

export function WidgetsSettingsScreen() {
  const navigation = useNavigation<WidgetsSettingsNavigationProp>();
  const { capture } = useAnalytics();

  useEffect(() => {
    capture(AnalyticsEvent.WidgetSetupViewed, { source: 'settings' });
  }, [capture]);

  const handleNavigateBack = () => {
    navigation.goBack();
  };

  const handleOpenHelp = async () => {
    capture(AnalyticsEvent.WidgetSetupHelpOpened, { source: 'settings' });
    // Apple does not provide a first-party deep link into the widget gallery.
    // Send users to the canonical support instructions.
    await Linking.openURL('https://support.apple.com/guide/iphone/add-widgets-to-the-home-screen-iphb8f3c8f06/ios');
  };

  const handleTryToday = async () => {
    // Show the payoff by routing into the same shell/canvas destinations the widget uses.
    // Note: keep this distinct from source=widget so we don't treat it as widget adoption.
    await Linking.openURL('kwilt://today?source=widget_setup_try');
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Widgets" onPressBack={handleNavigateBack} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Add Kwilt to your Home Screen or Lock Screen so Today and your next step are one tap away.
            </Text>
          </View>

          <Card style={styles.card}>
            <VStack space="md">
              <HStack alignItems="center" space="sm">
                <Icon name="home" size={18} color={colors.textPrimary} />
                <Text style={styles.cardTitle}>Add the Kwilt widget</Text>
              </HStack>
              <VStack space="xs">
                <Text style={styles.step}>
                  1) Touch and hold the Home Screen until apps jiggle.
                </Text>
                <Text style={styles.step}>2) Tap the “+” button in the top corner.</Text>
                <Text style={styles.step}>3) Search for “Kwilt”, then add the widget.</Text>
              </VStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Button variant="secondary" onPress={() => void handleOpenHelp()}>
                  <ButtonLabel>Apple instructions</ButtonLabel>
                </Button>
                <Button onPress={() => void handleTryToday()}>
                  <ButtonLabel tone="inverse">Try Today</ButtonLabel>
                </Button>
              </HStack>
            </VStack>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Tip: after you add the widget, tapping it should open Kwilt directly to Today or your next Activity.
            </Text>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionBody: {
    ...typography.body,
    color: colors.textSecondary,
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
});


