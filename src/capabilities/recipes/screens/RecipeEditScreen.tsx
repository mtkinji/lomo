import { useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { IngredientLineEditor, type EditableIngredientLine } from '../components/IngredientLineEditor';
import { InstructionSectionEditor, type EditableInstructionStep } from '../components/InstructionSectionEditor';
import type { RecipeProjection } from '../data/recipeCache';
import { useRecipeStore } from '../runtime/useRecipeStore';

function nextId(prefix: string): string { return `${prefix}-${Crypto.randomUUID()}`; }

export type RecipeEditorDraft = {
  title: string;
  description: string;
  servings: string;
  ingredients: EditableIngredientLine[];
  instructions: EditableInstructionStep[];
  sourceTitle: string;
  sourceAuthor: string;
  notes: string;
};

export function reviewedDataFromEditorDraft(
  draft: RecipeEditorDraft,
  provenance: { method: 'manual' | 'url' | 'photo' | 'scan' | 'text' | 'voice'; sourceUrl?: string | null } = { method: 'manual' },
) {
  return {
    title: draft.title.trim(), description: draft.description.trim() || null,
    yieldQuantity: draft.servings.trim() ? Number(draft.servings) : null, yieldUnit: draft.servings.trim() ? 'servings' : null,
    prepMinutes: null, cookMinutes: null, notes: draft.notes.trim() || null,
    ingredients: draft.ingredients.filter((line) => line.originalText.trim()).map((line) => ({
      id: line.id, groupLabel: null, originalText: line.originalText.trim(), quantityMin: null, quantityMax: null,
      unit: null, ingredientConcept: null, preparation: null, optional: false, parseConfidence: null,
    })),
    instructions: draft.instructions.filter((step) => step.text.trim()).map((step) => ({ id: step.id, sectionLabel: null, text: step.text.trim() })),
    provenance: {
      method: provenance.method, sourceUrl: provenance.sourceUrl ?? null, sourceTitle: draft.sourceTitle.trim() || null,
      sourceAuthor: draft.sourceAuthor.trim() || null, sourceContentHash: null,
      rightsBasis: provenance.method === 'manual' ? 'user_authored' as const : 'private_user_import' as const,
    },
    credits: [], lineage: [],
  };
}

export function RecipeEditView({ initial, saving, error, canSave = true, beforeFields, onSave, onBack }: {
  initial: RecipeEditorDraft;
  saving: boolean;
  error: string | null;
  canSave?: boolean;
  beforeFields?: React.ReactNode;
  onSave(draft: RecipeEditorDraft): Promise<void> | void;
  onBack(dirty: boolean): void;
}) {
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const patch = (values: Partial<RecipeEditorDraft>) => setDraft((current) => ({ ...current, ...values }));
  return (
    <AppShell>
      <PageHeader title={initial.title ? 'Edit recipe' : 'New recipe'} onPressBack={() => onBack(dirty)} rightElement={<Button size="sm" variant="primary" disabled={saving || !canSave || !draft.title.trim()} onPress={() => { void onSave(draft); }}>{saving ? 'Saving…' : 'Save'}</Button>} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          {error ? <Text tone="destructive">{error}</Text> : null}
          {beforeFields}
          <Field label="Title" value={draft.title} onChangeText={(title) => patch({ title })} placeholder="Grandma's chocolate cake" autoFocus={!initial.title} />
          <Field label="About this recipe" value={draft.description} onChangeText={(description) => patch({ description })} placeholder="Why you love it (optional)" multiline />
          <Field label="Servings" value={draft.servings} onChangeText={(servings) => patch({ servings })} placeholder="4" keyboardType="decimal-pad" />

          <Section title="Ingredients" action="Add ingredient" onAction={() => patch({ ingredients: [...draft.ingredients, { id: nextId('ingredient'), originalText: '' }] })}>
            {draft.ingredients.map((line) => (
              <IngredientLineEditor
                key={line.id}
                line={line}
                onChange={(next) => patch({ ingredients: draft.ingredients.map((candidate) => candidate.id === line.id ? next : candidate) })}
                onRemove={() => patch({ ingredients: draft.ingredients.filter((candidate) => candidate.id !== line.id) })}
              />
            ))}
          </Section>

          <Section title="Instructions" action="Add step" onAction={() => patch({ instructions: [...draft.instructions, { id: nextId('step'), text: '' }] })}>
            {draft.instructions.map((step, position) => (
              <InstructionSectionEditor
                key={step.id}
                step={step}
                position={position}
                onChange={(next) => patch({ instructions: draft.instructions.map((candidate) => candidate.id === step.id ? next : candidate) })}
                onRemove={() => patch({ instructions: draft.instructions.filter((candidate) => candidate.id !== step.id) })}
              />
            ))}
          </Section>

          <Section title="Source and story">
            <Field label="Recipe or book" value={draft.sourceTitle} onChangeText={(sourceTitle) => patch({ sourceTitle })} placeholder="Optional" />
            <Field label="Who it came from" value={draft.sourceAuthor} onChangeText={(sourceAuthor) => patch({ sourceAuthor })} placeholder="Optional" />
            <Field label="Notes" value={draft.notes} onChangeText={(notes) => patch({ notes })} placeholder="Variations, memories, or cooking notes" multiline />
          </Section>
          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text variant="label">{label}</Text>
      <TextInput accessibilityLabel={label} multiline={multiline} placeholderTextColor={colors.textSecondary} style={[styles.input, multiline && styles.multiline, style]} {...inputProps} />
    </View>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Heading variant="sm">{title}</Heading>{action ? <Button variant="ghost" size="sm" onPress={onAction}>{action}</Button> : null}</View>
      {children}
    </View>
  );
}

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeEdit'>;

function draftFromProjection(projection?: RecipeProjection): RecipeEditorDraft {
  const version = projection?.currentVersion;
  return {
    title: version?.title ?? '', description: version?.description ?? '', servings: version?.yieldQuantity?.toString() ?? '',
    ingredients: version?.ingredients.map((line) => ({ id: line.id, originalText: line.originalText })) ?? [],
    instructions: version?.instructions.map((step) => ({ id: step.id, text: step.text })) ?? [],
    sourceTitle: projection?.recipe.provenance.sourceTitle ?? '', sourceAuthor: projection?.recipe.provenance.sourceAuthor ?? '', notes: version?.notes ?? '',
  };
}

export function RecipeEditScreen({ navigation, route }: Props) {
  const recipeId = route.params?.recipeId;
  const projection = useRecipeStore((state) => state.recipes.find((item) => item.recipe.id === recipeId));
  const saveRecipe = useRecipeStore((state) => state.save);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = useMemo(() => draftFromProjection(projection), [projection]);
  const handleBack = (dirty: boolean) => {
    if (!dirty) { navigation.goBack(); return; }
    Alert.alert('Discard changes?', 'Your recipe has unsaved changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };
  const handleSave = async (draft: RecipeEditorDraft) => {
    setSaving(true); setError(null);
    const versionId = nextId('version');
    const now = new Date().toISOString();
    const resolvedRecipeId = projection?.recipe.id ?? nextId('recipe');
    const expectedVersion = projection?.currentVersion.version ?? 0;
    const reviewedData = reviewedDataFromEditorDraft(draft);
    const optimistic: RecipeProjection = {
      recipe: projection?.recipe ?? {
        id: resolvedRecipeId, ownerPersonId: 'pending-owner', currentVersionId: versionId, lifecycle: 'active',
        provenance: { id: nextId('provenance'), ...reviewedData.provenance, importedAt: null }, credits: [], lineage: [], accessGrants: [], mediaAssets: [], createdAt: now, updatedAt: now,
      },
      currentVersion: {
        id: versionId, recipeId: resolvedRecipeId, version: expectedVersion + 1, title: reviewedData.title,
        description: reviewedData.description, yieldQuantity: reviewedData.yieldQuantity, yieldUnit: reviewedData.yieldUnit,
        prepMinutes: null, cookMinutes: null, notes: reviewedData.notes,
        ingredients: reviewedData.ingredients.map((line, position) => ({ ...line, recipeVersionId: versionId, position })),
        instructions: reviewedData.instructions.map((step, position) => ({ ...step, recipeVersionId: versionId, position })),
        createdByPersonId: 'pending-owner', createdAt: now, contentHash: `pending:${now}`,
      },
    };
    try {
      await saveRecipe({ recipeId: projection?.recipe.id ?? null, expectedVersion, idempotencyKey: `recipe-save:${Crypto.randomUUID()}`, reviewedData }, optimistic);
      navigation.replace('RecipeHome', { recipeId: resolvedRecipeId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Recipe could not be saved.');
    } finally { setSaving(false); }
  };
  return <RecipeEditView initial={initial} saving={saving} error={error} onSave={handleSave} onBack={handleBack} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, form: { paddingHorizontal: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  fieldWrap: { gap: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.fieldFill, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  section: { gap: spacing.sm }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomSpace: { height: 80 },
});
