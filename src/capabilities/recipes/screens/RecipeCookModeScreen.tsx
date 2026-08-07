import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { Logo } from "../../../ui/Logo";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Text } from "../../../ui/Typography";
import { CookCueCard } from "../components/CookCueCard";
import { CookStepMedia } from "../components/CookStepMedia";
import { CookTimerControl } from "../components/CookTimerControl";
import { CookVoiceStatus } from "../components/CookVoiceStatus";
import { useRecipeCookSession } from "../runtime/useRecipeCookSession";
import { useRecipeStore } from "../runtime/useRecipeStore";
import type { RecipeProjection } from "../data/recipeCache";
import {
  createCookVoiceController,
  type CookVoiceControllerAction,
} from "../voice/cookVoiceController";
import { cookVoiceTransport } from "../voice/cookVoiceTransport";
import type { CookVoiceState } from "../voice/cookVoiceContracts";
import { cookVoiceSpeech } from "../voice/cookVoiceSpeech";
import { createCookVoiceSilenceDetector } from "../voice/cookVoiceSilenceDetector";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { STARTER_RECIPE_PROJECTIONS } from "../data/starterRecipeCatalog";
import { resolveAvailableRecipe } from "../data/resolveAvailableRecipe";

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeCookMode">;
export function RecipeCookModeScreen({ navigation, route }: Props) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const projection = resolveAvailableRecipe(
    personalRecipes,
    route.params.recipeId,
    STARTER_RECIPE_PROJECTIONS,
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

export function RecipeCookModeExperience({
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
  return (
    <ActiveRecipeCookModeExperience
      projection={projection}
      landscape={landscape}
      navigation={navigation}
      cook={cook}
    />
  );
}

function ActiveRecipeCookModeExperience({
  projection,
  landscape,
  navigation,
  cook,
}: {
  projection: RecipeProjection;
  landscape: boolean;
  navigation: Props["navigation"];
  cook: ReturnType<typeof useRecipeCookSession>;
}) {
  const { capture } = useAnalytics();
  const insets = useSafeAreaInsets();
  const [voiceState, setVoiceState] = useState<CookVoiceState>("off");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceSessionActiveRef = useRef(true);
  const recordingActiveRef = useRef(false);
  const listeningEpochRef = useRef(0);
  const pendingVoiceResponseRef = useRef<string | null>(null);
  const finishListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const beginListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const session = cook.session!;
  const cue = cook.cues[session.currentCueIndex]!;
  const send = useCallback((event: Parameters<typeof cook.send>[0]) => {
    if (event.type === "next" || event.type === "back")
      capture(AnalyticsEvent.CookCueAdvanced, {
        method: event.type,
        cue_index_bucket: Math.floor(session.currentCueIndex / 3) * 3,
      });
    if (event.type.endsWith("_timer"))
      capture(AnalyticsEvent.CookTimerOutcome, { outcome: event.type });
    return cook
      .send(event)
      .catch((error) =>
        Alert.alert(
          "Cook Mode needs a refresh",
          error instanceof Error ? error.message : "Please reopen this recipe.",
        ),
      );
  }, [capture, cook, session.currentCueIndex]);
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
          pendingVoiceResponseRef.current = answer;
        } else {
          pendingVoiceResponseRef.current = cue.supportingCue
            ? `${cue.actionText} Ready when. ${cue.supportingCue.text}`
            : cue.actionText || cue.displayText;
        }
        return;
      }
      if (action.type === "read_position") {
        pendingVoiceResponseRef.current = `Step ${session.currentCueIndex + 1} of ${session.cueCount}.`;
        return;
      }
      if (action.type === "start_timer") {
        void cook.startTimer({
          durationSeconds: action.durationSeconds,
          label: action.label,
        });
        return;
      }
      if (action.type === "start_suggested_timer") {
        if (cue.timerSuggestions.length === 1) {
          const suggestion = cue.timerSuggestions[0];
          void cook.startTimer(suggestion);
          pendingVoiceResponseRef.current = `Starting the ${suggestion.label.toLowerCase()} timer.`;
        } else if (cue.timerSuggestions.length === 0) {
          pendingVoiceResponseRef.current = "This step doesn’t include a timer. Say a duration, like start a five-minute timer.";
        } else {
          pendingVoiceResponseRef.current = "This step includes more than one time. Say the duration you want to use.";
        }
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
          pendingVoiceResponseRef.current = "I couldn’t find that timer. Use the timer controls on this step.";
          return;
        }
        void send({ type: action.type, timerId: timer.id });
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
    () => {
      voiceSessionActiveRef.current = true;
      requestAnimationFrame(() => { void beginListeningRef.current(); });
      return () => {
        voiceSessionActiveRef.current = false;
        recordingActiveRef.current = false;
        listeningEpochRef.current += 1;
        void cookVoiceTransport.cancel();
        void cookVoiceSpeech.stop();
      };
    },
    [],
  );
  const speakAndResume = useCallback(async (text: string) => {
    if (!voiceSessionActiveRef.current) return;
    setVoiceState("speaking");
    setVoiceLevel(0);
    try {
      await cookVoiceSpeech.speak(text);
    } catch {
      // Speech is an enhancement. The visual session and touch fallback remain available.
    }
    if (voiceSessionActiveRef.current) await beginListeningRef.current();
  }, []);

  const finishListening = useCallback(async () => {
    if (!recordingActiveRef.current) return;
    recordingActiveRef.current = false;
    listeningEpochRef.current += 1;
    setVoiceState("thinking");
    setVoiceLevel(0);
    pendingVoiceResponseRef.current = null;
    try {
      const transcript = await cookVoiceTransport.stopAndTranscribe();
      const result = voiceController.handle(transcript, { hasActiveSession: true });
      const response = pendingVoiceResponseRef.current
        ?? result.acknowledgement
        ?? (result.state === "needs_grounded_answer"
          ? "I can’t verify that from the saved recipe. Use touch controls or check a trusted cooking source."
          : result.state === "not_handled"
            ? "Try next, back, repeat, or start a timer."
            : null);
      if (response) await speakAndResume(response);
      else if (voiceSessionActiveRef.current) await beginListeningRef.current();
    } catch (error) {
      capture(AnalyticsEvent.CookVoiceFallback, {
        failure_reason: "transcription_unavailable",
        voice_mode: "cook_mode",
      });
      setVoiceState("off");
      setVoiceError(error instanceof Error ? error.message : "Use the touch controls.");
    }
  }, [capture, speakAndResume, voiceController]);
  finishListeningRef.current = finishListening;

  const beginListening = useCallback(async () => {
    if (!voiceSessionActiveRef.current || recordingActiveRef.current) return;
    const epoch = listeningEpochRef.current + 1;
    listeningEpochRef.current = epoch;
    setVoiceError(null);
    setVoiceLevel(0);
    const detector = createCookVoiceSilenceDetector();
    try {
      await cookVoiceTransport.start((level) => {
        if (epoch !== listeningEpochRef.current || !voiceSessionActiveRef.current) return;
        setVoiceLevel(level);
        if (detector.observe(level, Date.now())) void finishListeningRef.current();
      });
      if (epoch !== listeningEpochRef.current || !voiceSessionActiveRef.current) {
        await cookVoiceTransport.cancel();
        return;
      }
      recordingActiveRef.current = true;
      setVoiceState("listening");
    } catch (error) {
      capture(AnalyticsEvent.CookVoiceFallback, {
        failure_reason: "start_unavailable",
        voice_mode: "cook_mode",
      });
      setVoiceState("off");
      setVoiceError(error instanceof Error ? error.message : "Use the touch controls.");
    }
  }, [capture]);
  beginListeningRef.current = beginListening;
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
    <View style={[styles.cookCanvas, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.turmeric200} />
      <PageHeader
        title={projection.currentVersion.title}
        onPressBack={exit}
        rightElement={<Logo size={28} />}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.md },
          landscape && styles.landscapeContent,
        ]}
      >
        <View style={styles.cueColumn}>
          <CookCueCard
            cue={cue}
            current={session.currentCueIndex + 1}
            total={session.cueCount}
          />
          {!landscape ? <CookStepMedia media={cue.media} /> : null}
        </View>
        <View style={[
          styles.controls,
          landscape && styles.landscapeControls,
          landscape && !cue.media && styles.landscapeControlsWithoutMedia,
        ]}>
          {landscape ? <CookStepMedia media={cue.media} /> : null}
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
            onPause={(timerId) => { void send({ type: "pause_timer", timerId }); }}
            onResume={(timerId) => { void send({ type: "resume_timer", timerId }); }}
            onCancel={(timerId) => { void send({ type: "cancel_timer", timerId }); }}
          />
          <CookVoiceStatus
            voiceState={voiceState}
            voiceLevel={voiceLevel}
            errorMessage={voiceError}
            onFinishSpeaking={() => { void finishListeningRef.current(); }}
            onRetry={() => { void beginListeningRef.current(); }}
          />
          <View style={styles.nav}>
            <Button
              variant="outline"
              style={[
                styles.navButton,
                session.currentCueIndex === 0 && styles.navButtonDisabled,
              ]}
              disabled={session.currentCueIndex === 0}
              onPress={() => { void send({ type: "back" }); }}
            >
              Back
            </Button>
            {session.currentCueIndex === session.cueCount - 1 ? (
              <Button
                variant="primary"
                style={styles.navButton}
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
              <Button variant="primary" style={styles.navButton} onPress={() => { void send({ type: "next" }); }}>Next</Button>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  cookCanvas: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.turmeric200,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  landscapeContent: { flexDirection: "row", alignItems: "stretch", gap: spacing.lg },
  cueColumn: { flex: 3, gap: spacing.md },
  controls: { flex: 2, gap: spacing.md, justifyContent: "flex-end" },
  landscapeControls: { justifyContent: "space-between" },
  landscapeControlsWithoutMedia: { justifyContent: "center" },
  nav: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  navButton: { flex: 1 },
  navButtonDisabled: { opacity: 0.48 },
});
