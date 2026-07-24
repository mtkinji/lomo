import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { useMoneyData } from '../data/MoneyDataContext';
import type { MoneyStackParamList } from '../navigation/types';

export function MoneyScreenFrame({
  children,
  moreMenu,
  title,
}: {
  children: ReactNode;
  moreMenu?: ReactNode;
  title: string;
}) {
  const { openMenu } = useCapabilityShell();
  const navigation = useNavigation<NativeStackNavigationProp<MoneyStackParamList>>();
  const { error, pendingAppControlReviewCategoryId, refresh, refreshing, snapshot, status } = useMoneyData();

  useEffect(() => {
    if (!pendingAppControlReviewCategoryId) return;
    navigation.navigate('MoneyCategoryDetail', { categoryId: pendingAppControlReviewCategoryId });
  }, [navigation, pendingAppControlReviewCategoryId]);

  return (
    <AppShell>
      <PageHeader title={title} moreMenu={moreMenu} onPressMenu={openMenu} />
      {status === 'loading' && !snapshot ? (
        <View accessibilityLabel="Loading Money" style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text tone="secondary">Reading your Money data…</Text>
        </View>
      ) : status === 'error' && !snapshot ? (
        <View style={styles.centered}>
          <Text tone="secondary" style={styles.centeredText}>{error || 'Money data could not be loaded.'}</Text>
          <Button variant="outline" onPress={() => void refresh()}>Try again</Button>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}
        >
          {error ? (
            <View accessibilityRole="alert" style={styles.warning}>
              <Text variant="label">Showing the last successful update</Text>
              <Text tone="secondary">{error}</Text>
            </View>
          ) : null}
          {children}
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centeredText: { textAlign: 'center' },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  warning: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.fieldFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
