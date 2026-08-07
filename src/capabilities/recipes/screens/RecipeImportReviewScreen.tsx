import { useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

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

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeImportReview'>;
type Mode = 'url' | 'text';

function draftToEditor(draft: RecipeImportProjection): RecipeEditorDraft {
  const data = draft.extractedData;
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const instructions = Array.isArray(data.instructions) ? data.instructions : [];
  return {
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    servings: typeof data.yieldQuantity === 'number' ? String(data.yieldQuantity) : '',
    ingredients: ingredients.flatMap((item, index) => item && typeof item === 'object' && typeof (item as any).originalText === 'string' ? [{ id: typeof (item as any).id === 'string' ? (item as any).id : `ingredient-${index}`, originalText: (item as any).originalText }] : []),
    instructions: instructions.flatMap((item, index) => item && typeof item === 'object' && typeof (item as any).text === 'string' ? [{ id: typeof (item as any).id === 'string' ? (item as any).id : `step-${index}`, text: (item as any).text }] : []),
    sourceTitle: typeof data.sourceTitle === 'string' ? data.sourceTitle : '',
    sourceAuthor: typeof data.sourceAuthor === 'string' ? data.sourceAuthor : '',
    notes: '',
  };
}

export function RecipeImportReviewScreen({ navigation }: Props) {
  const sharePayload = useShareIntentStore((state) => state.payload);
  const clearShare = useShareIntentStore((state) => state.clear);
  const sharedSource = useMemo(() => recipeSourceFromSharePayload(sharePayload), [sharePayload]);
  const [mode, setMode] = useState<Mode>(sharedSource?.mode ?? 'url');
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
    return <RecipeEditView
      initial={draftToEditor(draft)} saving={busy} error={error ?? (draft.warnings.length ? draft.warnings.join(' ') : null)}
      canSave={privateCopyConfirmed}
      beforeFields={<><ImportEvidenceViewer evidence={draft.evidence} warnings={draft.warnings} expiresAt={draft.expiresAt} onRetry={()=>{setDraft(null);setPrivateCopyConfirmed(false);}}/><Pressable accessibilityRole="checkbox" accessibilityState={{checked:privateCopyConfirmed}} onPress={()=>setPrivateCopyConfirmed((value)=>!value)} style={[styles.rights,privateCopyConfirmed&&styles.rightsActive]}><Text>{privateCopyConfirmed?'✓ ':''}Save as a private household copy</Text><Text tone="secondary">I will keep the source attribution below and review this draft before saving.</Text></Pressable></>}
      onBack={(dirty) => { if (dirty) Alert.alert('Discard changes?', 'Your reviewed import has unsaved changes.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => setDraft(null) }]); else setDraft(null); }}
      onSave={async (editorDraft) => {
        setBusy(true); setError(null);
        try {
          if(!privateCopyConfirmed)throw new Error('Choose how this source may be saved.');const reviewedData = reviewedDataFromEditorDraft(editorDraft, { method: draft.method, sourceUrl });
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
      <PageHeader title="Import recipe" onPressBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Heading variant="md">Bring the recipe. Kwilt will make a draft.</Heading>
        <Text tone="secondary">Nothing becomes a recipe until you review and save it.</Text>
        <View style={styles.actions}>
          <Button variant={mode === 'url' ? 'primary' : 'outline'} size="sm" onPress={() => setMode('url')}>From a link</Button>
          <Button variant={mode === 'text' ? 'primary' : 'outline'} size="sm" onPress={() => setMode('text')}>Paste or dictate</Button>
        </View>
        <TextInput
          accessibilityLabel={mode === 'url' ? 'Recipe URL' : 'Recipe text'}
          value={source}
          onChangeText={setSource}
          autoCapitalize="none"
          autoCorrect={mode !== 'url'}
          multiline={mode === 'text'}
          placeholder={mode === 'url' ? 'https://…' : 'Paste the recipe, or use the keyboard microphone'}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, mode === 'text' && styles.textArea]}
        />
        {error ? <Text tone="destructive">{error}</Text> : null}
        <Button variant="primary" disabled={busy || !source.trim()} onPress={() => { void extract(mode === 'url' ? { method: 'url', sourceUrl: source.trim() } : { method: 'text', sourceText: source.trim() }); }}>{busy ? 'Making draft…' : 'Make a review draft'}</Button>
        <View style={styles.divider}><View style={styles.rule} /><Text tone="secondary">or use a photo</Text><View style={styles.rule} /></View>
        <View style={styles.actions}><Button variant="outline" onPress={() => { void pickPhoto(true); }}>Take a photo</Button><Button variant="outline" onPress={() => { void pickPhoto(false); }}>Choose photos</Button></View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.md, gap: spacing.md }, actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.fieldFill, color: colors.textPrimary, padding: spacing.md, ...typography.body },
  textArea: { minHeight: 180, textAlignVertical: 'top' }, divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  rights:{padding:spacing.md,gap:spacing.xs,borderWidth:1,borderColor:colors.border,borderRadius:14},rightsActive:{borderColor:colors.pine700,backgroundColor:colors.pine50},
});
