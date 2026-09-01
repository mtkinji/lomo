import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, radii, spacing } from "../../../theme";
import { Button, IconButton } from "../../../ui/Button";
import { Coachmark } from "../../../ui/Coachmark";
import { Icon } from "../../../ui/Icon";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Text } from "../../../ui/Typography";
import {
  CookCueCard,
  getCookCuePositionLabel,
} from "../components/CookCueCard";
import { RecipeIngredientChecklist } from "../components/RecipeIngredientList";
import { RecipeArtwork } from "../components/RecipeArtwork";
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
import { cookVoiceBargeIn } from "../voice/cookVoiceBargeIn";
import { cookVoiceSpeech } from "../voice/cookVoiceSpeech";
import { playCookVoiceReceiptSound } from "../voice/cookVoiceReceiptSound";
import { createCookVoiceSilenceDetector } from "../voice/cookVoiceSilenceDetector";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { STARTER_RECIPE_PROJECTIONS } from "../data/starterRecipeCatalog";
import { resolveAvailableRecipe } from "../data/resolveAvailableRecipe";
import { cookModeEducationCache } from "../data/cookModeEducationCache";
import { KwiltLoader } from '../../../ui/KwiltLoader';
import { useFeatureFlag } from '../../../services/analytics/useFeatureFlag';

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeCookMode">;
const LANDSCAPE_INGREDIENT_RAIL_WIDTH = 300;
export function RecipeCookModeScreen({ navigation, route }: Props) {
  const cookModePreviewEnabled = useFeatureFlag('kwilt-preview-cook-mode', true);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const projection = resolveAvailableRecipe(
    personalRecipes,
    route.params.recipeId,
    STARTER_RECIPE_PROJECTIONS,
  );
  if (!cookModePreviewEnabled) return (
    <AppShell>
      <PageHeader title="Cook Mode" onPressBack={() => navigation.goBack()} />
      <View style={styles.center}>
        <Text>Cook Mode is unavailable right now. Your recipe is still available.</Text>
        <Button variant="outline" onPress={() => navigation.goBack()}>Back to recipe</Button>
      </View>
    </AppShell>
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
      recipeScaleMultiplier={route.params.recipeScaleMultiplier}
      landscape={landscape}
      navigation={navigation}
    />
  );
}

export function RecipeCookModeExperience({
  projection,
  recipeScaleMultiplier,
  landscape,
  navigation,
}: {
  projection: RecipeProjection;
  recipeScaleMultiplier: 1 | 2 | 3;
  landscape: boolean;
  navigation: Props["navigation"];
}) {
  const { capture } = useAnalytics();
  const trackedSession = useRef<string | null>(null);
  const cook = useRecipeCookSession(projection, recipeScaleMultiplier);
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
          <KwiltLoader color={colors.textSecondary} />
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
          <Text>No cooking actions are available.</Text>
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
  const landscapeEdgeInset = landscape ? spacing["3xl"] : 0;
  const [voiceState, setVoiceState] = useState<CookVoiceState>("off");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    () => new Set(),
  );
  const [voiceGuideAcknowledged, setVoiceGuideAcknowledged] = useState<
    boolean | null
  >(null);
  const voiceStatusRef = useRef<View>(null);
  const voiceSessionActiveRef = useRef(true);
  const recordingActiveRef = useRef(false);
  const listeningEpochRef = useRef(0);
  const pendingVoiceResponseRef = useRef<string | null>(null);
  const lastVoiceResponseRef = useRef<string | null>(null);
  const finishListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const beginListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const resumeVoiceAfterMediaRef = useRef(false);
  const session = cook.session!;
  const cue = cook.cues[session.currentCueIndex]!;
  const send = useCallback(
    (event: Parameters<typeof cook.send>[0]) => {
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
            error instanceof Error
              ? error.message
              : "Please reopen this recipe.",
          ),
        );
    },
    [capture, cook, session.currentCueIndex],
  );
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
            : `I can’t verify ${action.ingredientQuery} from this action.`;
          pendingVoiceResponseRef.current = answer;
        } else if (lastVoiceResponseRef.current) {
          pendingVoiceResponseRef.current = lastVoiceResponseRef.current;
        } else {
          pendingVoiceResponseRef.current = cue.supportingCue
            ? `${cue.actionText} Ready when. ${cue.supportingCue.text}`
            : cue.actionText || cue.displayText;
        }
        return;
      }
      if (action.type === "read_position") {
        pendingVoiceResponseRef.current = `${getCookCuePositionLabel(cue)}.`;
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
          pendingVoiceResponseRef.current =
            "This action doesn’t include a timer. Say a duration, like start a five-minute timer.";
        } else {
          pendingVoiceResponseRef.current =
            "This action includes more than one time. Say the duration you want to use.";
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
          pendingVoiceResponseRef.current =
            "I couldn’t find that timer. Use the timer controls for this action.";
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
  useEffect(() => {
    voiceSessionActiveRef.current = true;
    requestAnimationFrame(() => {
      void beginListeningRef.current();
    });
    return () => {
      voiceSessionActiveRef.current = false;
      recordingActiveRef.current = false;
      listeningEpochRef.current += 1;
      void cookVoiceTransport.cancel();
      void cookVoiceBargeIn.stop();
      void cookVoiceSpeech.stop();
    };
  }, []);
  useEffect(() => {
    let active = true;
    void cookModeEducationCache
      .hasAcknowledgedVoiceGuide()
      .then((acknowledged) => {
        if (active) setVoiceGuideAcknowledged(acknowledged);
      });
    return () => {
      active = false;
    };
  }, []);
  const speakAndResume = useCallback(async (text: string) => {
    if (!voiceSessionActiveRef.current) return;
    lastVoiceResponseRef.current = text;
    setVoiceLevel(0);
    try {
      await cookVoiceSpeech.speak(text, () => {
        if (!voiceSessionActiveRef.current) return;
        setVoiceState("speaking");
        void cookVoiceBargeIn
          .start(() => {
            if (!voiceSessionActiveRef.current) return;
            void (async () => {
              await cookVoiceSpeech.stop();
              await cookVoiceBargeIn.stop();
              if (voiceSessionActiveRef.current)
                await beginListeningRef.current();
            })();
          })
          .catch(() => undefined);
      });
    } catch {
      // Speech is an enhancement. The visual session and touch fallback remain available.
    } finally {
      await cookVoiceBargeIn.stop();
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
      const transcript = await cookVoiceTransport.stopAndTranscribe({
        onRecordingStopped: playCookVoiceReceiptSound,
      });
      const result = voiceController.handle(transcript, {
        hasActiveSession: true,
      });
      const response =
        pendingVoiceResponseRef.current ??
        result.acknowledgement ??
        (result.state === "needs_grounded_answer"
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
      setVoiceError(
        error instanceof Error ? error.message : "Use the touch controls.",
      );
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
        if (
          epoch !== listeningEpochRef.current ||
          !voiceSessionActiveRef.current
        )
          return;
        setVoiceLevel(level);
        if (detector.observe(level, Date.now()))
          void finishListeningRef.current();
      });
      if (
        epoch !== listeningEpochRef.current ||
        !voiceSessionActiveRef.current
      ) {
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
      setVoiceError(
        error instanceof Error ? error.message : "Use the touch controls.",
      );
    }
  }, [capture]);
  beginListeningRef.current = beginListening;
  const pauseVoiceForMedia = useCallback(() => {
    resumeVoiceAfterMediaRef.current =
      recordingActiveRef.current || voiceState === "listening";
    recordingActiveRef.current = false;
    listeningEpochRef.current += 1;
    setVoiceLevel(0);
    setVoiceState("paused");
    void cookVoiceTransport.cancel();
    void cookVoiceBargeIn.stop();
    void cookVoiceSpeech.stop();
  }, [voiceState]);
  const resumeVoiceAfterMedia = useCallback(() => {
    const shouldResume = resumeVoiceAfterMediaRef.current;
    resumeVoiceAfterMediaRef.current = false;
    if (shouldResume && voiceSessionActiveRef.current)
      void beginListeningRef.current();
  }, []);
  const acknowledgeVoiceGuide = useCallback(() => {
    setVoiceGuideAcknowledged(true);
    void cookModeEducationCache.acknowledgeVoiceGuide().catch(() => undefined);
  }, []);
  const exit = () =>
    Alert.alert(
      "Pause cooking?",
      "Your exact place and timers will be saved.",
      [
        { text: "Keep cooking", style: "cancel" },
        {
          text: "Pause and exit",
          onPress: () => {
            send({ type: "pause" });
            navigation.popTo("RecipeHome", {
              recipeId: projection.recipe.id,
            });
          },
        },
      ],
    );
  const cueTimers = session.timers.filter(
    (timer) =>
      timer.cueId === cue.id && !["cancelled", "fired"].includes(timer.status),
  );
  const hasIngredientRail = cue.ingredientReferences.length > 0;
  const hasSupplementalActions =
    cue.timerSuggestions.length > 0 ||
    cueTimers.length > 0 ||
    Boolean(cue.media);
  const ingredientItems = cue.ingredientReferences.map((ingredient) => ({
    id: ingredient.ingredientLineId,
    display: `${ingredient.displayAmount ? `${ingredient.displayAmount} ` : ""}${ingredient.concept}`,
  }));
  const toggleIngredient = (ingredientId: string) => {
    setCheckedIngredients((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  };
  const timerControl = (
    <CookTimerControl
      suggestions={cue.timerSuggestions}
      timers={cueTimers}
      onStart={(suggestion) => {
        void cook.startTimer(suggestion);
      }}
      onPause={(timerId) => {
        void send({ type: "pause_timer", timerId });
      }}
      onResume={(timerId) => {
        void send({ type: "resume_timer", timerId });
      }}
      onCancel={(timerId) => {
        void send({ type: "cancel_timer", timerId });
      }}
    />
  );
  const previousDestinationLabel = "Back";
  const nextDestinationLabel =
    session.currentCueIndex === session.cueCount - 1 ? "Finish" : "Next";
  const recipeThumbnail = projection.recipe.mediaAssets.find(
    (asset) => asset.lifecycle === "active",
  );
  const transport = (
    <View testID="cook-transport" style={styles.transport}>
      <Button
        accessibilityLabel={
          session.currentCueIndex === 0
            ? "Back unavailable"
            : "Back to previous action"
        }
        size="sm"
        variant="primary"
        style={[
          styles.navButton,
          session.currentCueIndex === 0 && styles.navButtonDisabled,
        ]}
        disabled={session.currentCueIndex === 0}
        onPress={() => {
          void send({ type: "back" });
        }}
      >
        {previousDestinationLabel}
      </Button>
      <View style={styles.transportMiddle}>
        <CookVoiceStatus
          ref={voiceStatusRef}
          voiceState={voiceState}
          voiceLevel={voiceLevel}
          errorMessage={voiceError}
          onFinishSpeaking={() => {
            void finishListeningRef.current();
          }}
          onRetry={() => {
            void beginListeningRef.current();
          }}
        />
      </View>
      {session.currentCueIndex === session.cueCount - 1 ? (
        <Button
          accessibilityLabel="Finish cooking"
          size="sm"
          variant="primary"
          style={styles.navButton}
          onPress={() => {
            void cook.send({ type: "finish" }).then(() =>
              navigation.replace("RecipeCookComplete", {
                sessionId: session.id,
                recipeId: projection.recipe.id,
              }),
            );
          }}
        >
          {nextDestinationLabel}
        </Button>
      ) : (
        <Button
          accessibilityLabel="Continue to next action"
          size="sm"
          variant="primary"
          style={styles.navButton}
          onPress={() => {
            void send({ type: "next" });
          }}
        >
          {nextDestinationLabel}
        </Button>
      )}
    </View>
  );
  return (
    <View
      style={[
        styles.cookCanvas,
        {
          paddingTop: landscape ? Math.max(insets.top, spacing.lg) : insets.top,
          paddingLeft: Math.max(insets.left, landscapeEdgeInset) + spacing.sm,
          paddingRight: Math.max(insets.right, landscapeEdgeInset) + spacing.sm,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.turmeric200} />
      <View style={styles.focusRail}>
        <RecipeArtwork
          storageRef={recipeThumbnail?.storageRef}
          accessibilityLabel={`${projection.currentVersion.title} recipe thumbnail`}
          style={styles.recipeThumbnail}
        />
        <Text variant="label" numberOfLines={1} style={styles.focusLabel}>
          {projection.currentVersion.title}
        </Text>
        <IconButton
          accessibilityLabel="Exit Cook Mode"
          variant="ghost"
          onPress={exit}
        >
          <Icon name="close" size={20} color={colors.textPrimary} />
        </IconButton>
      </View>
      {landscape ? (
        <View
          style={[
            styles.content,
            styles.landscapeContent,
            { paddingBottom: Math.max(insets.bottom, spacing.xs) },
          ]}
        >
          <View testID="cook-landscape-body" style={styles.landscapeBody}>
            <View
              testID="cook-instruction-pane"
              style={[
                styles.instructionPane,
                !hasIngredientRail && styles.instructionPaneFullWidth,
              ]}
            >
              <CookCueCard
                cue={cue}
                showStepLabel={false}
                showIngredients={false}
                align="top"
              />
              {!hasIngredientRail && hasSupplementalActions ? (
                <View style={styles.inlineCueActions}>
                  {timerControl}
                  <CookStepMedia
                    media={cue.media}
                    display="trigger"
                    onFullscreenEnter={pauseVoiceForMedia}
                    onFullscreenExit={resumeVoiceAfterMedia}
                  />
                </View>
              ) : null}
              {voiceError ? (
                <Text
                  tone="secondary"
                  numberOfLines={1}
                  style={styles.voiceError}
                >
                  {voiceError}
                </Text>
              ) : null}
            </View>
            {hasIngredientRail ? (
              <View testID="cook-ingredient-rail" style={styles.ingredientRail}>
                <RecipeIngredientChecklist
                  items={ingredientItems}
                  checked={checkedIngredients}
                  onToggle={toggleIngredient}
                />
                <View style={styles.ingredientRailActions}>
                  {timerControl}
                  <CookStepMedia
                    media={cue.media}
                    display="trigger"
                    onFullscreenEnter={pauseVoiceForMedia}
                    onFullscreenExit={resumeVoiceAfterMedia}
                  />
                </View>
              </View>
            ) : null}
          </View>
          {transport}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View testID="cook-instruction-pane" style={styles.cueColumn}>
            <CookCueCard
              cue={cue}
              showStepLabel={false}
              showIngredients={false}
              align="top"
            />
            {ingredientItems.length ? (
              <RecipeIngredientChecklist
                items={ingredientItems}
                checked={checkedIngredients}
                onToggle={toggleIngredient}
              />
            ) : null}
            <CookStepMedia
              media={cue.media}
              onFullscreenEnter={pauseVoiceForMedia}
              onFullscreenExit={resumeVoiceAfterMedia}
            />
          </View>
          <View style={[styles.controls, styles.portraitControls]}>
            {timerControl}
            {voiceError ? (
              <Text
                tone="secondary"
                numberOfLines={1}
                style={styles.voiceError}
              >
                {voiceError}
              </Text>
            ) : null}
            {transport}
          </View>
        </ScrollView>
      )}
      <Coachmark
        visible={voiceGuideAcknowledged === false && voiceState === "listening"}
        targetRef={voiceStatusRef}
        placement="above"
        spotlight="ring"
        title={<Text variant="label">Cook hands-free</Text>}
        body={<Text>Say “Next,” “Repeat,” or “Start a timer.”</Text>}
        onDismiss={acknowledgeVoiceGuide}
      />
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
    backgroundColor: colors.turmeric200,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  focusRail: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recipeThumbnail: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
  },
  focusLabel: {
    flex: 1,
    color: colors.textPrimary,
    opacity: 0.72,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  landscapeContent: { width: "100%", alignItems: "stretch", gap: spacing.sm },
  landscapeBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing["2xl"],
  },
  cueColumn: { flex: 3, minWidth: 0, gap: spacing.md },
  instructionPane: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  instructionPaneFullWidth: { paddingRight: 0 },
  ingredientRail: {
    width: LANDSCAPE_INGREDIENT_RAIL_WIDTH,
    flexBasis: LANDSCAPE_INGREDIENT_RAIL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: "flex-start",
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  ingredientRailActions: { gap: spacing.sm, alignItems: "flex-start" },
  inlineCueActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  controls: { minWidth: 0, gap: spacing.md, justifyContent: "flex-end" },
  portraitControls: { flex: 2 },
  transport: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transportMiddle: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  navButton: { minWidth: 88, flexGrow: 0, flexShrink: 0 },
  navButtonDisabled: { opacity: 0.48 },
  voiceError: { fontSize: 13 },
});
