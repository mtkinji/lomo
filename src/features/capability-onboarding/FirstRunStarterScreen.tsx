import { StyleSheet, View } from 'react-native';
import { spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Typography';
import { EditorialOnboardingScreen } from './EditorialOnboardingScreen';
import type { CapabilityOnboardingContract } from './capabilityOnboardingContracts';

export function FirstRunStarterScreen({ paths, onStartPath, onExplore }: {
  paths: CapabilityOnboardingContract[];
  onStartPath: (path: CapabilityOnboardingContract) => void;
  onExplore: () => void;
}) {
  const money = paths.find(({ id }) => id === 'budget-app-controls');
  const alternatives = [
    { id: 'make-progress', label: 'Set a goal' },
    { id: 'household-chores', label: 'Share household chores' },
    { id: 'make-meals-easier', label: 'Plan meals and groceries' },
  ];
  return (
    <EditorialOnboardingScreen
      title={money ? 'Control your spending.' : 'Start with what matters.'}
      onExit={onExplore}
      exitLabel="Explore Kwilt"
      action={money ? <Button fullWidth size="lg" onPress={() => onStartPath(money)}>Build my budget</Button> : <Button fullWidth size="lg" onPress={onExplore}>Explore Kwilt</Button>}
    >
      <Text variant="body">See where your money goes. Build a budget. Add app pauses when you want them.</Text>
      <View style={styles.alternatives}>
        <Text variant="label">Or start here</Text>
        {alternatives.map(({ id, label }) => {
          const path = paths.find((candidate) => candidate.id === id);
          return path ? <Button key={id} variant="ghost" size="md" style={styles.row} onPress={() => onStartPath(path)}><Text style={styles.rowText}>{label}</Text></Button> : null;
        })}
      </View>
    </EditorialOnboardingScreen>
  );
}

const styles = StyleSheet.create({
  alternatives: { gap: spacing.xs, paddingTop: spacing.xl },
  row: { justifyContent: 'flex-start' },
  rowText: { ...typography.body, flexShrink: 1 },
});
