import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, StyleSheet, View } from 'react-native';
import { Input, SurveyCard, Text, VStack } from '../../ui/primitives';
import type { SurveyStep } from '../../ui/SurveyCard';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { Icon } from '../../ui/Icon';
import { colors, spacing } from '../../theme';
import { HapticsService } from '../../services/HapticsService';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';

/**
 * Extracts a timeframe phrase from the user's goal description text.
 * Returns the matched phrase (e.g. "by next month", "in 3 weeks") or null if none found.
 */
function extractTimeframe(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Patterns to match (order matters - more specific first)
  const patterns: Array<{ regex: RegExp; extract: (match: RegExpMatchArray) => string }> = [
    // "by [month] [day]" or "by [month] [year]" - e.g. "by March 15", "by January 2026"
    {
      regex: /\bby\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{1,2}(?:st|nd|rd|th)?|\d{4}))?\b/i,
      extract: (m) => m[0],
    },
    // "by [relative time]" - e.g. "by next month", "by end of year", "by Q2"
    {
      regex: /\bby\s+(next\s+(?:week|month|year|quarter)|end\s+of\s+(?:the\s+)?(?:week|month|year|quarter)|q[1-4]|(?:this|the)\s+(?:week|month|year|quarter))\b/i,
      extract: (m) => m[0],
    },
    // "in [N] [units]" - e.g. "in 3 months", "in 2 weeks", "in a year"
    {
      regex: /\bin\s+(?:(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+)?(days?|weeks?|months?|years?|quarters?)\b/i,
      extract: (m) => m[0],
    },
    // "this [timeframe]" - e.g. "this year", "this quarter", "this month"
    {
      regex: /\bthis\s+(week|month|year|quarter|semester)\b/i,
      extract: (m) => m[0],
    },
    // "next [timeframe]" - e.g. "next month", "next week"
    {
      regex: /\bnext\s+(week|month|year|quarter|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      extract: (m) => m[0],
    },
    // "starting [time]" - e.g. "starting tomorrow", "starting Monday", "starting next week"
    {
      regex: /\bstarting\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+(?:week|month))\b/i,
      extract: (m) => m[0],
    },
    // Standalone relative dates
    {
      regex: /\b(tomorrow|today|end\s+of\s+(?:the\s+)?(?:week|month|year))\b/i,
      extract: (m) => m[0],
    },
    // Specific date formats: "March 15", "Jan 1st", "December 2026"
    {
      regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{4})\b/i,
      extract: (m) => m[0],
    },
    // Numeric date formats: "3/15", "03/15/2026"
    {
      regex: /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
      extract: (m) => m[0],
    },
  ];

  for (const { regex, extract } of patterns) {
    const match = lowerText.match(regex);
    if (match) {
      // Return the original case version from the input
      const startIndex = match.index!;
      const endIndex = startIndex + match[0].length;
      return text.substring(startIndex, endIndex);
    }
  }

  return null;
}

type GoalCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
  /**
   * When true, show the choice screen first (recommend vs describe).
   * If false, skip straight to the describe flow.
   */
  autoRecommendOnMount?: boolean;
};

type GoalCreationMode = 'choice' | 'recommend' | 'describe';

/**
 * Goal creation workflow presenter.
 *
 * The flow starts with a streamed message, then shows pill buttons for the user
 * to choose between "Get a recommendation" or "Describe your goal".
 * This tap-first approach matches the FTUE pattern.
 */
export function GoalCreationFlow({ chatControllerRef, autoRecommendOnMount = false }: GoalCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isGoalCreationWorkflow = definition?.chatMode === 'goalCreation';
  const currentStepId = instance?.currentStepId;

  const isContextCollectActive =
    isGoalCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  // Start with the choice phase when autoRecommendOnMount is enabled
  const [creationMode, setCreationMode] = useState<GoalCreationMode>(
    autoRecommendOnMount ? 'choice' : 'describe'
  );

  // Streaming state
  const [introStreamed, setIntroStreamed] = useState(false);
  const [choiceButtonsVisible, setChoiceButtonsVisible] = useState(false);
  const hasRequestedIntroRef = useRef(false);

  // Animation values for choice buttons
  const choiceButtonsOpacity = useRef(new Animated.Value(0)).current;
  const choiceButtonsTranslateY = useRef(new Animated.Value(8)).current;

  // Form state
  const [prompt, setPrompt] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [surveyStep, setSurveyStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const hasAttemptedAutoRecommendRef = useRef(false);

  // Stream intro message when in choice mode
  useEffect(() => {
    if (!isContextCollectActive) return;
    if (creationMode !== 'choice') return;
    if (introStreamed) return;
    if (hasRequestedIntroRef.current) return;
    hasRequestedIntroRef.current = true;

    const controller = chatControllerRef?.current;
    if (!controller?.streamAssistantReplyFromWorkflow) {
      setIntroStreamed(true);
      // Show buttons after a short delay even without streaming
      setTimeout(() => setChoiceButtonsVisible(true), 300);
      return;
    }

    controller.streamAssistantReplyFromWorkflow(
      'How would you like to create your goal?',
      'goal-intro-choice',
      {
        onDone: () => {
          setIntroStreamed(true);
          // Reveal choice buttons after streaming completes
          setTimeout(() => setChoiceButtonsVisible(true), 400);
        },
      },
    );
  }, [chatControllerRef, creationMode, introStreamed, isContextCollectActive]);

  // Animate choice buttons when they become visible
  useEffect(() => {
    if (!choiceButtonsVisible) return;
    choiceButtonsOpacity.setValue(0);
    choiceButtonsTranslateY.setValue(8);
    Animated.parallel([
      Animated.timing(choiceButtonsOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(choiceButtonsTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [choiceButtonsVisible, choiceButtonsOpacity, choiceButtonsTranslateY]);

  // Stream describe intro when entering describe mode
  const hasStreamedDescribeIntroRef = useRef(false);
  useEffect(() => {
    if (!isContextCollectActive) return;
    if (creationMode !== 'describe') return;
    if (hasStreamedDescribeIntroRef.current) return;
    hasStreamedDescribeIntroRef.current = true;

    const controller = chatControllerRef?.current;
    if (!controller?.streamAssistantReplyFromWorkflow) return;

    controller.streamAssistantReplyFromWorkflow(
      'Describe your goal and when you want to achieve it.',
      'goal-describe-intro',
    );
  }, [chatControllerRef, creationMode, isContextCollectActive]);

  // Handle automatic recommendation when user chooses "Get a recommendation"
  useEffect(() => {
    if (creationMode !== 'recommend') return;
    if (!isContextCollectActive) return;
    if (!workflowRuntime || !isGoalCreationWorkflow) return;
    if (submitting) return;
    if (hasAttemptedAutoRecommendRef.current) return;

    hasAttemptedAutoRecommendRef.current = true;

    const run = async () => {
      try {
        setSubmitting(true);
        // Complete the context step with a minimal synthetic prompt so the agent
        // has permission to generate immediately (without user typing).
        workflowRuntime.completeStep('context_collect', {
          prompt:
            'Propose one starter goal based on my existing context in kwilt (arcs/goals/activities and any focused Arc). Assume a near-term horizon (roughly 30–90 days) unless the context strongly implies otherwise.',
          constraints: null,
        }, 'agent_generate_goals');

        await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
      } catch {
        // Return the workflow to context collection so the user can type the
        // goal manually (existing fallback UI).
        workflowRuntime.completeStep('agent_generate_goals', undefined, 'context_collect');
        setCreationMode('describe');
        hasAttemptedAutoRecommendRef.current = false;
      } finally {
        setSubmitting(false);
      }
    };

    void run();
  }, [
    creationMode,
    isContextCollectActive,
    isGoalCreationWorkflow,
    submitting,
    workflowRuntime,
  ]);

  const handleChooseRecommend = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    chatControllerRef?.current?.appendUserMessage('Get me a goal recommendation');
    // Animate out buttons before transitioning
    Animated.parallel([
      Animated.timing(choiceButtonsOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(choiceButtonsTranslateY, {
        toValue: -10,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCreationMode('recommend');
    });
  }, [chatControllerRef, choiceButtonsOpacity, choiceButtonsTranslateY]);

  const handleChooseDescribe = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    chatControllerRef?.current?.appendUserMessage("I'll describe my goal");
    // Animate out buttons before transitioning
    Animated.parallel([
      Animated.timing(choiceButtonsOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(choiceButtonsTranslateY, {
        toValue: -10,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCreationMode('describe');
    });
  }, [chatControllerRef, choiceButtonsOpacity, choiceButtonsTranslateY]);

  // Step navigation handlers
  const handleSurveyNext = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    // Extract timeframe from the goal description and pre-fill
    const extractedTimeframe = extractTimeframe(prompt);
    if (extractedTimeframe && !targetDate) {
      setTargetDate(extractedTimeframe);
    }
    setSurveyStep(1);
  }, [prompt, targetDate]);

  const handleSurveyBack = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    setSurveyStep(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isGoalCreationWorkflow) return;
    if (submitting) return;

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const trimmedTargetDate = targetDate.trim();

    Keyboard.dismiss();

    // Mirror the user's answer into the transcript so the workflow reads like chat.
    chatControllerRef?.current?.appendUserMessage(
      trimmedTargetDate.length > 0
        ? `${trimmedPrompt}\n\nTarget: ${trimmedTargetDate}`
        : trimmedPrompt,
    );

    workflowRuntime.completeStep('context_collect', {
      prompt: trimmedPrompt,
      constraints: trimmedTargetDate.length > 0 ? `Target date: ${trimmedTargetDate}` : null,
    });

    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
    } finally {
      setSubmitting(false);
    }
  }, [chatControllerRef, targetDate, isGoalCreationWorkflow, prompt, submitting, workflowRuntime]);

  // Define survey steps (must be before early returns to satisfy React hooks rules)
  const surveySteps: SurveyStep[] = useMemo(() => [
    {
      id: 'goal',
      title: 'What do you want to achieve?',
      canProceed: prompt.trim().length > 0,
      render: () => (
        <Input
          multiline
          value={prompt}
          onChangeText={setPrompt}
          placeholder="e.g., Finish the first draft of my novel; Run a 5K; Launch my side project."
          editable={!submitting}
          returnKeyType="done"
          blurOnSubmit
          multilineMinHeight={100}
          multilineMaxHeight={140}
        />
      ),
    },
    {
      id: 'timeframe',
      title: 'When do you want to achieve this?',
      canProceed: true, // timeframe is optional
      render: () => (
        <VStack space="sm">
          <Input
            multiline
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="e.g., by next month, in 3 weeks, by March 15"
            editable={!submitting}
            returnKeyType="done"
            blurOnSubmit
            multilineMinHeight={100}
            multilineMaxHeight={140}
          />
          <Text style={styles.timeframeHint}>
            Optional — leave blank if you're not sure yet.
          </Text>
        </VStack>
      ),
    },
  ], [prompt, targetDate, submitting]);

  if (!isContextCollectActive) {
    return null;
  }

  // When in recommend mode and submitting, show nothing (the ghost loader appears in the chat)
  if (creationMode === 'recommend' && submitting) {
    return null;
  }

  // Choice phase: Show pill buttons after streaming completes
  if (creationMode === 'choice') {
    if (!choiceButtonsVisible) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.choiceButtonsContainer,
          {
            opacity: choiceButtonsOpacity,
            transform: [{ translateY: choiceButtonsTranslateY }],
          },
        ]}
      >
        <Button
          style={styles.choicePillButton}
          variant="ai"
          onPress={handleChooseRecommend}
        >
          <View style={styles.choicePillContent}>
            <Icon name="sparkles" size={16} color={colors.aiForeground} />
            <ButtonLabel size="md" tone="inverse">Recommend a goal</ButtonLabel>
          </View>
        </Button>
        <Button
          style={styles.choicePillButton}
          variant="secondary"
          onPress={handleChooseDescribe}
        >
          <ButtonLabel size="md">Describe my goal</ButtonLabel>
        </Button>
      </Animated.View>
    );
  }

  // Describe phase: Show 2-step survey card
  return (
    <View style={styles.container}>
      <SurveyCard
        steps={surveySteps}
        currentStepIndex={surveyStep}
        onBack={handleSurveyBack}
        onNext={handleSurveyNext}
        onSubmit={handleSubmit}
        nextLabel="Next"
        submitLabel={submitting ? 'Working…' : 'Continue'}
        variant="stacked"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  // Choice buttons (pill style, matching FTUE)
  choiceButtonsContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  choicePillButton: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  choicePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Timeframe step hint
  timeframeHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
