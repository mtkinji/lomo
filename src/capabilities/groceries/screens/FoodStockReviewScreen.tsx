import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { createFoodStockRepository } from '../data/foodStockRepository';
import type { FoodStockObservation, FoodStockState } from '../domain/foodStockContracts';
import { useRecipeStore } from '../../recipes/runtime/useRecipeStore';

type Props = NativeStackScreenProps<FoodStackParamList, 'FoodStockReview'>;
export function FoodStockReviewScreen({ navigation, route }: Props) {
  const recipes = useRecipeStore((state) => state.recipes); const [observations, setObservations] = useState<FoodStockObservation[]>([]); const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { void createFoodStockRepository().list().then(setObservations).catch(() => setObservations([])); }, []);
  const concepts = useMemo(() => route.params?.concepts?.length ? route.params.concepts : [...new Set(recipes.flatMap((recipe) => recipe.currentVersion.ingredients.flatMap((line) => line.ingredientConcept ? [line.ingredientConcept] : [])))].slice(0, 12), [recipes, route.params?.concepts]);
  const setState = async (concept: string, state: FoodStockState) => { setSaving(concept); const previous = observations.find((item) => item.concept.toLowerCase() === concept.toLowerCase()); try { await createFoodStockRepository().observe({ concept, state, quantityMin: previous?.quantityMin ?? null, quantityMax: previous?.quantityMax ?? null, unit: previous?.unit ?? null, source: 'manual', confidence: state === 'confirmed' || state === 'depleted' ? 1 : 0.6, observedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), supersedesObservationId: previous?.id ?? null }); setObservations((current) => [{ id: Crypto.randomUUID(), ownerPersonId: previous?.ownerPersonId ?? 'current-person', concept, state, quantityMin: null, quantityMax: null, unit: null, source: 'manual', confidence: state === 'confirmed' || state === 'depleted' ? 1 : 0.6, observedAt: new Date().toISOString(), expiresAt: null, supersedesObservationId: previous?.id ?? null, correctedAt: null }, ...current]); } finally { setSaving(null); } };
  return <AppShell><PageHeader title="What do you already have?" onPressBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content}><Heading variant="md">Confirm only what could change this plan.</Heading><Text tone="secondary">Kwilt won’t ask you to maintain a pantry. Old evidence becomes “check first”; it never decides food safety.</Text>{concepts.map((concept) => { const current = observations.find((item) => item.concept.toLowerCase() === concept.toLowerCase()); return <View key={concept} style={styles.row}><View style={styles.label}><Text>{concept}</Text>{current ? <Text tone="secondary">{current.state.replace('_', ' ')}</Text> : null}</View><View style={styles.actions}><Button size="sm" variant={current?.state === 'confirmed' ? 'primary' : 'outline'} disabled={saving === concept} onPress={() => { void setState(concept, 'confirmed'); }}>Have it</Button><Button size="sm" variant={current?.state === 'check_first' ? 'primary' : 'outline'} disabled={saving === concept} onPress={() => { void setState(concept, 'check_first'); }}>Check</Button><Button size="sm" variant="ghost" disabled={saving === concept} onPress={() => { void setState(concept, 'depleted'); }}>Out</Button></View></View>; })}<Button onPress={() => navigation.goBack()}>Done</Button></ScrollView></AppShell>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, row: { gap: spacing.sm, paddingVertical: spacing.sm }, label: { gap: 2 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
