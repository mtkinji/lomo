import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, ScrollView, StyleSheet, TextInput, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing, typography } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import { createMealPlanningRepository } from "../data/mealPlanningRepository";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { AnalyticsEvent } from "../../../services/analytics/events";

type Props = NativeStackScreenProps<FoodStackParamList, "MealChoiceResponse">;
type Projection = {
  roundId: string;
  version: number;
  state: "open" | "closed" | "cancelled";
  closesAt: string | null;
  inviterLabel: string;
  selectionLimit: number;
  suggestionLimit: number;
  candidates: Array<{
    id: string;
    title: string;
    recipeSnapshot?: { media?: { url?: string } } | null;
  }>;
  myResponse: {
    selectedCandidateIds: string[];
    pass: boolean;
    suggestion: string | null;
  } | null;
};
export function MealChoiceResponseScreen({ navigation, route }: Props) {
  const [projection, setProjection] = useState<Projection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pass, setPass] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const { capture } = useAnalytics();
  useEffect(() => {
    void createMealPlanningRepository()
      .projection(route.params.roundId)
      .then((value) => {
        const next = value as Projection;
        setProjection(next);
        setSelected(next.myResponse?.selectedCandidateIds ?? []);
        setPass(
          route.params.intent === "pass" || (next.myResponse?.pass ?? false),
        );
        setSuggestion(next.myResponse?.suggestion ?? "");
      })
      .catch((error) => Alert.alert("Meal choices unavailable", error.message));
  }, [route.params.intent, route.params.roundId]);
  const unavailable =
    projection?.state !== "open" ||
    Boolean(
      projection?.closesAt && Date.parse(projection.closesAt) <= Date.now(),
    );
  const submit = async () => {
    if (!projection || unavailable) return;
    setBusy(true);
    try {
      await createMealPlanningRepository().submitResponse({
        roundId: projection.roundId,
        expectedRoundVersion: projection.version,
        selectedCandidateIds: selected,
        pass,
        suggestion: suggestion.trim() || null,
        availableCandidateIds: projection.candidates.map(
          (candidate) => candidate.id,
        ),
        selectionLimit: projection.selectionLimit,
      });
      capture(AnalyticsEvent.MealChoiceResponseCompleted, {
        outcome: pass ? "passed" : selected.length ? "selected" : "suggested",
        count: selected.length,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Choices changed",
        error instanceof Error
          ? error.message
          : "Reconnect and review the current round.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Choose meals"
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md">
          {projection?.inviterLabel ?? "Your household"} wants your input.
        </Heading>
        <Text tone="secondary">
          Pick what sounds good, pass, or suggest one idea. Your choices stay
          private while the round is open.
        </Text>
        {unavailable ? (
          <View style={styles.notice}>
            <Text>
              {projection?.state === "cancelled"
                ? "This invitation was withdrawn."
                : "This choice round is closed."}
            </Text>
            <Text tone="secondary">Nothing new was submitted.</Text>
          </View>
        ) : null}
        {projection?.candidates.map((candidate) => {
          const active = selected.includes(candidate.id);
          const image = candidate.recipeSnapshot?.media?.url;
          return (
            <Pressable
              disabled={unavailable}
              key={candidate.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled: unavailable }}
              onPress={() => {
                setPass(false);
                setSelected((current) =>
                  active
                    ? current.filter((id) => id !== candidate.id)
                    : current.length < projection.selectionLimit
                      ? [...current, candidate.id]
                      : current,
                );
              }}
              style={[styles.row, active && styles.active]}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
              <View style={styles.grow}>
                <Text>{candidate.title}</Text>
                <Text tone="secondary">
                  {active ? "Sounds good" : "Choose"}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Button
          disabled={unavailable}
          variant={pass ? "primary" : "outline"}
          onPress={() => {
            setPass(true);
            setSelected([]);
          }}
        >
          Pass this time
        </Button>
        <TextInput
          editable={!unavailable}
          accessibilityLabel="Suggest one meal"
          placeholder="One other idea (optional)"
          value={suggestion}
          onChangeText={setSuggestion}
          maxLength={projection?.suggestionLimit ?? 240}
          style={styles.input}
        />
        <Button
          disabled={
            !projection ||
            unavailable ||
            busy ||
            (!pass && !selected.length && !suggestion.trim())
          }
          onPress={() => {
            void submit();
          }}
        >
          {busy ? "Sending…" : "Done"}
        </Button>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
  image: { width: 72, height: 56, borderRadius: 10 },
  imagePlaceholder: {
    width: 72,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.fieldFill,
  },
  grow: { flex: 1, gap: 2 },
  notice: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.fieldFill,
    gap: 2,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.fieldFill,
    ...typography.body,
  },
});
