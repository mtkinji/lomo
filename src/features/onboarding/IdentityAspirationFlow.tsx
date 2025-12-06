import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Heading, Text } from '../../ui/primitives';
import { Input } from '../../ui/Input';
import { CelebrationGif } from '../../ui/CelebrationGif';
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
  const [hasStreamedDreamsIntroCopy, setHasStreamedDreamsIntroCopy] = useState(false);

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
  const bigDreams =
    dreamInput.trim().length > 0 ? [dreamInput.trim()] : [];

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

  // Sanitize Arc name to ensure it follows 1-3 word pattern
  const sanitizeArcName = (name: string): string => {
    if (!name) return 'Identity Growth';
    
    let cleaned = name.trim();
    
    // Remove common prefixes that violate the pattern
    cleaned = cleaned.replace(/^(toward|towards|becoming|i want to|i want|i'd|i can)\s+/i, '');
    
    // Remove "I want" patterns that shouldn't be in the name
    cleaned = cleaned.replace(/\bi want\b/gi, '');
    
    // Split into words and take first 1-3 meaningful words
    const words = cleaned.split(/\s+/).filter((word) => {
      const lower = word.toLowerCase();
      const hasLetter = /[a-z]/i.test(lower);
      // Filter out common filler words and standalone symbols like "&"
      return (
        word.length > 0 &&
        hasLetter &&
        !['to', 'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'of', 'with'].includes(lower) &&
        !lower.match(/^(i|you|we|they|it)$/)
      );
    });
    
    // Take first 1-3 words, capitalize first letter of each
    const meaningfulWords = words.slice(0, 3);
    if (meaningfulWords.length === 0) {
      return 'Identity Growth';
    }
    
    return meaningfulWords
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
    const impactLabel = impact || 'a way you want your life to touch others';
    const valueLabel = valueOrientation || 'a core value';
    const philosophyLabel = philosophy || 'a way of moving through life';
    const vocationLabel = vocation || 'a kind of work that feels like home';
    const dreamsLabel =
      bigDreams.length > 0
        ? bigDreams.join('; ')
        : "one or two concrete things you'd love to bring to life someday";

    // Generate Arc name using allowed patterns: Domain+Posture, Value+Domain, Two-noun frame
    // Must be 1-3 words (emoji prefix allowed)
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

      // Extract key words from domain and trait for Domain+Posture or Two-noun patterns
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

      // If we have a big dream, extract 1-2 key words from it
      if (bigDreams.length > 0) {
        const firstDream = bigDreams[0].toLowerCase();
        // Remove common words and extract meaningful nouns
        const meaningfulWords = firstDream
          .replace(/\b(i want to|i want|i'd|i can|and|the|a|an|into|turn|build|make|create|sell|profitable|lifestyle|business|product|physical)\b/gi, '')
          .split(/\s+/)
          .filter((word) => word.length > 3)
          .slice(0, 2);
        
        if (meaningfulWords.length > 0) {
          const capitalized = meaningfulWords
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (meaningfulWords.length <= 2) {
            return capitalized;
          }
        }
      }

      // Fallback: use domain word or simple identity arena
      if (domainWord) {
        return domainWord.charAt(0).toUpperCase() + domainWord.slice(1);
      }

      return 'Identity Growth';
    };

    const arcName = sanitizeArcName(generateArcName());

    // Generate 3-sentence narrative following the new model:
    // Sentence 1: Start with "I want…", express identity direction
    // Sentence 2: Why this direction matters now (using signals)
    // Sentence 3: One concrete ordinary-life scene (grounded in proud moment + strength + values)
    
    // Helper to clean and format user inputs for natural sentence insertion
    const cleanPhrase = (phrase: string): string => {
      if (!phrase) return '';
      // Remove "I want" patterns that shouldn't appear in the narrative
      let cleaned = phrase.toLowerCase().replace(/\bi want to\b|\bi want\b|\bi'd\b|\bi can\b/gi, '').trim();
      // Remove leading articles if they create awkward grammar
      cleaned = cleaned.replace(/^(a|an|the)\s+/i, '');
      // Capitalize first letter for sentence start or keep lowercase for mid-sentence
      return cleaned;
    };

    // Extract core domain concept (first meaningful word or phrase)
    const domainCore = domainLabel.split(/[&,]/)[0]?.trim().toLowerCase() || 'growth';
    const motivationCore = motivationLabel.split(/[&,]/)[0]?.trim().toLowerCase() || 'purpose';
    const traitCore = traitLabel.replace(/^Your\s+/i, '').split(/[&,]/)[0]?.trim().toLowerCase() || 'strength';
    
    // Sentence 1: Identity direction
    const sentence1 = `I want to grow into someone who cares deeply about ${domainCore}, powered by ${motivationCore}, and who leans on ${traitCore} as a real strength.`;
    
    // Sentence 2: Why it matters now - need to construct proper grammar
    const growthEdgeCore = growthEdgeLabel.toLowerCase().trim();
    // Fix incomplete phrases like "staying consistent" -> "I'm working on staying consistent"
    const growthEdgePhrase = growthEdgeCore.match(/^(staying|being|becoming|learning|working)/i)
      ? `I'm working on ${growthEdgeCore}`
      : growthEdgeCore.startsWith('i ') || growthEdgeCore.startsWith('i\'m ')
      ? growthEdgeCore
      : `I'm learning to navigate ${growthEdgeCore}`;
    
    // Extract key concept from dreams (remove "I want" patterns and extract 2-4 key words)
    let dreamPhrase = '';
    if (bigDreams.length > 0) {
      const firstDream = bigDreams[0].toLowerCase();
      // Remove "I want" patterns and extract meaningful words
      const meaningfulWords = firstDream
        .replace(/\bi want to\b|\bi want\b|\bi'd\b|\bi can\b/gi, '')
        .split(/\s+/)
        .filter((word) => word.length > 3 && !['that', 'this', 'with', 'into', 'turn'].includes(word))
        .slice(0, 4)
        .join(' ');
      dreamPhrase = meaningfulWords || 'what matters most';
    }
    
    const valueCore = valueLabel.split(/[&,]/)[0]?.trim().toLowerCase() || 'integrity';
    
    const sentence2 = bigDreams.length > 0 && dreamPhrase
      ? `This direction matters now because ${growthEdgePhrase}, and I'm learning to bring ${dreamPhrase} to life in a way that stays grounded, kind to my energy, and aligned with ${valueCore}.`
      : `This direction matters now because ${growthEdgePhrase}, and I'm learning to move toward what matters at a pace that feels sustainable and true to ${valueCore}.`;

    // Sentence 3: Concrete everyday scene
    const proudMomentCore = proudMomentLabel.toLowerCase().trim();
    const vocationCore = vocationLabel.split(/[&,]/)[0]?.trim().toLowerCase() || 'work';
    
    // Fix philosophy phrase - handle "with clarity and intention" -> "clarity and intention"
    let philosophyPhrase = philosophyLabel.toLowerCase().trim();
    philosophyPhrase = philosophyPhrase.replace(/^(with|through|by|via)\s+/i, '');
    
    const sentence3 = `On normal days, that often looks like ${proudMomentCore} in the way I move through ${vocationCore}, staying true to my approach of ${philosophyPhrase || 'thoughtful intention'}.`;

    const aspirationSentence = `${sentence1} ${sentence2} ${sentence3}`;

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
      workflowRuntime,
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
        workflowStepId: 'arc_insights_quality_check',
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
      workflowRuntime,
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
        workflowStepId: 'arc_insights_generate',
      };

      // Try up to 3 candidates, using the quality judge to avoid very weak drafts.
      const QUALITY_THRESHOLD = 7.5;

      let bestCandidate: ArcDevelopmentInsights | null = null;
      let bestScore: number | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const reply = await sendCoachChat(messages, options);
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
      workflowRuntime,
      scoreArcInsightQuality,
      buildLocalInsightsFallback,
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
      if (bigDreams.length > 0) {
        inputsSummaryLines.push(
          `concrete big things the user would love to bring to life (treat these as high-priority identity imagery, not task lists): ${bigDreams.join(
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

      const buildPrompt = (judgeFeedback?: string) => {
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
          '-----------------------------------------',
          'ARC NAME — RULES',
          '-----------------------------------------',
          'Arc.name must:',
          '- be 1–3 words (emoji prefix allowed),',
          '- describe an identity direction or arena,',
          '- feel stable over years (can hold many goals),',
          '- reflect the user\'s inputs (domain + vibe + dream),',
          '- when a concrete big dream is present, treat it as a primary naming anchor so the Arc name quietly points at that dream (or its essence),',
          '- avoid personality types ("The Visionary", "The Genius"),',
          '- avoid tasks ("Start My Business", "Get Fit This Year"),',
          '- avoid vague abstractions ("My Best Self", "Life Journey"),',
          '- avoid abstract noun combinations that don\'t form a coherent identity ("Creativity Curiosity", "Exploration Discovery", "Growth Learning").',
          '',
          'Allowed name patterns (choose ONE and follow it exactly):',
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
          '3. Sentence 3: In another short sentence, give one concrete, ordinary-life scene showing how this direction appears on a normal day. Use grounded images anchored in proud-moment and strength signals, not generic abstractions.',
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

      const options: CoachChatOptions = {
        mode: 'firstTimeOnboarding',
        workflowDefinitionId: workflowRuntime?.definition?.id,
        workflowInstanceId: workflowRuntime?.instance?.id,
        workflowStepId: 'aspiration_generate',
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

          const reply = await sendCoachChat(messages, options);
          const parsed = parseAspirationFromReply(reply);

          if (!parsed) {
            // Try again if we couldn't parse JSON; let the loop handle fallback.
            continue;
          }

          // Pre-filter: Check for obvious grammatical errors before quality scoring
          const narrative = parsed.aspirationSentence.toLowerCase();
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
          
          if (hasRawInputPattern || wordSaladPattern) {
            // Skip this candidate - it has obvious grammatical errors
            if (__DEV__) {
              console.warn('[onboarding] Skipping candidate with grammatical errors:', {
                hasRawInputPattern,
                wordSaladPattern,
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

    addArc(arc);
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

    const copy =
      'That gives me a really solid sketch of who **Future You** is becoming. 🎉';

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
    setPhase('dreams');
  };

  const renderDomain = () => (
    <>
    <Card style={[styles.stepCard, styles.researchCard]}>
      <View style={styles.stepBody}>
          <Text style={styles.questionMeta}>1 of 10</Text>
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
          <Text style={styles.questionMeta}>2 of 10</Text>
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
          <Text style={styles.questionMeta}>3 of 10</Text>
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
          <Text style={styles.questionMeta}>4 of 10</Text>
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
          <Text style={styles.questionMeta}>5 of 10</Text>
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
          <Text style={styles.questionMeta}>6 of 10</Text>
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
          <Text style={styles.questionMeta}>7 of 10</Text>
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
                    handleConfirmImpact(option.label);
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
          <Text style={styles.questionMeta}>8 of 10</Text>
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
          <Text style={styles.questionMeta}>9 of 10</Text>
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
          <Text style={styles.questionMeta}>10 of 10</Text>
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
    const trimmed = dreamInput.trim();
    if (!trimmed) {
      return;
    }

    // Mirror earlier steps: echo the user's free-response answer into the
    // shared chat surface so it appears as a green message bubble.
    appendChatUserMessage(trimmed);

    if (workflowRuntime) {
      workflowRuntime.completeStep('nickname_optional', { nickname: null });
    }

    setPhase('generating');
    void generateAspiration();
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
        <Card style={styles.stepCard}>
          <View style={styles.stepBody}>
            <CelebrationGif kind="firstArcDreamsPrompt" size="md" />
          </View>
        </Card>
        <Card style={[styles.stepCard, styles.researchCard]}>
          <View style={styles.stepBody}>
            <Text style={styles.questionMeta}>Part 2 of 2</Text>
            <Text style={styles.questionTitle}>
              Looking 5–10 years ahead, what’s one big thing you’d love to have brought to life?
            </Text>
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
                <Text style={styles.primaryButtonLabel}>Continue</Text>
              </Button>
            </View>
          </View>
        </Card>
      </View>
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
  dreamsStack: {
    gap: spacing.lg,
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
  questionMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
});


