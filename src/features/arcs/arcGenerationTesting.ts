/**
 * Arc Generation Testing Framework
 * 
 * This module provides tools to test different prompting paradigms against
 * synthetic questionnaire responses to identify which approaches produce
 * the highest quality Arcs.
 */

import type { GeneratedArc, ArcRubricJudgeResult, ArcComparisonRubricJudgeResult } from '../../services/ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateArcs, judgeArcRubric, judgeArcComparisonRubric } from '../../services/ai';

/**
 * Synthetic questionnaire response structure matching the IdentityAspirationFlow inputs
 */
export type SyntheticQuestionnaireResponse = {
  id: string;
  description: string; // Human-readable description of this persona
  ageBand: SyntheticAgeBand;
  domain: string;
  motivation: string;
  signatureTrait: string;
  growthEdge: string;
  proudMoment: string;
  meaning: string;
  impact: string;
  valueOrientation: string;
  philosophy: string;
  vocation: string;
  whyNow?: string;
  bigDreams: string[];
  nickname?: string;
  // Archetype/emulation (tap-centric) fields.
  // These are designed for a chip-based questionnaire experience.
  roleModelTypeId?: ArchetypeRoleModelTypeId; // tap: what kind of people do you look up to?
  specificRoleModelId?: ArchetypeSpecificRoleModelId | 'none' | 'not_sure'; // tap: pick a person (optional)
  roleModelWhyId?: ArchetypeRoleModelWhyId; // tap: why did you pick them? (optional follow-up)
  admiredQualityIds?: ArchetypeAdmiredQualityId[]; // tap: what do you admire? (multi-select)

  // Legacy free-text (kept for backward compat / richer prompts when available).
  roleModelType?: string;
  specificRoleModels?: string[];
  admiredQualities?: string[];
};

export type SyntheticAgeBand =
  | '13-15'
  | '16-17'
  | '18-24'
  | '25-plus';

/**
 * Archetype / Emulation (tap-centric) question option sets
 */
export type ArchetypeRoleModelTypeId =
  | 'builders_makers'
  | 'artists_creatives'
  | 'leaders_founders'
  | 'teachers_mentors'
  | 'helpers_carers'
  | 'athletes_competitors'
  | 'calm_steady_people'
  | 'brave_truth_tellers';

export const ARCHETYPE_ROLE_MODEL_TYPES: Array<{ id: ArchetypeRoleModelTypeId; label: string }> = [
  { id: 'builders_makers', label: 'Builders & makers' },
  { id: 'artists_creatives', label: 'Artists & creatives' },
  { id: 'leaders_founders', label: 'Leaders & founders' },
  { id: 'teachers_mentors', label: 'Teachers & mentors' },
  { id: 'helpers_carers', label: 'Helpers & carers' },
  { id: 'athletes_competitors', label: 'Athletes & competitors' },
  { id: 'calm_steady_people', label: 'Calm, steady people' },
  { id: 'brave_truth_tellers', label: 'Brave truth-tellers' },
];

export type ArchetypeSpecificRoleModelId =
  | 'parent_guardian'
  | 'coach_teacher'
  | 'older_sibling_friend'
  | 'local_leader'
  | 'artist_creator'
  | 'builder_maker'
  | 'founder_builder'
  | 'public_figure';

export const ARCHETYPE_SPECIFIC_ROLE_MODELS: Array<{ id: ArchetypeSpecificRoleModelId; label: string }> = [
  { id: 'parent_guardian', label: 'A parent / guardian' },
  { id: 'coach_teacher', label: 'A coach / teacher' },
  { id: 'older_sibling_friend', label: 'An older sibling / friend' },
  { id: 'local_leader', label: 'Someone I know who leads well' },
  { id: 'artist_creator', label: 'An artist / creator I like' },
  { id: 'builder_maker', label: 'A builder / maker I like' },
  { id: 'founder_builder', label: 'A founder / builder I like' },
  { id: 'public_figure', label: 'A public figure' },
];

export type ArchetypeRoleModelWhyId =
  | 'how_they_treat_people'
  | 'how_they_handle_pressure'
  | 'how_they_work'
  | 'how_they_create'
  | 'how_they_lead'
  | 'how_they_live_values'
  | 'how_they_keep_going';

export const ARCHETYPE_ROLE_MODEL_WHY: Array<{ id: ArchetypeRoleModelWhyId; label: string }> = [
  { id: 'how_they_treat_people', label: 'How they treat people' },
  { id: 'how_they_handle_pressure', label: 'How they handle pressure' },
  { id: 'how_they_work', label: 'How they work (craft/effort)' },
  { id: 'how_they_create', label: 'How they create / make things' },
  { id: 'how_they_lead', label: 'How they lead' },
  { id: 'how_they_live_values', label: 'How they live their values' },
  { id: 'how_they_keep_going', label: 'How they keep going when it’s hard' },
];

export type ArchetypeAdmiredQualityId =
  | 'curiosity'
  | 'patience'
  | 'discipline'
  | 'kindness'
  | 'courage'
  | 'calm'
  | 'integrity'
  | 'creativity'
  | 'consistency'
  | 'humility'
  | 'clarity'
  | 'craft'
  | 'care_for_others'
  | 'bravery_truth'
  | 'resilience';

export const ARCHETYPE_ADMIRED_QUALITIES: Array<{ id: ArchetypeAdmiredQualityId; label: string }> = [
  { id: 'curiosity', label: 'Curiosity' },
  { id: 'patience', label: 'Patience' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'kindness', label: 'Kindness' },
  { id: 'courage', label: 'Courage' },
  { id: 'calm', label: 'Calm under pressure' },
  { id: 'integrity', label: 'Integrity / honesty' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'humility', label: 'Humility / teachability' },
  { id: 'clarity', label: 'Clarity (makes things simple)' },
  { id: 'craft', label: 'Craft / skill' },
  { id: 'care_for_others', label: 'Caring for others' },
  { id: 'bravery_truth', label: 'Bravery to tell the truth' },
  { id: 'resilience', label: 'Resilience' },
];

const labelFor = <T extends { id: string; label: string }>(list: T[], id: string | undefined) =>
  id ? list.find((x) => x.id === id)?.label : undefined;

const labelsFor = <T extends { id: string; label: string }>(list: T[], ids: string[] | undefined) =>
  (ids ?? [])
    .map((id) => list.find((x) => x.id === id)?.label)
    .filter((x): x is string => Boolean(x));

/**
 * Prompt paradigm definition
 */
export type PromptParadigm = {
  id: string;
  name: string;
  description: string;
  /**
   * Dev-only: if false, this paradigm is excluded from Arc Testing runs.
   * Useful for pruning consistently underperforming paradigms.
   */
  enabled?: boolean;
  buildPrompt: (response: SyntheticQuestionnaireResponse) => {
    prompt: string;
    timeHorizon?: string;
    additionalContext?: string;
  };
};

/**
 * Test result for a single paradigm + response combination
 */
export type TestResult = {
  paradigmId: string;
  responseId: string;
  arcs: GeneratedArc[];
  timestamp: string;
  error?: string;
};

/**
 * Comparison result showing how different paradigms performed
 */
export type ComparisonResult = {
  responseId: string;
  results: Array<{
    paradigmId: string;
    arcs: GeneratedArc[];
    error?: string;
  }>;
};

/**
 * Scoring / rubric types
 */
export type RubricFactorId =
  | 'ease_answering_14yo'
  | 'survey_length'
  | 'arc_quality'
  | 'arc_felt_accuracy'
  | 'arc_reading_ease'
  | 'arc_everyday_concreteness'
  | 'arc_clarity';

export type RubricWeights = Record<RubricFactorId, number>;

export type RubricRow = {
  paradigmId: string;
  paradigmName: string;
  // 0–10 each
  easeAnswering14yo: number;
  surveyLength: number;
  arcQuality: number;
  arcFeltAccuracy: number;
  arcReadingEase: number;
  arcEverydayConcreteness: number;
  arcClarity: number;
  overall: number;
  notes?: string[];
};

export type RubricTable = {
  responseId: string;
  responseDescription: string;
  rows: RubricRow[];
  weights: RubricWeights;
};

type ArcTestingScoringMode = 'heuristic' | 'ai';

type ArcTestingParadigmRunRow = {
  paradigmId: string;
  paradigmName: string;
  overall: number;
  arcQuality: number;
  arcFeltAccuracy: number;
  arcReadingEase: number;
  arcEverydayConcreteness: number;
  arcClarity: number;
};

type ArcTestingParadigmRun = {
  runId: string;
  createdAt: string;
  scoringMode: ArcTestingScoringMode;
  judgeModel?: string;
  generationModel?: string;
  responseCount?: number;
  rows: ArcTestingParadigmRunRow[];
};

type ArcTestingParadigmStats = {
  paradigmId: string;
  paradigmName: string;
  runs: number;
  meanOverall: number;
  meanDeltaFromMedian: number;
  lastOverall?: number;
  lastDeltaFromMedian?: number;
};

const ARC_TESTING_PRUNING_HISTORY_KEY = 'kwilt-arc-testing-pruning-history-v1';
const ARC_TESTING_PRUNING_MAX_RUNS = 25;
const ARC_TESTING_PRUNING_MIN_RUNS = 3;
const ARC_TESTING_PRUNING_KEEP_FRACTION = 0.5; // keep top half, prune bottom half

const safeJsonParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const loadPruningHistory = async (): Promise<ArcTestingParadigmRun[]> => {
  if (!__DEV__) return [];
  const raw = await AsyncStorage.getItem(ARC_TESTING_PRUNING_HISTORY_KEY);
  const parsed = safeJsonParse<ArcTestingParadigmRun[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const savePruningHistory = async (runs: ArcTestingParadigmRun[]): Promise<void> => {
  if (!__DEV__) return;
  const trimmed =
    runs.length > ARC_TESTING_PRUNING_MAX_RUNS ? runs.slice(runs.length - ARC_TESTING_PRUNING_MAX_RUNS) : runs;
  await AsyncStorage.setItem(ARC_TESTING_PRUNING_HISTORY_KEY, JSON.stringify(trimmed));
};

const computeMedian = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

const mean = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const computeStatsFromHistory = (history: ArcTestingParadigmRun[]): ArcTestingParadigmStats[] => {
  // Only use full-suite-like runs (responseCount > 1) when present.
  const suiteRuns = history.filter((r) => (r.responseCount ?? 0) > 1);
  const runsToUse = suiteRuns.length > 0 ? suiteRuns : history;

  const byParadigm = new Map<string, ArcTestingParadigmRunRow[]>();
  runsToUse.forEach((run) => {
    const median = computeMedian(run.rows.map((r) => r.overall));
    run.rows.forEach((row) => {
      const list = byParadigm.get(row.paradigmId) ?? [];
      list.push({ ...row, overall: clamp0to10(row.overall), arcQuality: clamp0to10(row.arcQuality) });
      byParadigm.set(row.paradigmId, list);
      // Store delta from median in a separate map via a side-channel array (below).
    });
  });

  const stats: ArcTestingParadigmStats[] = [];
  for (const [paradigmId, rows] of byParadigm.entries()) {
    const overallByRun: number[] = [];
    const deltas: number[] = [];
    // Re-walk runs to compute per-run deltas.
    runsToUse.forEach((run) => {
      const row = run.rows.find((r) => r.paradigmId === paradigmId);
      if (!row) return;
      const median = computeMedian(run.rows.map((r) => r.overall));
      overallByRun.push(clamp0to10(row.overall));
      deltas.push(clamp0to10(row.overall) - clamp0to10(median));
    });

    const last = overallByRun.length ? overallByRun[overallByRun.length - 1] : undefined;
    const lastDelta = deltas.length ? deltas[deltas.length - 1] : undefined;
    const paradigmName = rows[rows.length - 1]?.paradigmName ?? paradigmId;
    stats.push({
      paradigmId,
      paradigmName,
      runs: overallByRun.length,
      meanOverall: mean(overallByRun),
      meanDeltaFromMedian: mean(deltas),
      lastOverall: last,
      lastDeltaFromMedian: lastDelta,
    });
  }
  stats.sort((a, b) => b.meanOverall - a.meanOverall);
  return stats;
};

export type ArcTestingPruningDecision = {
  prunedParadigmIds: string[];
  stats: ArcTestingParadigmStats[];
  usedRuns: number;
  eligibleCount: number;
  keepCount: number;
  cutoffMeanOverall?: number;
  reason?: string;
};

export const computePruningDecisionFromHistory = (history: ArcTestingParadigmRun[]): ArcTestingPruningDecision => {
  const stats = computeStatsFromHistory(history);
  const eligible = stats.filter((s) => s.runs >= ARC_TESTING_PRUNING_MIN_RUNS);

  if (eligible.length < 4) {
    return {
      prunedParadigmIds: [],
      stats,
      usedRuns: history.length,
      eligibleCount: eligible.length,
      keepCount: eligible.length,
      reason: 'insufficient_history',
    };
  }

  const keepCount = Math.max(1, Math.ceil(eligible.length * ARC_TESTING_PRUNING_KEEP_FRACTION));
  const kept = eligible.slice(0, keepCount);
  const pruned = eligible.slice(keepCount).map((s) => s.paradigmId);
  const cutoffMeanOverall = kept.length ? kept[kept.length - 1]?.meanOverall : undefined;

  return {
    prunedParadigmIds: pruned,
    stats,
    usedRuns: history.length,
    eligibleCount: eligible.length,
    keepCount,
    cutoffMeanOverall,
  };
};

/**
 * Records an aggregate (mean-across-responses) rubric run for pruning history.
 * Call this after a full-suite run has been scored.
 */
export async function recordArcTestingAggregateRun(params: {
  rows: RubricRow[];
  scoringMode: ArcTestingScoringMode;
  judgeModel?: string;
  generationModel?: string;
  responseCount?: number;
}): Promise<void> {
  if (!__DEV__) return;
  const history = await loadPruningHistory();
  const run: ArcTestingParadigmRun = {
    runId: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    scoringMode: params.scoringMode,
    judgeModel: params.judgeModel,
    generationModel: params.generationModel,
    responseCount: params.responseCount,
    rows: params.rows.map((r) => ({
      paradigmId: r.paradigmId,
      paradigmName: r.paradigmName,
      overall: r.overall,
      arcQuality: r.arcQuality,
      arcFeltAccuracy: r.arcFeltAccuracy,
      arcReadingEase: r.arcReadingEase,
      arcEverydayConcreteness: r.arcEverydayConcreteness,
      arcClarity: r.arcClarity,
    })),
  };
  await savePruningHistory([...history, run]);
}

export async function getArcTestingPruningDecision(): Promise<ArcTestingPruningDecision> {
  const history = await loadPruningHistory();
  return computePruningDecisionFromHistory(history);
}

export async function clearArcTestingPruningHistory(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(ARC_TESTING_PRUNING_HISTORY_KEY);
}

const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  ease_answering_14yo: 0.15,
  survey_length: 0.1,
  arc_quality: 0.35,
  arc_felt_accuracy: 0.15,
  arc_reading_ease: 0.12,
  arc_everyday_concreteness: 0.08,
  arc_clarity: 0.05,
};

const clamp0to10 = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
};
const clamp0to1 = (n: number) => Math.max(0, Math.min(1, n));

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u2019]/g, "'")
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3);

const sentenceSplit = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.!?]+(?:\s|$)+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const countMeaningfulNameWords = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    // Count tokens that contain letters/numbers; ignore emoji/punctuation-only tokens.
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

const approximateSyllables = (word: string) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  // Rough heuristic: count vowel groups.
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 0;
  // Silent trailing e
  if (w.endsWith('e') && !w.endsWith('le') && count > 1) count -= 1;
  return Math.max(1, count);
};

const fleschReadingEase = (text: string) => {
  const sentences = sentenceSplit(text);
  const words = tokenize(text);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((acc, w) => acc + approximateSyllables(w), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  // Flesch Reading Ease
  return 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
};

const CLICHE_PHRASES: string[] = [
  'make a difference',
  'lasting impact',
  'turn my dreams into reality',
  'embrace the journey',
  'step outside of my comfort zone',
  'challenge the status quo',
  'bring my vision to life',
  'meaningful problems',
  'innovative solutions',
  'bold entrepreneur',
  'growth mindset',
];

const containsCliche = (text: string) => {
  const t = normalizeText(text);
  return CLICHE_PHRASES.some((p) => t.includes(p));
};

const arcConstraintScore = (arc: GeneratedArc): { score: number; notes: string[] } => {
  const notes: string[] = [];
  let score = 10;
  const name = (arc.name ?? '').trim();
  const narrative = String(arc.narrative ?? '').trim();
  const wordTokens = narrative.split(/\s+/).filter(Boolean);
  const words = wordTokens.length;
  const sentences = sentenceSplit(narrative).length;

  const meaningfulWords = countMeaningfulNameWords(name);
  if (meaningfulWords < 1 || meaningfulWords > 3) {
    score -= 2;
    notes.push('name not 1–3 words');
  }
  if (name.length > 42) {
    score -= 1;
    notes.push('name too long');
  }
  if (!/^I want(?:\s|…)/.test(narrative)) {
    score -= 2;
    notes.push('narrative does not start with “I want…”');
  }
  if (sentences !== 3) {
    score -= 2;
    notes.push('narrative not exactly 3 sentences');
  }
  if (words < 40 || words > 120) {
    score -= 2;
    notes.push('narrative word count out of bounds');
  }
  if (/\n/.test(narrative)) {
    score -= 1;
    notes.push('narrative has newlines');
  }

  return { score: clamp0to10(score), notes };
};

const arcSpecificityScore = (response: SyntheticQuestionnaireResponse, arc: GeneratedArc) => {
  const narrative = String(arc.narrative ?? '');
  const name = String(arc.name ?? '');
  const combined = `${name} ${narrative}`;
  const tokens = tokenize(combined);
  const unique = new Set(tokens);

  // Reward anchoring in user-provided concretes (dreams, role model qualities, nickname).
  const tappedRoleModelType = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, response.roleModelTypeId);
  const tappedWhy = labelFor(ARCHETYPE_ROLE_MODEL_WHY, response.roleModelWhyId);
  const tappedQualities = labelsFor(ARCHETYPE_ADMIRED_QUALITIES, response.admiredQualityIds as string[] | undefined);
  const anchors: string[] = [
    ...(response.bigDreams ?? []),
    ...(tappedQualities ?? []),
    ...(response.admiredQualities ?? []),
    ...(response.specificRoleModels ?? []),
    tappedRoleModelType ?? '',
    tappedWhy ?? '',
    response.nickname ?? '',
  ].filter(Boolean);
  const anchorTokens = new Set(tokenize(anchors.join(' ')));
  const overlap = [...anchorTokens].filter((t) => unique.has(t)).length;

  // Penalize cliché density.
  const clichePenalty = containsCliche(combined) ? 2 : 0;
  const base = 4 + Math.min(4, unique.size / 35) * 4; // 4..8 based on lexical variety
  const anchorBonus = Math.min(2, overlap / 4); // up to +2
  return clamp0to10(base + anchorBonus - clichePenalty);
};

const arcAlignmentScore = (response: SyntheticQuestionnaireResponse, arc: GeneratedArc) => {
  const tappedRoleModelType = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, response.roleModelTypeId);
  const tappedWhy = labelFor(ARCHETYPE_ROLE_MODEL_WHY, response.roleModelWhyId);
  const tappedQualities = labelsFor(ARCHETYPE_ADMIRED_QUALITIES, response.admiredQualityIds as string[] | undefined);
  const responseText = [
    response.domain,
    response.motivation,
    response.signatureTrait,
    response.growthEdge,
    response.proudMoment,
    response.meaning,
    response.impact,
    response.valueOrientation,
    response.philosophy,
    response.vocation,
    response.whyNow ?? '',
    ...(response.bigDreams ?? []),
    response.nickname ?? '',
    tappedRoleModelType ?? '',
    tappedWhy ?? '',
    ...(tappedQualities ?? []),
    response.roleModelType ?? '',
    ...(response.admiredQualities ?? []),
  ].join(' ');

  const a = new Set(tokenize(responseText));
  const b = new Set(tokenize(`${arc.name ?? ''} ${arc.narrative ?? ''}`));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  const jaccard = union === 0 ? 0 : intersection / union;
  return clamp0to10(jaccard * 20); // scale into 0..10-ish range
};

const arcInterpretabilityScore = (arc: GeneratedArc) => {
  const narrative = String(arc.narrative ?? '').trim();
  if (!narrative) return 0;
  const fre = fleschReadingEase(narrative); // higher is easier
  // Convert FRE to 0–10. 30 is hard; 70 is easy.
  const freScore = clamp0to10(((fre - 30) / 40) * 10);

  const sentences = sentenceSplit(narrative);
  const words = narrative.split(/\s+/).filter(Boolean);
  const avgSentenceWords = sentences.length ? words.length / sentences.length : words.length;
  const longSentencePenalty = avgSentenceWords > 28 ? 2 : avgSentenceWords > 24 ? 1 : 0;

  return clamp0to10(freScore - longSentencePenalty);
};

const arcEverydayConcretenessScore = (arc: GeneratedArc) => {
  const narrative = normalizeText(String(arc.narrative ?? ''));
  if (!narrative) return 0;

  // Concrete action/scene signals (very lightweight heuristic).
  const sceneSignals = [
    'when',
    'on',
    'at',
    'in',
    'while',
    'today',
    'tomorrow',
    'morning',
    'afternoon',
    'evening',
    'weekend',
    'after school',
    'before school',
    'at work',
    'at home',
    'with my',
  ];
  const concreteVerbs = [
    'build',
    'make',
    'practice',
    'train',
    'write',
    'ship',
    'cook',
    'study',
    'teach',
    'plan',
    'call',
    'listen',
    'show up',
    'walk',
    'run',
    'lift',
    'draw',
    'record',
    'post',
  ];
  const abstractNouns = [
    'impact',
    'purpose',
    'journey',
    'growth',
    'potential',
    'mindset',
    'legacy',
    'meaning',
    'values',
    'authenticity',
    'fulfillment',
    'innovation',
  ];

  const hasScene = sceneSignals.some((s) => narrative.includes(s));
  const verbHits = concreteVerbs.filter((v) => narrative.includes(v)).length;
  const abstractHits = abstractNouns.filter((n) => narrative.includes(n)).length;

  // Start from 3. Add for scene + action. Subtract for abstract density.
  let score = 3;
  if (hasScene) score += 2;
  score += Math.min(4, verbHits); // up to +4
  score -= Math.min(3, Math.floor(abstractHits / 3)); // -0..-3
  return clamp0to10(score);
};

/**
 * Heuristic proxy for "felt accuracy / does it get them?"
 * This is intentionally approximate; AI-judged scoring is preferred for this dimension.
 */
const arcFeltAccuracyScore = (response: SyntheticQuestionnaireResponse, arc: GeneratedArc) => {
  // Blend existing alignment + specificity as a proxy for perceived personal relevance.
  const alignment = clamp0to10(arcAlignmentScore(response, arc));
  const specificity = clamp0to10(arcSpecificityScore(response, arc));
  // Slight penalty if the Arc is extremely generic (low specificity).
  const genericPenalty = specificity < 4 ? 1 : 0;
  return clamp0to10(alignment * 0.55 + specificity * 0.45 - genericPenalty);
};

const arcClarityScore = (arc: GeneratedArc) => {
  const name = String(arc.name ?? '').toLowerCase();
  const narrative = normalizeText(String(arc.narrative ?? ''));
  let score = 10;

  const vagueNameTokens = ['mindset', 'journey', 'impact', 'purposeful', 'growth'];
  if (vagueNameTokens.some((t) => name.includes(t))) score -= 1;
  if (containsCliche(narrative)) score -= 2;
  // Penalize if it reads like traits stacked without scene words.
  const sceneSignals = ['when', 'on', 'at', 'in', 'while', 'today', 'morning', 'table', 'home', 'desk', 'phone'];
  const hasSceneWord = sceneSignals.some((t) => narrative.includes(t));
  if (!hasSceneWord) score -= 1;

  return clamp0to10(score);
};

const questionCountByParadigmId: Record<string, number> = {
  baseline: 11,
  narrative_first: 11,
  identity_spine: 11,
  dream_anchor: 6,
  minimalist: 4,
  question_answer: 10,
  contrast_based: 11,
  values_first: 6,
  // Tap-centric: role model type + specific person + why + admired qualities
  archetype_emulation: 4,
  // Minimal essentials + (optional) role model taps
  hybrid_minimalist_archetype: 5,
};

const easeAnswering14yoByParadigmId: Record<string, number> = {
  baseline: 5,
  narrative_first: 6,
  identity_spine: 5,
  dream_anchor: 7,
  minimalist: 9,
  question_answer: 7,
  contrast_based: 6,
  values_first: 6,
  // Tap-centric chips: easy; specific person pick is optional.
  archetype_emulation: 9,
  // Minimal + tap-centric; designed for teens.
  hybrid_minimalist_archetype: 9,
};

const surveyLengthScore = (questionCount: number) => {
  // 3 questions ≈ 10, 10 questions ≈ ~4.4, 12 questions ≈ ~2.8
  const score = 10 - Math.max(0, questionCount - 3) * 0.8;
  return clamp0to10(score);
};

/**
 * Compute rubric rows for a single response comparison.
 * Arc-quality-related factors are computed from the *best* Arc (highest quality score)
 * returned for each paradigm.
 */
export function computeRubricTableForComparison(
  comparison: ComparisonResult,
  options?: { weights?: RubricWeights }
): RubricTable {
  const response = SYNTHETIC_RESPONSES.find((r) => r.id === comparison.responseId);
  const weights = options?.weights ?? DEFAULT_RUBRIC_WEIGHTS;
  const responseDescription = response?.description ?? comparison.responseId;

  const rows: RubricRow[] = comparison.results.map((result) => {
    const paradigm = PROMPT_PARADIGMS.find((p) => p.id === result.paradigmId);
    const paradigmName = paradigm?.name ?? result.paradigmId;
    const notes: string[] = [];

    const qCount = questionCountByParadigmId[result.paradigmId] ?? 10;
    const ease = clamp0to10(easeAnswering14yoByParadigmId[result.paradigmId] ?? 6);
    const length = surveyLengthScore(qCount);

    if (result.error) {
      const overall = clamp0to10(
        ease * weights.ease_answering_14yo +
          length * weights.survey_length
      );
      notes.push(`error: ${result.error}`);
      return {
        paradigmId: result.paradigmId,
        paradigmName,
        easeAnswering14yo: ease,
        surveyLength: length,
        arcQuality: 0,
        arcFeltAccuracy: 0,
        arcReadingEase: 0,
        arcEverydayConcreteness: 0,
        arcClarity: 0,
        overall,
        notes,
      };
    }

    const arcs = Array.isArray(result.arcs) ? result.arcs : [];
    if (!response || arcs.length === 0) {
      const overall = clamp0to10(
        ease * weights.ease_answering_14yo +
          length * weights.survey_length
      );
      notes.push('no arcs returned');
      return {
        paradigmId: result.paradigmId,
        paradigmName,
        easeAnswering14yo: ease,
        surveyLength: length,
        arcQuality: 0,
        arcFeltAccuracy: 0,
        arcReadingEase: 0,
        arcEverydayConcreteness: 0,
        arcClarity: 0,
        overall,
        notes,
      };
    }

    // Compute per-arc scores, pick best as the representative.
    const perArc = arcs.map((arc) => {
      const constraint = arcConstraintScore(arc);
      const specificity = arcSpecificityScore(response, arc);
      const alignment = arcAlignmentScore(response, arc);
      const readingEase = arcInterpretabilityScore(arc);
      const feltAccuracy = arcFeltAccuracyScore(response, arc);
      const everydayConcreteness = arcEverydayConcretenessScore(arc);
      const clarity = arcClarityScore(arc);

      // Quality emphasizes constraints + specificity + alignment + a light clarity term.
      const quality = clamp0to10(constraint.score * 0.35 + specificity * 0.35 + alignment * 0.2 + clarity * 0.1);

      return {
        arc,
        quality,
        feltAccuracy,
        readingEase,
        everydayConcreteness,
        clarity,
        constraintNotes: constraint.notes,
      };
    });

    const best = perArc.slice().sort((a, b) => b.quality - a.quality)[0]!;
    if (best.constraintNotes.length > 0) {
      notes.push(...best.constraintNotes.slice(0, 2));
    }

    const overall = clamp0to10(
      ease * weights.ease_answering_14yo +
        length * weights.survey_length +
        best.quality * weights.arc_quality +
        best.feltAccuracy * weights.arc_felt_accuracy +
        best.readingEase * weights.arc_reading_ease +
        best.everydayConcreteness * weights.arc_everyday_concreteness +
        best.clarity * weights.arc_clarity
    );

    return {
      paradigmId: result.paradigmId,
      paradigmName,
      easeAnswering14yo: ease,
      surveyLength: length,
      arcQuality: best.quality,
      arcFeltAccuracy: best.feltAccuracy,
      arcReadingEase: best.readingEase,
      arcEverydayConcreteness: best.everydayConcreteness,
      arcClarity: best.clarity,
      overall,
      notes: notes.length ? notes : undefined,
    };
  });

  // Sort best-first for display.
  rows.sort((a, b) => b.overall - a.overall);

  return {
    responseId: comparison.responseId,
    responseDescription,
    rows,
    weights,
  };
}

export function formatRubricTable(table: RubricTable): string {
  const lines: string[] = [];
  const response = SYNTHETIC_RESPONSES.find((r) => r.id === table.responseId);
  lines.push(
    `RUBRIC SCORES — ${table.responseDescription}${response?.ageBand ? ` (age ${response.ageBand})` : ''}`
  );
  lines.push('');
  lines.push('Paradigm | Ease(14yo) | Length | Quality | Felt | ReadEase | Everyday | Clarity | Overall');
  lines.push('---|---:|---:|---:|---:|---:|---:|---:|---:');
  for (const row of table.rows) {
    lines.push(
      `${row.paradigmName} | ${row.easeAnswering14yo.toFixed(1)} | ${row.surveyLength.toFixed(1)} | ${row.arcQuality.toFixed(1)} | ${row.arcFeltAccuracy.toFixed(1)} | ${row.arcReadingEase.toFixed(1)} | ${row.arcEverydayConcreteness.toFixed(1)} | ${row.arcClarity.toFixed(1)} | ${row.overall.toFixed(1)}`
    );
  }
  return lines.join('\n');
}

export function aggregateRubricTables(
  comparisons: ComparisonResult[],
  options?: { weights?: RubricWeights }
): { weights: RubricWeights; rows: RubricRow[] } {
  const weights = options?.weights ?? DEFAULT_RUBRIC_WEIGHTS;
  const byParadigm = new Map<string, RubricRow[]>();

  for (const comparison of comparisons) {
    const table = computeRubricTableForComparison(comparison, { weights });
    for (const row of table.rows) {
      const list = byParadigm.get(row.paradigmId);
      if (list) list.push(row);
      else byParadigm.set(row.paradigmId, [row]);
    }
  }

  const mean = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

  const rows: RubricRow[] = [...byParadigm.entries()].map(([paradigmId, entries]) => {
    const paradigmName = entries[0]?.paradigmName ?? paradigmId;
    return {
      paradigmId,
      paradigmName,
      easeAnswering14yo: mean(entries.map((e) => e.easeAnswering14yo)),
      surveyLength: mean(entries.map((e) => e.surveyLength)),
      arcQuality: mean(entries.map((e) => e.arcQuality)),
      arcFeltAccuracy: mean(entries.map((e) => e.arcFeltAccuracy)),
      arcReadingEase: mean(entries.map((e) => e.arcReadingEase)),
      arcEverydayConcreteness: mean(entries.map((e) => e.arcEverydayConcreteness)),
      arcClarity: mean(entries.map((e) => e.arcClarity)),
      overall: mean(entries.map((e) => e.overall)),
    };
  });

  rows.sort((a, b) => b.overall - a.overall);
  return { weights, rows };
}

type AiJudgeOptions = {
  enabled: boolean;
  judgeModel?: string;
};

const judgeCache = new Map<string, ArcRubricJudgeResult>();
const comparisonJudgeCache = new Map<string, ArcComparisonRubricJudgeResult>();

export function clearArcTestingJudgeCaches() {
  judgeCache.clear();
  comparisonJudgeCache.clear();
}

const cacheKeyForJudge = (args: {
  judgeModel: string;
  responseId: string;
  paradigmId: string;
  arcName: string;
  arcNarrative: string;
}) =>
  [
    'judge',
    args.judgeModel,
    args.responseId,
    args.paradigmId,
    normalizeText(args.arcName).slice(0, 80),
    normalizeText(args.arcNarrative).slice(0, 240),
  ].join('|');

const cacheKeyForComparisonJudge = (args: {
  judgeModel: string;
  responseId: string;
  candidates: Array<{ paradigmId: string; arcs: Array<{ name: string; narrative: string }> }>;
}) => {
  const arcDigest = args.candidates
    .map((c) => {
      const arcs = c.arcs
        .map((a) => `${normalizeText(a.name).slice(0, 60)}::${normalizeText(a.narrative).slice(0, 120)}`)
        .join('||');
      return `${c.paradigmId}=>${arcs}`;
    })
    .join('##');
  return ['comparisonJudge', args.judgeModel, args.responseId, arcDigest.slice(0, 1600)].join('|');
};

const buildResponseSummaryForJudge = (response: SyntheticQuestionnaireResponse) => {
  const tappedRoleModelType = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, response.roleModelTypeId);
  const tappedWhy = labelFor(ARCHETYPE_ROLE_MODEL_WHY, response.roleModelWhyId);
  const tappedQualities = labelsFor(ARCHETYPE_ADMIRED_QUALITIES, response.admiredQualityIds as string[] | undefined);
  const tappedSpecific =
    response.specificRoleModelId && response.specificRoleModelId !== 'none' && response.specificRoleModelId !== 'not_sure'
      ? labelFor(ARCHETYPE_SPECIFIC_ROLE_MODELS, response.specificRoleModelId)
      : response.specificRoleModelId === 'none'
      ? 'No one specific'
      : response.specificRoleModelId === 'not_sure'
      ? 'Not sure'
      : undefined;

  const lines: string[] = [
    `- ageBand: ${response.ageBand}`,
    `- domain: ${response.domain}`,
    `- vibe: ${response.motivation}`,
    `- social presence: ${response.signatureTrait}`,
    `- growth edge: ${response.growthEdge}`,
    `- proud moment: ${response.proudMoment}`,
    `- meaning: ${response.meaning}`,
    `- impact: ${response.impact}`,
    `- values: ${response.valueOrientation}`,
    `- philosophy: ${response.philosophy}`,
    `- vocation: ${response.vocation}`,
    response.whyNow ? `- whyNow: ${response.whyNow}` : '',
    response.nickname ? `- nickname: ${response.nickname}` : '',
    response.bigDreams.length ? `- bigDreams: ${response.bigDreams.join('; ')}` : '',
    tappedRoleModelType ? `- roleModelType(tap): ${tappedRoleModelType}` : '',
    tappedSpecific ? `- specificRoleModel(tap): ${tappedSpecific}` : '',
    tappedWhy ? `- roleModelWhy(tap): ${tappedWhy}` : '',
    tappedQualities.length ? `- admiredQualities(tap): ${tappedQualities.join('; ')}` : '',
    response.roleModelType ? `- roleModelType(typed): ${response.roleModelType}` : '',
    response.specificRoleModels?.length ? `- specificRoleModels(typed): ${response.specificRoleModels.join('; ')}` : '',
    response.admiredQualities?.length ? `- admiredQualities(typed): ${response.admiredQualities.join('; ')}` : '',
  ].filter(Boolean);
  return lines.join('\n');
};

const mapJudgeToRubric = (judge: ArcRubricJudgeResult) => {
  const arcQuality = clamp0to10(
    judge.identityCoherence * 0.3 +
      judge.groundedness * 0.25 +
      judge.distinctiveness * 0.2 +
      judge.constraintCompliance * 0.15 +
      judge.adoptionLikelihood * 0.1
  );
  const arcFeltAccuracy = clamp0to10(judge.feltAccuracy);
  const arcReadingEase = clamp0to10(judge.readingEase);
  const arcEverydayConcreteness = clamp0to10(judge.everydayConcreteness);
  const arcClarity = clamp0to10(judge.clarity);
  return { arcQuality, arcFeltAccuracy, arcReadingEase, arcEverydayConcreteness, arcClarity };
};

export async function computeRubricTableForComparisonAsync(
  comparison: ComparisonResult,
  options?: { weights?: RubricWeights; aiJudge?: AiJudgeOptions }
): Promise<RubricTable> {
  const response = SYNTHETIC_RESPONSES.find((r) => r.id === comparison.responseId);
  const weights = options?.weights ?? DEFAULT_RUBRIC_WEIGHTS;
  const responseDescription = response?.description ?? comparison.responseId;
  const aiJudge = options?.aiJudge;

  // Fast path: if judge disabled, use heuristic scoring.
  if (!aiJudge?.enabled) {
    return computeRubricTableForComparison(comparison, { weights });
  }

  const judgeModel = aiJudge.judgeModel ?? 'gpt-4o-mini';

  if (!response) {
    return computeRubricTableForComparison(comparison, { weights });
  }

  // Build comparative judge candidates (all paradigms at once).
  const candidates = comparison.results
    .filter((r) => Array.isArray(r.arcs) && r.arcs.length > 0 && !r.error)
    .map((r) => {
      const paradigm = PROMPT_PARADIGMS.find((p) => p.id === r.paradigmId);
      return {
        paradigmId: r.paradigmId,
        paradigmName: paradigm?.name ?? r.paradigmId,
        arcs: (r.arcs ?? []).slice(0, 3).map((a) => ({ name: a.name ?? '', narrative: a.narrative ?? '' })),
      };
    });

  const responseSummary = buildResponseSummaryForJudge(response);

  // Cache the comparative judge response so reruns are fast.
  const compKey = cacheKeyForComparisonJudge({
    judgeModel,
    responseId: comparison.responseId,
    candidates: candidates.map((c) => ({ paradigmId: c.paradigmId, arcs: c.arcs })),
  });
  const cachedComparison = comparisonJudgeCache.get(compKey);
  const judgedComparison =
    cachedComparison ??
    (await judgeArcComparisonRubric({
      responseSummary,
      ageBand: response.ageBand,
      candidates,
      judgeModelOverride: judgeModel,
    }));
  if (judgedComparison && !cachedComparison) {
    comparisonJudgeCache.set(compKey, judgedComparison);
  }

  const rows: RubricRow[] = [];
  for (const result of comparison.results) {
    const paradigm = PROMPT_PARADIGMS.find((p) => p.id === result.paradigmId);
    const paradigmName = paradigm?.name ?? result.paradigmId;
    const notes: string[] = [];

    const qCount = questionCountByParadigmId[result.paradigmId] ?? 10;
    const ease = clamp0to10(easeAnswering14yoByParadigmId[result.paradigmId] ?? 6);
    const length = surveyLengthScore(qCount);

    if (result.error || !Array.isArray(result.arcs) || result.arcs.length === 0) {
      const overall = clamp0to10(ease * weights.ease_answering_14yo + length * weights.survey_length);
      if (result.error) notes.push(`error: ${result.error}`);
      else notes.push('no arcs returned');
      rows.push({
        paradigmId: result.paradigmId,
        paradigmName,
        easeAnswering14yo: ease,
        surveyLength: length,
        arcQuality: 0,
        arcFeltAccuracy: 0,
        arcReadingEase: 0,
        arcEverydayConcreteness: 0,
        arcClarity: 0,
        overall,
        notes,
      });
      continue;
    }

    // If comparative judge failed, fall back to per-arc judging (existing path).
    const judgedRow = judgedComparison?.results?.find((r) => r.paradigmId === result.paradigmId);
    if (!judgedRow) {
      // Existing per-arc judge fallback (cached)
      const judged = await Promise.all(
        result.arcs.map(async (arc) => {
          const key = cacheKeyForJudge({
            judgeModel,
            responseId: comparison.responseId,
            paradigmId: result.paradigmId,
            arcName: arc.name ?? '',
            arcNarrative: arc.narrative ?? '',
          });
          const cached = judgeCache.get(key);
          const judge =
            cached ??
            (await judgeArcRubric({
              responseSummary,
              ageBand: response.ageBand,
              paradigmName,
              arc: { name: arc.name ?? '', narrative: arc.narrative ?? '' },
              judgeModelOverride: judgeModel,
            }));
          if (judge && !cached) {
            judgeCache.set(key, judge);
          }
          return { arc, judge };
        })
      );

      const judgedWithScores = judged.map(({ arc, judge }) => {
        if (!judge) {
          const constraint = arcConstraintScore(arc);
          const specificity = arcSpecificityScore(response, arc);
          const alignment = arcAlignmentScore(response, arc);
          const readingEase = arcInterpretabilityScore(arc);
          const feltAccuracy = arcFeltAccuracyScore(response, arc);
          const everydayConcreteness = arcEverydayConcretenessScore(arc);
          const clarity = arcClarityScore(arc);
          const quality = clamp0to10(
            constraint.score * 0.35 + specificity * 0.35 + alignment * 0.2 + clarity * 0.1
          );
          return {
            arcQuality: quality,
            arcFeltAccuracy: feltAccuracy,
            arcReadingEase: readingEase,
            arcEverydayConcreteness: everydayConcreteness,
            arcClarity: clarity,
            notes: constraint.notes,
            judgeConfidence: 0,
          };
        }
        const mapped = mapJudgeToRubric(judge);
        return {
          ...mapped,
          notes: (judge.notes ?? []).slice(0, 3),
          judgeConfidence: clamp0to1(judge.confidence ?? 0),
        };
      });

      judgedWithScores.sort((a, b) => b.arcQuality - a.arcQuality);
      const best = judgedWithScores[0]!;
      if (best.notes?.length) notes.push(...best.notes);
      if (best.judgeConfidence > 0) notes.push(`judge_confidence=${best.judgeConfidence.toFixed(2)}`);

      const overall = clamp0to10(
        ease * weights.ease_answering_14yo +
          length * weights.survey_length +
          best.arcQuality * weights.arc_quality +
          best.arcFeltAccuracy * weights.arc_felt_accuracy +
          best.arcReadingEase * weights.arc_reading_ease +
          best.arcEverydayConcreteness * weights.arc_everyday_concreteness +
          best.arcClarity * weights.arc_clarity
      );

      rows.push({
        paradigmId: result.paradigmId,
        paradigmName,
        easeAnswering14yo: ease,
        surveyLength: length,
        arcQuality: best.arcQuality,
        arcFeltAccuracy: best.arcFeltAccuracy,
        arcReadingEase: best.arcReadingEase,
        arcEverydayConcreteness: best.arcEverydayConcreteness,
        arcClarity: best.arcClarity,
        overall,
        notes: notes.length ? notes.slice(0, 5) : undefined,
      });
      continue;
    }

    // Comparative judged scores -> rubric mapping (includes nonParroting).
    const arcQuality = clamp0to10(
      judgedRow.identityCoherence * 0.28 +
        judgedRow.groundedness * 0.22 +
        judgedRow.distinctiveness * 0.18 +
        judgedRow.constraintCompliance * 0.12 +
        judgedRow.adoptionLikelihood * 0.1 +
        judgedRow.nonParroting * 0.1
    );
    const arcFeltAccuracy = clamp0to10(judgedRow.feltAccuracy);
    const arcReadingEase = clamp0to10(judgedRow.readingEase);
    const arcEverydayConcreteness = clamp0to10(judgedRow.everydayConcreteness);
    const arcClarity = clamp0to10(judgedRow.clarity);

    if (judgedRow.notes?.length) notes.push(...judgedRow.notes.slice(0, 4));
    if (typeof judgedRow.overallRank === 'number') notes.push(`rank=${judgedRow.overallRank}`);
    if (typeof judgedRow.confidence === 'number') notes.push(`judge_confidence=${clamp0to1(judgedRow.confidence).toFixed(2)}`);

    const overall = clamp0to10(
      ease * weights.ease_answering_14yo +
        length * weights.survey_length +
        arcQuality * weights.arc_quality +
        arcFeltAccuracy * weights.arc_felt_accuracy +
        arcReadingEase * weights.arc_reading_ease +
        arcEverydayConcreteness * weights.arc_everyday_concreteness +
        arcClarity * weights.arc_clarity
    );

    rows.push({
      paradigmId: result.paradigmId,
      paradigmName,
      easeAnswering14yo: ease,
      surveyLength: length,
      arcQuality,
      arcFeltAccuracy,
      arcReadingEase,
      arcEverydayConcreteness,
      arcClarity,
      overall,
      notes: notes.length ? notes.slice(0, 6) : undefined,
    });
  }

  // Sort best-first for display.
  rows.sort((a, b) => b.overall - a.overall);
  return {
    responseId: comparison.responseId,
    responseDescription,
    rows,
    weights,
  };
}

export function aggregateRubricRows(rows: RubricRow[]): RubricRow[] {
  const byParadigm = new Map<string, RubricRow[]>();
  rows.forEach((r) => {
    const list = byParadigm.get(r.paradigmId);
    if (list) list.push(r);
    else byParadigm.set(r.paradigmId, [r]);
  });
  const mean = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
  const agg: RubricRow[] = [...byParadigm.entries()].map(([paradigmId, entries]) => ({
    paradigmId,
    paradigmName: entries[0]?.paradigmName ?? paradigmId,
    easeAnswering14yo: mean(entries.map((e) => e.easeAnswering14yo)),
    surveyLength: mean(entries.map((e) => e.surveyLength)),
    arcQuality: mean(entries.map((e) => e.arcQuality)),
    arcFeltAccuracy: mean(entries.map((e) => e.arcFeltAccuracy)),
    arcReadingEase: mean(entries.map((e) => e.arcReadingEase)),
    arcEverydayConcreteness: mean(entries.map((e) => e.arcEverydayConcreteness)),
    arcClarity: mean(entries.map((e) => e.arcClarity)),
    overall: mean(entries.map((e) => e.overall)),
  }));
  agg.sort((a, b) => b.overall - a.overall);
  return agg;
}

/**
 * 10 diverse synthetic questionnaire responses for testing
 */
export const SYNTHETIC_RESPONSES: SyntheticQuestionnaireResponse[] = [
  {
    id: 'craftsperson',
    description: 'Woodworker who wants to build a small honest studio',
    ageBand: '25-plus',
    domain: 'Craft, skill & building',
    motivation: 'Calm',
    signatureTrait: 'Someone who works hard',
    growthEdge: 'Finishing things',
    proudMoment: 'Making something meaningful',
    meaning: 'Creating things that last',
    impact: 'Bringing clarity or understanding',
    valueOrientation: 'Stewardship & responsibility',
    philosophy: 'With clarity and intention',
    vocation: 'Building things with my hands',
    bigDreams: ['Build a small, honest woodworking studio'],
    nickname: 'The Builder',
    roleModelTypeId: 'builders_makers',
    specificRoleModelId: 'builder_maker',
    roleModelWhyId: 'how_they_work',
    admiredQualityIds: ['craft', 'discipline', 'integrity', 'patience'],
    // legacy typed (optional enrichment)
    roleModelType: 'Master craftspeople and makers who build things that last',
    specificRoleModels: ['James Krenov', 'George Nakashima'],
    admiredQualities: ['Attention to detail', 'Patience with materials', 'Honesty in craft', 'Building things that outlast them'],
  },
  {
    id: 'entrepreneur',
    description: 'Tech founder focused on building Kwilt lifestyle app',
    ageBand: '25-plus',
    domain: 'Work & career',
    motivation: 'Confident',
    signatureTrait: 'Someone who surprises people',
    growthEdge: 'Staying consistent',
    proudMoment: 'Pushing yourself',
    meaning: "Achieving something you're proud of",
    impact: 'Solving meaningful problems',
    valueOrientation: 'Courage',
    philosophy: 'With passion and boldness',
    vocation: 'Building ventures',
    whyNow: "I'm excited about this and want to take it seriously.",
    bigDreams: ['Bring love build kwilt lifestyle application business to life'],
    nickname: 'The Founder',
    roleModelTypeId: 'leaders_founders',
    specificRoleModelId: 'founder_builder',
    roleModelWhyId: 'how_they_create',
    admiredQualityIds: ['curiosity', 'integrity', 'clarity', 'consistency'],
    // legacy typed (optional enrichment)
    roleModelType: 'Founders who build thoughtful, human-centered products',
    specificRoleModels: ['Stewart Butterfield', 'Julie Zhuo'],
    admiredQualities: ['Thoughtful product decisions', "Building things that didn't exist before", 'Staying grounded while building', 'Curiosity as a strength'],
  },
  {
    id: 'family_steward',
    description: 'Parent focused on creating a nurturing home environment',
    ageBand: '25-plus',
    domain: 'Family & relationships',
    motivation: 'Kind',
    signatureTrait: 'Someone people trust',
    growthEdge: 'Managing emotions',
    proudMoment: 'Supporting a friend',
    meaning: 'Growing deep relationships',
    impact: 'Helping people feel seen or supported',
    valueOrientation: 'Care',
    philosophy: 'With calm and steadiness',
    vocation: 'Caring for my family',
    bigDreams: [],
  },
  {
    id: 'creative_explorer',
    description: 'Artist exploring new creative mediums',
    ageBand: '18-24',
    domain: 'Creativity & expression',
    motivation: 'Creative',
    signatureTrait: 'Someone others want around',
    growthEdge: 'Getting started',
    proudMoment: 'Making something meaningful',
    meaning: 'Bringing beauty or insight into the world',
    impact: 'Inspiring creativity or imagination',
    valueOrientation: 'Curiosity',
    philosophy: 'With creativity and experimentation',
    vocation: 'Making art',
    bigDreams: ['Record a folk album with friends'],
  },
  {
    id: 'spiritual_seeker',
    description: 'Person deepening their faith practice',
    ageBand: '25-plus',
    domain: 'Faith & spirituality',
    motivation: 'Calm',
    signatureTrait: 'Someone who keeps their cool',
    growthEdge: 'Staying focused',
    proudMoment: "Showing up even when it's hard",
    meaning: 'Living your faith and values in everyday life',
    impact: 'Bringing more peace into the world',
    valueOrientation: 'Wisdom & insight',
    philosophy: 'With humility and learning',
    vocation: 'Following my faith',
    bigDreams: [],
    roleModelTypeId: 'calm_steady_people',
    specificRoleModelId: 'coach_teacher',
    roleModelWhyId: 'how_they_live_values',
    admiredQualityIds: ['calm', 'integrity', 'humility', 'kindness'],
    // legacy typed (optional enrichment)
    roleModelType: 'People who live their faith quietly and consistently',
    specificRoleModels: ['Henri Nouwen', 'Madeleine L\'Engle'],
    admiredQualities: ['Gentleness', 'Steadiness', 'Integrity in small moments', 'Quiet faithfulness'],
  },
  {
    id: 'problem_solver',
    description: 'Engineer who wants to solve meaningful problems',
    ageBand: '25-plus',
    domain: 'Work & career',
    motivation: 'Focused',
    signatureTrait: 'Someone who works hard',
    growthEdge: 'Believing in yourself',
    proudMoment: 'Thinking in a new way',
    meaning: 'Mastering skills',
    impact: "Making people's lives easier",
    valueOrientation: 'Discipline',
    philosophy: 'With clarity and intention',
    vocation: 'Building software',
    bigDreams: ['Start a tiny design studio'],
  },
  {
    id: 'community_builder',
    description: 'Person focused on bringing people together',
    ageBand: '18-24',
    domain: 'Community & service',
    motivation: 'Kind',
    signatureTrait: 'Someone who brings others together',
    growthEdge: 'Speaking up',
    proudMoment: 'Helping someone',
    meaning: 'Helping others thrive',
    impact: 'Helping people feel seen or supported',
    valueOrientation: 'Care',
    philosophy: 'With calm and steadiness',
    vocation: 'Supporting my community',
    bigDreams: [],
  },
  {
    id: 'health_warrior',
    description: 'Person rebuilding physical strength and energy',
    ageBand: '18-24',
    domain: 'Health & physical',
    motivation: 'Strong',
    signatureTrait: 'Someone who works hard',
    growthEdge: 'Staying consistent',
    proudMoment: 'Taking care of your body & energy',
    meaning: 'Becoming your strongest self',
    impact: 'Bringing more peace into the world',
    valueOrientation: 'Discipline',
    philosophy: 'With clarity and intention',
    vocation: 'Building physical strength',
    bigDreams: [],
  },
  {
    id: 'maker_creator',
    description: 'Person who loves hands-on making and physical creation',
    ageBand: '25-plus',
    domain: 'Craft, skill & building',
    motivation: 'Creative',
    signatureTrait: 'Someone who surprises people',
    growthEdge: 'Finishing things',
    proudMoment: 'Making something meaningful',
    meaning: 'Creating things that last',
    impact: 'Bringing beauty or insight into the world',
    valueOrientation: 'Curiosity',
    philosophy: 'With creativity and experimentation',
    vocation: 'Making things with my hands',
    bigDreams: ['Build a cabin I can rent on Airbnb'],
  },
  {
    id: 'learner_teacher',
    description: 'Educator focused on mastery and sharing knowledge',
    ageBand: '25-plus',
    domain: 'Work & career',
    motivation: 'Curious',
    signatureTrait: 'Someone people trust',
    growthEdge: 'Being patient',
    proudMoment: 'Improving a skill',
    meaning: 'Mastering skills',
    impact: 'Bringing clarity or understanding',
    valueOrientation: 'Wisdom & insight',
    philosophy: 'With humility and learning',
    vocation: 'Teaching and learning',
    bigDreams: [],
    roleModelTypeId: 'teachers_mentors',
    specificRoleModelId: 'coach_teacher',
    roleModelWhyId: 'how_they_work',
    admiredQualityIds: ['clarity', 'humility', 'curiosity', 'care_for_others'],
    // legacy typed (optional enrichment)
    roleModelType: 'Teachers and thinkers who make complex things clear',
    specificRoleModels: ['Richard Feynman', 'Brené Brown'],
    admiredQualities: ['Ability to explain complex ideas simply', 'Intellectual humility', 'Genuine curiosity', 'Making learning accessible'],
  },
  {
    id: 'teen_competitor',
    description: '14-year-old athlete trying to become calm and consistent under pressure',
    ageBand: '13-15',
    domain: 'Health & physical',
    motivation: 'Calm',
    signatureTrait: 'Someone who keeps their cool',
    growthEdge: 'Staying consistent',
    proudMoment: 'Pushing yourself',
    meaning: 'Becoming your strongest self',
    impact: 'Bringing more peace into the world',
    valueOrientation: 'Discipline',
    philosophy: 'With calm and steadiness',
    vocation: 'Training and showing up',
    bigDreams: ['Make varsity next season'],
    nickname: 'Steady',
    roleModelTypeId: 'athletes_competitors',
    specificRoleModelId: 'coach_teacher',
    roleModelWhyId: 'how_they_handle_pressure',
    admiredQualityIds: ['calm', 'consistency', 'discipline', 'resilience'],
  },
  {
    id: 'teen_creator',
    description: '16-year-old who wants to create and share art without freezing up',
    ageBand: '16-17',
    domain: 'Creativity & expression',
    motivation: 'Confident',
    signatureTrait: 'Someone who surprises people',
    growthEdge: 'Believing in yourself',
    proudMoment: 'Making something meaningful',
    meaning: 'Bringing beauty or insight into the world',
    impact: 'Inspiring creativity or imagination',
    valueOrientation: 'Courage',
    philosophy: 'With creativity and experimentation',
    vocation: 'Making and sharing art',
    bigDreams: ['Post my work online consistently for 3 months'],
    nickname: 'The Creator',
    roleModelTypeId: 'artists_creatives',
    specificRoleModelId: 'artist_creator',
    roleModelWhyId: 'how_they_create',
    admiredQualityIds: ['creativity', 'courage', 'curiosity', 'resilience'],
  },
];

/**
 * PARADIGM 1: Current System Prompt (Baseline)
 * Uses the existing prompt structure from IdentityAspirationFlow
 */
const paradigm1_Baseline: PromptParadigm = {
  id: 'baseline',
  name: 'Baseline (Current System)',
  description: 'The current prompt structure used in IdentityAspirationFlow',
  // Consistently underperforms in dev scoring; keep defined for reference but exclude from runs.
  enabled: false,
  buildPrompt: (response) => {
    const inputsSummary = [
      `domain of becoming: ${response.domain}`,
      `motivational style: ${response.motivation}`,
      `signature trait: ${response.signatureTrait}`,
      `growth edge: ${response.growthEdge}`,
      `everyday proud moment: ${response.proudMoment}`,
      `source of meaning: ${response.meaning}`,
      `why this matters now / turning point: ${response.whyNow || 'not specified'}`,
      `desired impact: ${response.impact}`,
      `core values: ${response.valueOrientation}`,
      `life philosophy: ${response.philosophy}`,
      `vocational orientation: ${response.vocation}`,
    ];
    if (response.bigDreams.length > 0) {
      inputsSummary.push(
        `concrete big things the user would love to bring to life (treat these as high-priority identity imagery, not task lists): ${response.bigDreams.join('; ')}`
      );
    }
    if (response.nickname) {
      inputsSummary.push(
        `typed nickname (treat this as a high-priority anchor for the Arc Name and description): ${response.nickname}`
      );
    }

    return {
      prompt: inputsSummary.join('\n- '),
    };
  },
};

/**
 * PARADIGM 2: Narrative-First Approach
 * Emphasizes storytelling and identity narrative over structured fields
 */
const paradigm2_NarrativeFirst: PromptParadigm = {
  id: 'narrative_first',
  name: 'Narrative-First Approach',
  description: 'Frames inputs as a cohesive story of becoming rather than discrete fields',
  enabled: false,
  buildPrompt: (response) => {
    const story = `Imagine a person who:
- Lives in the domain of ${response.domain.toLowerCase()}
- Gives off a ${response.motivation.toLowerCase()} vibe when you imagine their future self
- Is experienced by others as ${response.signatureTrait.toLowerCase()}
- Is growing into ${response.growthEdge.toLowerCase()} as their core strength
- On normal days, feels proud when ${response.proudMoment.toLowerCase()}
- Finds meaning in ${response.meaning.toLowerCase()}
- Wants their impact to be ${response.impact.toLowerCase()}
- Values ${response.valueOrientation.toLowerCase()} above all
- Approaches life ${response.philosophy.toLowerCase()}
- Sees their vocation as ${response.vocation.toLowerCase()}
${response.whyNow ? `- Right now matters because: ${response.whyNow}` : ''}
${response.bigDreams.length > 0 ? `- Has concrete dreams: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `- Sometimes calls themselves: ${response.nickname}` : ''}

Write an identity Arc for this person.`;

    return {
      prompt: story,
    };
  },
};

/**
 * PARADIGM 3: Identity Spine Approach
 * Focuses on finding the single core identity thread
 */
const paradigm3_IdentitySpine: PromptParadigm = {
  id: 'identity_spine',
  name: 'Identity Spine Approach',
  description: 'Emphasizes finding ONE clear identity through-line from all inputs',
  enabled: false,
  buildPrompt: (response) => {
    return {
      prompt: `Find the single identity spine that connects these signals:

DOMAIN: ${response.domain}
VIBE: ${response.motivation}
SOCIAL PRESENCE: ${response.signatureTrait}
STRENGTH DIRECTION: ${response.growthEdge}
EVERYDAY PROUD: ${response.proudMoment}
MEANING SOURCE: ${response.meaning}
DESIRED IMPACT: ${response.impact}
CORE VALUE: ${response.valueOrientation}
LIFE APPROACH: ${response.philosophy}
VOCATION: ${response.vocation}
${response.whyNow ? `WHY NOW: ${response.whyNow}` : ''}
${response.bigDreams.length > 0 ? `BIG DREAMS: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `NICKNAME: ${response.nickname}` : ''}

Your job: Identify the ONE identity direction that ties all these together. Don't try to include everything—find the core thread.`,
    };
  },
};

/**
 * PARADIGM 4: Dream-Anchor Approach
 * Prioritizes big dreams as the primary naming/narrative anchor
 */
const paradigm4_DreamAnchor: PromptParadigm = {
  id: 'dream_anchor',
  name: 'Dream-Anchor Approach',
  description: 'Uses concrete big dreams as the primary anchor for Arc name and narrative',
  buildPrompt: (response) => {
    const hasDreams = response.bigDreams.length > 0;
    const dreamSection = hasDreams
      ? `PRIMARY ANCHOR (use this as the heart of the Arc):
${response.bigDreams.map((dream, i) => `Dream ${i + 1}: ${dream}`).join('\n')}

This dream represents who they want to become. The Arc name should describe the identity of someone who achieves this dream (or its essence). The narrative should weave this dream directly into the first sentence.`
      : 'No concrete big dreams provided—use other signals.';

    return {
      prompt: `${dreamSection}

Supporting identity signals:
- Domain: ${response.domain}
- Vibe: ${response.motivation}
- Social presence: ${response.signatureTrait}
- Growth edge: ${response.growthEdge}
- Proud moment: ${response.proudMoment}
- Meaning: ${response.meaning}
- Impact: ${response.impact}
- Values: ${response.valueOrientation}
- Philosophy: ${response.philosophy}
- Vocation: ${response.vocation}
${response.whyNow ? `- Why now: ${response.whyNow}` : ''}
${response.nickname ? `- Nickname: ${response.nickname}` : ''}`,
    };
  },
};

/**
 * PARADIGM 5: Minimalist Approach
 * Uses only the most essential fields
 */
const paradigm5_Minimalist: PromptParadigm = {
  id: 'minimalist',
  name: 'Minimalist Approach',
  description: 'Uses only domain, vibe, proud moment, and big dreams—strips away complexity',
  buildPrompt: (response) => {
    return {
      prompt: `Domain: ${response.domain}
Vibe: ${response.motivation}
What makes them proud: ${response.proudMoment}
${response.bigDreams.length > 0 ? `Dreams: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `Nickname: ${response.nickname}` : ''}

Generate an identity Arc. Keep it simple and grounded.`,
    };
  },
};

/**
 * PARADIGM 6: Question-Answer Format
 * Presents inputs as answers to identity questions
 */
const paradigm6_QuestionAnswer: PromptParadigm = {
  id: 'question_answer',
  name: 'Question-Answer Format',
  description: 'Frames inputs as answers to identity-discovery questions',
  buildPrompt: (response) => {
    return {
      prompt: `Q: Which part of life needs attention?
A: ${response.domain}

Q: What's the vibe of your future self?
A: ${response.motivation}

Q: How do people experience that future you?
A: ${response.signatureTrait}

Q: What kind of strength are you growing into?
A: ${response.growthEdge}

Q: What makes you proud on a normal day?
A: ${response.proudMoment}

Q: Where do you find meaning?
A: ${response.meaning}

Q: What impact do you want to have?
A: ${response.impact}

Q: What do you value most?
A: ${response.valueOrientation}

Q: How do you approach life?
A: ${response.philosophy}

Q: What's your vocation?
A: ${response.vocation}
${response.whyNow ? `\nQ: Why does this matter now?\nA: ${response.whyNow}` : ''}
${response.bigDreams.length > 0 ? `\nQ: What are your big dreams?\nA: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `\nQ: What's your nickname?\nA: ${response.nickname}` : ''}

Generate an identity Arc based on these answers.`,
    };
  },
};

/**
 * PARADIGM 7: Contrast-Based Approach
 * Emphasizes what they're moving away from and toward
 */
const paradigm7_ContrastBased: PromptParadigm = {
  id: 'contrast_based',
  name: 'Contrast-Based Approach',
  description: 'Frames identity in terms of moving away from X and toward Y',
  enabled: false,
  buildPrompt: (response) => {
    return {
      prompt: `This person is moving FROM a place where:
- Their ${response.domain.toLowerCase()} feels unsettled
- They struggle with ${response.growthEdge.toLowerCase()}
- They want to grow into ${response.growthEdge.toLowerCase()}

They're moving TOWARD becoming someone who:
- Gives off a ${response.motivation.toLowerCase()} vibe
- Is experienced as ${response.signatureTrait.toLowerCase()}
- Feels proud when ${response.proudMoment.toLowerCase()}
- Finds meaning in ${response.meaning.toLowerCase()}
- Wants to ${response.impact.toLowerCase()}
- Values ${response.valueOrientation.toLowerCase()}
- Approaches life ${response.philosophy.toLowerCase()}
- Sees their work as ${response.vocation.toLowerCase()}
${response.bigDreams.length > 0 ? `- Dreams of: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `- Calls themselves: ${response.nickname}` : ''}

Generate an Arc that captures this journey of becoming.`,
    };
  },
};

/**
 * PARADIGM 8: Values-First Approach
 * Leads with values and meaning, then builds identity from there
 */
const paradigm8_ValuesFirst: PromptParadigm = {
  id: 'values_first',
  name: 'Values-First Approach',
  description: 'Starts with values and meaning, then builds identity direction',
  buildPrompt: (response) => {
    return {
      prompt: `Core values: ${response.valueOrientation}
Source of meaning: ${response.meaning}
Desired impact: ${response.impact}
Life philosophy: ${response.philosophy}

From these values, this person wants to grow in: ${response.domain}
They want to become someone with a ${response.motivation.toLowerCase()} presence, who is ${response.signatureTrait.toLowerCase()}
Their growth edge is ${response.growthEdge.toLowerCase()}
On normal days, they feel proud when ${response.proudMoment.toLowerCase()}
Their vocation is ${response.vocation.toLowerCase()}
${response.whyNow ? `Why now: ${response.whyNow}` : ''}
${response.bigDreams.length > 0 ? `Big dreams: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `Nickname: ${response.nickname}` : ''}

Generate an Arc that roots identity in these values.`,
    };
  },
};

/**
 * PARADIGM 9: Archetype/Emulation Approach
 * Infers idealized future self from who they admire and what qualities they value
 */
const paradigm9_ArchetypeEmulation: PromptParadigm = {
  id: 'archetype_emulation',
  name: 'Archetype/Emulation Approach',
  description: 'Infers identity direction from role models and admired qualities',
  buildPrompt: (response) => {
    const tappedRoleModelType = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, response.roleModelTypeId);
    const tappedSpecificRoleModel =
      response.specificRoleModelId && response.specificRoleModelId !== 'none' && response.specificRoleModelId !== 'not_sure'
        ? labelFor(ARCHETYPE_SPECIFIC_ROLE_MODELS, response.specificRoleModelId)
        : response.specificRoleModelId === 'none'
        ? 'No one specific'
        : response.specificRoleModelId === 'not_sure'
        ? 'Not sure'
        : undefined;
    const tappedWhy = labelFor(ARCHETYPE_ROLE_MODEL_WHY, response.roleModelWhyId);
    const tappedQualities = labelsFor(ARCHETYPE_ADMIRED_QUALITIES, response.admiredQualityIds as string[] | undefined);

    const hasRoleModelData =
      Boolean(tappedRoleModelType) ||
      Boolean(tappedSpecificRoleModel) ||
      tappedQualities.length > 0 ||
      Boolean(response.roleModelType) ||
      (response.specificRoleModels && response.specificRoleModels.length > 0) ||
      (response.admiredQualities && response.admiredQualities.length > 0);

    if (!hasRoleModelData) {
      // Fallback to standard fields if no role model data
      return paradigm1_Baseline.buildPrompt(response);
    }

    const roleModelSection = [
      tappedRoleModelType ? `Kind of people they look up to (tap): ${tappedRoleModelType}` : '',
      tappedSpecificRoleModel ? `Specific person (tap): ${tappedSpecificRoleModel}` : '',
      tappedWhy ? `Why they picked that person (tap): ${tappedWhy}` : '',
      tappedQualities.length > 0 ? `What they admire (tap): ${tappedQualities.join('; ')}` : '',
      // Legacy free-text (if present)
      response.roleModelType ? `Kind of people they look up to (typed): ${response.roleModelType}` : '',
      response.specificRoleModels && response.specificRoleModels.length > 0
        ? `Specific people (typed): ${response.specificRoleModels.join('; ')}`
        : '',
      response.admiredQualities && response.admiredQualities.length > 0
        ? `What they admire (typed): ${response.admiredQualities.join('; ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      prompt: `ARC GENERATION FROM ROLE MODELS & ARCHETYPES

This person looks up to certain kinds of people. Your job is to infer what kind of person they want to become based on who they admire.

${roleModelSection}

From these role models and admired qualities, infer:
- What identity direction does this person want to grow toward?
- What domain of life does this aspiration live in?
- What kind of presence/vibe would they have if they embodied these admired qualities?
- How would this show up in their everyday life?

Additional context (use to refine, but role models are primary):
- Domain: ${response.domain}
- Vibe: ${response.motivation}
- Social presence: ${response.signatureTrait}
- Growth edge: ${response.growthEdge}
- Proud moment: ${response.proudMoment}
- Meaning: ${response.meaning}
- Impact: ${response.impact}
- Values: ${response.valueOrientation}
- Philosophy: ${response.philosophy}
- Vocation: ${response.vocation}
${response.whyNow ? `- Why now: ${response.whyNow}` : ''}
${response.bigDreams.length > 0 ? `- Big dreams: ${response.bigDreams.join('; ')}` : ''}
${response.nickname ? `- Nickname: ${response.nickname}` : ''}

Generate an Arc that captures who they want to become based on who they admire. The Arc should feel like it's describing someone who embodies the qualities they look up to, not just copying those people.`,
    };
  },
};

/**
 * PARADIGM 10: Hybrid (Minimalist + Archetype)
 * 
 * DESIGN RATIONALE:
 * This paradigm combines the best of Minimalist (survey ease, speed) and Archetype (personalization, 
 * felt accuracy) to create a highly effective Arc generation approach.
 * 
 * TESTING RESULTS:
 * - Survey ease: 9.0/10 (maintains Minimalist's ease, same as Archetype)
 * - Length score: 8.4/10 (5 questions vs Minimalist's 4, but still excellent)
 * - Quality: 4.9/10 (parity with parent paradigms)
 * - Felt accuracy: 3.7/10 (room for improvement, but foundation is solid)
 * - Status: KEPT in testing (not pruned after 25+ runs)
 * 
 * KEY INNOVATIONS:
 * 1. Minimal essential inputs (from Minimalist) - reduces cognitive load
 * 2. Optional role model signals (from Archetype) - adds personalization without requiring it
 * 3. Explicit quality requirements - directs AI to optimize for felt accuracy, readability, concreteness
 * 4. Role model translation (not copying) - prevents generic "be like X" Arcs
 * 5. Everyday scene requirement - forces concreteness and tangibility
 * 
 * See docs/hybrid-paradigm-testing-results.md for full testing documentation.
 */
const paradigm10_HybridMinimalistArchetype: PromptParadigm = {
  id: 'hybrid_minimalist_archetype',
  name: 'Hybrid: Minimalist + Archetype',
  description: 'Combines minimalist essentials with tap-centric role-model inference for a highly personal, concrete Arc',
  buildPrompt: (response) => {
    // ============================================================================
    // STEP 1: Extract role model signals (tap-centric, with legacy fallback)
    // ============================================================================
    // We support both tap-centric (chip-based) and legacy free-text role model inputs.
    // Tap-centric is preferred for UX (easier for teens), but we gracefully handle
    // typed responses for backward compatibility.
    
    // Extract tap-centric role model type (e.g., "builders_makers", "artists_creatives")
    const tappedRoleModelType = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, response.roleModelTypeId);
    
    // Extract specific role model (e.g., "parent_guardian", "coach_teacher")
    // Handle special cases: "none" and "not_sure" are valid responses that indicate
    // the user doesn't have a specific person in mind (still useful signal!)
    const tappedSpecificRoleModel =
      response.specificRoleModelId && response.specificRoleModelId !== 'none' && response.specificRoleModelId !== 'not_sure'
        ? labelFor(ARCHETYPE_SPECIFIC_ROLE_MODELS, response.specificRoleModelId)
        : response.specificRoleModelId === 'none'
        ? 'No one specific'
        : response.specificRoleModelId === 'not_sure'
        ? 'Not sure'
        : undefined;
    
    // Extract "why" they picked that person (e.g., "how_they_treat_people", "how_they_handle_pressure")
    // This is a follow-up question that adds depth to the role model signal
    const tappedWhy = labelFor(ARCHETYPE_ROLE_MODEL_WHY, response.roleModelWhyId);
    
    // Extract admired qualities (multi-select, e.g., ["patience", "creativity", "courage"])
    // These are the concrete qualities they want to embody
    const tappedQualities = labelsFor(ARCHETYPE_ADMIRED_QUALITIES, response.admiredQualityIds as string[] | undefined);

    // ============================================================================
    // STEP 2: Build role model signals section (graceful degradation)
    // ============================================================================
    // We combine tap-centric and legacy typed inputs, prioritizing taps.
    // If no role model data exists, the section will be empty but the prompt
    // still works (graceful degradation - Minimalist fallback).
    const roleModelSignals = [
      // Tap-centric signals (preferred - easier for teens)
      tappedRoleModelType ? `Kind of people they look up to (tap): ${tappedRoleModelType}` : '',
      tappedSpecificRoleModel ? `Specific person (tap): ${tappedSpecificRoleModel}` : '',
      tappedWhy ? `Why they picked that person (tap): ${tappedWhy}` : '',
      tappedQualities.length > 0 ? `What they admire (tap): ${tappedQualities.join('; ')}` : '',
      // Legacy typed signals (fallback for backward compatibility)
      response.roleModelType ? `Kind of people they look up to (typed): ${response.roleModelType}` : '',
      response.specificRoleModels && response.specificRoleModels.length > 0
        ? `Specific people (typed): ${response.specificRoleModels.join('; ')}`
        : '',
      response.admiredQualities && response.admiredQualities.length > 0
        ? `What they admire (typed): ${response.admiredQualities.join('; ')}`
        : '',
    ]
      .filter(Boolean) // Remove empty strings
      .join('\n'); // Join with newlines for readability

    // ============================================================================
    // STEP 3: Prepare optional fields (with explicit "None specified" fallback)
    // ============================================================================
    // We explicitly state "None specified" rather than omitting fields to:
    // 1. Make it clear to the AI that we checked (not just missing data)
    // 2. Reduce ambiguity in prompt interpretation
    // 3. Maintain consistent prompt structure
    const dreams = response.bigDreams.length > 0 ? response.bigDreams.join('; ') : 'None specified';
    const nickname = response.nickname ? response.nickname : 'None specified';

    // ============================================================================
    // STEP 4: Build the prompt with explicit structure
    // ============================================================================
    // The prompt is organized into clear sections to guide the AI:
    // 1. Objective (what we're optimizing for)
    // 2. Inputs (minimal essentials from Minimalist)
    // 3. Role model signals (optional personalization from Archetype)
    // 4. Hard constraints (format requirements)
    // 5. Quality requirements (what "best" means)
    return {
      prompt: `You are generating ONE Identity Arc for a real person. Optimize for: (1) felt accuracy (it "gets" them), (2) easy reading, (3) everyday concreteness.

INPUTS (minimal essentials):
- Age band: ${response.ageBand}
- Domain: ${response.domain}
- Future-self vibe: ${response.motivation}
- Everyday proud moment: ${response.proudMoment}
- Optional dreams: ${dreams}
- Optional nickname: ${nickname}

ROLE MODEL SIGNALS (mostly taps; may be incomplete):
${roleModelSignals || 'No role model signals provided.'}

HARD OUTPUT CONSTRAINTS (must follow exactly):
- Return 1 arc.
- Arc name must be 1–3 meaningful words (no more than 3). Prefer 2 words.
- Arc narrative MUST be exactly 3 sentences, one paragraph, 40–120 words total.
- Narrative MUST start with "I want".
- Avoid clichés and vague phrases (no "journey", no "mindset", no "purposeful impact").

QUALITY REQUIREMENTS (what "best" means):
- Personal: weave in the domain + proud moment + vibe; if role-model signals exist, translate them into *their* identity (do NOT name-drop or copy the role model).
- Concrete: include at least one everyday scene ("on a Tuesday...", "after practice...", "at my desk...") AND one specific micro-behavior they could do this week.
- Readable: aim for a 14-year-old to understand instantly; short words, short sentences, no jargon.
- Useful: make the arc feel like a clear identity direction someone could adopt.

Also include up to 4 suggestedForces as short, concrete phrases (no abstract virtues-only lists).`,
    };
  },
};

/**
 * All available prompt paradigms
 */
export const PROMPT_PARADIGMS: PromptParadigm[] = [
  paradigm1_Baseline,
  paradigm2_NarrativeFirst,
  paradigm3_IdentitySpine,
  paradigm4_DreamAnchor,
  paradigm5_Minimalist,
  paradigm6_QuestionAnswer,
  paradigm7_ContrastBased,
  paradigm8_ValuesFirst,
  paradigm9_ArchetypeEmulation,
  paradigm10_HybridMinimalistArchetype,
];

export const getActivePromptParadigms = (): PromptParadigm[] =>
  PROMPT_PARADIGMS.filter((p) => p.enabled !== false);

export async function getActivePromptParadigmsAsync(): Promise<PromptParadigm[]> {
  const base = getActivePromptParadigms();
  const decision = await getArcTestingPruningDecision();
  const pruned = new Set(decision.prunedParadigmIds);
  // If we have no pruning signal yet, or pruning would eliminate too many, keep base.
  const filtered = base.filter((p) => !pruned.has(p.id));
  if (filtered.length < Math.max(3, Math.ceil(base.length * 0.5))) {
    return base;
  }
  return filtered;
}

/**
 * Run a single test: one paradigm against one response
 */
export async function runSingleTest(
  paradigm: PromptParadigm,
  response: SyntheticQuestionnaireResponse,
  options?: { modelOverride?: string }
): Promise<TestResult> {
  const { prompt, timeHorizon, additionalContext } = paradigm.buildPrompt(response);

  try {
    const arcs = await generateArcs({
      prompt,
      timeHorizon,
      additionalContext,
      modelOverride: options?.modelOverride,
    });

    return {
      paradigmId: paradigm.id,
      responseId: response.id,
      arcs,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      paradigmId: paradigm.id,
      responseId: response.id,
      arcs: [],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all paradigms against a single response
 */
export async function testAllParadigmsForResponse(
  response: SyntheticQuestionnaireResponse,
  options?: { modelOverride?: string }
): Promise<ComparisonResult> {
  const paradigms = await getActivePromptParadigmsAsync();
  const results = await Promise.all(
    paradigms.map(async (paradigm) => {
      const testResult = await runSingleTest(paradigm, response, options);
      return {
        paradigmId: paradigm.id,
        arcs: testResult.arcs,
        error: testResult.error,
      };
    })
  );

  return {
    responseId: response.id,
    results,
  };
}

/**
 * Run all paradigms against all responses
 */
export async function runFullTestSuite(): Promise<ComparisonResult[]> {
  const comparisons = await Promise.all(
    SYNTHETIC_RESPONSES.map((response) => testAllParadigmsForResponse(response))
  );

  return comparisons;
}

export async function runFullTestSuiteWithOptions(
  options?: { modelOverride?: string }
): Promise<ComparisonResult[]> {
  const comparisons = await Promise.all(
    SYNTHETIC_RESPONSES.map((response) => testAllParadigmsForResponse(response, options))
  );
  return comparisons;
}

/**
 * Format test results for human review
 */
export function formatTestResults(comparison: ComparisonResult): string {
  const response = SYNTHETIC_RESPONSES.find((r) => r.id === comparison.responseId);
  const lines: string[] = [
    `\n${'='.repeat(80)}`,
    `RESPONSE: ${response?.description || comparison.responseId}${response?.ageBand ? ` (age ${response.ageBand})` : ''}`,
    `${'='.repeat(80)}`,
  ];

  comparison.results.forEach((result) => {
    const paradigm = PROMPT_PARADIGMS.find((p) => p.id === result.paradigmId);
    lines.push(`\n--- ${paradigm?.name || result.paradigmId} ---`);
    if (result.error) {
      lines.push(`ERROR: ${result.error}`);
    } else {
      result.arcs.forEach((arc, i) => {
        lines.push(`\nArc ${i + 1}:`);
        lines.push(`  Name: ${arc.name}`);
        lines.push(`  Narrative: ${arc.narrative}`);
        if (arc.suggestedForces && arc.suggestedForces.length > 0) {
          lines.push(`  Forces: ${arc.suggestedForces.join(', ')}`);
        }
      });
    }
  });

  return lines.join('\n');
}

