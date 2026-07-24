import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import type { MoneyStackParamList } from '../navigation/types';

type DetailRouteName = 'MoneyCategoryDetail' | 'MoneyTransactionDetail';

export function MoneyDetailPlaceholderScreen({
  navigation,
  route,
}: NativeStackScreenProps<MoneyStackParamList, DetailRouteName>) {
  const title = route.name === 'MoneyCategoryDetail' ? 'Category' : 'Transaction';
  return (
    <AppShell>
      <PageHeader title={title} onPressBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.body}>Live {title.toLowerCase()} detail is being integrated without fixture fallback.</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
