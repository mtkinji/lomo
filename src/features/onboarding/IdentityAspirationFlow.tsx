import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Heading, Text } from '../../ui/primitives';
import { Input } from '../../ui/Input';
import { Dialog } from '../../ui/Dialog';
import { colors, spacing, typography, fonts } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import { sendCoachChat, type CoachChatOptions, type CoachChatTurn } from '../../services/ai';
import { useAppStore } from '../../store/useAppStore';
import type { Arc } from '../../domain/types';
import type { AiChatPaneController } from '../ai/AiChatScreen';
import { ArcListCard } from '../../ui/ArcListCard';

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
    id: 'craft_skill_building',
    label: 'Craft, skill & building',
    emoji: '🛠️',
    tags: ['mastery', 'making', 'strength'],
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
    id: 'purpose_meaning_contribution',
    label: 'Purpose, meaning & contribution',
    emoji: '🌱',
    tags: ['meaning', 'values', 'helping', 'making_meaningful'],
  },
  {
    id: 'courage_confidence',
    label: 'Courage & confidence',
    emoji: '💪',
    tags: ['courage', 'self_belief'],
  },
  {
    id: 'habits_discipline_energy',
    label: 'Habits, discipline & energy',
    emoji: '📅',
    tags: ['discipline', 'consistency', 'strength'],
  },
  {
    id: 'adventure_exploration',
    label: 'Adventure & exploration',
    emoji: '🧭',
    tags: ['exploration', 'courage'],
  },
  {
    id: 'inner_life_mindset',
    label: 'Inner life & mindset',
    emoji: '🧘',
    tags: ['calm', 'emotion_regulation', 'meaning'],
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
  { id: 'curiosity', label: 'Curiosity', tags: ['curiosity', 'exploration'] },
  { id: 'imagination', label: 'Imagination', tags: ['imagination', 'creative'] },
  { id: 'loyalty', label: 'Loyalty', tags: ['loyalty', 'relationships'] },
  {
    id: 'competitiveness',
    label: 'Competitive drive',
    tags: ['competitiveness', 'excellence'],
  },
  { id: 'humor', label: 'Sense of humor', tags: ['humor', 'relationships'] },
  { id: 'calm', label: 'Calm', tags: ['calm'] },
  { id: 'intensity', label: 'Intensity', tags: ['intensity'] },
  { id: 'empathy', label: 'Empathy', tags: ['empathy', 'helping'] },
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
  {
    id: 'caring_for_energy',
    label: 'Taking care of your body & energy',
    tags: ['calm', 'discipline', 'strength'],
  },
];

// Q6 – Source of meaning
const MEANING_OPTIONS: ChoiceOption[] = [
  {
    id: 'creating_things_that_last',
    label: 'Creating things that last',
    tags: ['making_meaningful', 'making', 'mastery'],
  },
  {
    id: 'growing_deep_relationships',
    label: 'Growing deep relationships',
    tags: ['relationships', 'friend_support', 'helping'],
  },
  {
    id: 'mastering_skills',
    label: 'Mastering skills',
    tags: ['skill_improvement', 'mastery', 'discipline'],
  },
  {
    id: 'helping_others_thrive',
    label: 'Helping others thrive',
    tags: ['helping', 'relationships', 'values'],
  },
  {
    id: 'achieving_something_proud_of',
    label: 'Achieving something you’re proud of',
    tags: ['excellence', 'competitiveness', 'strength'],
  },
  {
    id: 'bringing_beauty_or_insight',
    label: 'Bringing beauty or insight into the world',
    tags: ['creative', 'imagination', 'new_thinking'],
  },
  {
    id: 'faith_or_bigger_story',
    label: 'Living your faith and values in everyday life',
    tags: ['meaning', 'values', 'calm'],
  },
  {
    id: 'becoming_strongest_self',
    label: 'Becoming your strongest self',
    tags: ['strength', 'self_belief'],
  },
];

// Q7 – Desired impact on others
const IMPACT_OPTIONS: ChoiceOption[] = [
  {
    id: 'impact_clarity',
    label: 'Bringing clarity or understanding',
    tags: ['new_thinking', 'problem_solving'],
  },
  {
    id: 'impact_easier_lives',
    label: 'Making people’s lives easier',
    tags: ['helping', 'problem_solving'],
  },
  {
    id: 'impact_seen_supported',
    label: 'Helping people feel seen or supported',
    tags: ['empathy', 'friend_support', 'relationships'],
  },
  {
    id: 'impact_creativity',
    label: 'Inspiring creativity or imagination',
    tags: ['creative', 'imagination', 'expression'],
  },
  {
    id: 'impact_solving_problems',
    label: 'Solving meaningful problems',
    tags: ['problem_solving', 'mastery'],
  },
  {
    id: 'impact_peace',
    label: 'Bringing more peace into the world',
    tags: ['calm', 'meaning'],
  },
  {
    id: 'impact_integrity',
    label: 'Standing for integrity or honesty',
    tags: ['values', 'honesty_bravery'],
  },
];

// Q8 – Core values orientation
const VALUES_OPTIONS: ChoiceOption[] = [
  { id: 'value_honesty', label: 'Honesty', tags: ['honesty_bravery', 'values'] },
  { id: 'value_courage', label: 'Courage', tags: ['courage', 'values'] },
  { id: 'value_care', label: 'Care', tags: ['helping', 'relationships'] },
  { id: 'value_wisdom', label: 'Wisdom & insight', tags: ['meaning', 'new_thinking'] },
  { id: 'value_discipline', label: 'Discipline', tags: ['discipline', 'consistency'] },
  { id: 'value_curiosity', label: 'Curiosity', tags: ['curiosity', 'exploration'] },
  {
    id: 'value_stewardship',
    label: 'Stewardship & responsibility',
    tags: ['making_meaningful', 'values'],
  },
  { id: 'value_simplicity', label: 'Simplicity', tags: ['calm', 'values'] },
];

// Q9 – Life philosophy / approach
const PHILOSOPHY_OPTIONS: ChoiceOption[] = [
  {
    id: 'philosophy_clarity_intention',
    label: 'With clarity and intention',
    tags: ['meaning', 'focus'],
  },
  {
    id: 'philosophy_creativity_experimentation',
    label: 'With creativity and experimentation',
    tags: ['creative', 'imagination'],
  },
  {
    id: 'philosophy_calm_steadiness',
    label: 'With calm and steadiness',
    tags: ['calm', 'consistency'],
  },
  {
    id: 'philosophy_passion_boldness',
    label: 'With passion and boldness',
    tags: ['intensity', 'courage'],
  },
  {
    id: 'philosophy_humility_learning',
    label: 'With humility and learning',
    tags: ['curiosity', 'new_thinking'],
  },
  {
    id: 'philosophy_integrity_long_term',
    label: 'With integrity and long-term thinking',
    tags: ['values', 'making_meaningful'],
  },
  {
    id: 'philosophy_service_generosity',
    label: 'With service and generosity',
    tags: ['helping', 'friend_support'],
  },
];

// Q10 – Vocational / creative orientation
const VOCATION_OPTIONS: ChoiceOption[] = [
  {
    id: 'voc_making_building',
    label: 'Making or building things',
    tags: ['making', 'creative', 'strength'],
  },
  {
    id: 'voc_designing_simple',
    label: 'Designing simple, elegant solutions',
    tags: ['problem_solving', 'discipline'],
  },
  {
    id: 'voc_leading',
    label: 'Leading or organizing people',
    tags: ['leadership', 'relationships'],
  },
  {
    id: 'voc_exploring_ideas',
    label: 'Exploring ideas or research',
    tags: ['exploration', 'curiosity', 'new_thinking'],
  },
  {
    id: 'voc_creating_art',
    label: 'Creating art, experiences, or stories',
    tags: ['creative', 'expression', 'imagination'],
  },
  {
    id: 'voc_solving_complex',
    label: 'Solving complex problems',
    tags: ['problem_solving', 'mastery'],
  },
  {
    id: 'voc_helping_teaching',
    label: 'Helping or teaching others',
    tags: ['helping', 'friend_support'],
  },
  {
    id: 'voc_starting_ventures',
    label: 'Starting ventures or initiatives',
    tags: ['starting', 'making', 'values'],
  },
];

const TWEAK_OPTIONS: ChoiceOption[] = [
  { id: 'more_calm', label: 'More calm / steady' },
  { id: 'more_energy', label: 'More energy / boldness' },
  { id: 'more_relationships', label: 'More about relationships' },
  { id: 'more_mastery', label: 'More about skill & mastery' },
  { id: 'simpler_language', label: 'Simpler language' },
];

type Phase =
  | 'domain'
  | 'motivation'
  | 'trait'
  | 'growth'
  | 'proudMoment'
  | 'meaning'
  | 'impact'
  | 'values'
  | 'philosophy'
  | 'vocation'
  | 'dreams'
  | 'generating'
  | 'reveal'
  | 'tweak';

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
  const setLastOnboardingArcId = useAppStore((state) => state.setLastOnboardingArcId);

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
  const [meaningIds, setMeaningIds] = useState<string[]>([]);
  const [impactIds, setImpactIds] = useState<string[]>([]);
  const [valueIds, setValueIds] = useState<string[]>([]);
  const [philosophyIds, setPhilosophyIds] = useState<string[]>([]);
  const [vocationIds, setVocationIds] = useState<string[]>([]);
  const [nickname, setNickname] = useState('');

  const [aspiration, setAspiration] = useState<AspirationPayload | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identitySignature, setIdentitySignature] = useState<Record<IdentityTag, number>>(
    {} as Record<IdentityTag, number>
  );
  const [showResearchExplainer, setShowResearchExplainer] = useState(false);
  const [openQuestionInfoKey, setOpenQuestionInfoKey] = useState<string | null>(null);
  const [personalDreams, setPersonalDreams] = useState<string[]>([]);
  const [dreamInput, setDreamInput] = useState('');

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
  const meaning = formatSelectionLabels(meaningIds, MEANING_OPTIONS);
  const impact = formatSelectionLabels(impactIds, IMPACT_OPTIONS);
  const valueOrientation = formatSelectionLabels(valueIds, VALUES_OPTIONS);
  const philosophy = formatSelectionLabels(philosophyIds, PHILOSOPHY_OPTIONS);
  const vocation = formatSelectionLabels(vocationIds, VOCATION_OPTIONS);

  const canGenerate =
    domainIds.length > 0 &&
    motivationIds.length > 0 &&
    signatureTraitIds.length > 0 &&
    growthEdgeIds.length > 0 &&
    proudMomentIds.length > 0 &&
    meaningIds.length > 0 &&
    impactIds.length > 0 &&
    valueIds.length > 0 &&
    philosophyIds.length > 0 &&
    vocationIds.length > 0;

  const advancePhase = (next: Phase) => {
    setPhase(next);
  };

  const toggleQuestionInfo = (key: string) => {
    setOpenQuestionInfoKey((current) => (current === key ? null : key));
  };

  const buildNextSmallStep = (): string => {
    let nextSmallStep = 'Your next small step: Practice what matters for just 5 minutes.';
    if (proudMomentIds.includes('improving_a_skill')) {
      nextSmallStep =
        'Your next small step: Set a 10-minute timer to practice one small piece of something you care about.';
    } else if (
      proudMomentIds.includes('helping_someone') ||
      proudMomentIds.includes('supporting_a_friend')
    ) {
      nextSmallStep =
        'Your next small step: Reach out to one person today and offer one simple, concrete help.';
    } else if (proudMomentIds.includes('making_something_meaningful')) {
      nextSmallStep =
        'Your next small step: Make a tiny version of something you care about—no pressure to finish it.';
    } else if (proudMomentIds.includes('showing_up_when_hard')) {
      nextSmallStep =
        'Your next small step: Pick one small way to show up today, even if your energy is low.';
    }
    return nextSmallStep;
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
        nextSmallStep?: string | null;
      };

      if (!parsed.arcName || !parsed.aspirationSentence) {
        return null;
      }

      const nextSmallStep = parsed.nextSmallStep && parsed.nextSmallStep.trim().length > 0
        ? parsed.nextSmallStep
        : buildNextSmallStep();

      return {
        arcName: parsed.arcName,
        aspirationSentence: parsed.aspirationSentence,
        nextSmallStep,
      };
    } catch {
      return null;
    }
  };

  const buildLocalAspirationFallback = (): AspirationPayload | null => {
    if (
      !domain ||
      !motivation ||
      !signatureTrait ||
      !growthEdge ||
      !proudMoment ||
      !meaning ||
      !impact ||
      !valueOrientation ||
      !philosophy ||
      !vocation
    ) {
      return null;
    }

    const domainLabel = domain || 'a part of your life that matters';
    const motivationLabel = motivation || 'a kind of drive that fits you';
    const traitLabel = signatureTrait || 'a strength that already feels like you';
    const growthEdgeLabel = growthEdge || 'a real challenge you are working on';
    const proudMomentLabel = proudMoment || 'a small way you show up on ordinary days';
    const meaningLabel = meaning || 'a source of meaning that feels true for you';
    const impactLabel = impact || 'a way you want your life to touch others';
    const valueLabel = valueOrientation || 'a core value';
    const philosophyLabel = philosophy || 'a way of moving through life';
    const vocationLabel = vocation || 'a kind of work that feels like home';
    const dreamsLabel =
      personalDreams.length > 0
        ? personalDreams.join('; ')
        : 'one or two concrete things you’d love to bring to life someday';

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
      `You’re the kind of person who is growing in **${domainLabel.toLowerCase()}**, powered by ${motivationLabel.toLowerCase()}.`,
      `Your ${traitLabel.toLowerCase()} is already a real strength, and this next chapter keeps building on it while you face ${growthEdgeLabel.toLowerCase()} with honesty.`,
      `Underneath it all is ${meaningLabel.toLowerCase()}, a desire to ${impactLabel.toLowerCase()}, and a commitment to ${valueLabel.toLowerCase()} lived ${philosophyLabel.toLowerCase()}.`,
      `On normal days, that often looks like ${proudMomentLabel.toLowerCase()} in the way you approach ${vocationLabel.toLowerCase()}.`,
      personalDreams.length > 0
        ? `Along the way, you’re drawn to big things like ${dreamsLabel.toLowerCase()}, which give this Arc a tangible shape in your life.`
        : '',
    ].join(' ');

    const nextSmallStep = buildNextSmallStep();

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

  const scoreAspirationQuality = useCallback(
    async (candidate: AspirationPayload): Promise<number | null> => {
      // Ask the onboarding agent to act as a lightweight judge for the
      // synthesized Identity Arc so we can avoid showing very weak drafts.
      const judgePrompt = [
        'You are evaluating the quality of an Identity Arc generated for a user.',
        '',
        'Rate it on a 0–2 scale for each dimension:',
        '1) specificity – how clearly it reflects this particular user rather than anyone.',
        '2) coherence – how well the sentences hang together around one clear identity thread.',
        '3) depth – whether it includes values, meaning, or worldview (not just traits).',
        '4) voice – whether the tone fits a thoughtful, identity-focused app (not corporate or therapy-like).',
        '5) constraint_adherence – whether it follows the requested structure and avoids advice, steps, or “you should” language.',
        '',
        'Return JSON only in this shape (no extra commentary, no markdown):',
        '{',
        '  "scores": {',
        '    "specificity": 0,',
        '    "coherence": 0,',
        '    "depth": 0,',
        '    "voice": 0,',
        '    "constraint_adherence": 0',
        '  },',
        '  "total_score": 0,',
        '  "regenerate_recommended": false,',
        '  "notes": "one or two short sentences of feedback"',
        '}',
        '',
        'User identity signals (high-level):',
        `- domain of becoming: ${domain || 'unknown'}`,
        `- motivational style: ${motivation || 'unknown'}`,
        `- signature trait: ${signatureTrait || 'unknown'}`,
        `- growth edge: ${growthEdge || 'unknown'}`,
        `- everyday proud moment: ${proudMoment || 'unknown'}`,
        `- source of meaning: ${meaning || 'unknown'}`,
        `- desired impact: ${impact || 'unknown'}`,
        `- core values: ${valueOrientation || 'unknown'}`,
        `- life philosophy: ${philosophy || 'unknown'}`,
        `- vocational orientation: ${vocation || 'unknown'}`,
        `- concrete big things they’d love to bring to life: ${
          personalDreams.length > 0 ? personalDreams.join('; ') : 'none named'
        }`,
        '',
        `Candidate Arc name: ${candidate.arcName}`,
        `Candidate Arc narrative: ${candidate.aspirationSentence}`,
      ].join('\n');

      const messages: CoachChatTurn[] = [
        {
          role: 'user',
          content: judgePrompt,
        },
      ];

      const options: CoachChatOptions = {
        mode: 'firstTimeOnboarding',
        workflowDefinitionId: workflowRuntime?.definition?.id,
        workflowInstanceId: workflowRuntime?.instance?.id,
        workflowStepId: 'aspiration_quality_check',
      };

      try {
        const reply = await sendCoachChat(messages, options);
        const startIdx = reply.indexOf('{');
        const endIdx = reply.lastIndexOf('}');
        const jsonText =
          startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
            ? reply.slice(startIdx, endIdx + 1)
            : reply;

        const parsed = JSON.parse(jsonText) as {
          total_score?: number;
          totalScore?: number;
        };

        const total =
          typeof parsed.total_score === 'number'
            ? parsed.total_score
            : typeof parsed.totalScore === 'number'
            ? parsed.totalScore
            : null;

        if (total == null || Number.isNaN(total)) {
          return null;
        }

        return total;
      } catch (err) {
        console.warn('[onboarding] Failed to score identity Arc quality', err);
        return null;
      }
    },
    [
      domain,
      motivation,
      signatureTrait,
      growthEdge,
      proudMoment,
      meaning,
      impact,
      valueOrientation,
      philosophy,
      vocation,
      personalDreams,
      workflowRuntime,
    ]
  );

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
        `source of meaning: ${meaning}`,
        `desired impact: ${impact}`,
        `core values: ${valueOrientation}`,
        `life philosophy: ${philosophy}`,
        `vocational orientation: ${vocation}`,
      ];
      if (personalDreams.length > 0) {
        inputsSummaryLines.push(
          `concrete big things the user would love to bring to life (treat these as high-priority identity imagery, not task lists): ${personalDreams.join(
            '; '
          )}`
        );
      }
      if (nickname.trim()) {
        inputsSummaryLines.push(
          `typed nickname (treat this as a high-priority anchor for the Arc Name and description): ${nickname.trim()}`
        );
      }
      if (tweakHint) {
        inputsSummaryLines.push(`user tweak preference: ${tweakHint}`);
      }

      const inputsSummary = inputsSummaryLines.join('\n- ');

      const prompt = [
        '🌟 KWILT DEEP ARC GENERATION — SYSTEM PROMPT',
        '',
        'You are generating a deep Identity Arc for a user based on their answers to a short tap-only onboarding quiz.',
        '',
        'An Identity Arc is:',
        '- a vivid, inspiring description of the user’s future self,',
        '- grounded in identity, values, meaning, and creative/vocational orientation,',
        '- written in 3–5 beautifully crafted sentences,',
        '- emotionally resonant, metaphorically rich, and specific,',
        '- powerful enough that the user feels seen and understood.',
        '',
        'Hard rules:',
        '- Do NOT use “You’re becoming…” or “You’re growing into…”.',
        '- Do NOT use first person (“I”).',
        '- Do NOT give steps, advice, or growth edges.',
        '- Do NOT list traits or sound like a résumé.',
        '- Do NOT mention questions, options, or how the Arc was constructed.',
        '- Do NOT use therapy language or corporate tone.',
        '',
        'Structure:',
        '1) Arc Name: "The {Identity Noun}"',
        '   - Identity noun should reflect their orientation (Maker, Explorer, Builder, Visionary, etc.), philosophy, values, and vocation/creation style.',
        '   - Never use a bare generic noun (like just "Leader" or "Helper") without a modifier.',
        '   - If a nickname input is provided, treat it as a high-priority inspiration for the Arc name unless clearly unsafe.',
        '',
        '2) Description (3–5 sentences):',
        '- Start with identity-claiming language such as "You’re the kind of person who...", "You bring...", or "You move through the world with...".',
        '- Include their philosophy or worldview (clarity, service, integrity, simplicity, etc.).',
        '- Include the impact or meaning they hope to create for others.',
        '- Include how they tend to express their strengths in everyday life.',
        '- End with an emotionally satisfying line that sums up the identity, not an instruction.',
        '',
        'Additionally, generate a single tiny next step that helps them live this Arc in a low-pressure way.',
        '',
        'Your task now:',
        '- Using the inputs below, generate an Identity Arc that follows all of the rules above.',
        '- Do not talk about the inputs directly; only express the underlying identity.',
        '',
        'Output format (JSON only, no backticks, no extra commentary):',
        '{',
        '  "arcName": string,',
        '  "aspirationSentence": string, // 3–5 sentences',
        '  "nextSmallStep": string      // one sentence starting with "Your next small step: "',
        '}',
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
          // Run a lightweight quality check and only use clearly weak scores
          // to trigger a local fallback so users never see obviously "junk"
          // Arcs from the FTUE.
          const qualityScore = await scoreAspirationQuality(parsed);

          if (qualityScore != null && qualityScore < 8) {
            console.warn(
              '[onboarding] Identity Arc quality below threshold, using local fallback instead',
              { qualityScore }
            );
            const fallback = buildLocalAspirationFallback();
            if (fallback) {
              setAspiration(fallback);
              if (workflowRuntime) {
                workflowRuntime.completeStep('aspiration_generate', {
                  arcName: fallback.arcName,
                  arcNarrative: fallback.aspirationSentence,
                  nextSmallStep: fallback.nextSmallStep,
                });
              }
              setPhase('reveal');
              return;
            }
          }

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
    [
      canGenerate,
      domain,
      motivation,
      signatureTrait,
      growthEdge,
      proudMoment,
      meaning,
      impact,
      valueOrientation,
      philosophy,
      vocation,
      nickname,
      workflowRuntime,
      scoreAspirationQuality,
    ]
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
    setLastOnboardingArcId(arc.id);
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
      'Hello 👋 and welcome to **kwilt** — I’m here to help you design a future you’d actually be proud to live in, then make it feel doable with clear goals and daily activities.',
      // Message 2 (introduce Arcs, lightly hint at Goals + Activities)
      'We’ll start by sketching a short **identity Arc** that captures the kind of **person you want to become**.\n\nThen kwilt can use that Arc to shape better **Goals** and small everyday **Activities**, so your effort lines up with a purpose that feels real to you.',
      // Message 3 (light research grounding)
      'Under the hood I’m borrowing from **research-backed psychology**, so the plan we build actually **fits you**—not someone else’s idea of who you should be.',
      // Message 4 (lead-in to the two-part flow: taps + one short free-response step)
      'To do that well, we’ll go in **two quick parts**: first a personality‑quiz‑style set of **about 10 quick, tap-only questions**, then one short follow-up where you can name a big thing you’d love to bring to life in your own words. All together it should still only take a few minutes, and it helps me surface a future version of you you’d genuinely want to grow into.',
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
      { id: 'love_that', label: '🧠 Sounds smart!' },
      { id: 'just_work', label: 'Tell me about the research 🤓' },
    ],
  ];

  const handleIntroResponse = (label: string) => {
    const controller = chatControllerRef?.current;
    if (controller) {
      controller.appendUserMessage(label);
    }

    const normalized = label.toLowerCase();
    const isResearchQuestion =
      normalized.includes('research') && !normalized.includes('sounds smart');
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

  const handleConfirmDomain = (selectedDomain: string, displayLabel?: string) => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('vibe_select', { domain: selectedDomain });
    }
    appendChatUserMessage(displayLabel ?? selectedDomain);
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
    advancePhase('meaning');
  };

  const handleConfirmMeaning = (selectedMeaning: string) => {
    appendChatUserMessage(selectedMeaning);
    setError(null);
    advancePhase('impact');
  };

  const handleConfirmImpact = (selectedImpact: string) => {
    appendChatUserMessage(selectedImpact);
    setError(null);
    advancePhase('values');
  };

  const handleConfirmValues = (selectedValue: string) => {
    appendChatUserMessage(selectedValue);
    setError(null);
    advancePhase('philosophy');
  };

  const handleConfirmPhilosophy = (selectedPhilosophy: string) => {
    appendChatUserMessage(selectedPhilosophy);
    setError(null);
    advancePhase('vocation');
  };

  const handleConfirmVocation = (selectedVocation: string) => {
    appendChatUserMessage(selectedVocation);
    setError(null);
    setError(null);
    setPhase('dreams');
  };

  const renderDomain = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            Which part of yourself are you most excited to grow right now?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('domain')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.fullWidthList}>
            {DOMAIN_OPTIONS.map((option) => {
              const selected = domainIds.includes(option.id);
              const labelWithEmoji = option.emoji ? `${option.emoji} ${option.label}` : option.label;
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
                    handleConfirmDomain(option.label, labelWithEmoji);
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
      <Dialog
        visible={openQuestionInfoKey === 'domain'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This first choice helps me understand which part of you most wants to grow so I can anchor your Identity Arc there."
      >
        <Text style={styles.bodyText}>
          The options are based on research in motivation and values. Each one is a different growth
          lane—creativity, craft, leadership, relationships, contribution, courage, habits, adventure,
          or inner life—so your choice gives a strong signal about which future self to focus your Arc
          around.
        </Text>
      </Dialog>
    </>
  );

  const renderMotivation = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            Thinking about that future version of you, what do you think would motivate them the most
            here?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('motivation')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.fullWidthList}>
            {getAdaptiveOptions(MOTIVATION_OPTIONS, 5).map((option) => {
              const selected = motivationIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
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
      <Dialog
        visible={openQuestionInfoKey === 'motivation'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question looks past today’s mood and focuses on what really fuels that future version of you in this area."
      >
        <Text style={styles.bodyText}>
          Motivation science—especially work on intrinsic motivation and Self‑Determination Theory
          (Deci & Ryan)—shows people stick with change longer when their goals match their deeper
          drives, like caring for others, mastering hard things, or bringing new ideas into the world.
          Your choice here is a quick way of capturing those drives so your Identity Arc reflects why
          you do things, not just what you do.
        </Text>
      </Dialog>
    </>
  );

  const renderTrait = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            Future-you will still be you—just more grown up and confident. For that future version of
            you, which of these strengths would you most want them to have?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('trait')}
            >
              ⓘ
            </Text>
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
      <Dialog
        visible={openQuestionInfoKey === 'trait'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question captures the 'flavor' of Future You—the trait you most want to lean into."
      >
        <Text style={styles.bodyText}>
          Positive psychology and identity research—from work on character strengths (Peterson &amp;
          Seligman’s VIA) to strengths-based coaching tools like CliftonStrengths—shows people change
          more sustainably when growth builds on real strengths instead of fighting their nature.
          Picking a signature strength here gives me a concrete, research-backed trait to anchor in
          your Identity Arc, so it sounds like you at your best, not a totally different person.
        </Text>
      </Dialog>
    </>
  );

  const renderGrowth = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            Every good story has a challenge. Which of these challenges feels most real for you right
            now?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('growth')}
            >
              ⓘ
            </Text>
          </Text>
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
      <Dialog
        visible={openQuestionInfoKey === 'growth'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question surfaces the real tension in your story right now."
      >
        <Text style={styles.bodyText}>
          Narrative identity research (McAdams and others) shows that how we frame our challenges
          shapes the story we tell about who we are. Naming one core growth edge lets your Identity Arc
          acknowledge reality without turning into a list of problems or advice, so the future you
          imagine still feels believable.
        </Text>
      </Dialog>
    </>
  );

  const renderProudMoment = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            On a normal day in that future—not a big moment—what could you do that would make you feel
            quietly proud of yourself?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('proud')}
            >
              ⓘ
            </Text>
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
      <Dialog
        visible={openQuestionInfoKey === 'proud'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question turns your future identity into something you can picture on an ordinary day."
      >
        <Text style={styles.bodyText}>
          Research on habits and identity—from implementation intentions to tiny‑habits work
          (Gollwitzer, Fogg, and others)—suggests that small, repeatable actions do more to change who
          we are than occasional big wins. That includes things like caring for your body and energy,
          following through on a small promise, or quietly helping someone. Choosing a 'quietly proud'
          moment helps your Identity Arc translate into daily behavior, not just an inspiring headline.
        </Text>
      </Dialog>
    </>
  );

  const renderMeaning = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            When you imagine your future, what makes life feel truly meaningful to you?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('meaning')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.fullWidthList}>
            {MEANING_OPTIONS.map((option) => {
              const selected = meaningIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  onPress={() => {
                    const previousSelected = MEANING_OPTIONS.filter((o) =>
                      meaningIds.includes(o.id)
                    );
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setMeaningIds([option.id]);
                    handleConfirmMeaning(option.label);
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
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
      <Dialog
        visible={openQuestionInfoKey === 'meaning'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question asks where your sense of meaning really comes from."
      >
        <Text style={styles.bodyText}>
          Work on meaning and narrative identity (Frankl, McAdams, and contemporary meaning-in-life
          research) shows people stay committed to change when it connects to what feels deeply
          worthwhile—whether that’s relationships, craft, service, or living out your faith and core
          values. Your answer here helps the Identity Arc include a 'why' behind your growth, not just
          traits and goals.
        </Text>
      </Dialog>
    </>
  );

  const renderImpact = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            How do you hope your life will impact other people?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('impact')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.chipGrid}>
            {IMPACT_OPTIONS.map((option) => {
              const selected = impactIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    const previousSelected = IMPACT_OPTIONS.filter((o) => impactIds.includes(o.id));
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setImpactIds([option.id]);
                    handleConfirmImpact(option.label);
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
      <Dialog
        visible={openQuestionInfoKey === 'impact'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question brings in the 'for others' side of your identity."
      >
        <Text style={styles.bodyText}>
          Purpose research (e.g., Damon and colleagues) finds that many people experience their
          strongest sense of direction in how they affect others—through support, creativity, or
          solving real problems. Naming your hoped-for impact helps the Identity Arc capture not just
          who you are, but what you’re trying to offer to the people around you.
        </Text>
      </Dialog>
    </>
  );

  const renderValues = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            Which value feels most core to who you want to be?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('values')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.chipGrid}>
            {VALUES_OPTIONS.map((option) => {
              const selected = valueIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    const previousSelected = VALUES_OPTIONS.filter((o) => valueIds.includes(o.id));
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setValueIds([option.id]);
                    handleConfirmValues(option.label);
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
      <Dialog
        visible={openQuestionInfoKey === 'values'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question anchors your future identity in one clear value."
      >
        <Text style={styles.bodyText}>
          Values act like a compass—research on self-concordant goals and values clarification
          (Sheldon, Kasser, and others) shows people are more persistent and satisfied when their
          actions line up with what they care about most. Choosing one value here gives your Identity
          Arc a strong through-line to organize around.
        </Text>
      </Dialog>
    </>
  );

  const renderPhilosophy = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            How do you want to move through life—what&apos;s the overall approach?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('philosophy')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.fullWidthList}>
            {PHILOSOPHY_OPTIONS.map((option) => {
              const selected = philosophyIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  onPress={() => {
                    const previousSelected = PHILOSOPHY_OPTIONS.filter((o) =>
                      philosophyIds.includes(o.id)
                    );
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setPhilosophyIds([option.id]);
                    handleConfirmPhilosophy(option.label);
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
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
      <Dialog
        visible={openQuestionInfoKey === 'philosophy'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question captures the way you want to move through the world, not just what you do."
      >
        <Text style={styles.bodyText}>
          Research on mindsets and worldviews (Dweck’s mindset work, meaning-making, and narrative
          identity) shows that the lens you use to interpret life affects how you respond to setbacks
          and make choices. Including this in your Identity Arc lets it speak to your worldview and
          tone, not only your goals.
        </Text>
      </Dialog>
    </>
  );

  const renderVocation = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionTitle}>
            And which kind of work or creation feels closest to Future You?{' '}
            <Text
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('vocation')}
            >
              ⓘ
            </Text>
          </Text>
          <View style={styles.fullWidthList}>
            {VOCATION_OPTIONS.map((option) => {
              const selected = vocationIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  onPress={() => {
                    const previousSelected = VOCATION_OPTIONS.filter((o) =>
                      vocationIds.includes(o.id)
                    );
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setVocationIds([option.id]);
                    handleConfirmVocation(option.label);
                  }}
                >
                  <Text
                    style={[
                      styles.fullWidthOptionLabel,
                      selected && styles.fullWidthOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>
      <Dialog
        visible={openQuestionInfoKey === 'vocation'}
        onClose={() => setOpenQuestionInfoKey(null)}
        title="Why this question matters"
        description="This question gives your Arc a concrete creative or vocational arena."
      >
        <Text style={styles.bodyText}>
          Possible-selves research (Markus &amp; Nurius and later work) suggests people engage more
          when they can picture the kinds of work or creation their future identity might live inside.
          Choosing a lane here helps the Identity Arc hint at where your gifts might show up—in
          ventures, craft, teaching, ideas, or something else.
        </Text>
      </Dialog>
    </>
  );

  const startGeneratingFromDreams = () => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('nickname_optional', { nickname: null });
    }
    setPhase('generating');
    void generateAspiration();
  };

  const renderDreams = () => {
    const hasAnyDreams = personalDreams.length > 0;
    const maxDreamsReached = personalDreams.length >= 3;

    return (
      <Card style={styles.stepCard}>
        <View style={styles.stepBody}>
          <Text style={styles.bodyText}>
            {hasAnyDreams
              ? 'You’ve already named at least one big thing you’d love to bring to life. Want to add another, or head straight to your Identity Arc?'
              : 'Part 2 of 2: Let’s name one big thing you’d love to bring to life so your Identity Arc can include something concrete and personal.'}
          </Text>
          {!hasAnyDreams ? (
            <Text style={styles.bodyText}>
              If you could fast-forward 5–10 years and feel deeply proud, what’s one big thing you’d
              love to have brought to life? It could be rewilding land, building a small home,
              restoring something old, starting a retreat, recording an album—whatever actually tugs at
              you.
            </Text>
          ) : null}
          {hasAnyDreams ? (
            <View style={styles.dreamList}>
              {personalDreams.map((dream, index) => (
                <Text key={index} style={styles.dreamListItem}>
                  • {dream}
                </Text>
              ))}
            </View>
          ) : null}
          {!maxDreamsReached ? (
            <Input
              value={dreamInput}
              onChangeText={setDreamInput}
              placeholder={
                hasAnyDreams
                  ? 'Add one more big thing (optional)'
                  : 'e.g., Rewild our back acreage into a native meadow; restore a 1970s 911; build a small timber-frame home.'
              }
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={() => {
                const trimmed = dreamInput.trim();
                if (!trimmed) return;
                setPersonalDreams((prev) => [...prev, trimmed]);
                setDreamInput('');
              }}
            />
          ) : null}
          <View style={styles.inlineActions}>
            {!hasAnyDreams ? (
              <>
                <Button
                  variant="accent"
                  style={styles.primaryButton}
                  disabled={!dreamInput.trim()}
                  onPress={() => {
                    const trimmed = dreamInput.trim();
                    if (!trimmed) return;
                    setPersonalDreams([trimmed]);
                    setDreamInput('');
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>Use this big thing</Text>
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    setPersonalDreams([]);
                    setDreamInput('');
                    startGeneratingFromDreams();
                  }}
                >
                  <Text style={styles.linkLabel}>I’m not sure yet</Text>
                </Button>
              </>
            ) : (
              <>
                {!maxDreamsReached ? (
                  <Button
                    variant="accent"
                    style={styles.primaryButton}
                    disabled={!dreamInput.trim()}
                    onPress={() => {
                      const trimmed = dreamInput.trim();
                      if (!trimmed) return;
                      setPersonalDreams((prev) => [...prev, trimmed]);
                      setDreamInput('');
                      if (personalDreams.length + 1 >= 3) {
                        startGeneratingFromDreams();
                      }
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>Add this big thing</Text>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  onPress={() => {
                    startGeneratingFromDreams();
                  }}
                >
                  <Text style={styles.linkLabel}>That’s enough for now</Text>
                </Button>
              </>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderGenerating = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepBody}>
        <Text style={styles.bodyText}>
          I’m weaving everything you tapped into a single Identity Arc and one tiny next step.
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={styles.bodyText}>Give me a moment to pull the threads together…</Text>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </Card>
  );

  const renderArcPreview = () => {
    if (!aspiration) return null;

    const nowIso = new Date().toISOString();
    const previewArc: Arc = {
      id: 'arc-onboarding-preview',
      name: aspiration.arcName,
      narrative: aspiration.aspirationSentence,
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return <ArcListCard arc={previewArc} narrativeTone="strong" showFullNarrative />;
  };

  const renderReveal = () => {
    if (!aspiration) return null;

    return (
      <>
        <View style={styles.revealIntroText}>
          <Text style={styles.bodyText}>
            Based on what you tapped, here’s a draft Arc that fits what you picked. You can rename
            this Arc or edit the description later from your Arcs list.
          </Text>
        </View>
        <View style={styles.arcPreviewContainer}>{renderArcPreview()}</View>
        <Card style={[styles.stepCard, styles.revealStepCard]}>
          <View style={styles.stepBody}>
            <View style={[styles.inlineActions, styles.revealInlineActions]}>
              <Button
                variant="accent"
                style={styles.primaryButton}
                onPress={handleConfirmAspiration}
              >
                <Text style={styles.primaryButtonLabel}>🤩 Yes! I'd love to become like this</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setPhase('tweak');
                }}
              >
                <Text style={styles.linkLabel}>Close but tweak it</Text>
              </Button>
            </View>
          </View>
        </Card>
      </>
    );
  };

  const renderTweak = () => (
    <>
      <View style={styles.arcPreviewContainer}>{renderArcPreview()}</View>
      <Card style={styles.stepCard}>
        <View style={styles.stepBody}>
          <Text style={styles.bodyText}>
            What should this lean more toward? Pick one option below and I’ll quietly adjust the
            wording to fit you better.
          </Text>
          <View style={styles.chipGrid}>
            {TWEAK_OPTIONS.map((option) => {
              return (
                <Pressable
                  key={option.id}
                  style={styles.chip}
                  onPress={() => {
                    setPhase('generating');
                    void generateAspiration(option.id);
                  }}
                >
                  <Text style={styles.chipLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>
    </>
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

  if (phase === 'meaning') {
    return renderMeaning();
  }

  if (phase === 'impact') {
    return renderImpact();
  }

  if (phase === 'values') {
    return renderValues();
  }

  if (phase === 'philosophy') {
    return renderPhilosophy();
  }

  if (phase === 'vocation') {
    return renderVocation();
  }

  if (phase === 'dreams') {
    return renderDreams();
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
  questionInfoTrigger: {
    paddingLeft: spacing.xs,
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
  dreamList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dreamListItem: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
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
  revealIntroText: {
    marginBottom: spacing.lg,
  },
  arcPreviewContainer: {
    marginBottom: spacing.lg,
  },
  revealStepCard: {
    // Use the same white card surface and padding as other choice cards; no
    // custom background so it doesn't look like a separate gray panel.
    backgroundColor: colors.card,
  },
  revealInlineActions: {
    marginTop: spacing.md,
  },
});


