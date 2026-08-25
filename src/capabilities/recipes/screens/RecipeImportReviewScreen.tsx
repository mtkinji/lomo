import { useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { getImagePickerMediaTypesImages } from '../../../utils/imagePickerMediaTypes';
import { createRecipeImportProposalExecutor } from '../../food-ai/recipeImportProposalExecutor';
import { createRecipeImportRepository, type RecipeImportProjection, type RecipeImportSource } from '../data/recipeImportRepository';
import { useRecipeStore } from '../runtime/useRecipeStore';
import { RecipeEditView, reviewedDataFromEditorDraft, type RecipeEditorDraft } from './RecipeEditScreen';
import { recipeSourceFromSharePayload, useShareIntentStore } from '../../../store/useShareIntentStore';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { ImportEvidenceViewer } from '../components/ImportEvidenceViewer';
import { getRecipeImportEntryPresentation, type RecipeImportIntent } from './recipeImportEntry';

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeImportReview'>;

export function draftToEditor(draft: RecipeImportProjection): RecipeEditorDraft {
  const data = draft.extractedData;
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const instructions = Array.isArray(data.instructions) ? data.instructions : [];
  return {
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    yieldQuantity: typeof data.yieldQuantity === 'number' ? String(data.yieldQuantity) : '',
    yieldUnit: typeof data.yieldUnit === 'string' ? data.yieldUnit : '',
    ingredients: ingredients.flatMap((item, index) => item && typeof item === 'object' && typeof (item as any).originalText === 'string' ? [{ id: typeof (item as any).id === 'string' ? (item as any).id : `ingredient-${index}`, originalText: (item as any).originalText }] : []),
    instructions: instructions.flatMap((item, index) => item && typeof item === 'object' && typeof (item as any).text === 'string' ? [{ id: typeof (item as any).id === 'string' ? (item as any).id : `step-${index}`, text: (item as any).text }] : []),
    sourceTitle: typeof data.sourceTitle === 'string' ? data.sourceTitle : '',
    sourceAuthor: typeof data.sourceAuthor === 'string' ? data.sourceAuthor : '',
    notes: '',
  };
}

export function RecipeImportReviewScreen({ navigation, route }: Props) {
  const sharePayload = useShareIntentStore((state) => state.payload);
  const clearShare = useShareIntentStore((state) => state.clear);
  const sharedSource = useMemo(() => recipeSourceFromSharePayload(sharePayload), [sharePayload]);
  const intent: RecipeImportIntent = sharedSource
    ? sharedSource.mode === 'url' ? 'web' : 'family'
    : route.params?.intent ?? 'family';
  const presentation = getRecipeImportEntryPresentation(intent);
  const [source, setSource] = useState(sharedSource?.value ?? '');
  const [draft, setDraft] = useState<RecipeImportProjection | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateCopyConfirmed,setPrivateCopyConfirmed]=useState(false);
  const refresh = useRecipeStore((state) => state.refresh);
  const { capture } = useAnalytics();
  useEffect(() => { if (sharedSource) clearShare(); }, [clearShare, sharedSource]);

  const extract = async (input: RecipeImportSource) => {
    setBusy(true); setError(null);
    capture(AnalyticsEvent.RecipeImportStarted, { method: input.method });
    try {
      const result = await createRecipeImportRepository().extract(input, `recipe-import:${Crypto.randomUUID()}`);
      setDraft(result);
      setSourceUrl(input.method === 'url' ? input.sourceUrl : null);
      capture(AnalyticsEvent.RecipeImportDraftCreated, { method: input.method, warning_count: result.warnings.length });
    } catch (caught) { capture(AnalyticsEvent.RecipeImportFailed, { method: input.method }); setError(caught instanceof Error ? caught.message : 'Recipe import failed.'); }
    finally { setBusy(false); }
  };

  const pickPhoto = async (camera: boolean) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', `Allow ${camera ? 'camera' : 'photo library'} access to import a recipe.`); return; }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: getImagePickerMediaTypesImages(), quality: 0.72, base64: true };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: true, selectionLimit: 10 });
    if (result.canceled) return;
    const imageDataUrls = result.assets.flatMap((asset) => asset.base64 ? [`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`] : []);
    if (!imageDataUrls.length) { setError('Kwilt could not read that image.'); return; }
    await extract({ method: 'photo', imageDataUrls });
  };

  if (draft) {
    const canSave = !presentation.requiresPrivateCopyConfirmation || privateCopyConfirmed;
    return <RecipeEditView
      initial={draftToEditor(draft)} saving={busy} error={error ?? (draft.warnings.length ? draft.warnings.join(' ') : null)}
      canSave={canSave}
      beforeFields={<><ImportEvidenceViewer evidence={draft.evidence} warnings={draft.warnings} expiresAt={draft.expiresAt} onRetry={()=>{setDraft(null);setPrivateCopyConfirmed(false);}}/>{presentation.requiresPrivateCopyConfirmation?<Pressable accessibilityRole="checkbox" accessibilityState={{checked:privateCopyConfirmed}} onPress={()=>setPrivateCopyConfirmed((value)=>!value)} style={[styles.rights,privateCopyConfirmed&&styles.rightsActive]}><Text>{privateCopyConfirmed?'✓ ':''}Save as a private copy</Text><Text tone="secondary">I will keep the source attribution below and review this draft before saving.</Text></Pressable>:<View style={styles.privateNote}><Text variant="label">Private to you</Text><Text tone="secondary">Review the draft below. Nothing is saved until you choose Save.</Text></View>}</>}
      onBack={(dirty) => { if (dirty) Alert.alert('Discard changes?', 'Your reviewed import has unsaved changes.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => setDraft(null) }]); else setDraft(null); }}
      onSave={async (editorDraft) => {
        setBusy(true); setError(null);
        try {
          if(!canSave)throw new Error('Choose how this source may be saved.');const reviewedData = reviewedDataFromEditorDraft(editorDraft, { method: draft.method, sourceUrl }, draft.extractedData.equipmentRequirements);
          const receipt = await createRecipeImportProposalExecutor().approve({ draftId: draft.id, idempotencyKey: `recipe-import-approval:${Crypto.randomUUID()}`, reviewedData });
          await refresh();
          capture(AnalyticsEvent.RecipeImportApproved, { method: draft.method });
          navigation.replace('RecipeHome', { recipeId: receipt.recipeId });
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Recipe could not be saved.'); }
        finally { setBusy(false); }
      }}
    />;
  }

  return (
    <AppShell>
      <PageHeader title={presentation.pageTitle} titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Heading variant="md" maxFontSizeMultiplier={1.8}>{presentation.heading}</Heading>
          <Text tone="secondary">{presentation.detail}</Text>
          {presentation.showPhotos ? <><View style={styles.actions}><Button variant="outline" onPress={() => { void pickPhoto(true); }}>Take a photo</Button><Button variant="outline" onPress={() => { void pickPhoto(false); }}>Choose photos</Button></View><View style={styles.divider}><View style={styles.rule} /><Text tone="secondary">or paste or dictate</Text><View style={styles.rule} /></View></> : null}
          <TextInput
            accessibilityLabel={presentation.inputLabel}
            value={source}
            onChangeText={setSource}
            autoCapitalize={presentation.inputKind === 'url' ? 'none' : 'sentences'}
            autoCorrect={presentation.inputKind !== 'url'}
            keyboardType={presentation.inputKind === 'url' ? 'url' : 'default'}
            multiline={presentation.inputKind === 'text'}
            placeholder={presentation.placeholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, presentation.inputKind === 'text' && styles.textArea]}
          />
          {error ? <Text tone="destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button variant="primary" disabled={busy || !source.trim()} onPress={() => { void extract(presentation.inputKind === 'url' ? { method: 'url', sourceUrl: source.trim() } : { method: 'text', sourceText: source.trim() }); }}>{busy ? 'Making draft…' : presentation.primaryLabel}</Button>
          {presentation.showManual ? <Button variant="ghost" onPress={() => navigation.replace('RecipeEdit', {})}>Start with a blank recipe</Button> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.fieldFill, color: colors.textPrimary, padding: spacing.md, ...typography.body },
  textArea: { minHeight: 180, textAlignVertical: 'top' }, divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  rights:{padding:spacing.md,gap:spacing.xs,borderWidth:1,borderColor:colors.border,borderRadius:14},rightsActive:{borderColor:colors.pine700,backgroundColor:colors.pine50},privateNote:{padding:spacing.md,gap:spacing.xs,borderRadius:14,backgroundColor:colors.fieldFill},
});
