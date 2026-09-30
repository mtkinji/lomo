import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { FullWidthActionDock, useFullWidthActionDockClearance } from '../../ui/FullWidthActionDock';
import { Logo } from '../../ui/Logo';
import { Text } from '../../ui/Typography';
import { OnboardingShorelineBackdrop } from './OnboardingShorelineBackdrop';

type Props = {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  action: ReactNode;
  onExit: () => void;
  exitLabel: string;
  active?: boolean;
};

/** Local editorial variant; does not alter the canonical illustrated setup frame. */
export function EditorialOnboardingScreen({ title, eyebrow, children, action, onExit, exitLabel, active = true }: Props) {
  const insets = useSafeAreaInsets();
  const clearance = useFullWidthActionDockClearance();
  return (
    <View style={styles.root} testID="onboarding.editorial">
      <OnboardingShorelineBackdrop active={active} />
      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <Logo size={28} />
        <Button onPress={onExit} variant="ghost" size="md">{exitLabel}</Button>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false}>
        <View style={styles.story}>
          {eyebrow ? <Text variant="label" style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {children}
        </View>
      </ScrollView>
      <FullWidthActionDock>{action}</FullWidthActionDock>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parchment },
  chrome: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  story: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { color: colors.textSecondary },
  title: { ...typography.titleXl, color: colors.textPrimary },
});
