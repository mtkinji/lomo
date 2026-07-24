import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Heading, Text } from '../../../ui/Typography';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { parseCategoryPlanDraft } from '../domain/categoryPlanDraft';
import { useMoneyData } from '../data/MoneyDataContext';
import type { MoneyStackParamList } from '../navigation/types';

export function MoneyCategoryCreateScreen({
  navigation,
}: NativeStackScreenProps<MoneyStackParamList, 'MoneyCategoryCreate'>) {
  const { createCategory, savingCategory } = useMoneyData();
  const [name, setName] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const input = parseCategoryPlanDraft({ name, monthlyAmount });
      const categoryId = await createCategory(input);
      navigation.replace('MoneyCategoryDetail', { categoryId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The category could not be created.');
    }
  };

  return (
    <AppShell>
      <PageHeader title="New category" onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Heading variant="md">Make room for what matters</Heading>
          <Text tone="secondary">Name the category and set the amount you intend to use each month.</Text>
        </View>
        <Input
          autoCapitalize="words"
          autoCorrect
          label="Category name"
          onChangeText={setName}
          placeholder="Groceries"
          returnKeyType="next"
          value={name}
        />
        <Input
          keyboardType="decimal-pad"
          label="Monthly amount"
          onChangeText={setMonthlyAmount}
          placeholder="$0.00"
          value={monthlyAmount}
        />
        {error ? <Text tone="destructive">{error}</Text> : null}
        <Button disabled={savingCategory} fullWidth onPress={() => void submit()} variant="primary">
          {savingCategory ? 'Creating…' : 'Create category'}
        </Button>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing['3xl'] },
  intro: { gap: spacing.xs },
});
