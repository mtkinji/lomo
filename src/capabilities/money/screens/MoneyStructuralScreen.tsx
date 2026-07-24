import { StyleSheet, Text, View } from 'react-native';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { colors, spacing, typography } from '../../../theme';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { MoneyPlaceBar } from '../navigation/MoneyPlaceBar';
import type { MoneyPlaceRouteName } from '../navigation/types';

export function MoneyStructuralScreen({
  activePlace,
  onSelectPlace,
  title,
}: {
  activePlace: MoneyPlaceRouteName;
  onSelectPlace: (place: MoneyPlaceRouteName) => void;
  title: string;
}) {
  const { openMenu } = useCapabilityShell();

  return (
    <AppShell>
      <PageHeader title={title} onPressMenu={openMenu}>
        <MoneyPlaceBar
          activePlace={activePlace}
          onSelect={onSelectPlace}
        />
      </PageHeader>
      <View style={styles.content}>
        <Text style={styles.title}>Money is ready for live data.</Text>
        <Text style={styles.body}>
          This native surface intentionally shows no sample financial values while the shared-session read model is being integrated.
        </Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
