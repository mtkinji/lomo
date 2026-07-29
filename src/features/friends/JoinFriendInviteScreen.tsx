import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { acceptFriendInvite } from '../../services/friendships';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Text, VStack } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';

type ScreenRoute = RouteProp<SettingsStackParamList, 'SettingsJoinFriend'>;
type ScreenNavigation = NativeStackNavigationProp<SettingsStackParamList, 'SettingsJoinFriend'>;
type DecisionState = 'idle' | 'accepting' | 'accepted' | 'unavailable';

export function JoinFriendInviteScreen() {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<ScreenNavigation>();
  const [state, setState] = useState<DecisionState>('idle');

  const accept = async () => {
    if (state === 'accepting') return;
    setState('accepting');
    try {
      await ensureSignedInWithPrompt('friend');
      const result = await acceptFriendInvite(route.params.inviteCode);
      setState(result.success && result.status === 'active' ? 'accepted' : 'unavailable');
    } catch {
      setState('unavailable');
    }
  };

  const openSharing = () => navigation.navigate('SettingsSharing');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Friend invite" onPressBack={() => navigation.goBack()} />

        <Card style={styles.card}>
          {state === 'accepted' ? (
            <VStack space="md" style={styles.centered}>
              <View style={styles.iconWrap}>
                <Icon name="check" size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.title}>You’re friends</Text>
              <Text style={styles.bodyCentered}>
                Nothing was shared. You can now choose each other more easily when you decide to share.
              </Text>
              <Button fullWidth onPress={openSharing}>Open Sharing</Button>
            </VStack>
          ) : state === 'unavailable' ? (
            <VStack space="md" style={styles.centered}>
              <View style={styles.iconWrap}>
                <Icon name="link" size={21} color={colors.textPrimary} />
              </View>
              <Text style={styles.title}>This invite is unavailable</Text>
              <Text style={styles.bodyCentered}>
                Ask the sender for a new link, or return to Sharing.
              </Text>
              <Button fullWidth onPress={openSharing}>Open Sharing</Button>
              <Button fullWidth variant="ghost" onPress={() => setState('idle')}>Try again</Button>
            </VStack>
          ) : (
            <VStack space="lg">
              <VStack space="sm" style={styles.centered}>
                <View style={styles.iconWrap}>
                  <Icon name="users" size={22} color={colors.textPrimary} />
                </View>
                <Text style={styles.title}>Connect on Kwilt?</Text>
                <Text style={styles.bodyCentered}>
                  Accepting makes this person easier to choose in a future sharing moment.
                </Text>
              </VStack>

              <View style={styles.boundary}>
                <Text style={styles.boundaryTitle}>
                  Becoming friends does not share anything by itself.
                </Text>
                <Text style={styles.body}>
                  Your Goals, Activities, Chapters, Money, Screen Time, Household, and location stay private.
                </Text>
              </View>

              <Button fullWidth disabled={state === 'accepting'} onPress={() => void accept()}>
                {state === 'accepting' ? (
                  <ActivityIndicator color={colors.canvas} />
                ) : (
                  'Accept friend invite'
                )}
              </Button>
              <Button fullWidth variant="ghost" disabled={state === 'accepting'} onPress={() => navigation.goBack()}>
                Not now
              </Button>
            </VStack>
          )}
        </Card>
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
  card: {
    padding: spacing.xl,
  },
  centered: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  bodyCentered: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  boundary: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boundaryTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
});
