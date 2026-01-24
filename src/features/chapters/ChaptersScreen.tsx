import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import { VStack, Heading, Text, EmptyState } from '../../ui/primitives';

export function ChaptersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList, 'MoreChapters'>>();

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        iconName="chapters"
        iconTone="chapter"
        onPressBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.navigate('MoreHome');
        }}
      />
      <VStack space="lg">
        <EmptyState
          title="No chapters yet"
          instructions="Log a few activities first—then kwilt will help you generate a Chapter."
          primaryAction={{
            label: 'Go to Activities',
            variant: 'accent',
            onPress: () =>
              navigation.navigate('MainTabs', {
                screen: 'ActivitiesTab',
                params: { screen: 'ActivitiesList' },
              }),
            accessibilityLabel: 'Go to the Activities list',
          }}
          style={styles.emptyState}
        />
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


