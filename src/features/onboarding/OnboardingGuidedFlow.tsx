import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@gluestack-ui/themed';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { GoalCard } from '../../ui/GoalCard';
import { Input } from '../../ui/Input';
import { Logo } from '../../ui/Logo';
import { useAppStore } from '../../store/useAppStore';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import {
  generateArcs,
  sendCoachChat,
  type CoachChatTurn,
  type GeneratedArc,
} from '../../services/ai';
import type { AgeRange, Arc, FocusAreaId, Goal } from '../../domain/types';
import { FOCUS_AREA_OPTIONS, getFocusAreaLabel } from '../../domain/focusAreas';
import { FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID } from '../../domain/workflows';
import type { AiChatPaneController } from '../ai/AiChatScreen';

type OnboardingStage =
  | 'welcome'
  | 'name'
  | 'age'
  | 'focus'
  | 'profileImage'
  | 'notifications'
  | 'arcIntro'
  | 'arcSuggestion'
  | 'arcManual'
  | 'closing';

const AGE_BUCKETS: { range: AgeRange; min: number; max: number }[] = [
  { range: 'under-18', min: 0, max: 17 },
  { range: '18-24', min: 18, max: 24 },
  { range: '25-34', min: 25, max: 34 },
  { range: '35-44', min: 35, max: 44 },
  { range: '45-54', min: 45, max: 54 },
  { range: '55-64', min: 55, max: 64 },
  { range: '65-plus', min: 65, max: 150 },
];

const DEFAULT_AGE_PLACEHOLDER: Record<AgeRange, string> = {
  'under-18': '17',
  '18-24': '22',
  '25-34': '29',
  '35-44': '38',
  '45-54': '48',
  '55-64': '58',
  '65-plus': '68',
  'prefer-not-to-say': '',
};

const STEP_LABELS: Record<OnboardingStage, string> = {
  welcome: 'Step 1',
  name: 'Step 2',
  age: 'Step 3',
  focus: 'Step 4',
  profileImage: 'Step 5',
  notifications: 'Step 6',
  arcIntro: 'Step 7',
  arcSuggestion: 'Step 8',
  arcManual: 'Step 9',
  closing: 'Step 10',
};

const STEP_SEQUENCE: OnboardingStage[] = [
  'welcome',
  'name',
  'age',
  'focus',
  'profileImage',
  'notifications',
  'arcIntro',
];

const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  'under-18': 'Under 18',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55-64': '55–64',
  '65-plus': '65+',
  'prefer-not-to-say': 'Prefer not to say',
};

type OnboardingGuidedFlowProps = {
  /**
   * Optional callback fired when the user completes the onboarding flow.
   * When omitted, the component falls back to updating the first-time UX
   * store directly so legacy entry points keep working.
   */
  onComplete?: () => void;
  /**
   * Optional controller for the shared chat surface. When provided, answers
   * collected in this flow are also mirrored into the AiChatPane transcript
   * as user bubbles and per-step assistant copy is streamed via sendCoachChat.
   */
  chatControllerRef?: React.RefObject<AiChatPaneController | null>;
};

export function OnboardingGuidedFlow({ onComplete, chatControllerRef }: OnboardingGuidedFlowProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const workflowRuntime = useWorkflowRuntime();
  const workflowId = workflowRuntime?.definition?.id;
  const isV2Workflow = workflowId === FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID;

  const appendChatUserMessage = useCallback(
    (content: string) => {
      const controller = chatControllerRef?.current;
      if (!controller) return;
      controller.appendUserMessage(content);
    },
    [chatControllerRef]
  );

  const sendStepAssistantCopy = useCallback(
    async (workflowStepId: string, opts?: { onDone?: () => void }) => {
      const controller = chatControllerRef?.current;
      if (!controller || !workflowRuntime?.definition || !workflowRuntime.instance) {
        return;
      }

      const step = workflowRuntime.definition.steps.find((s) => s.id === workflowStepId);
      if (!step) {
        return;
      }

      // For static steps, we bypass the LLM entirely and stream the exact copy
      // provided by the workflow definition. This is useful for fixed welcome
      // lines, confirmations, or other copy where we want full control.
      if (step.renderMode === 'static' && typeof step.staticCopy === 'string') {
        controller.streamAssistantReplyFromWorkflow(
          step.staticCopy,
          `assistant-step-${workflowStepId}`,
          { onDone: opts?.onDone }
        );
        return;
      }

      if (!step.promptTemplate) {
        return;
      }

      const collected = workflowRuntime.instance.collectedData ?? {};
      const collectedSummary =
        Object.keys(collected).length > 0
          ? `\n\nCurrent collected onboarding data (JSON):\n${JSON.stringify(
              collected,
              null,
              2
            )}\n\nUse this context, but do not repeat it verbatim.`
          : '';

      const renderedPrompt = `${step.promptTemplate.trim()}${collectedSummary}\n\nRespond as the Takado coach directly to the user in 1–3 short paragraphs. Keep it warm, concrete, and low-pressure.`;

      const history: CoachChatTurn[] = controller.getHistory();

      try {
        const reply = await sendCoachChat(
          [
            ...history,
            {
              role: 'user',
              content: renderedPrompt,
            },
          ],
          { mode: workflowRuntime.definition.chatMode }
        );
        let displayContent = reply;

        // For the goal draft step in v2 onboarding, the model is instructed to
        // return a JSON object with { title, why, timeHorizon }. We parse that
        // and render a human-friendly summary instead of showing raw JSON, and
        // also stash the structured goal on the workflow instance so the rest
        // of the app can consume it.
        if (isV2Workflow && workflowStepId === 'goal_draft') {
          try {
            // The model is instructed to respond with a single JSON object, but
            // we defensively extract the first {...} block in case it adds any
            // surrounding text.
            const startIdx = reply.indexOf('{');
            const endIdx = reply.lastIndexOf('}');
            const jsonText =
              startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
                ? reply.slice(startIdx, endIdx + 1)
                : reply;

            const parsed = JSON.parse(jsonText) as {
              title?: string;
              why?: string;
              timeHorizon?: string;
            };

            if (parsed && parsed.title && parsed.why && parsed.timeHorizon) {
              workflowRuntime.completeStep('goal_draft', {
                goal: {
                  title: parsed.title,
                  why: parsed.why,
                  timeHorizon: parsed.timeHorizon,
                },
              });

              // Create a real Goal record in the store using the same core
              // fields our normal goal list relies on. For now we attach it to
              // a placeholder Arc-less bucket so that the user lands on the
              // goal detail page with something concrete to edit.
              const nowISO = new Date().toISOString();
              const goalId = `goal-onboarding-${Date.now()}`;
              const newGoal: Goal = {
                id: goalId,
                arcId: 'onboarding-temp', // can be reassigned later
                title: parsed.title,
                description: parsed.why,
                status: 'planned',
                startDate: nowISO,
                targetDate: undefined,
                forceIntent: {},
                metrics: [],
                createdAt: nowISO,
                updatedAt: nowISO,
              };
              addGoal(newGoal);
              setLastOnboardingGoalId(goalId);

              // Let the goal card handle showing the concrete details. Here we
              // just explain that a first goal has been created.
              displayContent =
                'Takado uses AI to help you turn what you shared into a clear, short-term goal.\n\n' +
                "I’ve created a first goal below for you to start from. You’ll be able to rename it or change it anytime once you’re in the app.";
            }
          } catch (parseErr) {
            // If parsing fails, fall back to the raw assistant reply.
            console.warn('[onboarding] Failed to parse goal draft JSON', parseErr);
          }
        }

        controller.streamAssistantReplyFromWorkflow(
          displayContent,
          `assistant-step-${workflowStepId}`,
          { onDone: opts?.onDone }
        );
      } catch (error) {
        console.error('[onboarding] Failed to fetch assistant copy for step', workflowStepId, error);
      }
    },
    [chatControllerRef, workflowRuntime]
  );

  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const addGoal = useAppStore((state) => state.addGoal);
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const addArc = useAppStore((state) => state.addArc);
  const [visibleSteps, setVisibleSteps] = useState<OnboardingStage[]>(['welcome']);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStage[]>([]);

  const initialName = userProfile?.fullName?.trim() ?? '';
  const [nameInput, setNameInput] = useState(initialName);
  const [nameSubmitted, setNameSubmitted] = useState(Boolean(initialName));
  const [isEditingName, setIsEditingName] = useState(!nameSubmitted);

  const initialAgePlaceholder =
    userProfile?.ageRange && userProfile.ageRange !== 'prefer-not-to-say'
      ? DEFAULT_AGE_PLACEHOLDER[userProfile.ageRange]
      : '';
  const [ageInput, setAgeInput] = useState(initialAgePlaceholder);
  const [ageSubmitted, setAgeSubmitted] = useState(Boolean(userProfile?.ageRange));
  const [isEditingAge, setIsEditingAge] = useState(!ageSubmitted);

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<FocusAreaId[]>(
    userProfile?.focusAreas ?? []
  );
  const [focusAreasSubmitted, setFocusAreasSubmitted] = useState(
    Boolean(userProfile?.focusAreas && userProfile.focusAreas.length > 0)
  );

  const initialAvatar = userProfile?.avatarUrl ?? '';
  const [profileImageUri, setProfileImageUri] = useState(initialAvatar);
  const [profileImageStatus, setProfileImageStatus] = useState<'idle' | 'completed' | 'skipped'>(
    'idle'
  );
  const [isPickingImage, setIsPickingImage] = useState(false);

  const initialNotifications =
    typeof userProfile?.notifications?.remindersEnabled === 'boolean'
      ? userProfile.notifications.remindersEnabled
      : null;
  const [notificationsChoice, setNotificationsChoice] = useState<boolean | null>(
    initialNotifications
  );

  const [arcChoice, setArcChoice] = useState<'suggest' | 'manual' | null>(null);
  const [isGeneratingArc, setIsGeneratingArc] = useState(false);
  const [arcSuggestion, setArcSuggestion] = useState<GeneratedArc | null>(null);
  const [arcSuggestionError, setArcSuggestionError] = useState<string | null>(null);
  const [editedArcName, setEditedArcName] = useState('');
  const [editedArcNarrative, setEditedArcNarrative] = useState('');
  const [manualArcName, setManualArcName] = useState('');
  const [arcFinalized, setArcFinalized] = useState(false);
  const [createdArcName, setCreatedArcName] = useState<string | null>(null);

  // Lightweight state for schema-driven v2 identity collection. This is only
  // used when the v2 workflow is active and the current step is identity_basic.
  const [identityFormValues, setIdentityFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (userProfile?.fullName?.trim()) {
      initial.name = userProfile.fullName.trim();
    }
    return initial;
  });
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [cardsReady, setCardsReady] = useState<Record<string, boolean>>({});
  const identityCardOpacity = useRef(new Animated.Value(0)).current;

  // Simple state for the v2 desire_invite free-text step.
  const [desireFormValues, setDesireFormValues] = useState<Record<string, string>>({
    desireSummary: '',
  });
  const [desireSubmitting, setDesireSubmitting] = useState(false);

  const displayName = userProfile?.fullName?.trim() || nameInput.trim() || 'friend';

  const addVisibleStep = (step: OnboardingStage) => {
    setVisibleSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  const completeStep = (step: OnboardingStage, nextOverride?: OnboardingStage) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
    const index = STEP_SEQUENCE.indexOf(step);
    const defaultNext = index >= 0 ? STEP_SEQUENCE[index + 1] : undefined;
    const next = nextOverride ?? defaultNext;
    if (next) {
      addVisibleStep(next);
    }
    scrollToEnd();
  };

  const isStepVisible = (step: OnboardingStage) => visibleSteps.includes(step);
  const isStepCompleted = (step: OnboardingStage) => completedSteps.includes(step);

  // For v1 we still want to advance the internal step graph from "welcome" to
  // "name" so the Name card appears, but the visible welcome card itself is
  // no longer shown. We auto-complete the welcome step on mount for v1 only.
  useEffect(() => {
    if (isV2Workflow) return;
    if (!isStepVisible('welcome')) return;
    // Advance to the next step in the local timeline and mark the workflow
    // welcome step as complete without rendering a separate card.
    completeStep('welcome');
    workflowRuntime?.completeStep('welcome');
  }, []); // run once on mount

  // For v2, welcome_orientation is an agent-only step. When we detect that the
  // workflow is sitting on this step, we fetch the assistant copy once and,
  // after it finishes streaming (or a generous fallback timeout), advance to
  // the next workflow step. No card is rendered for this step.
  useEffect(() => {
    if (!isV2Workflow) return;
    if (!workflowRuntime?.instance) return;
    const currentStepId = workflowRuntime.instance.currentStepId;
    if (currentStepId !== 'welcome_orientation') return;

    let cancelled = false;

    // Fallback in case streaming callbacks fail for any reason. After a
    // generous window we still advance so the user isn't stuck. This delay is
    // intentionally long so that under normal conditions the typewriter
    // animation and onDone callback win.
    const fallbackTimeout = setTimeout(() => {
      if (cancelled) return;
      workflowRuntime.completeStep('welcome_orientation');
    }, 10000);

    void sendStepAssistantCopy('welcome_orientation', {
      onDone: () => {
        if (cancelled) return;
        clearTimeout(fallbackTimeout);
        workflowRuntime.completeStep('welcome_orientation');
      },
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimeout);
    };
  }, [isV2Workflow, workflowRuntime, sendStepAssistantCopy]);

  // For v2, identity_intro is a second agent-only step that invites the user
  // to share their name and age. We auto-run this step the same way as the
  // welcome step: stream copy once, then advance.
  useEffect(() => {
    if (!isV2Workflow) return;
    if (!workflowRuntime?.instance) return;
    const currentStepId = workflowRuntime.instance.currentStepId;
    if (currentStepId !== 'identity_intro') return;

    let cancelled = false;

    const fallbackTimeout = setTimeout(() => {
      if (cancelled) return;
      workflowRuntime.completeStep('identity_intro');
    }, 10000);

    void sendStepAssistantCopy('identity_intro', {
      onDone: () => {
        if (cancelled) return;
        clearTimeout(fallbackTimeout);
        workflowRuntime.completeStep('identity_intro');
      },
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimeout);
    };
  }, [isV2Workflow, workflowRuntime, sendStepAssistantCopy]);

  // For v2, desire_invite shows assistant copy first ("tell me one thing you
  // want to move forward") and then reveals a free-text card where the user
  // types their answer. We gate the card on the copy finishing so the flow
  // feels conversational.
  useEffect(() => {
    if (!isV2Workflow) return;
    if (!workflowRuntime?.instance) return;
    const currentStepId = workflowRuntime.instance.currentStepId;
    if (currentStepId !== 'desire_invite') return;
    if (cardsReady.desire_invite) return;

    let cancelled = false;

    const fallbackTimeout = setTimeout(() => {
      if (cancelled) return;
      setCardsReady((current) => ({ ...current, desire_invite: true }));
    }, 10000);

    void sendStepAssistantCopy('desire_invite', {
      onDone: () => {
        if (cancelled) return;
        clearTimeout(fallbackTimeout);
        setCardsReady((current) => ({ ...current, desire_invite: true }));
      },
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimeout);
    };
  }, [isV2Workflow, workflowRuntime, sendStepAssistantCopy, cardsReady.desire_invite]);

  // For downstream v2 steps where the agent is drafting structured output
  // (goal/arc/activities), we auto-run the assistant once the workflow lands on
  // each agent_generate step so the user never gets stuck without visible
  // progress. Confirm-style steps continue to rely on normal chat replies.
  const autoRunAssistantStep = useCallback(
    (stepId: string) => {
    if (!isV2Workflow) return;
    if (!workflowRuntime?.instance) return;
    const currentStepId = workflowRuntime.instance.currentStepId;
      if (currentStepId !== stepId) return;

    let cancelled = false;

    const fallbackTimeout = setTimeout(() => {
      if (cancelled) return;
        workflowRuntime.completeStep(stepId);
    }, 10000);

      void sendStepAssistantCopy(stepId, {
      onDone: () => {
        if (cancelled) return;
        clearTimeout(fallbackTimeout);
          workflowRuntime.completeStep(stepId);
      },
    });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimeout);
    };
    },
    [isV2Workflow, workflowRuntime, sendStepAssistantCopy]
  );

  useEffect(() => {
    const cleanup = autoRunAssistantStep('goal_draft');
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [autoRunAssistantStep]);

  useEffect(() => {
    const cleanup = autoRunAssistantStep('arc_introduce');
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [autoRunAssistantStep]);

  useEffect(() => {
    const cleanup = autoRunAssistantStep('arc_draft');
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [autoRunAssistantStep]);

  useEffect(() => {
    const cleanup = autoRunAssistantStep('activities_generate');
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [autoRunAssistantStep]);

  // Ensure the identity card fades in once we've marked it as ready and the
  // workflow has advanced to identity_basic.
  useEffect(() => {
    if (!isV2Workflow) return;
    if (workflowRuntime?.instance?.currentStepId !== 'identity_basic') return;
    if (!cardsReady.identity_basic) return;

    identityCardOpacity.setValue(0);
    Animated.timing(identityCardOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isV2Workflow, workflowRuntime?.instance?.currentStepId, cardsReady.identity_basic, identityCardOpacity]);

  const handleWelcome = async () => {
    // Legacy no-op: the dedicated welcome card has been removed in favor of
    // the shared AiChatPane welcome message. We keep this function around so
    // any lingering references remain safe.
  };

  // Mark the identity_basic card as ready whenever the workflow lands on that
  // step. Because welcome_orientation -> identity_intro -> identity_basic,
  // this means the card will only appear after the second onboarding message
  // has completed.
  useEffect(() => {
    if (!isV2Workflow) return;
    if (workflowRuntime?.instance?.currentStepId !== 'identity_basic') return;
    if (cardsReady.identity_basic) return;

    setCardsReady((current) => ({ ...current, identity_basic: true }));
  }, [isV2Workflow, workflowRuntime?.instance?.currentStepId, cardsReady.identity_basic]);

  const handleDesireInviteSubmit = async () => {
    const raw = desireFormValues.desireSummary ?? '';
    const trimmed = raw.trim();
    if (!trimmed) {
      return;
    }

    if (!workflowRuntime) {
      return;
    }

    setDesireSubmitting(true);
    try {
      workflowRuntime.completeStep('desire_invite', {
        desireSummary: trimmed,
      });

      appendChatUserMessage(trimmed);
    } finally {
      setDesireSubmitting(false);
    }
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      return;
    }
    updateUserProfile((current) => ({
      ...current,
      fullName: trimmed,
    }));
    setNameSubmitted(true);
    setIsEditingName(false);
    completeStep('name');
    appendChatUserMessage(`You can call me ${trimmed}.`);
  };

  const handleKeepName = () => {
    if (!nameInput.trim()) {
      return;
    }
    completeStep('name');
  };

  const handleSaveAge = async () => {
    const parsed = Number(ageInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }
    const range = pickAgeRange(parsed);
    updateUserProfile((current) => ({
      ...current,
      ageRange: range,
    }));
    setAgeSubmitted(true);
    setIsEditingAge(false);
    completeStep('age');
    // Map to workflow step "identity_basic" (v2) / "profile_basics" (v1)
    const effectiveName =
      userProfile?.fullName?.trim() || nameInput.trim() || undefined;
    workflowRuntime?.completeStep(isV2Workflow ? 'identity_basic' : 'profile_basics', {
      name: effectiveName,
      ageRange: range,
    });
    const bucketLabel = AGE_RANGE_LABELS[range] ?? String(range);
    appendChatUserMessage(`I’m in the ${bucketLabel} age range.`);
    await sendStepAssistantCopy(isV2Workflow ? 'identity_basic' : 'profile_basics');
  };

  const handleKeepAge = () => {
    if (!userProfile?.ageRange) {
      return;
    }
    completeStep('age');
  };

  const toggleFocusArea = (area: FocusAreaId) => {
    setSelectedFocusAreas((current) =>
      current.includes(area) ? current.filter((id) => id !== area) : [...current, area]
    );
  };

  const handleSaveFocusAreas = async () => {
    if (selectedFocusAreas.length === 0) {
      return;
    }
    updateUserProfile((current) => ({
      ...current,
      focusAreas: selectedFocusAreas,
    }));
    setFocusAreasSubmitted(true);
    completeStep('focus');
    // In v2, focus areas are implicitly captured through desire/goal; keep this
    // UI-only for now and only map to the v1 workflow step.
    if (!isV2Workflow) {
      workflowRuntime?.completeStep('focus_areas', {
        focusAreas: selectedFocusAreas,
      });
      const summary = selectedFocusSummary || 'those areas';
      appendChatUserMessage(`I want to focus on ${summary}.`);
      await sendStepAssistantCopy('focus_areas');
    }
  };

  const handleKeepFocusAreas = () => {
    if (selectedFocusAreas.length === 0) {
      return;
    }
    completeStep('focus');
  };

  const ensurePermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  };

  const handlePickImage = async (type: 'camera' | 'library') => {
    console.log('[onboarding] pick image requested', { type });
    if (isPickingImage) {
      console.log('[onboarding] pick image already in progress – ignoring');
      return;
    }
    const hasPermission = await ensurePermission(type);
    if (!hasPermission) {
      console.log('[onboarding] permission denied for', type);
      Alert.alert(
        'Permission needed',
        type === 'camera'
          ? 'Allow camera access in Settings to take a photo.'
          : 'Allow photo library access in Settings to pick an image.'
      );
      return;
    }
    console.log('[onboarding] permission granted for', type);
    setIsPickingImage(true);
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.9,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    };

    const handleResult = (result: ImagePicker.ImagePickerResult) => {
      console.log('[onboarding] picker returned result', result);
      if ('canceled' in result && result.canceled) {
        console.log('[onboarding] picker canceled by user');
        return;
      }
      const asset = result.assets?.[0];
      if (asset?.uri) {
        console.log('[onboarding] picker asset selected', asset.uri);
        setProfileImageUri(asset.uri);
        updateUserProfile((current) => ({
          ...current,
          avatarUrl: asset.uri,
        }));
        setProfileImageStatus('completed');
        completeStep('profileImage');
        if (isV2Workflow) {
          workflowRuntime?.completeStep('profile_avatar', {
            avatarUrl: asset.uri,
          });
          onComplete?.();
        }
      } else {
        console.warn('[onboarding] picker returned result with no asset');
      }
    };

    const handleError = (err: unknown) => {
      console.error('[onboarding] Failed to pick image', err);
      Alert.alert('Unable to update photo', 'Something went wrong. Please try again.');
    };

    const cleanup = () => {
      console.log('[onboarding] picker cleanup');
      setIsPickingImage(false);
    };

    const pickPromise =
      type === 'camera'
        ? ImagePicker.launchCameraAsync(options)
        : ImagePicker.launchImageLibraryAsync(options);

    pickPromise.then(handleResult).catch(handleError).finally(cleanup);
  };

  const handleSkipImage = () => {
    setProfileImageStatus('skipped');
    completeStep('profileImage');
    if (isV2Workflow) {
      workflowRuntime?.completeStep('profile_avatar', {
        avatarUrl: null,
      });
      onComplete?.();
    }
  };

  const handleKeepAvatar = () => {
    setProfileImageStatus('completed');
    completeStep('profileImage');
  };

  const handleRemoveAvatar = () => {
    setProfileImageUri('');
    updateUserProfile((current) => ({
      ...current,
      avatarUrl: undefined,
    }));
    setProfileImageStatus('idle');
  };

  const handleNotificationsChoice = async (enabled: boolean) => {
    updateUserProfile((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        remindersEnabled: enabled,
      },
    }));
    setNotificationsChoice(enabled);
    completeStep('notifications');
    // Map to workflow step "notifications" for the legacy v1 workflow only.
    if (!isV2Workflow) {
      workflowRuntime?.completeStep('notifications', {
      notifications: enabled ? 'enabled' : 'disabled',
    });
    }
    appendChatUserMessage(
      enabled ? 'Yes, enable reminders for me.' : 'No reminders for now, thanks.'
    );
    if (!isV2Workflow) {
      await sendStepAssistantCopy('notifications');
    }
  };

  const handleConfirmNotifications = () => {
    if (notificationsChoice === null) {
      return;
    }
    completeStep('notifications');
  };

  const handleArcChoice = async (choice: 'suggest' | 'manual') => {
    setArcChoice(choice);
    setArcSuggestion(null);
    setArcSuggestionError(null);
    setArcFinalized(false);
    setManualArcName('');
    if (choice === 'suggest') {
      completeStep('arcIntro', 'arcSuggestion');
      void handleGenerateArc();
    } else {
      completeStep('arcIntro', 'arcManual');
    }
    // Starter Arc decision is a v1-only concept; for v2 the arc will be
    // inferred from goal + identity prompts instead, so we do not advance the
    // workflow here.
    if (!isV2Workflow) {
      const strategy =
        choice === 'suggest'
          ? 'generate_from_answers'
          : 'start_from_scratch';
      workflowRuntime?.completeStep('starter_arc_decision', {
        starterArcStrategy: strategy,
      });
      appendChatUserMessage(
        choice === 'suggest'
          ? 'Please suggest a starter Arc based on what I shared.'
          : 'I’d like to name my own first Arc.'
      );
      await sendStepAssistantCopy('starter_arc_decision');
    }
  };

  const resetArcSelection = () => {
    if (arcFinalized) {
      return;
    }
    setArcChoice(null);
    setArcFinalized(false);
    setCreatedArcName(null);
    setArcSuggestion(null);
    setArcSuggestionError(null);
    setManualArcName('');
    setIsGeneratingArc(false);
    setVisibleSteps((prev) =>
      prev.filter((step) => step !== 'arcSuggestion' && step !== 'arcManual' && step !== 'closing')
    );
    setCompletedSteps((prev) =>
      prev.filter((step) => step !== 'arcSuggestion' && step !== 'arcManual' && step !== 'closing')
    );
  };

  const handleGenerateArc = async () => {
    setIsGeneratingArc(true);
    setArcSuggestionError(null);
    setArcSuggestion(null);
    try {
      const focusSummary =
        selectedFocusAreas.length > 0
          ? `Focus areas: ${selectedFocusAreas.map((area) => getFocusAreaLabel(area)).join(', ')}.`
          : 'Focus areas not specified.';
      const ageLine = userProfile?.ageRange ? `Age range: ${userProfile.ageRange}.` : '';
      const nameLine = userProfile?.fullName ? `Preferred name: ${userProfile.fullName}.` : '';
      const prompt = `${focusSummary} ${ageLine} ${nameLine} Generate a single grounded Arc idea that feels specific and doable.`;
      const arcs = await generateArcs({ prompt });
      if (!arcs || arcs.length === 0) {
        throw new Error('No arc suggestions returned');
      }
      const first = arcs[0];
      setArcSuggestion(first);
      setEditedArcName(first.name ?? '');
      setEditedArcNarrative(first.narrative ?? '');
    } catch (error) {
      console.error('Failed to generate arc', error);
      setArcSuggestionError('Unable to suggest an Arc right now. Try again in a moment.');
    } finally {
      setIsGeneratingArc(false);
      scrollToEnd();
    }
  };

  const handleConfirmSuggestedArc = () => {
    if (!arcSuggestion) {
      return;
    }
    const name = (editedArcName || arcSuggestion.name || '').trim();
    if (!name) {
      return;
    }
    finalizeArc({
      name,
      narrative: (editedArcNarrative || arcSuggestion.narrative || '').trim(),
      status: arcSuggestion.status ?? 'active',
    });
  };

  const handleManualArcSubmit = () => {
    const trimmed = manualArcName.trim();
    if (trimmed.length < 3) {
      return;
    }
    finalizeArc({
      name: trimmed,
      narrative: undefined,
      status: 'active',
    });
  };

  const finalizeArc = (payload: { name: string; narrative?: string; status?: Arc['status'] }) => {
    const arc = buildArcRecord(payload);
    addArc(arc);
    setArcFinalized(true);
    setCreatedArcName(arc.name);
    const completionStep = arcChoice === 'manual' ? 'arcManual' : 'arcSuggestion';
    completeStep(completionStep, 'closing');
    // Arc finalization is only relevant for the legacy v1 onboarding workflow.
    if (!isV2Workflow) {
      workflowRuntime?.completeStep('closing');
    appendChatUserMessage(`Let’s go with the Arc “${arc.name}”.`);
      void sendStepAssistantCopy('closing');
    }
  };

  const handleCloseFlow = () => {
    if (onComplete) {
      onComplete();
      return;
    }
    // Legacy fallback for any callers that still depend on this component
    // to close the first-time UX overlay directly.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useFirstTimeUxStore } = require('../../store/useFirstTimeUxStore') as typeof import('../../store/useFirstTimeUxStore');
    const completeFlowFromStore = useFirstTimeUxStore.getState().completeFlow;
    completeFlowFromStore();
  };

  const welcomeVisible = isStepVisible('welcome');
  const welcomeCompleted = isStepCompleted('welcome');
  const nameVisible = isStepVisible('name');
  const nameCompleted = isStepCompleted('name');
  const ageVisible = isStepVisible('age');
  const ageCompleted = isStepCompleted('age');
  const focusVisible = isStepVisible('focus');
  const focusCompleted = isStepCompleted('focus');
  const profileVisible = isStepVisible('profileImage');
  const profileCompleted = isStepCompleted('profileImage');
  const notificationsVisible = isStepVisible('notifications');
  const notificationsCompleted = isStepCompleted('notifications');
  const arcIntroVisible = isStepVisible('arcIntro') && !arcFinalized;
  const arcSuggestionVisible = isStepVisible('arcSuggestion') && !arcFinalized;
  const arcManualVisible = isStepVisible('arcManual') && !arcFinalized;
  const closingVisible = isStepVisible('closing');
  const existingAgeLabel = userProfile?.ageRange ? AGE_RANGE_LABELS[userProfile.ageRange] : null;
  const hasAvatar = Boolean(profileImageUri);
  const notificationsCopy =
    notificationsChoice === null
      ? null
      : notificationsChoice
      ? 'Gentle reminders are on.'
      : 'Noted. No reminders right now.';
  const focusHasSelection = selectedFocusAreas.length > 0;
  const finalArcName = createdArcName ?? 'your first Arc';

  const selectedFocusSummary = useMemo(() => {
    if (selectedFocusAreas.length === 0 && userProfile?.focusAreas?.length) {
      return userProfile.focusAreas.map((area) => getFocusAreaLabel(area)).join(', ');
    }
    if (selectedFocusAreas.length === 0) {
      return '';
    }
    return selectedFocusAreas.map((area) => getFocusAreaLabel(area)).join(', ');
  }, [selectedFocusAreas, userProfile?.focusAreas]);

  const currentWorkflowStepId = workflowRuntime?.instance?.currentStepId;

  const identityWorkflowStep = workflowRuntime?.definition?.steps.find(
    (step) => step.id === 'identity_basic'
  );
  const identityUi = identityWorkflowStep?.ui;

  const identityBasicFields: FormFieldConfig[] =
    identityUi?.fields?.map((field) => ({
      id: field.id,
      label: field.label,
      placeholder: field.placeholder,
      keyboardType: field.type === 'number' ? 'number-pad' : 'default',
      autoCapitalize: field.type === 'text' ? 'words' : 'none',
    })) ?? [
      {
        id: 'name',
        label: 'Preferred name',
        placeholder: 'e.g., Maya or MJ',
        autoCapitalize: 'words',
      },
      {
        id: 'age',
        label: 'Age',
        placeholder: 'How old are you?',
        keyboardType: 'number-pad',
      },
    ];

  const desireWorkflowStep = workflowRuntime?.definition?.steps.find(
    (step) => step.id === 'desire_invite'
  );
  const desireUi = desireWorkflowStep?.ui;

  const desireFields: FormFieldConfig[] =
    desireUi?.fields?.map((field) => ({
      id: field.id,
      label: field.label,
      placeholder: field.placeholder,
      keyboardType: field.type === 'number' ? 'number-pad' : 'default',
      autoCapitalize: field.type === 'text' ? 'sentences' : 'none',
      multiline: field.type === 'textarea',
      numberOfLines: field.type === 'textarea' ? 5 : 1,
    })) ?? [
      {
        id: 'desireSummary',
        label: 'In your own words',
        placeholder: 'Describe one thing you’d like to make progress on.',
        autoCapitalize: 'sentences',
        multiline: true,
        numberOfLines: 5,
      },
    ];

  const handleIdentityBasicSubmit = async () => {
    if (!workflowRuntime) return;

    const rawName = identityFormValues.name ?? '';
    const rawAge = identityFormValues.age ?? '';
    const trimmedName = rawName.trim();
    const parsedAge = Number(rawAge.trim());

    if (!trimmedName) {
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      return;
    }

    setIdentitySubmitting(true);
    try {
      const ageRange = pickAgeRange(parsedAge);
      updateUserProfile((current) => ({
        ...current,
        fullName: trimmedName,
        ageRange,
      }));

      workflowRuntime.completeStep('identity_basic', {
        name: trimmedName,
        age: parsedAge,
      });

      appendChatUserMessage(`My name is ${trimmedName}, I'm ${parsedAge}.`);
    } finally {
      setIdentitySubmitting(false);
    }
  };

  // When running under the v2 onboarding workflow, we render a single
  // schema-driven card for the current step inside the shared chat surface.
  if (isV2Workflow) {
    if (currentWorkflowStepId === 'goal_confirm') {
      const goal = workflowRuntime?.instance?.collectedData
        ?.goal as { title?: string; why?: string; timeHorizon?: string } | undefined;

      if (goal && goal.title) {
        return (
          <GoalCard
            title={goal.title}
            body={goal.why}
            metaLeft={goal.timeHorizon ? `Timeframe: ${goal.timeHorizon}` : undefined}
            onPress={onComplete}
          />
        );
      }
    }
    if (currentWorkflowStepId === 'identity_basic') {
      if (!cardsReady.identity_basic) {
        // Let the assistant copy drive the experience until the card is ready.
        return null;
      }

      const identityValues = {
        name: identityFormValues.name ?? '',
        age: identityFormValues.age ?? '',
      };

      const canSubmit =
        (identityValues.name ?? '').trim().length > 0 &&
        Number.isFinite(Number((identityValues.age ?? '').trim())) &&
        Number((identityValues.age ?? '').trim()) > 0;

      // In v2 we let the shared AiChatPane own scrolling, padding, and keyboard
      // handling. Returning just the animated card keeps the UX aligned with the
      // chat canvas and avoids clipping the card shadow inside an extra container.
      return (
        <Animated.View style={{ opacity: identityCardOpacity }}>
          <GenericFormCard
            title={identityUi?.title}
            fields={identityBasicFields}
            values={identityValues}
            onChange={(fieldId, value) =>
              setIdentityFormValues((current) => ({
                ...current,
                [fieldId]: value,
              }))
            }
            onSubmit={handleIdentityBasicSubmit}
            primaryButtonLabel={identityUi?.primaryActionLabel ?? 'Continue'}
            submitting={identitySubmitting}
            submitDisabled={!canSubmit}
          />
        </Animated.View>
      );
    }

    if (currentWorkflowStepId === 'desire_invite') {
      if (!cardsReady.desire_invite) {
        return null;
      }

      const desireValues = {
        desireSummary: desireFormValues.desireSummary ?? '',
      };

      const canSubmit = (desireValues.desireSummary ?? '').trim().length > 0;

      return (
        <GenericFormCard
          title={desireUi?.title}
          fields={desireFields}
          values={desireValues}
          onChange={(fieldId, value) =>
            setDesireFormValues((current) => ({
              ...current,
              [fieldId]: value,
            }))
          }
          onSubmit={handleDesireInviteSubmit}
          primaryButtonLabel={desireUi?.primaryActionLabel ?? 'Continue'}
          submitting={desireSubmitting}
          submitDisabled={!canSubmit}
        />
      );
    }

    if (currentWorkflowStepId === 'profile_avatar') {
      return (
        <Card style={styles.stepCard}>
          <View style={styles.stepBody}>
            <Text style={styles.bodyText}>
              Do you want to add a photo or avatar for your profile? You can skip this if you’d
              like.
            </Text>
            {hasAvatar ? (
              <View style={styles.avatarPreview}>
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
              </View>
            ) : null}
            <View style={styles.inlineActions}>
              <Button
                style={styles.primaryButton}
                onPress={() => handlePickImage('library')}
                disabled={isPickingImage}
              >
                {isPickingImage ? (
                  <ActivityIndicator color={colors.canvas} />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Choose from library</Text>
                )}
              </Button>
              <Button variant="ghost" onPress={handleSkipImage} disabled={isPickingImage}>
                <Text style={styles.linkLabel}>Skip for now</Text>
              </Button>
            </View>
          </View>
        </Card>
      );
    }

    // For v2 steps that don't yet have a dedicated card, let the assistant copy
    // drive the experience without rendering anything extra here.
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.timeline}>
          {nameVisible && (
            <Card style={[styles.stepCard, nameCompleted && styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.name}</Text>
              <Text style={styles.stepTitle}>Name</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>What should I call you?</Text>
              {nameSubmitted && !isEditingName ? (
                <>
                  <Text style={styles.ackText}>Nice to meet you, {nameInput.trim()}.</Text>
                  {nameCompleted ? (
                    <Button variant="link" onPress={() => setIsEditingName(true)}>
                      <Text style={styles.linkLabel}>Change name</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepName}>
                        <Text style={styles.primaryButtonLabel}>Keep this name</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setIsEditingName(true)}>
                        <Text style={styles.linkLabel}>Edit name</Text>
                      </Button>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g., Maya or MJ"
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveName}
                    disabled={!nameInput.trim()}
                  >
                    <Text style={styles.primaryButtonLabel}>Save name</Text>
                  </Button>
                </>
              )}
              </View>
            </Card>
          )}

          {ageVisible && (
            <Card style={[styles.stepCard, ageCompleted && styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.age}</Text>
              <Text style={styles.stepTitle}>Age</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>How old are you?</Text>
              {ageSubmitted && !isEditingAge ? (
                <>
                  <Text style={styles.bodyText}>
                    {existingAgeLabel
                      ? `I currently have you in the ${existingAgeLabel} range.`
                      : 'Age saved.'}
                  </Text>
                  {ageCompleted ? (
                    <Button variant="link" onPress={() => setIsEditingAge(true)}>
                      <Text style={styles.linkLabel}>Update age</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepAge}>
                        <Text style={styles.primaryButtonLabel}>Keep this age range</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setIsEditingAge(true)}>
                        <Text style={styles.linkLabel}>Edit age</Text>
                      </Button>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={ageInput}
                    onChangeText={setAgeInput}
                    placeholder="Enter your age"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveAge}
                  />
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveAge}
                    disabled={!ageInput.trim()}
                  >
                    <Text style={styles.primaryButtonLabel}>Save age</Text>
                  </Button>
                </>
              )}
              </View>
            </Card>
          )}

          {focusVisible && (
            <Card style={[styles.stepCard, focusCompleted && styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.focus}</Text>
              <Text style={styles.stepTitle}>Focus areas</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>
                Takado helps you organize your goals into clear paths, so you always know what to work
                on next.
              </Text>
              <Text style={styles.bodyText}>
                To start, where do you most want to make progress?
              </Text>
              {!focusAreasSubmitted ? (
                <>
                  <View style={styles.chipGrid}>
                    {FOCUS_AREA_OPTIONS.map((option) => {
                      const selected = selectedFocusAreas.includes(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => toggleFocusArea(option.id)}
                        >
                          <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button
                    style={styles.primaryButton}
                    onPress={handleSaveFocusAreas}
                    disabled={!focusHasSelection}
                  >
                    <Text style={styles.primaryButtonLabel}>Save focus areas</Text>
                  </Button>
                </>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    Great. I’ll keep {selectedFocusSummary || 'those'} in mind.
                  </Text>
                  {focusCompleted ? (
                    <Button variant="link" onPress={() => setFocusAreasSubmitted(false)}>
                      <Text style={styles.linkLabel}>Edit selection</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleKeepFocusAreas}>
                        <Text style={styles.primaryButtonLabel}>Keep these focus areas</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setFocusAreasSubmitted(false)}>
                        <Text style={styles.linkLabel}>Edit selection</Text>
                      </Button>
                    </View>
                  )}
                </>
              )}
              </View>
            </Card>
          )}

          {profileVisible && (
            <Card style={[styles.stepCard, profileCompleted && styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.profileImage}</Text>
              <Text style={styles.stepTitle}>Profile image (optional)</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>
                Do you want to add a photo or avatar for your profile? You can skip this if you’d
                like.
              </Text>
              {hasAvatar ? (
                <View style={styles.avatarPreview}>
                  <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                </View>
              ) : null}
              {!profileCompleted ? (
                <>
                  {hasAvatar && (
                    <Button style={styles.primaryButton} onPress={handleKeepAvatar}>
                      <Text style={styles.primaryButtonLabel}>Keep this photo</Text>
                    </Button>
                  )}
                  <View style={styles.inlineActions}>
                    <Button
                      style={styles.primaryButton}
                      onPress={() => handlePickImage('library')}
                      disabled={isPickingImage}
                    >
                      {isPickingImage ? (
                        <ActivityIndicator color={colors.canvas} />
                      ) : (
                        <Text style={styles.primaryButtonLabel}>Choose from library</Text>
                      )}
                    </Button>
                    <Button variant="ghost" onPress={handleSkipImage} disabled={isPickingImage}>
                      <Text style={styles.linkLabel}>Skip for now</Text>
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    {profileImageStatus === 'skipped'
                      ? 'No worries. You can add one later.'
                      : 'Perfect. Profile is set.'}
                  </Text>
                  <View style={styles.inlineActions}>
                    <Button variant="link" onPress={() => handlePickImage('library')}>
                      <Text style={styles.linkLabel}>
                        {hasAvatar ? 'Change photo' : 'Add one now'}
                      </Text>
                    </Button>
                    {hasAvatar ? (
                      <Button variant="link" onPress={handleRemoveAvatar}>
                        <Text style={styles.linkLabel}>Remove photo</Text>
                      </Button>
                    ) : null}
                  </View>
                </>
              )}
              </View>
            </Card>
          )}

          {notificationsVisible && (
            <Card style={[styles.stepCard, notificationsCompleted && styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.notifications}</Text>
              <Text style={styles.stepTitle}>Notifications</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>
                I can send gentle reminders when an important step is coming up. Do you want
                notifications?
              </Text>
              {notificationsChoice === null ? (
                <View style={styles.inlineActions}>
                  <Button
                    style={styles.primaryButton}
                    onPress={() => handleNotificationsChoice(true)}
                  >
                    <Text style={styles.primaryButtonLabel}>Yes, enable notifications</Text>
                  </Button>
                  <Button variant="ghost" onPress={() => handleNotificationsChoice(false)}>
                    <Text style={styles.linkLabel}>Not now</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.ackText}>{notificationsCopy}</Text>
                  {notificationsCompleted ? (
                    <Button variant="link" onPress={() => setNotificationsChoice(null)}>
                      <Text style={styles.linkLabel}>Change preference</Text>
                    </Button>
                  ) : (
                    <View style={styles.inlineActions}>
                      <Button style={styles.primaryButton} onPress={handleConfirmNotifications}>
                        <Text style={styles.primaryButtonLabel}>Keep this preference</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setNotificationsChoice(null)}>
                        <Text style={styles.linkLabel}>Change choice</Text>
                      </Button>
                    </View>
                  )}
                </>
              )}
              </View>
            </Card>
          )}

          {arcIntroVisible && (
            <Card style={styles.stepCard}>
              <Text style={styles.stepLabel}>{STEP_LABELS.arcIntro}</Text>
              <Text style={styles.stepTitle}>First Arc</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>
                In Takado, your bigger goals live inside Arcs. An Arc is just a focused chapter of
                your life, like “Get fit for summer” or “Launch my side project.”
              </Text>
              <Text style={styles.bodyText}>
                Want me to suggest a first Arc based on what you chose earlier, or start from
                scratch?
              </Text>
              {arcChoice === null ? (
                <View style={styles.inlineActions}>
                  <Button
                    style={styles.primaryButton}
                    onPress={() => handleArcChoice('suggest')}
                    disabled={isGeneratingArc}
                  >
                    <Text style={styles.primaryButtonLabel}>Suggest an Arc for me</Text>
                  </Button>
                  <Button variant="outline" onPress={() => handleArcChoice('manual')}>
                    <Text style={styles.outlineButtonLabel}>I’ll create my own</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.ackText}>
                    {arcChoice === 'suggest'
                      ? 'Great. I’ll suggest one based on what you shared.'
                      : 'Great. We’ll name this Arc together.'}
                  </Text>
                  <Button variant="link" onPress={resetArcSelection}>
                    <Text style={styles.linkLabel}>Change option</Text>
                  </Button>
                </>
              )}
              </View>
            </Card>
          )}

          {arcSuggestionVisible && (
            <Card
              style={[
                styles.stepCard,
                isStepCompleted('arcSuggestion') && styles.stepCardCompleted,
              ]}
            >
              <Text style={styles.stepLabel}>{STEP_LABELS.arcSuggestion}</Text>
              <Text style={styles.stepTitle}>Suggested Arc</Text>
              <View style={styles.stepBody}>
              {isGeneratingArc ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.textPrimary} />
                  <Text style={styles.bodyText}>Thinking through a good fit…</Text>
                </View>
              ) : arcSuggestionError ? (
                <>
                  <Text style={styles.errorText}>{arcSuggestionError}</Text>
                  <Button style={styles.primaryButton} onPress={handleGenerateArc}>
                    <Text style={styles.primaryButtonLabel}>Try again</Text>
                  </Button>
                </>
              ) : arcSuggestion ? (
                <>
                  <Text style={styles.bodyText}>Here’s a starter Arc based on what you shared:</Text>
                  <Input
                    value={editedArcName}
                    onChangeText={setEditedArcName}
                    placeholder="Arc name"
                    label="Arc name"
                  />
                  <Input
                    value={editedArcNarrative}
                    onChangeText={setEditedArcNarrative}
                    placeholder="One-line description"
                    label="One-line description"
                    multiline
                  />
                  <Text style={styles.bodyText}>
                    We’ll keep it simple: a few clear steps you can actually do.
                  </Text>
                  <View style={styles.inlineActions}>
                    <Button style={styles.primaryButton} onPress={handleConfirmSuggestedArc}>
                      <Text style={styles.primaryButtonLabel}>Looks good – use this</Text>
                    </Button>
                    <Button variant="ghost" onPress={handleGenerateArc}>
                      <Text style={styles.linkLabel}>Get a different one</Text>
                    </Button>
                  </View>
                </>
              ) : null}
              </View>
            </Card>
          )}

          {arcManualVisible && (
            <Card
              style={[
                styles.stepCard,
                isStepCompleted('arcManual') && styles.stepCardCompleted,
              ]}
            >
              <Text style={styles.stepLabel}>{STEP_LABELS.arcManual}</Text>
              <Text style={styles.stepTitle}>Name your Arc</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>Okay. Let’s start with a name for this Arc.</Text>
              <Text style={styles.bodyText}>What’s one thing you want to make real in your life?</Text>
              <Input
                value={manualArcName}
                onChangeText={setManualArcName}
                placeholder="e.g., Be a steady creative"
                returnKeyType="done"
                onSubmitEditing={handleManualArcSubmit}
              />
              <Button
                style={styles.primaryButton}
                onPress={handleManualArcSubmit}
                disabled={manualArcName.trim().length < 3}
              >
                <Text style={styles.primaryButtonLabel}>Save Arc name</Text>
              </Button>
              </View>
            </Card>
          )}

          {closingVisible && (
            <Card style={[styles.stepCard, styles.stepCardCompleted]}>
              <Text style={styles.stepLabel}>{STEP_LABELS.closing}</Text>
              <Text style={styles.stepTitle}>You’re all set</Text>
              <View style={styles.stepBody}>
              <Text style={styles.bodyText}>
                You’re all set, {displayName || 'friend'}.
              </Text>
              <Text style={styles.bodyText}>
                From here, you can:
              </Text>
              <Text style={styles.bodyText}>– Break your Arc into smaller steps</Text>
              <Text style={styles.bodyText}>– Add goals or habits</Text>
              <Text style={styles.bodyText}>– Or just ask me, “What should I do next?”</Text>
              <Text style={styles.bodyText}>
                {finalArcName ? `${finalArcName} is ready.` : 'Your first Arc is ready.'} I’ll keep
                things simple and focused as you go. 🌱
              </Text>
              <Button style={styles.primaryButton} onPress={handleCloseFlow}>
                <Text style={styles.primaryButtonLabel}>Enter Takado</Text>
              </Button>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FormFieldConfig = {
  id: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
};

type GenericFormCardProps = {
  stepLabel?: string;
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  primaryButtonLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
};

function GenericFormCard({
  stepLabel,
  title,
  description,
  fields,
  values,
  onChange,
  onSubmit,
  primaryButtonLabel,
  submitting,
  submitDisabled,
}: GenericFormCardProps) {
  const allFieldsFilled = fields.every((field) => (values[field.id] ?? '').trim().length > 0);
  const disabled =
    (submitDisabled ?? !allFieldsFilled) || Boolean(submitting);

  return (
    <Card style={styles.stepCard}>
      {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
      {title ? <Text style={styles.stepTitle}>{title}</Text> : null}
      <View style={styles.stepBody}>
        {description ? <Text style={styles.bodyText}>{description}</Text> : null}
        {fields.map((field) => (
          <Input
            key={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={values[field.id] ?? ''}
            onChangeText={(text) => onChange(field.id, text)}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            multiline={field.multiline}
            numberOfLines={field.numberOfLines}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        ))}
        <Button
          style={styles.primaryButton}
          onPress={onSubmit}
          disabled={disabled}
        >
          {submitting ? (
            <ActivityIndicator color={colors.canvas} />
          ) : (
            <Text style={styles.primaryButtonLabel}>{primaryButtonLabel}</Text>
          )}
        </Button>
      </View>
    </Card>
  );
}

function pickAgeRange(age: number): AgeRange {
  const bucket = AGE_BUCKETS.find((entry) => age >= entry.min && age <= entry.max);
  return bucket ? bucket.range : '65-plus';
}

function buildArcRecord(payload: {
  name: string;
  narrative?: string;
  status?: Arc['status'];
}): Arc {
  const timestamp = new Date().toISOString();
  return {
    id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name,
    narrative: payload.narrative,
    status: payload.status ?? 'active',
    startDate: timestamp,
    endDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: (spacing['2xl'] ?? spacing.xl) * 2,
  },
  timeline: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  brandWordmark: {
    ...typography.brand,
    color: colors.textPrimary,
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: spacing.md,
  },
  stepCardCompleted: {
    borderColor: 'rgba(15,23,42,0.15)',
    opacity: 0.95,
  },
  stepLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stepTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  stepBody: {
    gap: spacing.md,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  ackText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primaryButton: {
    width: '100%',
  },
  primaryButtonLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: '600',
  },
  outlineButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  linkLabel: {
    ...typography.bodySm,
    color: colors.accent,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.shell,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: '#DCFCE7',
  },
  chipLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  inlineActions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  avatarPreview: {
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: '#B91C1C',
  },
});


