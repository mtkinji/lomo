import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { openManageSubscription } from '../../services/entitlements';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, Text, VStack } from '../../ui/primitives';

export function ChangePlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const [isOpening, setIsOpening] = React.useState(false);

  const openAppleSubscriptions = React.useCallback(() => {
    setIsOpening(true);
    void openManageSubscription()
      .catch(() => {
        Alert.alert(
          'Unable to open Apple Subscriptions',
          'Open Settings on this iPhone, tap your name, then tap Subscriptions.',
        );
      })
      .finally(() => setIsOpening(false));
  }, []);

  return (
    <AppShell>
      <PageHeader title="Change plan" onPressBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <VStack space="md">
          <Heading style={styles.title}>Manage your plan with Apple</Heading>
          <Text style={styles.bodyCopy}>
            Apple shows your current Kwilt Pro plan, renewal price, billing date, and available changes.
          </Text>
          <Button
            fullWidth
            size="lg"
            disabled={isOpening}
            onPress={openAppleSubscriptions}
          >
            {isOpening ? 'Opening…' : 'Open Apple Subscriptions'}
          </Button>
        </VStack>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  bodyCopy: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
