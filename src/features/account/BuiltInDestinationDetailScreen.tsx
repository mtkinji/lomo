import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Card, HStack, Heading, Text, VStack, Badge, Button } from '../../ui/primitives';
import { spacing } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { OOTB_DESTINATIONS } from '../../domain/ootbDestinations';
import { formatActivityTypeLabel } from '../../domain/destinationCapabilities';
import { useAppStore } from '../../store/useAppStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsBuiltInDestinationDetail'>;
type Rt = RouteProp<SettingsStackParamList, 'SettingsBuiltInDestinationDetail'>;

export function BuiltInDestinationDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const kind = String((route.params as any)?.kind ?? '').trim().toLowerCase();

  const enabledSendToDestinations = useAppStore((s) => s.enabledSendToDestinations);
  const setSendToDestinationEnabled = useAppStore((s) => s.setSendToDestinationEnabled);

  const destination = OOTB_DESTINATIONS.find((d) => String(d.kind) === kind) ?? null;
  const isInstalled = Boolean((enabledSendToDestinations ?? {})[kind]);

  if (!destination || destination.kind === 'cursor_repo') {
    return (
      <AppShell>
        <View style={styles.screen}>
          <PageHeader title="Destination" onPressBack={() => navigation.goBack()} />
          <View style={styles.content}>
            <Card>
              <VStack space="xs">
                <Heading variant="sm">Destination not found</Heading>
                <Text>That destination may be unavailable in this build.</Text>
              </VStack>
            </Card>
          </View>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title={destination.displayName} onPressBack={() => navigation.goBack()} />
        <View style={styles.content}>
          <Card>
            <VStack space="sm">
              <VStack space="xs">
                <Heading variant="sm">{destination.displayName}</Heading>
                <Text>{destination.description}</Text>
              </VStack>

              <HStack space="xs" alignItems="center" style={styles.badgeWrap}>
                {destination.supportedTypes.map((t) => (
                  <Badge key={`${destination.kind}:${String(t)}`} variant="secondary">
                    {formatActivityTypeLabel(t)}
                  </Badge>
                ))}
              </HStack>

              <Button
                fullWidth
                variant={isInstalled ? 'secondary' : 'cta'}
                label={isInstalled ? 'Uninstall' : 'Install'}
                onPress={() => setSendToDestinationEnabled(kind, !isInstalled)}
                accessibilityLabel={isInstalled ? 'Uninstall destination' : 'Install destination'}
              />
              <Text style={styles.hint}>
                {isInstalled
                  ? 'This will appear in “Send to…” for supported Activity types.'
                  : 'Install to make this available in “Send to…” for supported Activity types.'}
              </Text>
            </VStack>
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  badgeWrap: {
    flexWrap: 'wrap',
  },
  hint: {
    marginTop: spacing.xs,
  },
});


