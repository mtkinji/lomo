import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme';
import { Button } from '../../ui/Button';
import { AppShell } from '../../ui/layout/AppShell';
import { Heading, Text } from '../../ui/Typography';

export function CapabilityOnboardingResumeScreen({
  onContinue,
  onChooseAnotherPath,
  onLookAround,
}: {
  onContinue: () => void;
  onChooseAnotherPath: () => void;
  onLookAround: () => void;
}) {
  return (
    <AppShell>
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text variant="label" tone="secondary">MAKE MEALS EASIER</Text>
          <Heading variant="lg">Continue where you left off?</Heading>
          <Text tone="secondary">Your progress is saved. Pick up here, choose a different kind of help, or explore Kwilt.</Text>
        </View>
        <View style={styles.actions}>
          <Button fullWidth onPress={onContinue}>Continue where I left off</Button>
          <Button fullWidth variant="outline" onPress={onChooseAnotherPath}>Choose another starting point</Button>
          <Button fullWidth variant="ghost" onPress={onLookAround}>Explore Kwilt</Button>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, gap: spacing.xl },
  copy: { marginTop: spacing['2xl'], gap: spacing.md },
  actions: { gap: spacing.sm },
});
