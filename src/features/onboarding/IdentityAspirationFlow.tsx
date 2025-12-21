import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View, Alert } from 'react-native';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Heading, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { ButtonLabel } from '../../ui/Typography';
import { Input } from '../../ui/Input';
import { CelebrationGif } from '../../ui/CelebrationGif';
import { Dialog } from '../../ui/Dialog';
import { QuestionCard } from '../../ui/QuestionCard';
import { colors, spacing, typography, fonts } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import { sendCoachChat, type CoachChatOptions, type CoachChatTurn } from '../../services/ai';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import type { Arc } from '../../domain/types';
import { canCreateArc } from '../../domain/limits';
import { buildHybridArcGuidelinesBlock } from '../../domain/arcHybridPrompt';
import type {
  ArchetypeAdmiredQualityId,
  ArchetypeRoleModelTypeId,
  ArchetypeRoleModelWhyId,
  ArchetypeSpecificRoleModelId,
} from '../../domain/archetypeTaps';
import {
  ARCHETYPE_ADMIRED_QUALITIES,
  ARCHETYPE_ROLE_MODEL_TYPES,
  ARCHETYPE_ROLE_MODEL_WHY,
  ARCHETYPE_SPECIFIC_ROLE_MODELS,
} from '../../domain/archetypeTaps';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import { ensureArcBannerPrefill } from '../arcs/arcBannerPrefill';
import type { AgentTimelineItem } from '../ai/agentRuntime';
import { ArcListCard } from '../../ui/ArcListCard';
import { openPaywallInterstitial } from '../../services/paywall';

type IdentityAspirationFlowMode = 'firstTimeOnboarding' | 'reuseIdentityForNewArc';

type IdentityAspirationFlowProps = {
  mode?: IdentityAspirationFlowMode;
  onComplete?: () => void;
  /**
   * Optional handle to the shared chat surface. This flow treats the
   * AiChatPane controller as its only link to the chat thread: it can append
   * synthetic user messages, stream assistant copy, and insert cards via the
   * AgentWorkspace `stepCard` slot, but it never mounts its own chat surface.
   *
   * In the long run, this same presenter pattern should be reused for Arc
   * creation from the Arcs list via an `arcCreation` workflow, instead of
   * mounting IdentityAspirationFlow directly inside a New Arc modal.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
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

// Optional – "Why now" / turning point for the identity Arc.
// Currently used in the Arc creation flow launched from the Arcs inventory
// (reuseIdentityForNewArc mode) so we can tune the narrative around the
// season the user is in without adding friction to the first-time FTUE.
const WHY_NOW_OPTIONS: ChoiceOption[] = [
  {
    id: 'excited_and_serious',
    label: "I’m excited about this and want to take it seriously.",
    tags: ['making_meaningful', 'mastery'],
  },
  {
    id: 'fits_future_me',
    label: "It fits who I’m trying to become.",
    tags: ['values', 'meaning'],
  },
  {
    id: 'keeps_returning',
    label: 'It keeps coming back to me.',
    tags: ['new_thinking', 'exploration'],
  },
  {
    id: 'change_for_good',
    label: 'It would really change things in a good way.',
    tags: ['making_meaningful'],
  },
  {
    id: 'bigger_than_me',
    label: 'It’s about more than just me.',
    tags: ['meaning', 'values', 'making_meaningful'],
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
  // NOTE: The original FTUE collected a richer 10-question identity snapshot.
  // The Hybrid-Minimal model intentionally uses a smaller set:
  //   Domain + Vibe + Proud moment + Big dream
  // …then optional Archetype taps to boost felt accuracy without typing.
  // We keep the legacy phases in the type for now to avoid a large delete diff,
  // but the first-time onboarding path no longer routes through them.
  | 'trait'
  | 'growth'
  | 'proudMoment'
  | 'nickname'
  | 'meaning'
  | 'whyNow'
  | 'impact'
  | 'values'
  | 'philosophy'
  | 'vocation'
  | 'dreams'
  // Hybrid archetype taps (optional, tap-centric)
  | 'roleModelType'
  | 'admiredQualities'
  | 'generating'
  | 'reveal'
  | 'tweak';

type ArcIdentitySlices = {
  identity: string;
  why: string;
  daily: string;
};

// Lightweight sentence splitter tailored for Arc narratives.
// Assumes three declarative sentences but degrades gracefully:
// - ignores decimal numbers like "2.0"
// - ignores common short abbreviations ("e.g.", "i.e.", "Dr.", "Mr.", "Ms.")
function splitAspirationNarrative(narrative?: string | null): ArcIdentitySlices | null {
  if (!narrative) return null;
  const text = narrative.trim();
  if (!text) return null;

  const abbreviations = new Set(['e.g.', 'i.e.', 'dr.', 'mr.', 'ms.']);
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const isTerminalPunctuation = ch === '.' || ch === '!' || ch === '?';
    if (!isTerminalPunctuation) continue;

    const prevChar = i > 0 ? text[i - 1] : '';
    const nextChar = i + 1 < text.length ? text[i + 1] : '';

    // Skip decimal numbers like "2.0"
    if (ch === '.' && /\d/.test(prevChar) && /\d/.test(nextChar)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const windowStart = Math.max(0, i - 4);
    const candidate = text.slice(windowStart, i + 1).toLowerCase();
    if (abbreviations.has(candidate)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Treat as sentence boundary only when followed by whitespace or end of string.
    if (nextChar && !/\s/.test(nextChar)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const rawSentence = text.slice(start, i + 1).trim();
    if (rawSentence.length > 0) {
      sentences.push(rawSentence);
    }
    start = i + 1;
    if (sentences.length === 3) break;
  }

  // Capture any trailing text after the last punctuation as part of the final sentence.
  if (sentences.length < 3 && start < text.length) {
    const tail = text.slice(start).trim();
    if (tail) {
      sentences.push(tail);
    }
  }

  if (sentences.length !== 3) {
    return null;
  }

  const [identity, why, daily] = sentences;
  return { identity, why, daily };
}

type AspirationPayload = {
  arcName: string;
  aspirationSentence: string;
  nextSmallStep: string;
};

type ArcDevelopmentInsights = {
  strengths: string[];
  growthEdges: string[];
  pitfalls: string[];
};

const BANNED_ARC_MUSH_PHRASES = [
  'in a grounded way',
  'rooted in',
  'powered by',
  'radiant',
  'tapestry',
  'essence',
  'unlock',
] as const;

const containsArcMushPhrases = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return BANNED_ARC_MUSH_PHRASES.some((phrase) => normalized.includes(phrase));
};

/**
 * Workflow presenter for the identity/Arc FTUE (and reuseIdentityForNewArc).
 *
 * This component owns the tap-first card experience and talks to the agent
 * runtime only through `WorkflowRuntimeContext` and the optional
 * `chatControllerRef`, so that all visible messages and cards still flow
 * through the shared AgentWorkspace + AiChatPane timeline.
 */
export function IdentityAspirationFlow({
  mode = 'firstTimeOnboarding',
  onComplete,
  chatControllerRef,
}: IdentityAspirationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();
  const addArc = useAppStore((state) => state.addArc);
  const setLastOnboardingArcId = useAppStore((state) => state.setLastOnboardingArcId);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const userProfile = useAppStore((state) => state.userProfile);

  const [phase, setPhase] = useState<Phase>(
    mode === 'reuseIdentityForNewArc' ? 'dreams' : 'domain',
  );
  const [introPlayed, setIntroPlayed] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [lastIntroStreamedIndex, setLastIntroStreamedIndex] = useState<number | null>(null);
  const [introActionsVisibleIndex, setIntroActionsVisibleIndex] = useState<number | null>(null);
  const introActionsOpacity = useRef(new Animated.Value(0)).current;
  const introActionsTranslateY = useRef(new Animated.Value(8)).current;
  const introActionsTranslateX = useRef(new Animated.Value(0)).current;
  // Track which intro index (if any) is currently streaming so we don't start
  // multiple overlapping streams of the same message when this effect re-runs.
  const introStreamingIndexRef = useRef<number | null>(null);
  const [hasStreamedDreamsIntroCopy, setHasStreamedDreamsIntroCopy] = useState(false);

  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [motivationIds, setMotivationIds] = useState<string[]>([]);
  const [signatureTraitIds, setSignatureTraitIds] = useState<string[]>([]);
  const [growthEdgeIds, setGrowthEdgeIds] = useState<string[]>([]);
  const [proudMomentIds, setProudMomentIds] = useState<string[]>([]);
  const [meaningIds, setMeaningIds] = useState<string[]>([]);
  const [whyNowIds, setWhyNowIds] = useState<string[]>([]);
  const [impactIds, setImpactIds] = useState<string[]>([]);
  const [valueIds, setValueIds] = useState<string[]>([]);
  const [philosophyIds, setPhilosophyIds] = useState<string[]>([]);
  const [vocationIds, setVocationIds] = useState<string[]>([]);
  // Hybrid (tap-centric archetype): optional signals to boost felt accuracy without typing.
  const [roleModelTypeId, setRoleModelTypeId] = useState<ArchetypeRoleModelTypeId | null>(null);
  const [specificRoleModelId, setSpecificRoleModelId] = useState<
    ArchetypeSpecificRoleModelId | 'none' | 'not_sure' | null
  >(null);
  const [roleModelWhyId, setRoleModelWhyId] = useState<ArchetypeRoleModelWhyId | null>(null);
  const [admiredQualityIds, setAdmiredQualityIds] = useState<ArchetypeAdmiredQualityId[]>([]);
  // Use a stable, per-session id for the draft Arc so that the preview card
  // and the eventually-created Arc share the same visual seed (gradient,
  // thumbnail variants, etc.).
  const [draftArcId] = useState(() => `arc-onboarding-${Date.now()}`);
  const [nickname, setNickname] = useState('');

  const [aspiration, setAspiration] = useState<AspirationPayload | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arcInsights, setArcInsights] = useState<ArcDevelopmentInsights | null>(null);

  const [identitySignature, setIdentitySignature] = useState<Record<IdentityTag, number>>(
    {} as Record<IdentityTag, number>
  );
  const [showResearchExplainer, setShowResearchExplainer] = useState(false);
  const [openQuestionInfoKey, setOpenQuestionInfoKey] = useState<string | null>(null);
  const [dreamInput, setDreamInput] = useState('');

  const callOnboardingAgentStep = useCallback(
    async (stepId: string, messages: CoachChatTurn[]): Promise<string> => {
      const options: CoachChatOptions = {
        mode: 'firstTimeOnboarding',
        workflowDefinitionId: workflowRuntime?.definition?.id,
        workflowInstanceId: workflowRuntime?.instance?.id,
        workflowStepId: stepId,
      };

      return sendCoachChat(messages, options);
    },
    [workflowRuntime]
  );

  const appendChatUserMessage = useCallback(
    (content: string) => {
      const controller = chatControllerRef?.current;
      if (!controller) return;
      controller.appendUserMessage(content);
    },
    [chatControllerRef]
  );

  /**
   * Build a compact snapshot of the visible onboarding conversation so far,
   * based on the shared Agent timeline. This gives the identity/aspiration
   * prompts a lightweight sense of how the thread has unfolded without
   * duplicating the structured identity signals we already send.
   */
  const buildConversationSnapshotFromTimeline = useCallback((): string | null => {
    const controller = chatControllerRef?.current;
    if (!controller || typeof controller.getTimeline !== 'function') {
      return null;
    }

    try {
      const timeline = controller.getTimeline() as AgentTimelineItem[];
      if (!timeline || timeline.length === 0) {
        return null;
      }

      const textItems = timeline.filter(
        (item) => item.kind === 'assistantMessage' || item.kind === 'userMessage'
      );

      if (textItems.length === 0) {
        return null;
      }

      const recent = textItems.slice(-4);
      const lines = recent
        .map((item) => {
          const speaker = item.kind === 'assistantMessage' ? 'assistant' : 'user';
          const rawContent = (item as AgentTimelineItem & { content?: unknown }).content;
          const content =
            typeof rawContent === 'string'
              ? rawContent.trim()
              : typeof (rawContent as { toString?: () => string })?.toString === 'function'
              ? String(rawContent).trim()
              : '';

          if (!content) {
            return null;
          }

          const truncated = content.length > 280 ? `${content.slice(0, 277)}…` : content;
          return `${speaker}: ${truncated}`;
        })
        .filter((line): line is string => Boolean(line));

      if (lines.length === 0) {
        return null;
      }

      return lines.join('\n');
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[onboarding] Failed to build conversation snapshot from agent timeline',
          err
        );
      }
      return null;
    }
  }, [chatControllerRef]);

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
  const whyNow = formatSelectionLabels(whyNowIds, WHY_NOW_OPTIONS);
  const impact = formatSelectionLabels(impactIds, IMPACT_OPTIONS);
  const valueOrientation = formatSelectionLabels(valueIds, VALUES_OPTIONS);
  const philosophy = formatSelectionLabels(philosophyIds, PHILOSOPHY_OPTIONS);
  const vocation = formatSelectionLabels(vocationIds, VOCATION_OPTIONS);
  const bigDreams =
    dreamInput.trim().length > 0 ? [dreamInput.trim()] : [];

  const canGenerate =
    domainIds.length > 0 &&
    motivationIds.length > 0 &&
    proudMomentIds.length > 0 &&
    // Minimal variant uses a single free-response big dream as the last required input.
    dreamInput.trim().length > 0;

  // When reusing identity context for a new Arc, hydrate the selection state
  // from the stored identityProfile so we can skip re-asking questions 1–10.
  const identityProfile = userProfile?.identityProfile;

  useEffect(() => {
    if (mode !== 'reuseIdentityForNewArc') return;
    if (!identityProfile) return;

    if (identityProfile.domainIds?.length) {
      setDomainIds(identityProfile.domainIds);
    }
    if (identityProfile.motivationIds?.length) {
      setMotivationIds(identityProfile.motivationIds);
    }
    if (identityProfile.signatureTraitIds?.length) {
      setSignatureTraitIds(identityProfile.signatureTraitIds);
    }
    if (identityProfile.growthEdgeIds?.length) {
      setGrowthEdgeIds(identityProfile.growthEdgeIds);
    }
    if (identityProfile.proudMomentIds?.length) {
      setProudMomentIds(identityProfile.proudMomentIds);
    }
    if (identityProfile.meaningIds?.length) {
      setMeaningIds(identityProfile.meaningIds);
    }
    if (identityProfile.impactIds?.length) {
      setImpactIds(identityProfile.impactIds);
    }
    if (identityProfile.valueIds?.length) {
      setValueIds(identityProfile.valueIds);
    }
    if (identityProfile.philosophyIds?.length) {
      setPhilosophyIds(identityProfile.philosophyIds);
    }
    if (identityProfile.vocationIds?.length) {
      setVocationIds(identityProfile.vocationIds);
    }
    if (identityProfile.nickname) {
      setNickname(identityProfile.nickname);
    }
    if (identityProfile.roleModelTypeId) {
      setRoleModelTypeId(identityProfile.roleModelTypeId);
    }
    if (identityProfile.specificRoleModelId) {
      setSpecificRoleModelId(identityProfile.specificRoleModelId);
    }
    if (identityProfile.roleModelWhyId) {
      setRoleModelWhyId(identityProfile.roleModelWhyId);
    }
    if (identityProfile.admiredQualityIds?.length) {
      setAdmiredQualityIds(identityProfile.admiredQualityIds);
    }

    // In the reuse flow we land directly on the big-dream question, then ask
    // a short "why does this feel important?" follow-up before generating.
    setPhase('dreams');
  }, [
    mode,
    identityProfile,
    setDomainIds,
    setMotivationIds,
    setSignatureTraitIds,
    setGrowthEdgeIds,
    setProudMomentIds,
    setMeaningIds,
    setImpactIds,
    setValueIds,
    setPhilosophyIds,
    setVocationIds,
    setRoleModelTypeId,
    setSpecificRoleModelId,
    setRoleModelWhyId,
    setAdmiredQualityIds,
  ]);

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

  // Sanitize Arc name to ensure it follows 1-3 word pattern
  const sanitizeArcName = (name: string): string => {
    if (!name) return 'Identity Growth';
    
    let cleaned = name.trim();
    
    // Remove common prefixes that violate the pattern
    cleaned = cleaned.replace(
      /^(toward|towards|becoming|i want to|i want|i['’]d love to|i['’]d like to|i would love to|i would like to|i['’]d|i can)\s+/i,
      ''
    );
    
    // Remove "I want" patterns that shouldn't be in the name
    cleaned = cleaned.replace(/\bi want\b/gi, '');
    cleaned = cleaned.replace(/\bi['’]d\b/gi, '');
    
    // Split into words and take first 1-3 meaningful words
    const words = cleaned.split(/\s+/).filter((word) => {
      const lower = word.toLowerCase();
      const hasLetter = /[\p{L}\p{N}]/u.test(lower);
      // Filter out common filler words and standalone symbols like "&"
      return (
        word.length > 0 &&
        hasLetter &&
        ![
          'to',
          'a',
          'an',
          'the',
          'and',
          'or',
          'but',
          'in',
          'on',
          'at',
          'for',
          'of',
          'with',
          'love',
          'like',
          'want',
          'would',
        ].includes(lower) &&
        !lower.match(/^(i|you|we|they|it)$/)
      );
    });
    
    // Take first 1-3 words, capitalize first letter of each
    const meaningfulWords = words.slice(0, 3);
    if (meaningfulWords.length === 0) {
      return 'Identity Growth';
    }
    
    return meaningfulWords
      .map((word) => {
        // Preserve internal capitalization for proper nouns (e.g., Kwilt) and acronyms.
        const hasInternalCaps = /[A-Z]/.test(word.slice(1));
        if (hasInternalCaps) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const parseAspirationFromReply = (reply: string): AspirationPayload | null => {
    // Primary path: strict JSON extraction.
    try {
      const startIdx = reply.indexOf('{');
      const endIdx = reply.lastIndexOf('}');
      const jsonText =
        startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
          ? reply.slice(startIdx, endIdx + 1)
          : reply;

      const parsed = JSON.parse(jsonText) as {
        name?: string;
        narrative?: string;
        arcName?: string; // Support legacy format
        aspirationSentence?: string; // Support legacy format
        nextSmallStep?: string | null;
      };

      // Support both new format (name/narrative) and legacy format (arcName/aspirationSentence)
      const arcName = parsed.name || parsed.arcName;
      const aspirationSentence = parsed.narrative || parsed.aspirationSentence;

      if (arcName && aspirationSentence) {
        const nextSmallStep =
          parsed.nextSmallStep && parsed.nextSmallStep.trim().length > 0
            ? parsed.nextSmallStep
            : buildNextSmallStep();

        return {
          arcName: sanitizeArcName(arcName),
          aspirationSentence,
          nextSmallStep,
        };
      }
      // Fall through to markdown-style parsing below when JSON is missing fields.
    } catch {
      // Swallow and try markdown-style parsing next.
    }

    // Fallback path: handle markdown-y responses like:
    // **Arc Name:** "The Empathetic Creator"
    // <paragraphs of narrative...>
    const nameMatch = reply.match(/\*\*Arc Name:\*\*\s*"?([^"\n]+)"?/i);
    if (!nameMatch) {
      return null;
    }

    const arcName = sanitizeArcName(nameMatch[1].trim());
    if (!arcName) {
      return null;
    }

    const afterTitle = reply.slice(nameMatch.index! + nameMatch[0].length).trim();
    if (!afterTitle) {
      return null;
    }

    const nextSmallStep = buildNextSmallStep();

    return {
      arcName,
      aspirationSentence: afterTitle,
      nextSmallStep,
    };
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
    const whyNowLabel = whyNow || '';
    const impactLabel = impact || 'a way you want your life to touch others';
    const valueLabel = valueOrientation || 'a core value';
    const philosophyLabel = philosophy || 'a way of moving through life';
    const vocationLabel = vocation || 'a kind of work that feels like home';
    const dreamRaw = bigDreams.length > 0 ? String(bigDreams[0] ?? '').trim() : '';
    const dreamHasKwilt = /\bkwilt\b/i.test(dreamRaw);

    // Generate Arc name using allowed patterns: primarily dream‑anchored, with
    // Domain+Posture / Value+Domain / Two‑noun frame as graceful fallbacks.
    // Must be 1‑3 words (emoji prefix allowed).
    const generateArcName = (): string => {
      // If nickname provided, use it (but ensure it's 1-3 words)
      if (nickname && nickname.trim()) {
        const words = nickname.trim().split(/\s+/);
        if (words.length <= 3) {
          return nickname.trim();
        }
        // If nickname is too long, use first 2-3 meaningful words
        return words.slice(0, 3).join(' ');
      }

      // Prefer stable identity-direction names, not the raw dream text.
      // Detect high-level domain signals from the dream + domain/vocation labels.
      const signalText = `${domainLabel} ${vocationLabel} ${dreamRaw}`.toLowerCase();
      const isVenture =
        /\b(venture|startup|entrepreneur|business|company|app|product|studio|initiative|launch)\b/.test(
          signalText
        );
      const isCreative =
        /\b(creative|design|write|music|album|art|maker|making|build|craft)\b/.test(signalText);
      const isRelational =
        /\b(relationship|friend|friends|community|partner|family|parent|kids|home)\b/.test(signalText);

      const inferredDomain = isVenture
        ? 'Venture'
        : isRelational
          ? 'Relational'
          : isCreative
            ? 'Creative'
            : 'Identity';

      const postureSignalText = `${motivationLabel} ${traitLabel} ${growthEdgeLabel} ${valueLabel} ${philosophyLabel}`.toLowerCase();
      const inferredPosture =
        /\b(discipline|disciplined|consistent|follow[- ]?through)\b/.test(postureSignalText)
          ? 'Discipline'
          : /\b(courage|brave|bold)\b/.test(postureSignalText)
            ? 'Courage'
            : 'Stewardship';

      return `${inferredDomain} ${inferredPosture}`;

      // If we can't get a clean identity phrase from the dream, fall back to
      // domain‑driven patterns.
      const domainWord = domainLabel.split(' ')[0]?.toLowerCase() ?? '';
      const traitWord = traitLabel.replace(/^Your\s+/i, '').split(' ')[0]?.toLowerCase() ?? '';
      const valueWord = valueLabel.split(' ')[0]?.toLowerCase() ?? '';

      // Try Domain + Posture pattern (e.g., "Venture Stewardship", "Creative Discipline")
      if (domainWord && traitWord && domainWord !== traitWord) {
        const capitalizedDomain = domainWord.charAt(0).toUpperCase() + domainWord.slice(1);
        const capitalizedTrait = traitWord.charAt(0).toUpperCase() + traitWord.slice(1);
        return `${capitalizedDomain} ${capitalizedTrait}`;
      }

      // Try Value + Domain pattern (e.g., "Honest Entrepreneurship")
      if (valueWord && domainWord && valueWord !== domainWord) {
        const capitalizedValue = valueWord.charAt(0).toUpperCase() + valueWord.slice(1);
        const capitalizedDomain = domainWord.charAt(0).toUpperCase() + domainWord.slice(1);
        return `${capitalizedValue} ${capitalizedDomain}`;
      }

      // Try Two-noun frame (e.g., "Craft & Contribution")
      if (domainWord && vocationLabel) {
        const vocationWord = vocationLabel.split(' ')[0]?.toLowerCase() ?? '';
        if (vocationWord && domainWord !== vocationWord) {
          const capitalizedDomain = domainWord.charAt(0).toUpperCase() + domainWord.slice(1);
          const capitalizedVocation = vocationWord.charAt(0).toUpperCase() + vocationWord.slice(1);
          return `${capitalizedDomain} & ${capitalizedVocation}`;
        }
      }

      // Fallback: use domain word or simple identity arena
      if (domainWord) {
        return domainWord.charAt(0).toUpperCase() + domainWord.slice(1);
      }

      return 'Identity Growth';
    };

    const arcName = sanitizeArcName(generateArcName());

    // Generate a clean 3-sentence narrative (no mush phrases, no lowercase word-salad).
    const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();
    const short = (value: string) => oneLine(value).replace(/[.?!]+$/g, '');

    const valuesCore = short(valueLabel);
    const philosophyCore = short(philosophyLabel);
    const meaningCore = short(meaningLabel);
    const impactCore = short(impactLabel);
    const proudMomentCore = short(proudMomentLabel).toLowerCase();
    const whyCore = short(whyNowLabel || '').trim();
    const growthCore = short(growthEdgeLabel).toLowerCase();

    const dreamClause = (() => {
      if (dreamHasKwilt) return 'build Kwilt into something real and useful';
      if (dreamRaw) return 'bring that dream to life';
      return `grow in ${short(domainLabel).toLowerCase()}`;
    })();

    const tensionClause = whyCore
      ? whyCore
      : growthCore
        ? `I'm working on ${growthCore}`
        : "I'm learning to follow through on what matters";

    const sentence1 = `I want to ${dreamClause}, and do it with ${valuesCore.toLowerCase()} and ${philosophyCore.toLowerCase()}.`;
    const sentence2 = `This matters now because ${tensionClause}, and I want my energy to go toward ${meaningCore.toLowerCase()} and ${impactCore.toLowerCase()}.`;
    const sentence3 = `On normal days, I see this when I’m ${proudMomentCore}, then taking one small step and calling it done.`;

    const aspirationSentence = oneLine(`${sentence1} ${sentence2} ${sentence3}`);

    const nextSmallStep = buildNextSmallStep();

    return {
      arcName,
      aspirationSentence,
      nextSmallStep,
    };
  };

  const parseInsightsFromReply = (reply: string): ArcDevelopmentInsights | null => {
    try {
      const startIdx = reply.indexOf('{');
      const endIdx = reply.lastIndexOf('}');
      const jsonText =
        startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
          ? reply.slice(startIdx, endIdx + 1)
          : reply;

      const parsed = JSON.parse(jsonText) as {
        strengths?: string[];
        growthEdges?: string[];
        pitfalls?: string[];
      };

      if (!parsed.strengths || !parsed.growthEdges || !parsed.pitfalls) {
        return null;
      }

      const strengths = parsed.strengths.filter((item) => typeof item === 'string' && item.trim());
      const growthEdges = parsed.growthEdges.filter(
        (item) => typeof item === 'string' && item.trim()
      );
      const pitfalls = parsed.pitfalls.filter((item) => typeof item === 'string' && item.trim());

      if (strengths.length === 0 || growthEdges.length === 0 || pitfalls.length === 0) {
        return null;
      }

      return { strengths, growthEdges, pitfalls };
    } catch {
      return null;
    }
  };

  const buildLocalInsightsFallback = (): ArcDevelopmentInsights | null => {
    if (!aspiration) {
      return null;
    }

    const dreamSnippet =
      bigDreams.length > 0
        ? bigDreams[0]
        : 'one or two concrete things you’d love to bring to life';

    const strengths: string[] = [];
    const growthEdges: string[] = [];
    const pitfalls: string[] = [];

    // Strengths – lean on what they already chose as energising or proud.
    if (motivation) {
      strengths.push(`Letting ${motivation.toLowerCase()} be real fuel instead of pressure.`);
    }
    if (proudMoment) {
      strengths.push(
        `Turning small, ${proudMoment.toLowerCase()} moments into proof that this Arc is already alive.`
      );
    } else {
      strengths.push('Treating small, ordinary choices as the main place this Arc grows.');
    }
    strengths.push(
      `Holding ${valueOrientation || 'your core values'} steady while you move toward ${
        dreamSnippet.toLowerCase() || 'that future'
      }.`
    );

    // Growth edges – normalize the tension they named.
    if (growthEdge) {
      growthEdges.push(
        `Turning “${growthEdge.toLowerCase()}” from a vague frustration into one clear practice at a time.`
      );
    } else {
      growthEdges.push('Letting this Arc grow through one clear practice instead of vague effort.');
    }
    if (domain) {
      growthEdges.push(
        `Protecting a little focused time for ${domain.toLowerCase()} even when life feels full.`
      );
    }
    growthEdges.push('Letting progress be small and repeatable instead of all‑or‑nothing.');

    // Pitfalls – gentle, non-moralizing patterns.
    pitfalls.push('Treating this Arc as something you have to “earn” instead of a direction to grow.');
    if (bigDreams.length > 0) {
      pitfalls.push(
        `Keeping ${dreamSnippet.toLowerCase()} so private that no one can support you in it.`
      );
    } else {
      pitfalls.push('Keeping your hopes so vague that it’s hard to know what actually matters.');
    }
    pitfalls.push('Slipping back into busyness and forgetting the quieter work this Arc asks for.');

    return { strengths, growthEdges, pitfalls };
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

  type AspirationQualityResult = {
    score: number;
    reasoning?: string;
  };

  const scoreAspirationQuality = useCallback(
    async (candidate: AspirationPayload): Promise<AspirationQualityResult | null> => {
      // Ask the onboarding agent to act as a lightweight judge for the
      // synthesized Identity Arc so we can avoid showing very weak drafts.
      const judgePrompt = [
        'You evaluate how well a candidate Identity Arc matches the user’s inputs and follows the identity-spine philosophy.',
        '',
        'Scoring dimensions (0–10 each):',
        '1) grammatical_correctness – are all sentences grammatically complete and natural-sounding? Score 0 if there are obvious grammatical errors, incomplete phrases, or raw user input inserted verbatim (e.g., "bring build physical product sell to life" instead of "bring building a physical product to life"). All sentences must be properly formed with correct subject-verb structure.',
        '2) input_fidelity – does the Arc clearly incorporate domain, motivation, proud moment, values/philosophy, vocation (if provided), and especially the user\'s named dream (when present)? Score low if it could apply to almost anyone or ignores the dream.',
        '3) identity_spine – is there ONE clear identity vector rather than a mashup of multiple roles or a "trait soup"?',
        '4) concrete_imagery – does it include at least one specific scene or image that a random user would be unlikely to produce, ideally tied to the dream or proud moment?',
        '5) why_now_tension – does it include a believable hint of what is shifting (old pattern → new approach) in light, non-therapeutic language?',
        '6) tone_voice – is the voice grounded, human, and plain (no cosmic or mystical language, no corporate buzzwords, no inspirational fluff; metaphors are minimal and drawn from user imagery)?',
        '',
        'Final score:',
        '- Compute final_score as:',
        '- final_score = (grammatical_correctness * 0.3) + (input_fidelity * 0.3) + ((identity_spine + concrete_imagery + why_now_tension + tone_voice) * 0.4 / 4).',
        '- Clamp final_score to the 0–10 range.',
        '- CRITICAL: If grammatical_correctness is below 5, automatically cap the final_score at 6.0 maximum, regardless of other scores.',
        '- CRITICAL: If the narrative uses obvious “LLM mush” phrasing like "in a grounded way", "rooted in", or "powered by", cap final_score at 6.0 maximum.',
        '',
        'Return ONLY a JSON object (no markdown, no surrounding text) in this shape:',
        '{',
        '  "total_score": 0,',
        '  "reasoning": "1–2 short sentences explaining your score"',
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
          bigDreams.length > 0 ? bigDreams.join('; ') : 'none named'
        }`,
        '',
        `Candidate Arc name: ${candidate.arcName}`,
        `Candidate Arc narrative: ${candidate.aspirationSentence}`,
      ].join('\n');

      try {
        const messages: CoachChatTurn[] = [
          {
            role: 'user',
            content: judgePrompt,
          },
        ];

        const reply = await callOnboardingAgentStep('aspiration_quality_check', messages);
        const startIdx = reply.indexOf('{');
        const endIdx = reply.lastIndexOf('}');
        const jsonText =
          startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
            ? reply.slice(startIdx, endIdx + 1)
            : reply;

        const parsed = JSON.parse(jsonText) as {
          total_score?: number;
          totalScore?: number;
          reasoning?: string;
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

        return {
          score: total,
          reasoning:
            typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0
              ? parsed.reasoning.trim()
              : undefined,
        };
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
      bigDreams,
      callOnboardingAgentStep,
    ]
  );

  const scoreArcInsightQuality = useCallback(
    async (candidate: ArcDevelopmentInsights): Promise<number | null> => {
      if (!aspiration) {
        return null;
      }

      const judgePrompt = [
        'You evaluate how well a set of Arc Development Insights fits a user’s Identity Arc and inputs.',
        '',
        'Each insight set has three sections:',
        '- strengths that help people grow this Arc,',
        '- growth edges people often develop on this path,',
        '- pitfalls people on this path learn to navigate.',
        '',
        'Scoring dimensions (0–10 each):',
        '1) alignment – do the bullets clearly relate to the Arc name, narrative, dream, and identity signals (domain, motivation, proud moment, values, vocation)?',
        '2) developmental_accuracy – do they describe believable ways people grow over time, without diagnosing or giving prescriptive advice?',
        '3) realism – could these show up in an ordinary week for this kind of person, in grounded language?',
        '4) clarity – are bullets short, scannable, and free of vague “inspire / unlock / radiate” language?',
        '',
        'Compute final_score as the simple average of the four dimensions, and clamp it to 0–10.',
        '',
        'Return ONLY a JSON object (no markdown, no surrounding text) in this shape:',
        '{',
        '  "total_score": 0,',
        '  "reasoning": "1–2 short sentences explaining your score"',
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
          bigDreams.length > 0 ? bigDreams.join('; ') : 'none named'
        }`,
        '',
        `Arc name: ${aspiration.arcName}`,
        `Arc narrative: ${aspiration.aspirationSentence}`,
        '',
        'Candidate Arc Development Insights:',
        `- strengths: ${candidate.strengths.join(' | ')}`,
        `- growth_edges: ${candidate.growthEdges.join(' | ')}`,
        `- pitfalls: ${candidate.pitfalls.join(' | ')}`,
      ].join('\n');

      try {
        const messages: CoachChatTurn[] = [
          {
            role: 'user',
            content: judgePrompt,
          },
        ];

        const reply = await callOnboardingAgentStep('arc_insights_quality_check', messages);
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
        console.warn('[onboarding] Failed to score Arc Development Insights quality', err);
        return null;
      }
    },
    [
      aspiration,
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
      bigDreams,
      callOnboardingAgentStep,
    ]
  );

  const generateArcDevelopmentInsights = useCallback(
    async (): Promise<ArcDevelopmentInsights | null> => {
      if (!aspiration) {
        return null;
      }

      const identitySignalsLines = [
        `domain of becoming: ${domain || 'unknown'}`,
        `motivational style: ${motivation || 'unknown'}`,
        `signature trait: ${signatureTrait || 'unknown'}`,
        `growth edge: ${growthEdge || 'unknown'}`,
        `everyday proud moment: ${proudMoment || 'unknown'}`,
        `source of meaning: ${meaning || 'unknown'}`,
        `desired impact: ${impact || 'unknown'}`,
        `core values: ${valueOrientation || 'unknown'}`,
        `life philosophy: ${philosophy || 'unknown'}`,
        `vocational orientation: ${vocation || 'unknown'}`,
      ];

      if (bigDreams.length > 0) {
        identitySignalsLines.push(
          `concrete big things the user would love to bring to life: ${bigDreams.join('; ')}`
        );
      }

      const identitySignals = identitySignalsLines.join('\n- ');

      const prompt = [
        '🌱 ARC DEVELOPMENT INSIGHTS — SYSTEM PROMPT',
        '',
        'You are generating a short, psychologically grounded “development profile” for a user’s Identity Arc.',
        '',
        'Your job is NOT to give advice or instructions. Instead, describe how people on this kind of path typically grow over time.',
        '',
        'Structure:',
        '- strengths: 2–3 bullets about capacities or habits that help people grow this Arc.',
        '- growth_edges: 2–3 bullets about tensions or edges people often work on along this path.',
        '- pitfalls: 2–3 bullets about common traps people on this path learn to navigate.',
        '',
        'Hard rules:',
        '- Do NOT use the word “should”.',
        '- Do NOT tell the user what to do or give step-by-step advice.',
        '- Do NOT diagnose traits, disorders, or fixed labels.',
        '- Keep language grounded, concrete, and non-cosmic (no destiny, vibration, radiance, etc.).',
        '- Speak in third-person plural framing like “people on this path often…” or “many people with this kind of Arc…”.',
        '- Bullets must be short (one line each) and easy to scan on a phone.',
        '',
        'Tone:',
        '- Supportive, non-judgmental, and normalizing.',
        '- Emphasize that edges and pitfalls are common patterns, not personal flaws.',
        '- Stay specific enough that the insights feel real for THIS Arc, not generic for everyone.',
        '',
        'Anchor your insights in:',
        '- the Arc name and narrative (identity spine, everyday scenes, and tension),',
        '- the user’s dream imagery (when present),',
        '- the identity signals (domain, motivation, proud moment, values, vocation, philosophy).',
        '',
        'Output format (JSON only, no backticks, no prose):',
        '{',
        '  "strengths": string[],',
        '  "growthEdges": string[],',
        '  "pitfalls": string[]',
        '}',
        '',
        'Identity Arc:',
        `- name: ${aspiration.arcName}`,
        `- narrative: ${aspiration.aspirationSentence}`,
        '',
        'User identity signals:',
        `- ${identitySignals}`,
      ].join('\n');

      // Try up to 3 candidates, using the quality judge to avoid very weak drafts.
      const QUALITY_THRESHOLD = 7.5;

      let bestCandidate: ArcDevelopmentInsights | null = null;
      let bestScore: number | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const messages: CoachChatTurn[] = [
            {
              role: 'user',
              content: prompt,
            },
          ];

          const reply = await callOnboardingAgentStep('arc_insights_generate', messages);
          const parsed = parseInsightsFromReply(reply);
          if (!parsed) {
            continue;
          }

          const score = await scoreArcInsightQuality(parsed);
          if (score == null) {
            // If the judge failed, accept the first parsable candidate and stop.
            bestCandidate = parsed;
            break;
          }

          if (bestScore == null || score > bestScore) {
            bestScore = score;
            bestCandidate = parsed;
          }

          if (score >= QUALITY_THRESHOLD) {
            break;
          }
        } catch (err) {
          console.warn('[onboarding] Failed to generate Arc Development Insights attempt', {
            attempt,
            err,
          });
        }
      }

      if (bestCandidate) {
        return bestCandidate;
      }

      return buildLocalInsightsFallback();
    },
    [
      aspiration,
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
      bigDreams,
      callOnboardingAgentStep,
      scoreArcInsightQuality,
      buildLocalInsightsFallback,
    ]
  );

  const generateArc = useCallback(
    async (tweakHint?: string) => {
      setIsGenerating(true);
      setError(null);

      // HYBRID-MINIMAL INPUT SUMMARY:
      // We intentionally keep the required input set small:
      // - Domain, Vibe, Proud moment, Big dream
      // …then optionally add Archetype taps (role models + admired qualities) to increase felt accuracy.
      const inputsSummaryLines = [
        `domain of becoming: ${domain}`,
        `motivational style / vibe: ${motivation}`,
        `everyday proud moment: ${proudMoment}`,
        `big dream (primary anchor): ${bigDreams.length > 0 ? bigDreams.join('; ') : 'not provided'}`,
      ];
      // Hybrid archetype taps: include any explicit role model signals in the prompt so the model
      // can improve felt accuracy without adding more free-text.
      if (roleModelTypeId) {
        const label = labelForArchetype(ARCHETYPE_ROLE_MODEL_TYPES, roleModelTypeId);
        if (label) inputsSummaryLines.push(`role model type (tap): ${label}`);
      }
      if (specificRoleModelId) {
        const label =
          specificRoleModelId === 'none'
            ? 'No one specific'
            : specificRoleModelId === 'not_sure'
            ? 'Not sure'
            : labelForArchetype(ARCHETYPE_SPECIFIC_ROLE_MODELS, specificRoleModelId);
        if (label) inputsSummaryLines.push(`specific role model (tap): ${label}`);
      }
      if (roleModelWhyId) {
        const label = labelForArchetype(ARCHETYPE_ROLE_MODEL_WHY, roleModelWhyId);
        if (label) inputsSummaryLines.push(`why they picked them (tap): ${label}`);
      }
      if (admiredQualityIds.length > 0) {
        const labels = admiredQualityIds
          .map((id) => labelForArchetype(ARCHETYPE_ADMIRED_QUALITIES, id))
          .filter((l): l is string => Boolean(l));
        if (labels.length > 0) {
          inputsSummaryLines.push(`admired qualities (tap): ${labels.join('; ')}`);
        }
      }
      // Optional: nickname still supported, but not part of the minimal required set.
      if (nickname.trim()) {
        inputsSummaryLines.push(`optional nickname: ${nickname.trim()}`);
      }
      if (tweakHint) {
        inputsSummaryLines.push(`user tweak preference: ${tweakHint}`);
      }

      const inputsSummary = inputsSummaryLines.join('\n- ');

      const buildPrompt = (judgeFeedback?: string) => {
        const conversationSnapshot = buildConversationSnapshotFromTimeline();
        const lines: string[] = [
          'You are an identity-development coach inside the Kwilt app. You help users generate a long-term identity direction called an Arc.',
          '',
          'An Arc is:',
          '- a slow-changing identity arena where the user wants to grow,',
          '- a direction for who they want to become in one area of life,',
          '- not a task list, not a project, not a personality label, and not corporate-speak.',
          '',
          'You will receive structured signals about the user\'s imagined future self:',
          '- domain of life needing attention',
          '- emotional vibe',
          '- how others experience their future presence',
          '- kind of strength they grow into',
          '- what they do on a normal "proud" day',
          '- optional nickname',
          '- optional age band',
          '- optional big dream (a concrete picture of something they\'d love to bring to life)',
          '',
          'Your job is to generate:',
          '1. Arc.name — a short, stable identity direction label (1–3 words, emoji optional)',
          '2. Arc.narrative — a 3-sentence, first-person description of what they want to grow toward in this Arc.',
          '',
          'Your outputs must be readable and useful to both a 14-year-old and a 41-year-old.',
          '',
          // Hybrid paradigm: align FTUE generation with our rubric targets.
          // Even though FTUE collects more than the "minimal essentials", we still optimize for:
          // - felt accuracy (specific, true-to-signals)
          // - reading ease (teen-friendly language)
          // - everyday concreteness (scenes + micro-behaviors)
          buildHybridArcGuidelinesBlock(),
          '',
          '-----------------------------------------',
          'ARC NAME — RULES',
          '-----------------------------------------',
          'Arc.name must:',
          '- be 1–3 words (emoji allowed),',
          '- describe an identity direction or arena,',
          '- feel stable over years (can hold many goals),',
          '- reflect the user\'s inputs (domain + vibe + dream),',
          '- when a concrete big dream is present, treat it as a **primary naming anchor** so the Arc name describes an aspirational identity of the kind of person who achieves that dream (or its essence),',
          // '- avoid personality types ("The Visionary", "The Genius"),',
          '- avoid tasks ("Start My Business", "Get Fit This Year"),',
          '- avoid vague abstractions ("My Best Self", "Life Journey"),',
          '- avoid abstract noun combinations that don\'t form a coherent identity ("Creativity Curiosity", "Exploration Discovery", "Growth Learning").',
          '',
          'When the user has given a concrete big dream (e.g., record an album, build a cabin, start a small studio), first look for a short identity phrase that **codes that dream into who they are becoming**. Examples:',
          '- Dream: "build a small, honest woodworking studio" → Name: "Woodshop Steward", "Honest Woodshop"',
          '- Dream: "record a folk album with friends" → Name: "Folk Album Season", "Honest Album"',
          '- Dream: "start a tiny design studio" → Name: "Studio Stewardship", "Tiny Studio"',
          '',
          'Avoid simply echoing the raw dream text as-is (e.g., "Build a cabin I can rent on Airbnb"). Your job is to convert the dream into an identity direction, not copy the sentence.',
          '',
          'If you cannot form a clean, identity-like phrase from the dream, fall back to the following patterns. Allowed name patterns (choose ONE and follow it exactly):',
          '- Domain + Posture: "Venture Stewardship", "Family Stewardship", "Relational Courage", "Creative Discipline"',
          '  * First word = life domain (Venture, Family, Relational, Creative)',
          '  * Second word = how you approach it (Stewardship, Courage, Discipline)',
          '- Value + Domain: "Honest Entrepreneurship", "Intentional Friendship"',
          '  * First word = core value (Honest, Intentional)',
          '  * Second word = domain where value applies (Entrepreneurship, Friendship)',
          '- Two-noun frame: "Craft & Contribution", "Making & Embodied Creativity"',
          '  * Both nouns must relate to the same identity direction',
          '  * Use "&" to connect them',
          '  * Example: "Craft & Contribution" = craft work that contributes; "Making & Embodied Creativity" = physical making as creative expression',
          '- Canonical template when matching spiritual / family / craft / venture arcs:',
          '  - "♾️ Discipleship"',
          '  - "🏡 Family Stewardship"',
          '  - "🧠 Craft & Contribution"',
          '  - "🪚 Making & Embodied Creativity"',
          '  - "🚀 Venture / Entrepreneurship"',
          '',
          'CRITICAL: Do NOT combine two abstract traits or concepts without a clear relationship. "Creativity Curiosity" is wrong because it\'s just two traits. "Creative Exploration" could work if it means exploring through creative means, but "Craft & Contribution" is better because it shows a clear relationship (craft that contributes).',
          '',
          'If unsure, choose the simplest truthful identity arena that matches the signals. Prefer Domain + Posture or Value + Domain patterns over abstract combinations.',
          '',
          '-----------------------------------------',
          'ARC NARRATIVE — RULES',
          '-----------------------------------------',
          'The Arc narrative MUST:',
          '- be exactly 3 sentences in a single paragraph,',
          '- be 40–120 words,',
          '- have the FIRST sentence start with: "I want…",',
          '- use plain, grounded language suitable for ages 14–50+,',
          '- avoid guru-speak, cosmic language, therapy language, or prescriptive "shoulds",',
          '- avoid describing who the user IS today,',
          '- describe only who they WANT TO BECOME and why it matters now.',
          '- keep each sentence reasonably short and readable — no sentence should be longer than about 30 words.',
          '',
          'Sentence roles:',
          '1. Sentence 1: Begin with "I want…", clearly expressing the identity direction within this Arc. When the user has given a specific big dream (e.g., record an album, build a cabin, start a studio), weave that dream directly into this first sentence so it feels like the heart of the direction, not a side note.',
          '2. Sentence 2: In a short sentence, explain why this direction matters now, using the user\'s signals (domain, vibe, social presence, strength, proud moment, dream).',
          '3. Sentence 3: In another short sentence, give one concrete, ordinary-life scene AND one micro-behavior they could do this week that shows this direction on a normal day.',
          '',
          'Tone:',
          '- grounded, human, reflective,',
          '- no mystical metaphors like "tapestry", "radiant", "harmonious existence", "legacy", "essence", etc.,',
          '- no advice, no "you should…", no step-by-step coaching,',
          '- no diagnosing the user (no "I am the kind of person who always…"),',
          '- it should feel like something the user could have written in a thoughtful journal entry.',
          '',
          '-----------------------------------------',
          'STYLE EXAMPLES — FOLLOW THIS FEEL',
          '-----------------------------------------',
          'These examples show the style, structure, and level of concreteness you should aim for. Do NOT copy them; adapt the same pattern to the user\'s signals.',
          '',
          'Example 1 (Venture / Entrepreneurship):',
          '- name: "🚀 Venture Stewardship"',
          '- narrative:',
          '"I want to build small, thoughtful ventures that support my family, my curiosity, and the kind of life I actually want to live. This matters to me because I\'m tired of work that scatters my energy, and I want my effort to go into things that are useful, honest, and aligned with my values. I see this direction on ordinary days when I sketch ideas at the kitchen table, ship a tiny improvement, or share early progress with someone I trust instead of keeping it all in my head."',
          '',
          'Example 2 (Making & Embodied Creativity):',
          '- name: "🪚 Making & Embodied Creativity"',
          '- narrative:',
          '"I want to stay connected to the physical world through the work of my hands—building, fixing, and creating things that are tangible and lasting. This matters to me because too much of my life can drift into screens and abstraction, and I feel calmer and more myself when I\'m shaping real materials with care. I notice this Arc on regular days when I step into the garage, pick up a tool, and make a small bit of progress on a project that didn\'t exist before."',
          '',
          'Example 3 (Family Stewardship):',
          '- name: "🏡 Family Stewardship"',
          '- narrative:',
          '"I want to become someone who actively builds a home where the people I love feel safe, seen, and lifted. This matters to me because I know how much atmosphere at home shapes everyone\'s confidence and peace, and I don\'t want that to be left to chance or just to my schedule. I see this Arc in simple moments when I put my phone down, really listen to a family member, or do one quiet thing that makes the house feel a little more cared for."',
          '',
          'Your goal is to produce outputs that feel as clear, grounded, and personally meaningful as these examples, but customized to the user\'s signals.',
          '',
          '-----------------------------------------',
          'OUTPUT FORMAT',
          '-----------------------------------------',
          'Return ONLY JSON in this exact format:',
          '',
          '{',
          '  "name": "<Arc name>",',
          '  "narrative": "<single paragraph, 3 sentences>",',
          '  "status": "active"',
          '}',
          '',
          'Do not add explanations, headings, or commentary.',
          '',
          'Inputs:',
          `- ${inputsSummary}`,
        ];

        if (conversationSnapshot && conversationSnapshot.trim().length > 0) {
          lines.push(
            '',
            'Recent visible conversation between you (the guide) and the user inside this onboarding thread. Use this only as extra nuance; the structured identity signals above remain the source of truth:',
            conversationSnapshot
          );
        }

        if (judgeFeedback && judgeFeedback.trim().length > 0) {
          lines.push(
            '',
            'Previous draft feedback from an internal reviewer (fix these issues while keeping the user’s underlying identity and inputs):',
            judgeFeedback.trim(),
            'Generate a new candidate that still fits the same person and inputs, but directly addresses this feedback.'
          );
        }

        return lines.join('\n');
      };

      const QUALITY_THRESHOLD = 9;
      const MAX_ATTEMPTS = 3;
      let bestCandidate: AspirationPayload | null = null;
      let bestQuality: AspirationQualityResult | null = null;
      let attempts = 0;
      let attemptsUntilThreshold: number | null = null;
      let lastFeedback: string | undefined;

      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
          attempts += 1;

          const prompt = buildPrompt(lastFeedback);
          const messages: CoachChatTurn[] = [
            {
              role: 'user',
              content: prompt,
            },
          ];

          const reply = await callOnboardingAgentStep('aspiration_generate', messages);
          const parsed = parseAspirationFromReply(reply);

          if (!parsed) {
            // Try again if we couldn't parse JSON; let the loop handle fallback.
            continue;
          }

          // Pre-filter: Check for obvious grammatical errors before quality scoring
          const narrative = parsed.aspirationSentence.toLowerCase();
          const name = parsed.arcName;
          const nameLooksLikeAStarterPhrase =
            /\b(i['’]d|i would|i want|i can|love|like)\b/i.test(name) || containsArcMushPhrases(name);
          if (nameLooksLikeAStarterPhrase) {
            continue;
          }
          // Check for raw user input patterns - verbatim insertion without proper transformation
          // Pattern: "bring build physical product sell" or "bring [verb] [noun] [verb]" without proper gerund/participle
          const hasRawInputPattern = 
            /\b(bring|turn|make)\s+(build|make|create|start|sell|turn)\s+\w+\s+\w+\s+(sell|turn|can|i|to|life)\b/i.test(narrative) ||
            // Pattern: "I want to build X I can sell" inserted verbatim
            /\bi want to (build|make|create|start)\s+\w+\s+(i|can)\s+(sell|turn)/i.test(narrative) ||
            // Pattern: Missing articles before nouns (e.g., "bring build physical product" instead of "bring building a physical product")
            /\b(bring|turn|make)\s+(build|make|create|start|sell)\s+(physical|product|business|venture|thing)\s+(sell|turn|can|i)\b/i.test(narrative);
          
          // Check for word salad - multiple verbs/nouns in sequence without proper structure
          const wordSaladPattern = /\b(build|make|create|start|sell|turn)\s+\w+\s+(build|make|create|start|sell|turn|physical|product|business)\s+\w+\s+(sell|turn|can|i|physical|product)\b/i.test(narrative);
          const hasMushPhrases = containsArcMushPhrases(narrative);
          
          if (hasRawInputPattern || wordSaladPattern || hasMushPhrases) {
            // Skip this candidate - it has obvious grammatical errors
            if (__DEV__) {
              console.warn('[onboarding] Skipping candidate with grammatical errors:', {
                hasRawInputPattern,
                wordSaladPattern,
                hasMushPhrases,
                narrativePreview: parsed.aspirationSentence.slice(0, 150),
              });
            }
            continue;
          }

          const quality = await scoreAspirationQuality(parsed);

          if (!quality) {
            // If the judge failed altogether, keep the first parsable candidate and stop.
            if (!bestCandidate) {
              bestCandidate = parsed;
            }
            break;
          }

          if (!bestQuality || quality.score > bestQuality.score) {
            bestQuality = quality;
            bestCandidate = parsed;
          }

          if (quality.score >= QUALITY_THRESHOLD) {
            if (attemptsUntilThreshold == null) {
              attemptsUntilThreshold = attempts;
            }
            break;
          }

          lastFeedback = quality.reasoning;
        }

        if (__DEV__ && bestCandidate && bestQuality) {
          // eslint-disable-next-line no-console
          console.log('[onboarding] Identity Arc generation summary', {
            draftArcId,
            arcName: bestCandidate.arcName,
            qualityThreshold: QUALITY_THRESHOLD,
            maxAttempts: MAX_ATTEMPTS,
            attempts,
            bestScore: bestQuality.score,
            attemptsUntilThreshold,
          });
        }

        if (bestCandidate && bestQuality && bestQuality.score >= QUALITY_THRESHOLD) {
          setAspiration(bestCandidate);
          if (workflowRuntime) {
            workflowRuntime.completeStep('aspiration_generate', {
              arcName: bestCandidate.arcName,
              arcNarrative: bestCandidate.aspirationSentence,
              nextSmallStep: bestCandidate.nextSmallStep,
            });
          }
          setPhase('reveal');
          return;
        }

        if (!bestCandidate) {
          // If the model did not return any well-formed JSON, fall back to a simple,
          // client-side synthesis so the user still gets a clear Arc.
          console.warn(
            '[onboarding] Aspiration JSON parse failed across attempts, falling back to local synthesis'
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
          return;
        }

        // If we have a best candidate but never reached the quality threshold,
        // prefer a local fallback when available so users don't see very weak drafts.
        const fallback = buildLocalAspirationFallback();
        if (fallback) {
          console.warn(
            '[onboarding] Identity Arc best candidate below quality threshold, using local fallback instead',
            {
              bestScore: bestQuality?.score ?? null,
            }
          );
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

        // If no fallback is possible, use the best candidate we have.
        setAspiration(bestCandidate);
        if (workflowRuntime) {
          workflowRuntime.completeStep('aspiration_generate', {
            arcName: bestCandidate.arcName,
            arcNarrative: bestCandidate.aspirationSentence,
            nextSmallStep: bestCandidate.nextSmallStep,
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
      buildConversationSnapshotFromTimeline,
      canGenerate,
      draftArcId,
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
      bigDreams,
      nickname,
      workflowRuntime,
      scoreAspirationQuality,
      buildLocalAspirationFallback,
    ]
  );

  const handleConfirmAspiration = () => {
    if (!aspiration) return;

    const isPro = useEntitlementsStore.getState().isPro;
    const canCreate = canCreateArc({ isPro, arcs: useAppStore.getState().arcs });
    if (!canCreate.ok) {
      Alert.alert(
        'Arc limit reached',
        `Free tier supports up to ${canCreate.limit} Arc total. Upgrade to Pro to create more arcs.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'arcs_create' }),
          },
        ],
      );
      return;
    }

    // Creating an Arc counts as showing up (planning is still engagement).
    useAppStore.getState().recordShowUp();
    const nowIso = new Date().toISOString();
    const arc: Arc = {
      id: draftArcId,
      name: aspiration.arcName,
      narrative: aspiration.aspirationSentence,
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

  const slices = splitAspirationNarrative(aspiration.aspirationSentence);

  updateUserProfile((current) => ({
    ...current,
    identityProfile: {
      domainIds,
      motivationIds,
      signatureTraitIds,
      growthEdgeIds,
      proudMomentIds,
      meaningIds,
      impactIds,
      valueIds,
      philosophyIds,
      vocationIds,
      roleModelTypeId: roleModelTypeId ?? undefined,
      specificRoleModelId: specificRoleModelId ?? undefined,
      roleModelWhyId: roleModelWhyId ?? undefined,
      admiredQualityIds: admiredQualityIds.length > 0 ? admiredQualityIds : undefined,
      nickname: nickname.trim() || undefined,
      aspirationArcName: aspiration.arcName,
      aspirationNarrative: aspiration.aspirationSentence,
      aspirationSlices: slices ?? undefined,
      lastUpdatedAt: nowIso,
    },
  }));

    addArc(arc);
    void ensureArcBannerPrefill(arc);
    // Fire-and-forget: generate Arc Development Insights in the background so
    // they are ready (or gracefully fall back) by the time the user lands on
    // the Arc detail screen. This should never block the onboarding flow.
    void (async () => {
      try {
        const insights = await generateArcDevelopmentInsights();
        if (!insights) return;
        setArcInsights(insights);
        useAppStore
          .getState()
          .updateArc(arc.id, (current) => ({
            ...current,
            developmentStrengths: insights.strengths,
            developmentGrowthEdges: insights.growthEdges,
            developmentPitfalls: insights.pitfalls,
            updatedAt: new Date().toISOString(),
          }));
      } catch (err) {
        console.warn('[onboarding] Failed to attach Arc Development Insights', err);
      }
    })();

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
      // Message 4 (lead-in to the minimal + archetype flow)
      'To do that well, we’ll keep it **simple and fast**: **4 quick questions** (tap‑based + one short free response), then a **quick personalization step** about who you admire (taps only). You can skip any of that personalization if nothing comes to mind. All together it should take just a few minutes, and it helps me surface a future version of you you’d genuinely want to grow into.',
    ];

    const queue = messages.length > 0 ? messages : [fallback];
    const current = queue[introIndex];

    if (current == null) {
      return;
    }

    // If we're already streaming this specific intro index, or we've already
    // finished streaming it, don't start another overlapping stream. This
    // prevents the same paragraph from appearing multiple times when React
    // re-renders while the typing animation is in flight.
    if (introStreamingIndexRef.current === introIndex || lastIntroStreamedIndex === introIndex) {
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

    // Mark this intro index as actively streaming so we avoid duplicate
    // streams until the current one has finished (or been skipped).
    introStreamingIndexRef.current = introIndex;

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
          introStreamingIndexRef.current = null;
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

  // When we enter the dreams phase, stream a short assistant message into
  // the shared chat surface so it appears as the next message in the thread.
  useEffect(() => {
    if (phase !== 'dreams') return;
    if (hasStreamedDreamsIntroCopy) return;

    const controller = chatControllerRef?.current;
    if (!controller) {
      // If we don't have a shared chat surface (for example, in a future host
      // that reuses this flow without the coach pane), skip the typed message
      // and allow the card + GIF to render immediately.
      setHasStreamedDreamsIntroCopy(true);
      return;
    }

    const copy = 'That gives me a solid sketch of who your future self is becoming. 🎉';

    controller.streamAssistantReplyFromWorkflow(copy, 'assistant-dreams-intro', {
      onDone: () => {
        // Wait until the typing animation (or a manual skip) has fully
        // completed before revealing the celebration GIF + free-response card
        // so this step feels consistent with the rest of the flow.
        setHasStreamedDreamsIntroCopy(true);
      },
    });
  }, [phase, hasStreamedDreamsIntroCopy, chatControllerRef]);

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
    // Hybrid-Minimal: go directly to the everyday proud-moment question.
    advancePhase('proudMoment');
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
    // Hybrid-Minimal: go directly to the big-dream question.
    advancePhase('dreams');
  };

  const handleContinueFromNickname = () => {
    if (workflowRuntime) {
      workflowRuntime.completeStep('nickname_optional', {
        nickname: nickname.trim().length ? nickname.trim() : null,
      });
    }
    // Hybrid-Minimal: role model type + admired qualities are required steps now.
    setPhase('roleModelType');
  };

  const labelForArchetype = <T extends { id: string; label: string }>(
    options: T[],
    id: string | null | undefined
  ): string | null => {
    if (!id) return null;
    return options.find((o) => o.id === id)?.label ?? null;
  };

  const renderRadioIndicator = (selected: boolean) => (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );

  const renderCheckboxIndicator = (selected: boolean) => (
    <View style={[styles.checkboxOuter, selected && styles.checkboxOuterSelected]}>
      {selected ? <Icon name="check" size={14} color={colors.canvas} /> : null}
    </View>
  );

  const renderRoleModelType = () => {
    return (
      <QuestionCard stepLabel="5 of 6" title="What kind of people do you look up to?">
        <View style={styles.fullWidthList}>
          {ARCHETYPE_ROLE_MODEL_TYPES.map((option) => {
            const selected = roleModelTypeId === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setRoleModelTypeId(option.id);
                  appendChatUserMessage(`People I look up to: ${option.label}`);
                  // Minimal + Archetype: jump straight to admired qualities.
                  setPhase('admiredQualities');
                }}
              >
                <View style={styles.fullWidthOptionContent}>
                  {renderRadioIndicator(selected)}
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
      </QuestionCard>
    );
  };

  const renderAdmiredQualities = () => {
    return (
      <QuestionCard stepLabel="6 of 6" title="What qualities do you admire in them? (Pick 1–3)">
        <View style={styles.fullWidthList}>
          {ARCHETYPE_ADMIRED_QUALITIES.map((option) => {
            const selected = admiredQualityIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  const next = toggleIdInList(option.id, admiredQualityIds);
                  // Enforce 1–3 selection to keep signal crisp (and keep this truly "quick").
                  if (next.length > 3) return;
                  setAdmiredQualityIds(next as ArchetypeAdmiredQualityId[]);
                }}
              >
                <View style={styles.fullWidthOptionContent}>
                  {renderCheckboxIndicator(selected)}
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

        <View style={styles.inlineActions}>
          <Button
            variant="accent"
            style={[
              styles.primaryButton,
              { flex: 1 },
              admiredQualityIds.length === 0 && styles.primaryButtonDisabled,
            ]}
            disabled={admiredQualityIds.length === 0}
            onPress={() => {
              const labels = admiredQualityIds
                .map((id) => labelForArchetype(ARCHETYPE_ADMIRED_QUALITIES, id))
                .filter((l): l is string => Boolean(l));
              appendChatUserMessage(`I admire: ${labels.join(', ')}`);
              setPhase('generating');
              void generateArc();
            }}
          >
            <ButtonLabel size="md" tone="inverse">
              Continue
            </ButtonLabel>
          </Button>
        </View>
      </QuestionCard>
    );
  };

  const renderNickname = () => {
    return (
      <QuestionCard title="If future-you had a nickname…">
        <Text style={styles.bodyText}>One or two words. (You can skip.)</Text>
        <Input
          value={nickname}
          onChangeText={setNickname}
          placeholder="e.g., The Builder"
          autoCapitalize="words"
          returnKeyType="done"
        />
        <View style={styles.inlineActions}>
          <Button
            variant="outline"
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={() => {
              setNickname('');
              handleContinueFromNickname();
            }}
          >
            <ButtonLabel size="md">Skip</ButtonLabel>
          </Button>
          <Button
            variant="accent"
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={handleContinueFromNickname}
          >
            <ButtonLabel size="md" tone="inverse">
              Continue
            </ButtonLabel>
          </Button>
        </View>
      </QuestionCard>
    );
  };

  const handleConfirmMeaning = (selectedMeaning: string, optionId: string) => {
    appendChatUserMessage(selectedMeaning);
    setError(null);
    if (workflowRuntime) {
      workflowRuntime.completeStep('meaning', { meaning: optionId });
    }
    // In the first-time FTUE we move directly into the impact question to
    // keep the flow fast. In the Arc creation flow launched from the Arcs
    // inventory, we insert a short "why now" check before continuing.
    if (mode === 'reuseIdentityForNewArc') {
      advancePhase('whyNow');
    } else {
      advancePhase('impact');
    }
  };

  const handleConfirmWhyNow = (selectedWhyNow: string, optionId: string) => {
    const trimmed = selectedWhyNow.trim();
    if (!trimmed) return;

    appendChatUserMessage(trimmed);
    setWhyNowIds([optionId]);
    setError(null);

    if (mode === 'reuseIdentityForNewArc') {
      // For Arc creation launched from the Arcs inventory, we move from the
      // big dream → why now → (optional archetype taps) → generating the Arc.
      const alreadyHasArchetypeSignals =
        Boolean(roleModelTypeId) ||
        Boolean(specificRoleModelId) ||
        Boolean(roleModelWhyId) ||
        admiredQualityIds.length > 0;
      if (alreadyHasArchetypeSignals) {
        setPhase('generating');
        void generateArc();
      } else {
        setPhase('roleModelType');
      }
    } else {
      advancePhase('impact');
    }
  };

  const handleConfirmImpact = (selectedImpact: string, optionId: string) => {
    appendChatUserMessage(selectedImpact);
    if (workflowRuntime) {
      workflowRuntime.completeStep('impact', { impact: optionId });
    }
    setError(null);
    advancePhase('values');
  };

  const handleConfirmValues = (selectedValue: string, optionId: string) => {
    appendChatUserMessage(selectedValue);
    if (workflowRuntime) {
      workflowRuntime.completeStep('values', { values: optionId });
    }
    setError(null);
    advancePhase('philosophy');
  };

  const handleConfirmPhilosophy = (selectedPhilosophy: string, optionId: string) => {
    appendChatUserMessage(selectedPhilosophy);
    if (workflowRuntime) {
      workflowRuntime.completeStep('philosophy', { philosophy: optionId });
    }
    setError(null);
    advancePhase('vocation');
  };

  const handleConfirmVocation = (selectedVocation: string, optionId: string) => {
    appendChatUserMessage(selectedVocation);
    if (workflowRuntime) {
      workflowRuntime.completeStep('vocation', { vocation: optionId });
    }
    setError(null);
    setPhase('dreams');
  };

  const renderDomain = () => (
    <>
      <QuestionCard
        stepLabel="1 of 6"
        title={
          <>
            Which part of yourself are you most excited to grow right now?{' '}
            <Pressable
              style={styles.questionInfoTrigger}
              accessibilityRole="button"
              accessibilityLabel="Why this question?"
              onPress={() => toggleQuestionInfo('domain')}
            >
              <Icon name="info" size={16} color={colors.textSecondary} />
            </Pressable>
          </>
        }
      >
        <View style={styles.fullWidthList}>
          {DOMAIN_OPTIONS.map((option) => {
            const selected = domainIds.includes(option.id);
            const labelWithEmoji = option.emoji ? `${option.emoji} ${option.label}` : option.label;
            return (
              <Pressable
                key={option.id}
                style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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
                  {renderRadioIndicator(selected)}
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
      </QuestionCard>
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
          <Text style={styles.questionMeta}>2 of 6</Text>
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
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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
                  {renderRadioIndicator(selected)}
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
              <Button
                key={option.id}
                size="small"
                variant="ghost"
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
                <ButtonLabel size="sm">{option.label}</ButtonLabel>
              </Button>
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
              <Button
                key={option.id}
                size="small"
                variant="ghost"
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
                <ButtonLabel size="sm">{option.label}</ButtonLabel>
              </Button>
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
          <Text style={styles.questionMeta}>3 of 6</Text>
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
        <View style={styles.fullWidthList}>
          {getAdaptiveOptions(PROUD_MOMENT_OPTIONS, 7).map((option) => {
            const selected = proudMomentIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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
                <View style={styles.fullWidthOptionContent}>
                  {renderRadioIndicator(selected)}
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
                    handleConfirmMeaning(option.label, option.id);
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

  const renderWhyNow = () => (
    <QuestionCard title="Why does this feel important to you?">
      <View style={styles.fullWidthList}>
        {WHY_NOW_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.fullWidthOption,
              whyNowIds.includes(option.id) && styles.fullWidthOptionSelected,
            ]}
            onPress={() => {
              handleConfirmWhyNow(option.label, option.id);
            }}
          >
            <View style={styles.fullWidthOptionContent}>
              <Text
                style={[
                  styles.fullWidthOptionLabel,
                  whyNowIds.includes(option.id) && styles.fullWidthOptionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </QuestionCard>
  );

  const renderImpact = () => (
    <>
      <Card style={[styles.stepCard, styles.researchCard]}>
        <View style={styles.stepBody}>
          <Text style={styles.questionMeta}>Legacy</Text>
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
          <View style={styles.fullWidthList}>
            {IMPACT_OPTIONS.map((option) => {
              const selected = impactIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  onPress={() => {
                    const previousSelected = IMPACT_OPTIONS.filter((o) => impactIds.includes(o.id));
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setImpactIds([option.id]);
                    handleConfirmImpact(option.label, option.id);
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
                <Button
                  key={option.id}
                  size="small"
                  variant="ghost"
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    const previousSelected = VALUES_OPTIONS.filter((o) => valueIds.includes(o.id));
                    previousSelected.forEach((prev) => updateSignatureForOption(prev, false));
                    updateSignatureForOption(option, true);
                    setValueIds([option.id]);
                    handleConfirmValues(option.label, option.id);
                  }}
                >
                  <ButtonLabel size="sm">{option.label}</ButtonLabel>
                </Button>
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
                    handleConfirmPhilosophy(option.label, option.id);
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
          <Text style={styles.questionMeta}>Legacy</Text>
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
                    handleConfirmVocation(option.label, option.id);
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
    const trimmed = dreamInput.trim();
    if (!trimmed) {
      return;
    }

    // Mirror earlier steps: echo the user's free-response answer into the
    // shared chat surface so it appears as a green message bubble.
    appendChatUserMessage(trimmed);

    if (workflowRuntime) {
      workflowRuntime.completeStep('big_dream', { bigDream: trimmed });
    }
    // Hybrid-Minimal: proceed to optional archetype taps (skip-able).
    setPhase('roleModelType');
  };

  const renderDreams = () => {
    const hasAnyDreams = bigDreams.length > 0;

    // Keep the celebration GIF and free-response card hidden until the
    // assistant's "Part 2 of 2" message has finished streaming in the chat,
    // so the sequence matches earlier steps (typed message first, then card).
    if (!hasStreamedDreamsIntroCopy) {
      return null;
    }

    return (
      <View style={styles.dreamsStack}>
        <QuestionCard
          stepLabel="4 of 6"
          title="Looking ahead, what’s one big thing you’d love to bring to life?"
        >
          <Input
            value={dreamInput}
            onChangeText={setDreamInput}
            multiline
            placeholder="e.g., Rewild our back acreage into a native meadow; restore a 1970s 911; build a small timber-frame home."
            autoCapitalize="sentences"
          />
          <View style={styles.inlineActions}>
            <Button
              variant="accent"
              style={[
                styles.primaryButton,
                !hasAnyDreams && styles.primaryButtonDisabled,
              ]}
              disabled={!hasAnyDreams}
              onPress={() => {
                startGeneratingFromDreams();
              }}
            >
              <ButtonLabel size="md" tone="inverse">
                Continue
              </ButtonLabel>
            </Button>
          </View>
        </QuestionCard>
      </View>
    );
  };

  const renderGenerating = () => {
    const nowIso = new Date().toISOString();
    // Lightweight placeholder Arc so we can reuse the Arc preview shell while the
    // real aspiration is generating. This keeps the canvas focused on the object
    // (an Arc) instead of showing another question-style card.
    const skeletonArc: Arc = {
      id: draftArcId,
      name: 'Shaping your Arc…',
      narrative: '',
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return (
      <ArcListCard
        arc={skeletonArc}
        narrativeTone="strong"
        style={styles.arcPreviewCard}
        customNarrative={
          <View style={styles.revealNarrativeBlock}>
            <View style={styles.arcIdentityRow}>
              <View style={styles.arcIdentityLabelRow}>
                <View style={[styles.skeletonBlock, styles.skeletonLabelBlock]} />
              </View>
              <View style={styles.skeletonSentenceBlockRow}>
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlock]} />
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlockShort]} />
              </View>
            </View>
            <View style={styles.arcIdentityRow}>
              <View style={styles.arcIdentityLabelRow}>
                <View style={[styles.skeletonBlock, styles.skeletonLabelBlock]} />
              </View>
              <View style={styles.skeletonSentenceBlockRow}>
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlock]} />
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlockShort]} />
              </View>
            </View>
            <View style={styles.arcIdentityRow}>
              <View style={styles.arcIdentityLabelRow}>
                <View style={[styles.skeletonBlock, styles.skeletonLabelBlock]} />
              </View>
              <View style={styles.skeletonSentenceBlockRow}>
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlock]} />
                <View style={[styles.skeletonBlock, styles.skeletonSentenceBlockShort]} />
              </View>
            </View>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textPrimary} />
              <Text style={styles.bodyText}>Pulling the threads together…</Text>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
      />
    );
  };

  const renderArcPreview = () => {
    if (!aspiration) return null;

    const nowIso = new Date().toISOString();
    const previewArc: Arc = {
      id: draftArcId,
      name: aspiration.arcName,
      narrative: aspiration.aspirationSentence,
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const raw = aspiration.aspirationSentence?.trim();
    if (!raw) return null;

    const slices = splitAspirationNarrative(raw);

    return (
      <ArcListCard
        arc={previewArc}
        narrativeTone="strong"
        style={styles.arcPreviewCard}
        customNarrative={
          <View style={styles.revealNarrativeBlock}>
            {slices ? (
              <>
                <View style={styles.arcIdentityRow}>
                  <View style={styles.arcIdentityLabelRow}>
                    <Text
                      style={styles.arcIdentityLabel}
                      accessibilityLabel="Identity direction"
                    >
                      Identity direction
                    </Text>
                  </View>
                  <Text style={styles.arcIdentitySentence}>{slices.identity}</Text>
                </View>
                <View style={styles.arcIdentityRow}>
                  <View style={styles.arcIdentityLabelRow}>
                    <Text
                      style={styles.arcIdentityLabel}
                      accessibilityLabel="Why this matters now"
                    >
                      Why this matters now
                    </Text>
                  </View>
                  <Text style={styles.arcIdentitySentence}>{slices.why}</Text>
                </View>
                <View style={styles.arcIdentityRow}>
                  <View style={styles.arcIdentityLabelRow}>
                    <Text
                      style={styles.arcIdentityLabel}
                      accessibilityLabel="Daily practice"
                    >
                      Daily practice
                    </Text>
                  </View>
                  <Text style={styles.arcIdentitySentence}>{slices.daily}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.bodyText}>{raw}</Text>
            )}
          </View>
        }
      />
    );
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
                <ButtonLabel size="md" tone="inverse">
                  🤩 Yes! I'd love to become like this
                </ButtonLabel>
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
                <Button
                  key={option.id}
                  size="small"
                  variant="ghost"
                  style={styles.chip}
                  onPress={() => {
                    setPhase('generating');
                    void generateArc(option.id);
                  }}
                >
                  <ButtonLabel size="sm">{option.label}</ButtonLabel>
                </Button>
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
            <ButtonLabel size="md" tone="inverse">
              Got it
            </ButtonLabel>
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
                <ButtonLabel size="md">{option.label}</ButtonLabel>
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

  if (phase === 'whyNow') {
    return renderWhyNow();
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

  if (phase === 'nickname') {
    return renderNickname();
  }

  if (phase === 'roleModelType') {
    return renderRoleModelType();
  }

  if (phase === 'admiredQualities') {
    return renderAdmiredQualities();
  }

  if (phase === 'reveal') {
    return renderReveal();
  }

  if (phase === 'tweak') {
    return renderTweak();
  }

  if (phase === 'generating') {
    return renderGenerating();
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
    // Use a modest vertical gap between rows inside the question cards; the
    // progress label + title manage their own tighter spacing.
    gap: spacing.sm,
  },
  dreamsStack: {
    // Keep the celebration GIF card visually connected to the free-response
    // question that follows by using the smallest vertical gap between them.
    // This avoids the GIF feeling isolated in its own section.
    gap: spacing.xs,
  },
  dreamsGifCard: {
    padding: spacing.sm,
  },
  researchHeading: {
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  bodyStrong: {
    // Use the actual Inter semibold face instead of relying on `fontWeight`,
    // which can cause React Native to fall back to a different font (and make
    // the emphasized text appear smaller).
    fontFamily: fonts.semibold,
    fontWeight: '600',
  },
  bodyItalic: {
    // Ensure italics keep the same base font sizing/metrics.
    fontFamily: fonts.regular,
    fontStyle: 'italic',
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  questionMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    // Keep the progress label visually tied to the question header with a
    // slightly tighter gap than the default body spacing.
    marginBottom: 0,
  },
  questionTitle: {
    // Slightly larger than core body copy so the question reads as a local
    // heading within the card, without jumping all the way to a full page
    // title size.
    ...typography.titleSm,
    color: colors.textPrimary,
    paddingBottom: spacing.md,
  },
  questionInfoTrigger: {
    paddingLeft: spacing.xs,
  },
  primaryButton: {
    alignSelf: 'stretch',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
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
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxOuterSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  fullWidthOptionEmoji: {
    ...typography.body,
    color: colors.textPrimary,
  },
  fullWidthOptionEmojiSelected: {
    color: colors.accent,
  },
  fullWidthOptionLabel: {
    // Use the same readable size as core body copy so options feel like
    // first-class choices, not secondary metadata.
    ...typography.body,
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
  revealIntroText: {
    marginBottom: spacing.lg,
  },
  arcPreviewContainer: {
    marginBottom: spacing.lg,
  },
  arcPreviewCard: {
    padding: spacing.sm,
  },
  revealStepCard: {
    // Use the same white card surface and padding as other choice cards; no
    // custom background so it doesn't look like a separate gray panel.
    backgroundColor: colors.card,
  },
  revealInlineActions: {
    marginTop: spacing.md,
  },
  revealNarrativeBlock: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  arcIdentityRow: {
    gap: spacing.xs,
  },
  arcIdentityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  arcIdentityIcon: {
    opacity: 0.7,
  },
  arcIdentityLabel: {
    // Match field micro-label styling so this feels like a structured identity field,
    // not a section header.
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  arcIdentitySentence: {
    ...typography.body,
    color: colors.textPrimary,
  },
  narrativeLeadText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Skeleton blocks for the Arc preview while the aspiration is generating.
  skeletonBlock: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
  },
  skeletonLabelBlock: {
    width: 80,
    height: 10,
  },
  skeletonSentenceBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  skeletonSentenceBlock: {
    flex: 1,
    height: 12,
  },
  skeletonSentenceBlockShort: {
    flex: 0.4,
    height: 12,
  },
});


