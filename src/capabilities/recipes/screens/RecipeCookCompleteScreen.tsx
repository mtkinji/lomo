import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing, typography } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { Heading, Text } from "../../../ui/Typography";
import { useAppStore } from "../../../store/useAppStore";
import { recipeCookCache } from "../data/recipeCookCache";
import { createRecipeCookRepository } from "../data/recipeCookRepository";
import { buildRecipeCookLearning } from "../domain/recipeCookLearning";
import type { RecipeCookLearningInput, RecipeCookSubstitutionDraft } from "../domain/recipeCookLearning";
import type { RecipeCookSession } from "../domain/recipeCookContracts";
import type { RecipeVersion } from "../domain/recipeContracts";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { useRecipeStore } from "../runtime/useRecipeStore";
import { resolveAvailableRecipe } from "../data/resolveAvailableRecipe";
import { STARTER_RECIPE_PROJECTIONS } from "../data/starterRecipeCatalog";

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeCookComplete">;

function RatingChoices({
  value,
  label,
  onChange,
}: {
  value: number | null;
  label: string;
  onChange(value: number): void;
}) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${rating} out of 5`}
          accessibilityState={{ selected: value === rating }}
          onPress={() => onChange(rating)}
          style={[styles.ratingChoice, value === rating && styles.ratingChoiceSelected]}
        >
          <Text variant="label">{rating}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function RecipeCookCompleteView({
  version,
  saving,
  error,
  onSave,
}: {
  version: RecipeVersion;
  saving: boolean;
  error: string | null;
  onSave(input: RecipeCookLearningInput): void | Promise<void>;
}) {
  const [again, setAgain] = useState<boolean | null>(null);
  const [outcomeRating, setOutcomeRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState<"private_note" | "recipe_edit_proposal">("private_note");
  const [choosingIngredient, setChoosingIngredient] = useState(false);
  const [substitutions, setSubstitutions] = useState<RecipeCookSubstitutionDraft[]>([]);
  const availableIngredients = version.ingredients.filter(
    (ingredient) => !substitutions.some((item) => item.ingredientLineId === ingredient.id),
  );
  const updateSubstitution = (
    ingredientLineId: string,
    update: Partial<RecipeCookSubstitutionDraft>,
  ) => {
    setSubstitutions((current) => current.map((item) =>
      item.ingredientLineId === ingredientLineId ? { ...item, ...update } : item,
    ));
  };
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Heading variant="lg">Dinner, done.</Heading>
      <Text tone="secondary">
        Keep what worked—and what you changed—private for next time.
      </Text>

      <View style={styles.section}>
        <Text variant="label">How did it turn out?</Text>
        <RatingChoices value={outcomeRating} label="Rate this cook" onChange={setOutcomeRating} />
        <Button
          variant="outline"
          onPress={() => setAgain((value) => (value === true ? null : true))}
        >
          {again === true ? "✓ We’d make this again" : "We’d make this again"}
        </Button>
      </View>

      <View style={styles.section}>
        <Text variant="label">What changed?</Text>
        {substitutions.map((substitution) => {
          const ingredient = version.ingredients.find((item) => item.id === substitution.ingredientLineId);
          if (!ingredient) return null;
          return (
            <View key={substitution.ingredientLineId} style={styles.substitutionCard}>
              <View style={styles.substitutionHeading}>
                <Text>{ingredient.originalText}</Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setSubstitutions((current) => current.filter((item) => item.ingredientLineId !== substitution.ingredientLineId))}
                >
                  Remove
                </Button>
              </View>
              <Text variant="label">Used instead</Text>
              <TextInput
                accessibilityLabel="Used instead"
                value={substitution.usedInstead}
                onChangeText={(usedInstead) => updateSubstitution(substitution.ingredientLineId, { usedInstead })}
                placeholder="What did you use instead?"
                placeholderTextColor={colors.textSecondary}
                style={styles.singleLineInput}
              />
              <Text tone="secondary">How did that substitution work?</Text>
              <RatingChoices
                value={substitution.resultRating}
                label="Rate this substitution"
                onChange={(resultRating) => updateSubstitution(substitution.ingredientLineId, { resultRating })}
              />
              <Text variant="label">Anything to remember?</Text>
              <TextInput
                accessibilityLabel="Substitution note"
                value={substitution.note}
                onChangeText={(substitutionNote) => updateSubstitution(substitution.ingredientLineId, { note: substitutionNote })}
                placeholder="Anything to remember?"
                placeholderTextColor={colors.textSecondary}
                style={styles.singleLineInput}
              />
            </View>
          );
        })}
        {choosingIngredient ? (
          <View style={styles.ingredientChoices}>
            <Text tone="secondary">Which ingredient did you replace?</Text>
            {availableIngredients.map((ingredient) => (
              <Button
                key={ingredient.id}
                size="sm"
                variant="outline"
                onPress={() => {
                  setSubstitutions((current) => [...current, {
                    ingredientLineId: ingredient.id,
                    usedInstead: "",
                    resultRating: null,
                    note: "",
                  }]);
                  setChoosingIngredient(false);
                }}
              >
                {ingredient.originalText}
              </Button>
            ))}
          </View>
        ) : availableIngredients.length > 0 ? (
          <Button size="sm" variant="outline" onPress={() => setChoosingIngredient(true)}>
            Add a substitution
          </Button>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="label">Remember for next time</Text>
        <TextInput
          accessibilityLabel="Cooking note"
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="More sauce next time…"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        {note.trim() ? (
          <View style={styles.destinations}>
            <Button size="sm" variant="outline" onPress={() => setDestination("private_note")}>
              {destination === "private_note" ? "✓ Private cook note" : "Private cook note"}
            </Button>
            <Button size="sm" variant="outline" onPress={() => setDestination("recipe_edit_proposal")}>
              {destination === "recipe_edit_proposal" ? "✓ Propose recipe edit" : "Propose recipe edit"}
            </Button>
          </View>
        ) : null}
        {destination === "recipe_edit_proposal" ? (
          <Text tone="secondary">This creates a review step. It does not edit or publish the recipe.</Text>
        ) : null}
      </View>
      {error ? <Text tone="destructive">{error}</Text> : null}
      <Button
        variant="primary"
        disabled={saving}
        onPress={() => void onSave({ wouldMakeAgain: again, outcomeRating, note, destination, substitutions })}
      >
        {saving ? "Saving…" : "Done"}
      </Button>
    </ScrollView>
  );
}

export function RecipeCookCompleteScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [session, setSession] = useState<RecipeCookSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const projection = resolveAvailableRecipe(personalRecipes, route.params.recipeId, STARTER_RECIPE_PROJECTIONS);
  useEffect(() => {
    if (userId) void recipeCookCache.read(userId).then(setSession);
  }, [userId]);
  const done = async (input: RecipeCookLearningInput) => {
    if (session?.id === route.params.sessionId) {
      if (!projection) {
        setError("This recipe version is not available on this device.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await createRecipeCookRepository().saveLearning(
          buildRecipeCookLearning(session, projection.currentVersion, input),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Your cooking note did not save.",
        );
        setSaving(false);
        return;
      }
    }
    capture(AnalyticsEvent.CookSessionCompleted, {
      outcome: input.wouldMakeAgain === true ? "make_again" : "complete",
      timer_count: session?.timers.length ?? 0,
    });
    navigation.reset({
      index: 1,
      routes: [
        { name: "FoodHome" },
        { name: "RecipeHome", params: { recipeId: route.params.recipeId } },
      ],
    });
  };
  if (!projection) {
    return (
      <AppShell>
        <View style={styles.content}>
          <Text>This recipe is not available on this device.</Text>
        </View>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <RecipeCookCompleteView version={projection.currentVersion} saving={saving} error={error} onSave={done} />
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
  },
  section: { gap: spacing.sm },
  ratingRow: { flexDirection: "row", gap: spacing.sm },
  ratingChoice: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingChoiceSelected: { borderColor: colors.textPrimary, backgroundColor: colors.fieldFill },
  substitutionCard: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  substitutionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  ingredientChoices: { gap: spacing.sm },
  singleLineInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    color: colors.textPrimary,
    textAlignVertical: "top",
    ...typography.body,
  },
  destinations: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
