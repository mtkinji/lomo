import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { FriendshipSettingsSection } from './FriendshipSettingsSection';

/**
 * Compatibility surface for older internal routes.
 * Settings > People > Sharing is the canonical Friends destination.
 */
export function FriendsScreen() {
  const navigation = useNavigation();
  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Friends" onPressBack={() => navigation.goBack()} />
        <FriendshipSettingsSection />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
});

export default FriendsScreen;
