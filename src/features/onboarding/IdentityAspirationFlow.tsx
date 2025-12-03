import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Heading, Text } from '../../ui/primitives';
import { colors, spacing, typography, fonts } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import { sendCoachChat, type CoachChatOptions, type CoachChatTurn } from '../../services/ai';
import { useAppStore } from '../../store/useAppStore';
import type { Arc } from '../../domain/types';
import type { AiChatPaneController } from '../ai/AiChatScreen';

type IdentityAspirationFlowProps = {
  onComplete?: () => void;
  /**
   * Optional handle to the shared chat surface. For this FTUE we keep AI work
   * mostly "behind the scenes" and do not currently stream visible chat turns,
   * but we keep the ref available for future refinement.
   */
  chatControllerRef?: React.RefObject<AiChatPaneController | null>;
};

type IdentityTag =
  | 'creative'
  | 'leadership'
  | 'relationships'
  | 'discipline'
  | 'courage'
  | 'mastery'
  | 'meaning'
  | 'exploration'
  | 'making'
  | 'reliability'
  | 'excellence'
  | 'problem_solving'
  | 'helping'
  | 'expression'
  | 'strength'
  | 'values'
  | 'curiosity'
  | 'imagination'
  | 'loyalty'
  | 'competitiveness'
  | 'humor'
  | 'calm'
  | 'intensity'
  | 'empathy'
  | 'consistency'
  | 'self_belief'
  | 'starting'
  | 'speaking_up'
  | 'finishing'
  | 'emotion_regulation'
  | 'patience'
  | 'focus'
  | 'showing_up'
  | 'making_meaningful'
  | 'new_thinking'
  | 'honesty_bravery'
  | 'skill_improvement'
  | 'friend_support';

type ChoiceOption = {
  id: string;
  label: string;
  tags?: IdentityTag[];
  emoji?: string;
};

// Q1 – Domain of becoming (the arena)
const DOMAIN_OPTIONS: ChoiceOption[] = [
  {
    id: 'creativity_expression',
    label: 'Creativity & expression',
    emoji: '🎨',
    tags: ['creative', 'expression', 'mastery'],
  },
  {
    id: 'leadership_influence',
    label: 'Leadership & influence',
    emoji: '🌟',
    tags: ['leadership', 'relationships'],
  },
  {
    id: 'relationships_connection',
    label: 'Relationships & connection',
    emoji: '🤝',
    tags: ['relationships', 'helping'],
  },
  {
    id: 'discipline_consistency',
    label: 'Discipline & consistency',
    emoji: '📅',
    tags: ['discipline', 'consistency'],
  },
  {
    id: 'courage_confidence',
    label: 'Courage & confidence',
    emoji: '💪',
    tags: ['courage', 'self_belief'],
  },
  {
    id: 'skill_mastery',
    label: 'Skill & mastery',
    emoji: '🏅',
    tags: ['mastery', 'strength'],
  },
  {
    id: 'purpose_meaning',
    label: 'Purpose & meaning',
    emoji: '🌱',
    tags: ['meaning', 'values'],
  },
  {
    id: 'adventure_exploration',
    label: 'Adventure & exploration',
    emoji: '🧭',
    tags: ['exploration', 'courage'],
  },
  {
    id: 'making_building',
    label: 'Making & building',
    emoji: '🛠️',
    tags: ['making', 'creative', 'strength'],
  },
];

// Q2 – Motivational style (their drive)
const MOTIVATION_OPTIONS: ChoiceOption[] = [
  {
    id: 'make_new_things',
    label: 'Making things that didn’t exist before',
    tags: ['creative', 'making', 'mastery'],
  },
  {
    id: 'reliable_for_others',
    label: 'Being someone others can rely on',
    tags: ['reliability', 'relationships', 'helping'],
  },
  {
    id: 'excellence_through_effort',
    label: 'Achieving excellence through effort',
    tags: ['excellence', 'discipline', 'mastery'],
  },
  {
    id: 'solve_hard_problems',
    label: 'Figuring out problems others can’t',
    tags: ['problem_solving', 'mastery'],
  },
  {
    id: 'help_people_feel_valued',
    label: 'Helping people feel valued',
    tags: ['helping', 'relationships', 'values'],
  },
  {
    id: 'express_ideas_new_way',
    label: 'Expressing ideas in a new way',
    tags: ['expression', 'creative', 'new_thinking'],
  },
  {
    id: 'become_stronger',
    label: 'Becoming stronger—mentally or physically',
    tags: ['strength', 'mastery', 'courage'],
  },
  {
    id: 'stand_up_for_what_matters',
    label: 'Standing up for what matters',
    tags: ['values', 'courage'],
  },
];

// Q3 – Signature trait (their flavor)
const SIGNATURE_TRAIT_OPTIONS: ChoiceOption[] = [
  { id: 'curiosity', label: 'Your curiosity', tags: ['curiosity', 'exploration'] },
  { id: 'imagination', label: 'Your imagination', tags: ['imagination', 'creative'] },
  { id: 'loyalty', label: 'Your loyalty', tags: ['loyalty', 'relationships'] },
  { id: 'competitiveness', label: 'Your competitiveness', tags: ['competitiveness', 'excellence'] },
  { id: 'humor', label: 'Your sense of humor', tags: ['humor', 'relationships'] },
  { id: 'calm', label: 'Your calm', tags: ['calm'] },
  { id: 'intensity', label: 'Your intensity', tags: ['intensity'] },
  { id: 'empathy', label: 'Your empathy', tags: ['empathy', 'helping'] },
];

// Q4 – Growth edge (their tension)
const GROWTH_EDGE_OPTIONS: ChoiceOption[] = [
  { id: 'staying_consistent', label: 'Staying consistent', tags: ['consistency', 'discipline'] },
  { id: 'believing_in_yourself', label: 'Believing in yourself', tags: ['self_belief'] },
  { id: 'getting_started', label: 'Getting started', tags: ['starting'] },
  { id: 'speaking_up', label: 'Speaking up', tags: ['speaking_up', 'courage'] },
  { id: 'finishing_things', label: 'Finishing things', tags: ['finishing', 'discipline'] },
  { id: 'managing_emotions', label: 'Managing emotions', tags: ['emotion_regulation'] },
  { id: 'being_patient', label: 'Being patient', tags: ['patience'] },
  { id: 'staying_focused', label: 'Staying focused', tags: ['focus', 'discipline'] },
];

// Q5 – Everyday proud moment (embodiment)
const PROUD_MOMENT_OPTIONS: ChoiceOption[] = [
  {
    id: 'showing_up_when_hard',
    label: 'Showing up even when it’s hard',
    tags: ['showing_up', 'consistency', 'courage'],
  },
  {
    id: 'making_something_meaningful',
    label: 'Making something meaningful',
    tags: ['making_meaningful', 'creative', 'making'],
  },
  { id: 'helping_someone', label: 'Helping someone', tags: ['helping', 'relationships'] },
  { id: 'pushing_yourself', label: 'Pushing yourself', tags: ['courage', 'strength'] },
  { id: 'thinking_in_new_way', label: 'Thinking in a new way', tags: ['new_thinking', 'exploration'] },
  { id: 'being_honest_or_brave', label: 'Being honest or brave', tags: ['honesty_bravery', 'values', 'courage'] },
  { id: 'improving_a_skill', label: 'Improving a skill', tags: ['skill_improvement', 'mastery'] },
  { id: 'supporting_a_friend', label: 'Supporting a friend', tags: ['friend_support', 'relationships', 'helping'] },
];

const TWEAK_OPTIONS: ChoiceOption[] = [
  { id: 'more_calm', label: 'More calm / steady' },
  { id: 'more_energy', label: 'More energy / boldness' },
  { id: 'more_relationships', label: 'More about relationships' },
  { id: 'more_mastery', label: 'More about skill & mastery' },
  { id: 'simpler_language', label: 'Simpler language' },
];

type Phase = 'domain' | 'motivation' | 'trait' | 'growth' | 'proudMoment' | 'nickname' | 'generating' | 'reveal' | 'tweak';

type AspirationPayload = {
  arcName: string;
  aspirationSentence: string;
  nextSmallStep: string;
};

export function IdentityAspirationFlow({
  onComplete,
  chatControllerRef,
}: IdentityAspirationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();
  const addArc = useAppStore((state) => state.addArc);

  const [phase, setPhase] = useState<Phase>('domain');
  const [introPlayed, setIntroPlayed] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [lastIntroStreamedIndex, setLastIntroStreamedIndex] = useState<number | null>(null);
  const [introActionsVisibleIndex, setIntroActionsVisibleIndex] = useState<number | null>(null);
  const introActionsOpacity = useRef(new Animated.Value(0)).current;
  const introActionsTranslateY = useRef(new Animated.Value(8)).current;
  const introActionsTranslateX = useRef(new Animated.Value(0)).current;

  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [motivationIds, setMotivationIds] = useState<string[]>([]);
  const [signatureTraitIds, setSignatureTraitIds] = useState<string[]>([]);
  const [growthEdgeIds, setGrowthEdgeIds] = useState<string[]>([]);
  const [proudMomentIds, setProudMomentIds] = useState<string[]>([]);
  const [nickname, setNickname] = useState('');
  const [nicknameTouched, setNicknameTouched] = useState(false);

  const [aspiration, setAspiration] = useState<AspirationPayload | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweak, setSelectedTweak] = useState<string | null>(null);

  const [identitySignature, setIdentitySignature] = useState<Record<IdentityTag, number>>(
    {} as Record<IdentityTag, number>
  );
  const [showResearchExplainer, setShowResearchExplainer] = useState(false);

  const appendChatUserMessage = useCallback(
    (content: string) => {
      const controller = chatControllerRef?.current;
      if (!controller) return;
      controller.appendUserMessage(content);
    },
    [chatControllerRef]
  );

  const formatSelectionLabels = (ids: string[], options: ChoiceOption[]): string => {
    const labels = ids
      .map((id) => options.find((o) => o.id === id)?.label ?? id)
      .filter(Boolean);

    if (labels.length === 0) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;

    const head = labels.slice(0, -1).join(', ');
    const tail = labels[labels.length - 1];
    return `${head} and ${tail}`;
  };

  const domain = formatSelectionLabels(domainIds, DOMAIN_OPTIONS);
  const motivation = formatSelectionLabels(motivationIds, MOTIVATION_OPTIONS);
  const signatureTrait = formatSelectionLabels(signatureTraitIds, SIGNATURE_TRAIT_OPTIONS);
  const growthEdge = formatSelectionLabels(growthEdgeIds, GROWTH_EDGE_OPTIONS);
  const proudMoment = formatSelectionLabels(proudMomentIds, PROUD_MOMENT_OPTIONS);

  const canGenerate =
    domainIds.length > 0 &&
    motivationIds.length > 0 &&
    signatureTraitIds.length > 0 &&
    growthEdgeIds.length > 0 &&
    proudMomentIds.length > 0;

  const advancePhase = (next: Phase) => {
    setPhase(next);
  };

  const parseAspirationFromReply = (reply: string): AspirationPayload | null => {
    try {
      const startIdx = reply.indexOf('{');
      const endIdx = reply.lastIndexOf('}');
      const jsonText =
        startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
          ? reply.slice(startIdx, endIdx + 1)
          : reply;

      const parsed = JSON.parse(jsonText) as {
        arcName?: string;
        aspirationSentence?: string;
        nextSmallStep?: string;
      };

      if (!parsed.arcName || !parsed.aspirationSentence || !parsed.nextSmallStep) {
        return null;
      }

      return {
        arcName: parsed.arcName,
        aspirationSentence: parsed.aspirationSentence,
        nextSmallStep: parsed.nextSmallStep,
      };
    } catch {
      return null;
    }
  };

  const buildLocalAspirationFallback = (): AspirationPayload | null => {
    if (!domain || !motivation || !signatureTrait || !growthEdge || !proudMoment) {
      return null;
    }

    const domainLabel = domain || 'a part of your life that matters';
    const motivationLabel = motivation || 'a kind of drive that fits you';
    const traitLabel = signatureTrait || 'a strength that already feels like you';
    const growthEdgeLabel = growthEdge || 'a real challenge you are working on';
    const proudMomentLabel = proudMoment || 'a small way you show up on ordinary days';

    const baseNameParts: string[] = [];
    if (domainLabel) {
      baseNameParts.push(domainLabel.split(' ')[0] ?? '');
    }
    if (traitLabel) {
      baseNameParts.push(traitLabel.replace(/^Your\s+/i, ''));
    }

    const arcName =
      (nickname && nickname.trim()) ||
      baseNameParts.join(' ') ||
      'Growing into your next version';

    const aspirationSentence = [
      `You’re becoming someone who is growing in **${domainLabel.toLowerCase()}**, driven by ${motivationLabel.toLowerCase()}.`,
      `Your ${traitLabel.toLowerCase()} is a real strength, and this next chapter is about working with ${growthEdgeLabel.toLowerCase()} instead of avoiding it.`,
      `On normal days, that looks like ${proudMomentLabel.toLowerCase()}.`,
    ].join(' ');

    let nextSmallStep = 'Your next small step: Practice what matters for just 5 minutes.';
    if (proudMomentIds.includes('improving_a_skill')) {
      nextSmallStep = 'Your next small step: Set a 10-minute timer to practice one small piece of something you care about.';
    } else if (proudMomentIds.includes('helping_someone') || proudMomentIds.includes('supporting_a_friend')) {
      nextSmallStep = 'Your next small step: Reach out to one person today and offer one simple, concrete help.';
    } else if (proudMomentIds.includes('making_something_meaningful')) {
      nextSmallStep = 'Your next small step: Make a tiny version of something you care about—no pressure to finish it.';
    } else if (proudMomentIds.includes('showing_up_when_hard')) {
      nextSmallStep = 'Your next small step: Pick one small way to show up today, even if your energy is low.';
    }

    return {
      arcName,
      aspirationSentence,
      nextSmallStep,
    };
  };

  const isLikelyOfflineError = (err: unknown): boolean => {
    if (!err) return false;

    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : typeof (err as { message?: unknown }).message === 'string'
        ? ((err as { message: string }).message)
        : undefined;

    if (!message) return false;

    const lower = message.toLowerCase();
    return (
      lower.includes('network request failed') ||
      lower.includes('network error') ||
      lower.includes('failed to fetch') ||
      lower.includes('internet connection appears to be offline')
    );
  };

  const generateAspiration = useCallback(
    async (tweakHint?: string) => {
      if (!canGenerate) {
        return;
      }

      setIsGenerating(true);
      setError(null);

      const inputsSummaryLines = [
        `domain of becoming: ${domain}`,
        `motivational style: ${motivation}`,
        `signature trait: ${signatureTrait}`,
        `growth edge: ${growthEdge}`,
        `everyday proud moment: ${proudMoment}`,
      ];
      if (nickname.trim()) {
        inputsSummaryLines.push(`nickname: ${nickname.trim()}`);
      }
      if (tweakHint) {
        inputsSummaryLines.push(`user tweak preference: ${tweakHint}`);
      }

      const inputsSummary = inputsSummaryLines.join('\n- ');

      const prompt = [
        'You are helping a teen user define a simple, identity-first Arc in their life.',
        '',
        'Using the inputs below—[domain of becoming], [motivational style], [signature trait], [growth edge], [everyday proud moment], optional [nickname]—create a short identity snapshot.',
        '',
        'Respond ONLY with a single JSON object in this exact shape (no backticks, no extra text):',
        '{',
        '  "arcName": string,',
        '  "aspirationSentence": string,',
        '  "nextSmallStep": string',
        '}',
        '',
        'Rules:',
        '- arcName: 2–5 words, tappable, age-appropriate (e.g., "Calm Creator", "Quiet Leader", "Steady Friend"). Prefer using the nickname if one is provided, cleaned up.',
        '- aspirationSentence: 3–6 short sentences that together describe:',
        '  1) who they are becoming in that domain,',
        '  2) how their signature trait is a strength,',
        '  3) what their real growth edge is (named gently), and',
        '  4) what this looks like on a normal day (using the proud moment).',
        '  Avoid generic language; keep it concrete, believable, and specific to these inputs.',
        '- nextSmallStep: ONE sentence starting with "Your next small step: " that suggests a tiny, doable behavior that matches their growth edge and proud moment.',
        '',
        'Inputs:',
        `- ${inputsSummary}`,
      ].join('\n');

      const messages: CoachChatTurn[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const options: CoachChatOptions = {
        mode: 'firstTimeOnboarding',
        workflowDefinitionId: workflowRuntime?.definition?.id,
        workflowInstanceId: workflowRuntime?.instance?.id,
        workflowStepId: 'aspiration_generate',
      };

      try {
        const reply = await sendCoachChat(messages, options);
        const parsed = parseAspirationFromReply(reply);

        if (parsed) {
          setAspiration(parsed);
          if (workflowRuntime) {
            workflowRuntime.completeStep('aspiration_generate', {
              arcName: parsed.arcName,
              arcNarrative: parsed.aspirationSentence,
              nextSmallStep: parsed.nextSmallStep,
            });
          }
          setPhase('reveal');
          return;
        }

        // If the model did not return well-formed JSON, fall back to a simple,
        // client-side synthesis so the user still gets a clear Arc.
        console.warn(
          '[onboarding] Aspiration JSON parse failed, falling back to local synthesis'
        );
        const fallback = buildLocalAspirationFallback();
        if (!fallback) {
          throw new Error('Unable to build local aspiration fallback.');
        }

        setAspiration(fallback);
        if (workflowRuntime) {
          workflowRuntime.completeStep('aspiration_generate', {
            arcName: fallback.arcName,
            arcNarrative: fallback.aspirationSentence,
            nextSmallStep: fallback.nextSmallStep,
          });
        }
        setPhase('reveal');
      } catch (err) {
        console.error('[onboarding] Failed to generate identity aspiration', err);
        if (isLikelyOfflineError(err)) {
          setError(
            "It looks like you're offline right now, so I can't load this step yet. Once you're back on Wi‑Fi or data, try again."
          );
        } else {
          setError(
            'Something went wrong while getting this identity Arc and tiny next step. Please try again in a moment.'
          );
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [canGenerate, domain, motivation, signatureTrait, growthEdge, proudMoment, nickname, workflowRuntime]
  );

  const handleConfirmAspiration = () => {
    if (!aspiration) return;

    const nowIso = new Date().toISOString();
    const arc: Arc = {
      id: `arc-onboarding-${Date.now()}`,
      name: aspiration.arcName,
      narrative: aspiration.aspirationSentence,
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    addArc(arc);
    if (workflowRuntime) {
      workflowRuntime.completeStep('aspiration_confirm', { confirmed: true });
      workflowRuntime.completeStep('closing_arc');
    }
    onComplete?.();
  };

  // Number of scripted intro messages we stream during the soft-start phase.
  const INTRO_MESSAGE_COUNT = 4;

  // Orchestrate the soft-start message as a typed assistant bubble rather than
  // a card. When the workflow lands on `soft_start`, we stream a short
  // sequence of intro messages and then advance to the first tap-centric card.
  useEffect(() => {
    if (!workflowRuntime?.instance || !workflowRuntime.definition) return;
    if (workflowRuntime.instance.currentStepId !== 'soft_start') return;
    if (introPlayed) return;

    const controller = chatControllerRef?.current;
    const step = workflowRuntime.definition.steps.find((s) => s.id === 'soft_start');
    const fallback =
      (step?.staticCopy as string | undefined) ??
      'Let’s uncover the version of you that feels the most you.';

    const messages: string[] = [
      // Message 1 (big-picture promise)
      'Hello 👋 and welcome to **kwilt** — we’re here to help you design the **future you want**, then make it feel doable with clear goals and tiny next steps.',
      // Message 2 (introduce Arcs, lightly hint at Goals + Activities)
      'We’ll start by sketching a short **identity Arc** that captures the kind of **person you want to become**.\n\nLater, kwilt will help you translate that Arc into concrete **Goals** and small everyday **Activities** so it’s easy to act on.',
      // Message 3 (light research grounding)
      'Everything is based on **research-backed psychology**, so your plan actually **fits you**—not someone else’s idea of who you should be.',
      // Message 4 (lead-in to the tap-only identity questions)
      'Great! Now let’s figure out the **kind of person you’re becoming**—so we can help you grow into someone you’re proud of.\n\nI’m going to ask you **5 quick questions**. Just tap what fits. No typing needed. This should only take about a minute.',
    ];

    const queue = messages.length > 0 ? messages : [fallback];
    const current = queue[introIndex];

    if (current == null) {
      return;
    }

    if (!controller) {
      // If we can’t stream into chat, fall back to immediately completing the
      // step so the cards remain usable, unless the user is currently viewing
      // the research explainer.
      if (!showResearchExplainer) {
        workflowRuntime.completeStep('soft_start');
        advancePhase('domain');
        setIntroPlayed(true);
      }
      return;
    }

    let cancelled = false;

    if (lastIntroStreamedIndex === introIndex) {
      return () => {
        cancelled = true;
      };
    }

    controller.streamAssistantReplyFromWorkflow(
      current,
      `assistant-soft-start-${introIndex}`,
      {
        onDone: () => {
          if (cancelled) return;
          setLastIntroStreamedIndex(introIndex);
        },
      }
    );

    return () => {
      cancelled = true;
    };
  }, [workflowRuntime, chatControllerRef, introPlayed, introIndex, lastIntroStreamedIndex]);

  // After a message has fully streamed, wait a short beat before revealing the
  // response actions so it feels like the agent has "finished talking".
  useEffect(() => {
    if (workflowRuntime?.instance?.currentStepId !== 'soft_start') return;
    if (lastIntroStreamedIndex === null) return;
    // For the very last intro message we skip rendering tap actions entirely
    // and instead auto-advance into the first structured step.
    if (lastIntroStreamedIndex === INTRO_MESSAGE_COUNT - 1) return;
    if (introActionsVisibleIndex === lastIntroStreamedIndex) return;

    const timeout = setTimeout(() => {
      setIntroActionsVisibleIndex(lastIntroStreamedIndex);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [workflowRuntime?.instance?.currentStepId, lastIntroStreamedIndex, introActionsVisibleIndex]);

  // Once the final intro message has fully streamed, automatically complete the
  // soft_start workflow step and move into the first tap-centric card without
  // requiring an extra "I'm ready" confirmation tap, unless the user is
  // currently reading the research explainer.
  useEffect(() => {
    if (workflowRuntime?.instance?.currentStepId !== 'soft_start') return;
    if (introPlayed) return;
    if (showResearchExplainer) return;
    if (lastIntroStreamedIndex !== INTRO_MESSAGE_COUNT - 1) return;

    const timeout = setTimeout(() => {
      if (workflowRuntime) {
        workflowRuntime.completeStep('soft_start');
      }
      setIntroPlayed(true);
      advancePhase('domain');
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    workflowRuntime?.instance?.currentStepId,
    lastIntroStreamedIndex,
    introPlayed,
    showResearchExplainer,
    advancePhase,
  ]);

  useEffect(() => {
    if (introActionsVisibleIndex === null) return;
    introActionsOpacity.setValue(0);
    introActionsTranslateY.setValue(8);
    introActionsTranslateX.setValue(0);
    Animated.parallel([
      Animated.timing(introActionsOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(introActionsTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [introActionsVisibleIndex, introActionsOpacity, introActionsTranslateY, introActionsTranslateX]);

  const introResponseOptions: ChoiceOption[][] = [
    [{ id: 'sounds_good', label: 'I\'m here for that! 👍' }],
    [{ id: 'makes_sense', label: '✅ Got it' }],
    [
      { id: 'love_that', label: 'I ❤️ science' },
      { id: 'just_work', label: 'What research? 🤨' },
    ],
  ];

  const handleIntroResponse = (label: string) => {
    const controller = chatControllerRef?.current;
    if (controller) {
      controller.appendUserMessage(label);
    }

    const isResearchQuestion = label.toLowerCase().startsWith('what research');
    if (isResearchQuestion) {
      setShowResearchExplainer(true);
    }

    // On tap, fade the buttons up and slightly to the right (toward the user
    // bubble) while fading them out. For normal paths we then advance to the
    // next intro message; for the "What research?" branch we stay on the same
    // message index and show the explainer card before moving on.
    Animated.parallel([
      Animated.timing(introActionsOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(introActionsTranslateY, {
        toValue: -10,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(introActionsTranslateX, {
        toValue: 16,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIntroActionsVisibleIndex(null);
      if (!isResearchQuestion) {
        setIntroIndex((current) => current + 1);
      }
    });
  };

  const toggleIdInList = (id: string, current: string[]): string[] => {
    if (current.includes(id)) {
      return current.filter((value) => value !== id);
    }
    return [...current, id];
  };

  const updateSignatureForOption = (option: ChoiceOption, nextSelected: boolean) => {
    if (!option.tags || option.tags.length === 0) return;
    const delta = nextSelected ? 1 : -1;
    setIdentitySignature((prev) => {
      const next: Record<IdentityTag, number> = { ...prev };
      option.tags?.forEach((tag) => {
        const currentValue = next[tag] ?? 0;
        const updated = currentValue + delta;
        next[tag] = updated < 0 ? 0 : updated;
      });
      return next;
    });
  };

  const scoreOption = (option: ChoiceOption): number => {
    if (!option.tags || option.tags.length === 0) return 0;
    return option.tags.reduce((sum, tag) => sum + (identitySignature[tag] ?? 0), 0);
  };

  const getAdaptiveOptions = (base: ChoiceOption[], primaryCount = base.length): ChoiceOption[] => {
    if (primaryCount >= base.length) {
      // Just sort by score, highest first.
      return [...base].sort((a, b) => scoreOption(b) - scoreOption(a));
    }

    const sortedByScoreDesc = [...base].sort((a, b) => scoreOption(b) - scoreOption(a));
    const primary = sortedByScoreDesc.slice(0, primaryCount);

    const primaryIds = new Set(primary.map((o) => o.id));
    const remaining = base.filter((o) => !primaryIds.has(o.id));

    // Contrast options: lowest-scoring among remaining.
    const contrast = [...remaining].sort((a, b) => scoreOption(a) - scoreOption(b)).slice(0, 2);

    return [...primary, ...contrast];
  };

  const handleConfirmDomain = (selectedDomain: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('vibe_select', { domain: selectedDomain });
    }
    appendChatUserMessage(selectedDomain);
    setError(null);
    advancePhase('motivation');
  };

  const handleConfirmMotivation = (selectedMotivation: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('social_mirror', { motivation: selectedMotivation });
    }
    appendChatUserMessage(selectedMotivation);
    setError(null);
    advancePhase('trait');
  };

  const handleConfirmTrait = (selectedTrait: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('core_strength', { signatureTrait: selectedTrait });
    }
    appendChatUserMessage(selectedTrait);
    setError(null);
    advancePhase('growth');
  };

  const handleConfirmGrowth = (selectedGrowthEdge: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('growth_edge', { growthEdge: selectedGrowthEdge });
    }
    appendChatUserMessage(selectedGrowthEdge);
    setError(null);
    advancePhase('proudMoment');
  };

  const handleConfirmProudMoment = (selectedProudMoment: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('everyday_moment', { proudMoment: selectedProudMoment });
    }
    appendChatUserMessage(selectedProudMoment);
    setError(null);
    advancePhase('nickname');
  };

  const renderDomain = () => (
    <Card style={[styles.stepCard, styles.researchCard]}>
      <View style={styles.stepBody}>
        <Text style={styles.questionTitle}>
          Which part of yourself are you most excited to grow right now?
        </Text>
        <View style={styles.fullWidthList}>
          {DOMAIN_OPTIONS.map((option) => {
            const selected = domainIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                onPress={() => {
                  // Single-select: clear previous selection contributions, then apply the new one
                  const previousSelected = DOMAIN_OPTIONS.filter((o) => domainIds.includes(o.id));
                  previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                  updateSignatureForOption(option, true);
                  setDomainIds([option.id]);
                  handleConfirmDomain(option.label);
                }}
              >
                <View style={styles.fullWidthOptionContent}>
                  {option.emoji ? (
                    <Text
                      style={[
                        styles.fullWidthOptionEmoji,
                        selected && styles.fullWidthOptionEmojiSelected,
                      ]}
                    >
                      {option.emoji}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.fullWidthOptionLabel,
                      selected && styles.fullWidthOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );

  const renderMotivation = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          When future-you is really in their zone here, what motivates them the most?
        </Text>
        <View style={styles.chipGrid}>
          {getAdaptiveOptions(MOTIVATION_OPTIONS, 5).map((option) => {
            const selected = motivationIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  const previousSelected = MOTIVATION_OPTIONS.filter((o) =>
                    motivationIds.includes(o.id)
                  );
                  previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                  updateSignatureForOption(option, true);
                  setMotivationIds([option.id]);
                  handleConfirmMotivation(option.label);
                }}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );

  const renderTrait = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          Future-you is still you, just more you. Which part of you do they lean into even more?
        </Text>
        <View style={styles.chipGrid}>
          {getAdaptiveOptions(SIGNATURE_TRAIT_OPTIONS, 5).map((option) => {
            const selected = signatureTraitIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  const previousSelected = SIGNATURE_TRAIT_OPTIONS.filter((o) =>
                    signatureTraitIds.includes(o.id)
                  );
                  previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                  updateSignatureForOption(option, true);
                  setSignatureTraitIds([option.id]);
                  handleConfirmTrait(option.label);
                }}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );

  const renderGrowth = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>Every good story has a challenge. Which one feels most real?</Text>
        <View style={styles.chipGrid}>
          {getAdaptiveOptions(GROWTH_EDGE_OPTIONS, 5).map((option) => {
            const selected = growthEdgeIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  const previousSelected = GROWTH_EDGE_OPTIONS.filter((o) =>
                    growthEdgeIds.includes(o.id)
                  );
                  previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                  updateSignatureForOption(option, true);
                  setGrowthEdgeIds([option.id]);
                  handleConfirmGrowth(option.label);
                }}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );

  const renderProudMoment = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          On a normal day in the future—not a big moment—what would make you feel quietly proud?
        </Text>
        <View style={styles.chipGrid}>
          {getAdaptiveOptions(PROUD_MOMENT_OPTIONS, 5).map((option) => {
            const selected = proudMomentIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  const previousSelected = PROUD_MOMENT_OPTIONS.filter((o) =>
                    proudMomentIds.includes(o.id)
                  );
                  previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                  updateSignatureForOption(option, true);
                  setProudMomentIds([option.id]);
                  handleConfirmProudMoment(option.label);
                }}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );

  const renderNickname = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          If that future-you had a nickname, what would it be? You can skip this if nothing comes
          to mind.
        </Text>
        <Input
          value={nickname}
          onChangeText={(text) => {
            setNicknameTouched(true);
            setNickname(text);
          }}
          placeholder="e.g., The Builder, The Quiet Genius"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (workflowRuntime) {
              workflowRuntime.completeStep('nickname_optional', {
                nickname: nickname.trim() || null,
              });
            }
            setPhase('generating');
            void generateAspiration();
          }}
        />
        <View style={styles.inlineActions}>
          <Button
            variant="accent"
            style={styles.primaryButton}
            onPress={() => {
              if (workflowRuntime) {
                workflowRuntime.completeStep('nickname_optional', {
                  nickname: nickname.trim() || null,
                });
              }
              setPhase('generating');
              void generateAspiration();
            }}
          >
            <Text style={styles.primaryButtonLabel}>
              {nicknameTouched && nickname.trim() ? 'Use this nickname' : 'Continue'}
            </Text>
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setNickname('');
              if (workflowRuntime) {
                workflowRuntime.completeStep('nickname_optional', { nickname: null });
              }
              setPhase('generating');
              void generateAspiration();
            }}
          >
            <Text style={styles.linkLabel}>Skip</Text>
          </Button>
        </View>
      </View>
    </Card>
  );

  const renderGenerating = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          I’m stitching what you chose into a short identity Arc and one tiny next step.
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={styles.bodyText}>This usually takes just a moment…</Text>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </Card>
  );

  const renderReveal = () => {
    if (!aspiration) return null;

    return (
      <Card style={styles.stepCard}>
        <View style={styles.stepBody}>
          <Text style={styles.bodyText}>You’re becoming someone who…</Text>
          <Text style={styles.bodyText}>{aspiration.aspirationSentence}</Text>
          <Text style={styles.bodyText}>{aspiration.nextSmallStep}</Text>
          <View style={styles.inlineActions}>
            <Button variant="accent" style={styles.primaryButton} onPress={handleConfirmAspiration}>
              <Text style={styles.primaryButtonLabel}>Yes, this feels like me</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setSelectedTweak(null);
                setPhase('tweak');
              }}
            >
              <Text style={styles.linkLabel}>Close but tweak it</Text>
            </Button>
          </View>
        </View>
      </Card>
    );
  };

  const renderTweak = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          What should this lean more toward? Pick one option below and I’ll quietly adjust the
          wording to fit you better.
        </Text>
        <View style={styles.chipGrid}>
          {TWEAK_OPTIONS.map((option) => {
            const selected = selectedTweak === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedTweak(option.id)}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.inlineActions}>
          <Button
            variant="accent"
            style={styles.primaryButton}
            onPress={() => {
              if (!selectedTweak) return;
              setPhase('generating');
              void generateAspiration(selectedTweak);
            }}
            disabled={!selectedTweak}
          >
            <Text style={styles.primaryButtonLabel}>Update it</Text>
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setSelectedTweak(null);
              setPhase('reveal');
            }}
          >
            <Text style={styles.linkLabel}>Go back</Text>
          </Button>
        </View>
      </View>
    </Card>
  );

  const renderResearchExplainer = () => (
    <Card style={[styles.stepCard, styles.researchCard]}>
      <View style={styles.stepBody}>
        <Heading style={styles.researchHeading} variant="sm" tone="default">
          The science behind your plan
        </Heading>
        <Text style={styles.bodyText}>
          Kwilt is based on research in{' '}
          <Text style={styles.bodyStrong}>
            motivation science, positive psychology, and identity development
          </Text>
          . These fields study how people actually grow—how they build confidence, stick with new
          habits, and become more like the kind of person they want to be.
        </Text>
        <Text style={styles.bodyText}>
          We use ideas like{' '}
          <Text style={styles.bodyItalic}>“possible selves”</Text> (imagining who you’re becoming),{' '}
          <Text style={styles.bodyStrong}>strength-based growth</Text>, and{' '}
          <Text style={styles.bodyStrong}>tiny, doable actions</Text> that fit your real life so you
          can stay motivated and make real progress.{' '}
          <Text style={styles.bodyStrong}>Nothing complicated</Text>—just science that helps your
          plan fit you. 🌱
        </Text>
        <View style={[styles.inlineActions, styles.researchActions]}>
          <Button
            variant="accent"
            style={styles.primaryButton}
            onPress={() => {
              setShowResearchExplainer(false);
              // After closing the explainer, advance to the next intro message
              // in the sequence so the user picks up where they left off.
              setIntroIndex((current) =>
                current < INTRO_MESSAGE_COUNT - 1 ? current + 1 : current
              );
            }}
          >
            <Text style={styles.primaryButtonLabel}>Got it</Text>
          </Button>
        </View>
      </View>
    </Card>
  );

  if (phase === 'generating') {
    return renderGenerating();
  }

  // While the workflow is in the soft_start step and we haven't finished the
  // intro sequence yet, render a lightweight response card with 1–2 tap
  // options per message so the intro feels like an interactive tutorial.
  if (workflowRuntime?.instance?.currentStepId === 'soft_start' && !introPlayed) {
    // Only show response actions once the current intro message has fully
    // streamed; this lets the agent "finish talking" before prompting a tap.
    if (!showResearchExplainer && introActionsVisibleIndex !== introIndex) {
      return null;
    }

    const responses =
      !showResearchExplainer && introActionsVisibleIndex === introIndex
        ? introResponseOptions[introIndex] ?? []
        : [];
    return (
      <>
        {responses.length > 0 ? (
          <Animated.View
            style={[
              styles.introActionsContainer,
              {
                opacity: introActionsOpacity,
                transform: [
                  { translateY: introActionsTranslateY },
                  { translateX: introActionsTranslateX },
                ],
              },
            ]}
          >
            {responses.map((option) => (
              <Button
                key={option.id}
                style={styles.introActionButton}
                variant="secondary"
                onPress={() => handleIntroResponse(option.label)}
              >
                <Text style={styles.introActionLabel}>{option.label}</Text>
              </Button>
            ))}
          </Animated.View>
        ) : null}
        {showResearchExplainer ? renderResearchExplainer() : null}
      </>
    );
  }

  if (phase === 'domain') {
    return renderDomain();
  }

  if (phase === 'motivation') {
    return renderMotivation();
  }

  if (phase === 'trait') {
    return renderTrait();
  }

  if (phase === 'growth') {
    return renderGrowth();
  }

  if (phase === 'proudMoment') {
    return renderProudMoment();
  }

  if (phase === 'nickname') {
    // Nickname step is currently unchanged from the earlier FTUE and remains
    // as an optional enhancement on top of the 5 identity questions.
    return renderNickname();
  }

  if (phase === 'reveal') {
    return renderReveal();
  }

  if (phase === 'tweak') {
    return renderTweak();
  }

  return null;
}

const styles = StyleSheet.create({
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.xl,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: spacing.md,
  },
  researchCard: {
    paddingHorizontal: spacing['xl'],
    paddingVertical: spacing['xl'],
  },
  stepBody: {
    gap: spacing.md,
  },
  researchHeading: {
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  bodyStrong: {
    fontWeight: '700',
  },
  bodyItalic: {
    fontStyle: 'italic',
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  questionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    paddingBottom: spacing.md,
  },
  primaryButton: {
    alignSelf: 'stretch',
  },
  primaryButtonLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: '600',
    textAlign: 'center',
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
  fullWidthList: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  fullWidthOption: {
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.shell,
  },
  fullWidthOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: '#DCFCE7',
  },
  fullWidthOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidthOptionEmoji: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  fullWidthOptionEmojiSelected: {
    color: colors.accent,
  },
  fullWidthOptionLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  fullWidthOptionLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  inlineActions: {
    flexDirection: 'column',
    gap: spacing.sm,
    alignItems: 'center',
  },
  researchActions: {
    paddingTop: spacing.xl,
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
  introActionsContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  introActionButton: {
    minHeight: 44,
    paddingHorizontal: spacing['2xl'] ?? spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    // Slightly darker than the agent workspace canvas/shell so the pill reads
    // as a clear control, even on light backgrounds.
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  introActionLabel: {
    ...typography.bodySm,
    color: colors.secondaryForeground,
    fontWeight: '600',
    textAlign: 'center',
  },
});


