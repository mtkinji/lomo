import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Text } from "../../../ui/Typography";
import { CookCueCard } from "../components/CookCueCard";
import { CookProgress } from "../components/CookProgress";
import { CookTimerControl } from "../components/CookTimerControl";
import { useRecipeCookSession } from "../runtime/useRecipeCookSession";
import { useRecipeStore } from "../runtime/useRecipeStore";
import type { RecipeProjection } from "../data/recipeCache";
import {
  createCookVoiceController,
  type CookVoiceControllerAction,
} from "../voice/cookVoiceController";
import { cookVoiceTransport } from "../voice/cookVoiceTransport";
import type { CookVoiceState } from "../voice/cookVoiceContracts";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeCookMode">;
export function RecipeCookModeScreen({ navigation, route }: Props) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const projection = useRecipeStore((state) =>
    state.recipes.find((item) => item.recipe.id === route.params.recipeId),
  );
  if (!projection)
    return (
      <AppShell>
        <PageHeader title="Cook Mode" onPressBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text>This recipe is not available.</Text>
        </View>
      </AppShell>
    );
  return (
    <RecipeCookModeExperience
      projection={projection}
      servings={route.params.servings}
      landscape={landscape}
      navigation={navigation}
    />
  );
}

function RecipeCookModeExperience({
  projection,
  servings,
  landscape,
  navigation,
}: {
  projection: RecipeProjection;
  servings: number;
  landscape: boolean;
  navigation: Props["navigation"];
}) {
  const { capture } = useAnalytics();
  const trackedSession = useRef<string | null>(null);
  const cook = useRecipeCookSession(projection, servings);
  const [voiceState, setVoiceState] = useState<CookVoiceState>("off");
  useEffect(() => {
    if (!cook.restoring && !cook.session) void cook.start();
  }, [cook.restoring, cook.session, cook.start]);
  useEffect(() => {
    const active = cook.session;
    if (!active || trackedSession.current === active.id) return;
    trackedSession.current = active.id;
    capture(
      active.currentCueIndex > 0 || active.status === "paused"
        ? AnalyticsEvent.CookSessionResumed
        : AnalyticsEvent.CookSessionStarted,
      { state: active.status, count: active.cueCount },
    );
  }, [capture, cook.session]);
  if (cook.restoring || !cook.session)
    return (
      <AppShell>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} />
          <Text tone="secondary">Restoring your place…</Text>
        </View>
      </AppShell>
    );
  const session = cook.session;
  const cue = cook.cues[session.currentCueIndex];
  if (!cue)
    return (
      <AppShell>
        <PageHeader
          title={projection.currentVersion.title}
          onPressBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <Text>No cooking steps are available.</Text>
        </View>
      </AppShell>
    );
  const send = (event: Parameters<typeof cook.send>[0]) => {
    if (event.type === "next" || event.type === "back")
      capture(AnalyticsEvent.CookCueAdvanced, {
        method: event.type,
        cue_index_bucket: Math.floor(session.currentCueIndex / 3) * 3,
      });
    if (event.type.endsWith("_timer"))
      capture(AnalyticsEvent.CookTimerOutcome, { outcome: event.type });
    void cook
      .send(event)
      .catch((error) =>
        Alert.alert(
          "Cook Mode needs a refresh",
          error instanceof Error ? error.message : "Please reopen this recipe.",
        ),
      );
  };
  const executeVoice = useCallback(
    (action: CookVoiceControllerAction) => {
      if (
        action.type === "next" ||
        action.type === "back" ||
        action.type === "pause" ||
        action.type === "resume" ||
        action.type === "finish"
      ) {
        send({ type: action.type });
        return;
      }
      if (action.type === "repeat") {
        if (action.ingredientQuery) {
          const item = cue.ingredientReferences.find((ingredient) =>
            ingredient.concept
              .toLowerCase()
              .includes(action.ingredientQuery!.toLowerCase()),
          );
          const answer = item
            ? `${item.displayAmount ? `${item.displayAmount} ` : ""}${item.concept}`
            : `I can’t verify ${action.ingredientQuery} from this step.`;
          AccessibilityInfo.announceForAccessibility(answer);
          Alert.alert("From this step", answer);
        } else {
          AccessibilityInfo.announceForAccessibility(cue.displayText);
          Alert.alert(`Step ${session.currentCueIndex + 1}`, cue.displayText);
        }
        return;
      }
      if (action.type === "read_position") {
        const answer = `Step ${session.currentCueIndex + 1} of ${session.cueCount}.`;
        AccessibilityInfo.announceForAccessibility(answer);
        return;
      }
      if (action.type === "start_timer") {
        void cook.startTimer({
          durationSeconds: action.durationSeconds,
          label: action.label,
        });
        return;
      }
      if (
        action.type === "pause_timer" ||
        action.type === "resume_timer" ||
        action.type === "cancel_timer"
      ) {
        const activeTimers = session.timers.filter(
          (timer) =>
            timer.status ===
            (action.type === "resume_timer" ? "paused" : "running"),
        );
        const timer = activeTimers[(action.timerOrdinal ?? 1) - 1];
        if (!timer) {
          Alert.alert(
            "Timer not found",
            "Use the timer controls on this step.",
          );
          return;
        }
        send({ type: action.type, timerId: timer.id });
      }
    },
    [cook, cue, send, session],
  );
  const executeVoiceRef = useRef(executeVoice);
  useEffect(() => {
    executeVoiceRef.current = executeVoice;
  }, [executeVoice]);
  const voiceController = useMemo(
    () =>
      createCookVoiceController({
        execute: (action) => executeVoiceRef.current(action),
        now: Date.now,
      }),
    [],
  );
  useEffect(
    () => () => {
      void cookVoiceTransport.cancel();
    },
    [],
  );
  const toggleVoice = async () => {
    if (voiceState === "off") {
      try {
        await cookVoiceTransport.start();
        setVoiceState("listening");
      } catch (error) {
        capture(AnalyticsEvent.CookVoiceFallback, {
          failure_reason: "start_unavailable",
          voice_mode: "touch",
        });
        Alert.alert(
          "Voice unavailable",
          error instanceof Error ? error.message : "Use the touch controls.",
        );
      }
      return;
    }
    if (voiceState !== "listening") return;
    setVoiceState("thinking");
    try {
      const transcript = await cookVoiceTransport.stopAndTranscribe();
      const result = voiceController.handle(transcript, {
        hasActiveSession: true,
      });
      if (result.state === "needs_grounded_answer")
        Alert.alert(
          "From this recipe",
          "I can’t verify that from the saved recipe. Use touch controls or check a trusted cooking source.",
        );
      else if (result.acknowledgement)
        AccessibilityInfo.announceForAccessibility(result.acknowledgement);
    } catch (error) {
      capture(AnalyticsEvent.CookVoiceFallback, {
        failure_reason: "transcription_unavailable",
        voice_mode: "touch",
      });
      Alert.alert(
        "Voice unavailable",
        error instanceof Error ? error.message : "Use the touch controls.",
      );
    } finally {
      setVoiceState("off");
    }
  };
  const exit = () =>
    Alert.alert("Pause cooking?", "Your exact step and timers will be saved.", [
      { text: "Keep cooking", style: "cancel" },
      {
        text: "Pause and exit",
        onPress: () => {
          send({ type: "pause" });
          navigation.navigate("RecipeHome", { recipeId: projection.recipe.id });
        },
      },
    ]);
  return (
    <AppShell>
      <PageHeader title={projection.currentVersion.title} onPressBack={exit} />
      <ScrollView
        contentContainerStyle={[styles.content, landscape && styles.landscape]}
      >
        <View style={styles.cueColumn}>
          <CookProgress
            current={session.currentCueIndex + 1}
            total={session.cueCount}
          />
          <CookCueCard cue={cue} />
        </View>
        <View style={styles.controls}>
          <Button
            variant="outline"
            onPress={() => {
              void toggleVoice();
            }}
          >
            {voiceState === "listening"
              ? "Done speaking"
              : voiceState === "thinking"
                ? "Thinking…"
                : "Speak a command"}
          </Button>
          <Text variant="label" tone="secondary">
            {voiceState === "off"
              ? "VOICE OFF · TOUCH CONTROLS READY"
              : voiceState.toUpperCase()}
          </Text>
          <CookTimerControl
            suggestions={cue.timerSuggestions}
            timers={session.timers.filter(
              (timer) =>
                timer.cueId === cue.id &&
                !["cancelled", "fired"].includes(timer.status),
            )}
            onStart={(suggestion) => {
              void cook.startTimer(suggestion);
            }}
            onPause={(timerId) => send({ type: "pause_timer", timerId })}
            onResume={(timerId) => send({ type: "resume_timer", timerId })}
            onCancel={(timerId) => send({ type: "cancel_timer", timerId })}
          />
          <View style={styles.nav}>
            <Button
              variant="outline"
              disabled={session.currentCueIndex === 0}
              onPress={() => send({ type: "back" })}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                Alert.alert(
                  `Step ${session.currentCueIndex + 1}`,
                  cue.displayText,
                )
              }
            >
              Repeat
            </Button>
            {session.currentCueIndex === session.cueCount - 1 ? (
              <Button
                variant="primary"
                onPress={() => {
                  void cook
                    .send({ type: "finish" })
                    .then(() =>
                      navigation.replace("RecipeCookComplete", {
                        sessionId: session.id,
                        recipeId: projection.recipe.id,
                      }),
                    );
                }}
              >
                Finish
              </Button>
            ) : (
              <Button variant="primary" onPress={() => send({ type: "next" })}>Next</Button>
            )}
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  landscape: { flexDirection: "row" },
  cueColumn: { flex: 3, gap: spacing.md },
  controls: { flex: 2, gap: spacing.md, justifyContent: "center" },
  nav: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
});
