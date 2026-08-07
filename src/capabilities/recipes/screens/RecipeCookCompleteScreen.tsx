import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, TextInput, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing, typography } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { Heading, Text } from "../../../ui/Typography";
import { useAppStore } from "../../../store/useAppStore";
import { recipeCookCache } from "../data/recipeCookCache";
import { createRecipeCookRepository } from "../data/recipeCookRepository";
import { buildRecipeCookLearning } from "../domain/recipeCookLearning";
import type { RecipeCookSession } from "../domain/recipeCookContracts";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeCookComplete">;
export function RecipeCookCompleteScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [again, setAgain] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState<
    "private_note" | "recipe_edit_proposal"
  >("private_note");
  const [session, setSession] = useState<RecipeCookSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  useEffect(() => {
    if (userId) void recipeCookCache.read(userId).then(setSession);
  }, [userId]);
  const done = async () => {
    if (session?.id === route.params.sessionId) {
      setSaving(true);
      setError(null);
      try {
        await createRecipeCookRepository().saveLearning(
          buildRecipeCookLearning(session, {
            wouldMakeAgain: again,
            note,
            destination,
          }),
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
      outcome: again === true ? "make_again" : "complete",
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
  return (
    <AppShell>
      <View style={styles.content}>
        <Heading variant="lg">Dinner, done.</Heading>
        <Text tone="secondary">
          Keep a private note for next time. Nothing changes the recipe unless
          you review an edit later.
        </Text>
        <Button
          variant={again === true ? "primary" : "outline"}
          onPress={() => setAgain((value) => (value === true ? null : true))}
        >
          We’d make this again
        </Button>
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
            <Button
              size="sm"
              variant={destination === "private_note" ? "primary" : "outline"}
              onPress={() => setDestination("private_note")}
            >
              Private cook note
            </Button>
            <Button
              size="sm"
              variant={
                destination === "recipe_edit_proposal" ? "primary" : "outline"
              }
              onPress={() => setDestination("recipe_edit_proposal")}
            >
              Propose recipe edit
            </Button>
          </View>
        ) : null}
        {destination === "recipe_edit_proposal" ? (
          <Text tone="secondary">
            This creates a review step. It does not edit or publish the recipe.
          </Text>
        ) : null}
        {error ? <Text tone="destructive">{error}</Text> : null}
        <Button
          variant="primary"
          disabled={saving}
          onPress={() => {
            void done();
          }}
        >
          {saving ? "Saving…" : "Done"}
        </Button>
      </View>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
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
