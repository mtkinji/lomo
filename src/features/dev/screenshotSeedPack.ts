import type { Arc, Goal, Activity, Metric } from '../../domain/types';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { pickHeroForArc } from '../arcs/arcHeroSelector';
import { sendCoachChat, type CoachChatTurn } from '../../services/ai';
import { ARC_CREATION_SYSTEM_PROMPT } from '../ai/systemPrompts';

const iso = (d: Date) => d.toISOString();
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
const atHour = (base: Date, hourLocal: number, minuteLocal = 0) => {
  const d = new Date(base);
  d.setHours(hourLocal, minuteLocal, 0, 0);
  return d;
};

export const SCREENSHOT_SEED_PREFIX = 'screenshotPack';

export const SCREENSHOT_PACK_ARC_IDS = [
  'arc-screenshot-health',
  'arc-screenshot-momentum',
  'arc-screenshot-create',
] as const;

type InstallResult =
  | { status: 'installed'; added: { arcs: number; goals: number; activities: number } }
  | { status: 'already_installed' }
  | { status: 'skipped_not_dev' }
  | { status: 'ai_unavailable'; error: string; added: { arcs: number; goals: number; activities: number } };

type RemoveResult =
  | { status: 'removed'; removed: { arcs: number } }
  | { status: 'not_installed' }
  | { status: 'skipped_not_dev' };

export function isScreenshotSeedInstalled(): boolean {
  const { arcs } = useAppStore.getState();
  return SCREENSHOT_PACK_ARC_IDS.some((id) => arcs.some((a) => a.id === id));
}

type ArcSurveySeed = {
  dream: string;
  whyNow?: string;
  domain: string;
  proudMoment: string;
  motivation: string;
  roleModelType: string;
  admiredQualities: string[];
};

function extractArcProposalJson(reply: string): { name: string; narrative: string; status: Arc['status'] } | null {
  const marker = 'ARC_PROPOSAL_JSON:';
  const idx = reply.indexOf(marker);
  if (idx === -1) return null;
  const after = reply.slice(idx + marker.length).trim();
  if (!after) return null;
  const [firstBlock] = after.split(/\n\s*\n/);
  const jsonLine = (firstBlock ?? '').trim();
  if (!jsonLine.startsWith('{') || !jsonLine.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(jsonLine) as any;
    const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    const narrative = typeof parsed?.narrative === 'string' ? parsed.narrative.trim() : '';
    const statusRaw = typeof parsed?.status === 'string' ? parsed.status.trim() : '';
    const status: Arc['status'] =
      statusRaw === 'paused' || statusRaw === 'archived' ? statusRaw : 'active';
    if (!name || !narrative) return null;
    return { name, narrative, status };
  } catch {
    return null;
  }
}

async function generateArcFromSurvey(seed: ArcSurveySeed): Promise<{ name: string; narrative: string; status: Arc['status'] } | null> {
  const lines = [
    `Dream: ${seed.dream}`,
    seed.whyNow ? `Why now: ${seed.whyNow}` : null,
    `Domain: ${seed.domain}`,
    `Proud moment: ${seed.proudMoment}`,
    `Motivation: ${seed.motivation}`,
    `People I look up to: ${seed.roleModelType}`,
    `I admire: ${seed.admiredQualities.join(', ')}`,
    '',
    'Please propose ONE Arc now and include ARC_PROPOSAL_JSON exactly as specified.',
  ].filter((l): l is string => Boolean(l));

  const messages: CoachChatTurn[] = [
    { role: 'system', content: ARC_CREATION_SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ];

  const reply = await sendCoachChat(messages, {
    mode: 'arcCreation',
    paywallSource: 'unknown',
    workflowDefinitionId: 'arcCreation',
    workflowStepId: 'agent_generate_arc',
  });
  return extractArcProposalJson(reply);
}

function buildArcHero(arc: Arc): Pick<Arc, 'thumbnailUrl' | 'thumbnailVariant' | 'heroImageMeta' | 'heroHidden'> {
  const selection = pickHeroForArc(arc);
  if (!selection.image) {
    return {
      thumbnailUrl: undefined,
      thumbnailVariant: arc.thumbnailVariant ?? 0,
      heroImageMeta: undefined,
      heroHidden: false,
    };
  }
  const nowIso = new Date().toISOString();
  return {
    thumbnailUrl: selection.image.uri,
    thumbnailVariant: arc.thumbnailVariant ?? 0,
    heroImageMeta: {
      source: 'curated',
      prompt: `${SCREENSHOT_SEED_PREFIX}:${arc.id}`,
      createdAt: nowIso,
      curatedId: selection.image.id,
    },
    heroHidden: false,
  };
}

function makeMetric(id: string, metric: Omit<Metric, 'id'>): Metric {
  return { id, ...metric };
}

function ensureAddArc(arc: Arc) {
  const store = useAppStore.getState();
  if (store.arcs.some((a) => a.id === arc.id)) return false;
  store.addArc(arc);
  return true;
}

function ensureAddGoal(goal: Goal) {
  const store = useAppStore.getState();
  if (store.goals.some((g) => g.id === goal.id)) return false;
  store.addGoal(goal);
  return true;
}

function ensureAddActivity(activity: Activity) {
  const store = useAppStore.getState();
  if (store.activities.some((a) => a.id === activity.id)) return false;
  store.addActivity(activity);
  return true;
}

export async function installScreenshotSeedPack(now: Date = new Date()): Promise<InstallResult> {
  if (!__DEV__) return { status: 'skipped_not_dev' };

  const createdAt = iso(addDays(now, -28));
  const updatedAt = iso(addDays(now, -1));

  const arc1Id = SCREENSHOT_PACK_ARC_IDS[0];
  const arc2Id = SCREENSHOT_PACK_ARC_IDS[1];
  const arc3Id = SCREENSHOT_PACK_ARC_IDS[2];

  const surveySeeds: Record<typeof SCREENSHOT_PACK_ARC_IDS[number], ArcSurveySeed> = {
    [arc1Id]: {
      dream: 'Feel steady energy and a calmer baseline, and build routines I can keep even on busy days.',
      whyNow: 'I’m tired of the rollercoaster and want something sustainable.',
      domain: 'Health & energy',
      proudMoment: 'I showed up for myself even when the day was packed.',
      motivation: 'Calm, steady progress',
      roleModelType: 'People who stay grounded and consistent',
      admiredQualities: ['Consistency', 'Self-respect', 'Patience'],
    },
    [arc2Id]: {
      dream: 'Make real progress in school/work without last-minute panic, and feel proud of my output.',
      whyNow: 'I want to stop cramming and start building momentum.',
      domain: 'Learning & work',
      proudMoment: 'I finished something meaningful and turned it in/shipped it on time.',
      motivation: 'Mastery and clarity',
      roleModelType: 'People who do deep work and follow through',
      admiredQualities: ['Focus', 'Discipline', 'Clarity'],
    },
    [arc3Id]: {
      dream: 'Create something I’m proud of and feel closer to people, with more small moments that actually matter.',
      whyNow: 'I don’t want my days to blur together.',
      domain: 'Creativity & relationships',
      proudMoment: 'I shared something real and felt connected, not performative.',
      motivation: 'Meaning and connection',
      roleModelType: 'People who make and share with heart',
      admiredQualities: ['Courage', 'Warmth', 'Follow-through'],
    },
  };

  let generated: Record<string, { name: string; narrative: string; status: Arc['status'] } | null> = {};
  let generationError: string | null = null;
  try {
    const results = await Promise.all(
      SCREENSHOT_PACK_ARC_IDS.map(async (id) => {
        const proposal = await generateArcFromSurvey(surveySeeds[id]);
        return [id, proposal] as const;
      })
    );
    generated = results.reduce<Record<string, { name: string; narrative: string; status: Arc['status'] } | null>>(
      (acc, [id, proposal]) => {
        acc[id] = proposal;
        return acc;
      },
      {}
    );
  } catch (err) {
    // We'll fall back to deterministic arcs below, but return a useful status if nothing gets added.
    if (__DEV__) {
      console.warn('[screenshotSeedPack] failed to generate arcs via survey', err);
    }
    generationError = err instanceof Error ? err.message : String(err);
  }

  const arcs: Arc[] = getFallbackArcs().map((fallback) => {
    const proposal = generated[fallback.id] ?? null;
    const name = proposal?.name ?? fallback.name;
    const narrative = proposal?.narrative ?? fallback.narrative;
    const status = proposal?.status ?? 'active';
    const arcBase: Arc = {
      id: fallback.id,
      name,
      narrative,
      status,
      startDate: iso(addDays(now, fallback.startOffsetDays)),
      endDate: iso(addDays(now, fallback.endOffsetDays)),
      createdAt,
      updatedAt,
      thumbnailVariant: fallback.thumbnailVariant,
    };
    return { ...arcBase, ...buildArcHero(arcBase) };
  });

  // Fallback arcs (deterministic) in case AI is unavailable. These are shaped
  // to match the Arc narrative constraints: "I want...", exactly 3 sentences.
  function getFallbackArcs(): Array<{
    id: string;
    name: string;
    narrative: string;
    thumbnailVariant: number;
    startOffsetDays: number;
    endOffsetDays: number;
  }> {
    return [
    {
      id: arc1Id,
      name: '🌿 Calm Strength',
      narrative:
        'I want steady energy and a calmer baseline so I can show up well in my days. This matters now because I’ve been feeling stretched thin, and I want routines that actually hold when life gets busy. On a normal day that goes well, I move my body, eat something simple that fuels me, and end the night with a small wind-down instead of scrolling.',
      thumbnailVariant: 0,
      startOffsetDays: -14,
      endOffsetDays: 28,
    },
    {
      id: arc2Id,
      name: '📚 Quiet Mastery',
      narrative:
        'I want to become someone who makes consistent progress in school or work without burning out. This matters now because I’m tired of last-minute stress and I want a rhythm that’s calm, focused, and sustainable. On a normal proud day, I do one deep work block, close a few loose ends, and finish with a clear plan for what comes next.',
      thumbnailVariant: 1,
      startOffsetDays: -5,
      endOffsetDays: 23,
    },
    {
      id: arc3Id,
      name: '🎨 Creative Connection',
      narrative:
        'I want to make things I’m proud of and stay close to the people who matter to me. This matters now because it’s easy for my days to blur together, and I want more moments that feel real and shared. On a normal day, I spend a little time drafting or practicing, then I reach out to one person and follow through on a small plan.',
      thumbnailVariant: 2,
      startOffsetDays: -35,
      endOffsetDays: 21,
    },
    ];
  }

  const goals: Goal[] = [
    // --- Arc 1 (mid-flight ~45%) --------------------------------------------
    {
      id: 'goal-screenshot-health-move',
      arcId: arc1Id,
      title: 'Move 4x/week (even if it’s short)',
      description: 'Keep it sustainable. Count walks, workouts, and “just move” days.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -14)),
      targetDate: iso(addDays(now, 28)),
      forceIntent: { 'force-activity': 3, 'force-mastery': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-health-move-sessions', { kind: 'event_count', label: 'sessions', target: 24 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-health-sleep',
      arcId: arc1Id,
      title: 'Sleep + morning reset',
      description: 'Wind down. Wake up without panic. Keep the first 15 minutes kind.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -14)),
      targetDate: iso(addDays(now, 28)),
      forceIntent: { 'force-activity': 2, 'force-mastery': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-health-sleep-nights', { kind: 'count', label: 'good nights', target: 18 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-health-food',
      arcId: arc1Id,
      title: 'Eat basics most days',
      description: 'Protein + plants + water. Not perfection—just coverage.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -14)),
      targetDate: iso(addDays(now, 28)),
      forceIntent: { 'force-activity': 2, 'force-mastery': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-health-food-days', { kind: 'count', label: 'days on track', target: 20 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-health-stress',
      arcId: arc1Id,
      title: 'Stress off-ramp',
      description: 'Have a few ways to downshift when I’m spiraling.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -14)),
      targetDate: iso(addDays(now, 28)),
      forceIntent: { 'force-activity': 1, 'force-mastery': 1, 'force-connection': 1, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-health-stress-sessions', { kind: 'event_count', label: 'resets', target: 14 })],
      createdAt,
      updatedAt,
    },

    // --- Arc 2 (early ~25%) -------------------------------------------------
    {
      id: 'goal-screenshot-momentum-deepwork',
      arcId: arc2Id,
      title: 'Deep work rhythm',
      description: 'Show up for focused blocks and stop pretending multitasking works.',
      status: 'planned',
      qualityState: 'ready',
      startDate: iso(addDays(now, -5)),
      targetDate: iso(addDays(now, 23)),
      forceIntent: { 'force-mastery': 3, 'force-activity': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-momentum-deepwork-blocks', { kind: 'count', label: 'focus blocks', target: 12 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-momentum-proof',
      arcId: arc2Id,
      title: 'One “proof” project',
      description: 'A small deliverable I can share (portfolio / demo / essay / deck).',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -5)),
      targetDate: iso(addDays(now, 23)),
      forceIntent: { 'force-mastery': 3, 'force-activity': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-momentum-proof-milestone', { kind: 'milestone', label: 'shared publicly', completedAt: null })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-momentum-comms',
      arcId: arc2Id,
      title: 'Communication & follow-through',
      description: 'Clear messages. Fewer open loops. Less anxiety.',
      status: 'planned',
      qualityState: 'ready',
      startDate: iso(addDays(now, -5)),
      targetDate: iso(addDays(now, 23)),
      forceIntent: { 'force-connection': 2, 'force-mastery': 2, 'force-activity': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-momentum-comms-threads', { kind: 'event_count', label: 'closed loops', target: 10 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-momentum-readiness',
      arcId: arc2Id,
      title: 'Presentation/interview readiness',
      description: 'Practice + prep so I’m not winging it last minute.',
      status: 'planned',
      qualityState: 'ready',
      startDate: iso(addDays(now, -5)),
      targetDate: iso(addDays(now, 23)),
      forceIntent: { 'force-mastery': 3, 'force-connection': 1, 'force-activity': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-momentum-readiness-reps', { kind: 'count', label: 'practice reps', target: 6 })],
      createdAt,
      updatedAt,
    },

    // --- Arc 3 (near-finish ~75%) ------------------------------------------
    {
      id: 'goal-screenshot-create-project',
      arcId: arc3Id,
      title: 'Finish a small creative project',
      description: 'Draft → revise → share. Small is fine. Done is better.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -35)),
      targetDate: iso(addDays(now, 21)),
      forceIntent: { 'force-mastery': 2, 'force-activity': 1, 'force-connection': 1, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-create-project-milestone', { kind: 'milestone', label: 'published/shared', completedAt: null })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-create-relationships',
      arcId: arc3Id,
      title: 'Be more present with people',
      description: 'Reach out, make plans, follow through.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -35)),
      targetDate: iso(addDays(now, 21)),
      forceIntent: { 'force-connection': 3, 'force-mastery': 0, 'force-activity': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-create-relationships', { kind: 'event_count', label: 'touchpoints', target: 12 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-create-boundaries',
      arcId: arc3Id,
      title: 'Digital boundaries that actually help',
      description: 'Less doomscroll. More intentional time.',
      status: 'in_progress',
      qualityState: 'ready',
      startDate: iso(addDays(now, -35)),
      targetDate: iso(addDays(now, 21)),
      forceIntent: { 'force-mastery': 2, 'force-activity': 1, 'force-connection': 0, 'force-spirituality': 0 },
      metrics: [makeMetric('metric-create-boundaries-days', { kind: 'count', label: 'screen-light nights', target: 14 })],
      createdAt,
      updatedAt,
    },
    {
      id: 'goal-screenshot-create-fun',
      arcId: arc3Id,
      title: 'Do a couple genuinely fun things',
      description: 'Fun counts. I’m allowed.',
      status: 'completed',
      qualityState: 'ready',
      startDate: iso(addDays(now, -35)),
      targetDate: iso(addDays(now, 21)),
      forceIntent: { 'force-activity': 2, 'force-connection': 2, 'force-mastery': 0, 'force-spirituality': 0 },
      metrics: [
        makeMetric('metric-create-fun-count', {
          kind: 'count',
          label: 'fun outings',
          baseline: 0,
          target: 4,
        }),
      ],
      createdAt,
      updatedAt,
    },
  ];

  const mkActivity = (
    activity: Omit<Activity, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
  ): Activity => {
    const ts = activity.createdAt ?? updatedAt;
    return {
      ...activity,
      forceActual: activity.forceActual ?? defaultForceLevels(0),
      createdAt: ts,
      updatedAt: activity.updatedAt ?? ts,
    } as Activity;
  };

  const activities: Activity[] = [
    // Arc 1 - move
    mkActivity({
      id: 'activity-screenshot-health-move-1',
      goalId: 'goal-screenshot-health-move',
      title: '20-min walk + music reset',
      type: 'task',
      tags: ['health', 'outdoors'],
      notes: '',
      estimateMinutes: 20,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, 0), 17, 30)),
      status: 'planned',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Reset',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 1,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),
    mkActivity({
      id: 'activity-screenshot-health-move-2',
      goalId: 'goal-screenshot-health-move',
      title: 'Strength: full-body basics',
      type: 'checklist',
      tags: ['health', 'strength'],
      notes: 'Keep it simple: just show up.',
      estimateMinutes: 35,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -2), 18, 0)),
      status: 'done',
      steps: [
        { id: 'step-1', title: 'Warm-up (5m)', completedAt: iso(addDays(now, -2)) },
        { id: 'step-2', title: 'Squats (3 sets)', completedAt: iso(addDays(now, -2)) },
        { id: 'step-3', title: 'Push-ups (3 sets)', completedAt: iso(addDays(now, -2)) },
        { id: 'step-4', title: 'Row / band pulls (3 sets)', completedAt: iso(addDays(now, -2)) },
        { id: 'step-5', title: 'Stretch (3m)', completedAt: iso(addDays(now, -2)) },
      ],
      repeatRule: 'weekly',
      phase: 'Strength',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 2,
      actualMinutes: 38,
      startedAt: iso(atHour(addDays(now, -2), 18, 0)),
      completedAt: iso(atHour(addDays(now, -2), 18, 45)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-activity': 2, 'force-mastery': 1 },
    }),
    mkActivity({
      id: 'activity-screenshot-health-move-3',
      goalId: 'goal-screenshot-health-move',
      title: 'Mobility (10m)',
      type: 'task',
      tags: ['health', 'recovery'],
      notes: '',
      estimateMinutes: 10,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, -1), 21, 30)),
      status: 'done',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Recovery',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 3,
      actualMinutes: 12,
      startedAt: iso(atHour(addDays(now, -1), 21, 30)),
      completedAt: iso(atHour(addDays(now, -1), 21, 45)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-activity': 1 },
    }),
    mkActivity({
      id: 'activity-screenshot-health-move-4',
      goalId: 'goal-screenshot-health-move',
      title: 'Try a new class (optional)',
      type: 'task',
      tags: ['health', 'fun'],
      notes: 'Only if it sounds genuinely fun.',
      estimateMinutes: 45,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, 3), 11, 0)),
      status: 'planned',
      steps: [],
      repeatRule: undefined,
      phase: 'Experiment',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 4,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 1 - sleep
    mkActivity({
      id: 'activity-screenshot-health-sleep-1',
      goalId: 'goal-screenshot-health-sleep',
      title: 'Lights down by 11:15',
      type: 'task',
      tags: ['sleep'],
      notes: 'Phone across the room.',
      estimateMinutes: 5,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, 0), 23, 10)),
      status: 'planned',
      steps: [],
      repeatRule: 'daily',
      phase: 'Wind-down',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: iso(atHour(addDays(now, 0), 23, 0)),
      orderIndex: 10,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),
    mkActivity({
      id: 'activity-screenshot-health-sleep-2',
      goalId: 'goal-screenshot-health-sleep',
      title: 'Morning: water + 3-min tidy',
      type: 'checklist',
      tags: ['routine'],
      notes: '',
      estimateMinutes: 8,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -3), 8, 10)),
      status: 'done',
      steps: [
        { id: 's1', title: 'Drink water', completedAt: iso(atHour(addDays(now, -3), 8, 12)) },
        { id: 's2', title: 'Open blinds', completedAt: iso(atHour(addDays(now, -3), 8, 13)) },
        { id: 's3', title: '3-min tidy', completedAt: iso(atHour(addDays(now, -3), 8, 16)) },
      ],
      repeatRule: 'weekdays',
      phase: 'Morning',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 11,
      actualMinutes: 9,
      startedAt: iso(atHour(addDays(now, -3), 8, 10)),
      completedAt: iso(atHour(addDays(now, -3), 8, 20)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-activity': 1 },
    }),

    // Arc 1 - food
    mkActivity({
      id: 'activity-screenshot-health-food-1',
      goalId: 'goal-screenshot-health-food',
      title: 'Grocery top-up (basics)',
      type: 'shopping_list',
      tags: ['errands', 'food'],
      notes: 'Quick run, no overthinking.',
      estimateMinutes: 35,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, 1), 18, 15)),
      status: 'planned',
      steps: [
        { id: 'g1', title: 'Yogurt or eggs', completedAt: null },
        { id: 'g2', title: 'Frozen veg', completedAt: null },
        { id: 'g3', title: 'Chicken/tofu', completedAt: null },
        { id: 'g4', title: 'Fruit', completedAt: null },
      ],
      repeatRule: undefined,
      phase: 'Food',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 20,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),
    mkActivity({
      id: 'activity-screenshot-health-food-2',
      goalId: 'goal-screenshot-health-food',
      title: 'Pack a “future me” snack',
      type: 'task',
      tags: ['food'],
      notes: 'Something easy: bar, fruit, nuts.',
      estimateMinutes: 5,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, -4), 22, 0)),
      status: 'done',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Prep',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 21,
      actualMinutes: 4,
      startedAt: iso(atHour(addDays(now, -4), 22, 0)),
      completedAt: iso(atHour(addDays(now, -4), 22, 6)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-activity': 1 },
    }),

    // Arc 1 - stress
    mkActivity({
      id: 'activity-screenshot-health-stress-1',
      goalId: 'goal-screenshot-health-stress',
      title: '10-min breathing + stretch',
      type: 'task',
      tags: ['recovery', 'calm'],
      notes: '',
      estimateMinutes: 10,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -1), 16, 15)),
      status: 'done',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Calm',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 30,
      actualMinutes: 11,
      startedAt: iso(atHour(addDays(now, -1), 16, 15)),
      completedAt: iso(atHour(addDays(now, -1), 16, 30)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-activity': 1 },
    }),

    // Arc 2 - deep work (early)
    mkActivity({
      id: 'activity-screenshot-momentum-deepwork-1',
      goalId: 'goal-screenshot-momentum-deepwork',
      title: 'Plan 3 priorities (10m)',
      type: 'task',
      tags: ['planning'],
      notes: '',
      estimateMinutes: 10,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, 0), 9, 0)),
      status: 'done',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Plan',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: iso(atHour(addDays(now, 0), 8, 55)),
      orderIndex: 100,
      actualMinutes: 8,
      startedAt: iso(atHour(addDays(now, 0), 9, 0)),
      completedAt: iso(atHour(addDays(now, 0), 9, 10)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-mastery': 1 },
    }),
    mkActivity({
      id: 'activity-screenshot-momentum-deepwork-2',
      goalId: 'goal-screenshot-momentum-deepwork',
      title: 'Focus block (45m): core task',
      type: 'task',
      tags: ['focus'],
      notes: 'Phone away. One tab. Start tiny if needed.',
      estimateMinutes: 45,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, 1), 10, 0)),
      status: 'planned',
      steps: [],
      repeatRule: 'weekly',
      phase: 'Deep work',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: iso(atHour(addDays(now, 1), 9, 55)),
      orderIndex: 101,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 2 - proof project
    mkActivity({
      id: 'activity-screenshot-momentum-proof-1',
      goalId: 'goal-screenshot-momentum-proof',
      title: 'Define “done” for the project (20m)',
      type: 'task',
      tags: ['project'],
      notes: 'What would you be proud to share?',
      estimateMinutes: 20,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, -2), 12, 30)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Milestone',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 120,
      actualMinutes: 22,
      startedAt: iso(atHour(addDays(now, -2), 12, 30)),
      completedAt: iso(atHour(addDays(now, -2), 12, 55)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-mastery': 2 },
    }),
    mkActivity({
      id: 'activity-screenshot-momentum-proof-2',
      goalId: 'goal-screenshot-momentum-proof',
      title: 'Draft v1 (60m)',
      type: 'task',
      tags: ['project', 'focus'],
      notes: '',
      estimateMinutes: 60,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, 2), 14, 0)),
      status: 'planned',
      steps: [],
      repeatRule: undefined,
      phase: 'Draft',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 121,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),
    mkActivity({
      id: 'activity-screenshot-momentum-proof-3',
      goalId: 'goal-screenshot-momentum-proof',
      title: 'Ask someone for feedback',
      type: 'task',
      tags: ['accountability'],
      notes: 'One person. One question.',
      estimateMinutes: 10,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, 4), 18, 45)),
      status: 'planned',
      steps: [],
      repeatRule: undefined,
      phase: 'Feedback',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 122,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 2 - comms/follow-through
    mkActivity({
      id: 'activity-screenshot-momentum-comms-1',
      goalId: 'goal-screenshot-momentum-comms',
      title: 'Close 3 open loops',
      type: 'checklist',
      tags: ['admin'],
      notes: 'Small follow-ups count.',
      estimateMinutes: 20,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, 1), 16, 0)),
      status: 'planned',
      steps: [
        { id: 'c1', title: 'Reply to the email you’re avoiding', completedAt: null },
        { id: 'c2', title: 'Send the quick update', completedAt: null },
        { id: 'c3', title: 'Schedule the thing', completedAt: null },
      ],
      repeatRule: undefined,
      phase: 'Admin',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 140,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 3 - creative project (near finish)
    mkActivity({
      id: 'activity-screenshot-create-project-1',
      goalId: 'goal-screenshot-create-project',
      title: 'Draft is done (yes, messy is fine)',
      type: 'task',
      tags: ['create'],
      notes: '',
      estimateMinutes: 45,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -10), 19, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Draft',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 200,
      actualMinutes: 50,
      startedAt: iso(atHour(addDays(now, -10), 19, 0)),
      completedAt: iso(atHour(addDays(now, -10), 19, 55)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-mastery': 2 },
    }),
    mkActivity({
      id: 'activity-screenshot-create-project-2',
      goalId: 'goal-screenshot-create-project',
      title: 'Revision pass (30m)',
      type: 'task',
      tags: ['create'],
      notes: 'One pass only. Don’t spiral.',
      estimateMinutes: 30,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -6), 20, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Revise',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 201,
      actualMinutes: 28,
      startedAt: iso(atHour(addDays(now, -6), 20, 0)),
      completedAt: iso(atHour(addDays(now, -6), 20, 35)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-mastery': 2 },
    }),
    mkActivity({
      id: 'activity-screenshot-create-project-3',
      goalId: 'goal-screenshot-create-project',
      title: 'Share it somewhere (low stakes)',
      type: 'task',
      tags: ['create', 'share'],
      notes: 'Send to a friend or post quietly.',
      estimateMinutes: 15,
      priority: 1,
      scheduledDate: iso(atHour(addDays(now, 2), 18, 0)),
      status: 'planned',
      steps: [],
      repeatRule: undefined,
      phase: 'Share',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 202,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 3 - relationships
    mkActivity({
      id: 'activity-screenshot-create-relationships-1',
      goalId: 'goal-screenshot-create-relationships',
      title: 'Text someone you miss',
      type: 'task',
      tags: ['relationships'],
      notes: 'Simple: “thinking of you—how are you?”',
      estimateMinutes: 5,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -2), 13, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Reach out',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 220,
      actualMinutes: 4,
      startedAt: iso(atHour(addDays(now, -2), 13, 0)),
      completedAt: iso(atHour(addDays(now, -2), 13, 5)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-connection': 2 },
    }),
    mkActivity({
      id: 'activity-screenshot-create-relationships-2',
      goalId: 'goal-screenshot-create-relationships',
      title: 'Make weekend plans (1 thing)',
      type: 'task',
      tags: ['relationships', 'fun'],
      notes: '',
      estimateMinutes: 10,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, 3), 12, 0)),
      status: 'planned',
      steps: [],
      repeatRule: undefined,
      phase: 'Plans',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 221,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 3 - boundaries
    mkActivity({
      id: 'activity-screenshot-create-boundaries-1',
      goalId: 'goal-screenshot-create-boundaries',
      title: 'Notification cleanup (15m)',
      type: 'task',
      tags: ['boundaries'],
      notes: 'Turn off the loud stuff.',
      estimateMinutes: 15,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, -7), 21, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Boundaries',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 240,
      actualMinutes: 14,
      startedAt: iso(atHour(addDays(now, -7), 21, 0)),
      completedAt: iso(atHour(addDays(now, -7), 21, 20)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-mastery': 1 },
    }),
    mkActivity({
      id: 'activity-screenshot-create-boundaries-2',
      goalId: 'goal-screenshot-create-boundaries',
      title: 'Screen-light night (no doomscroll)',
      type: 'task',
      tags: ['boundaries'],
      notes: 'Replace with a book / walk / chat.',
      estimateMinutes: 30,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -1), 20, 30)),
      status: 'skipped',
      steps: [],
      repeatRule: 'weekdays',
      phase: 'Evening',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 241,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      creationSource: 'manual',
      forceActual: defaultForceLevels(0),
    }),

    // Arc 3 - fun (completed goal)
    mkActivity({
      id: 'activity-screenshot-create-fun-1',
      goalId: 'goal-screenshot-create-fun',
      title: 'Go for boba/coffee with a friend',
      type: 'task',
      tags: ['fun', 'relationships'],
      notes: '',
      estimateMinutes: 45,
      priority: 2,
      scheduledDate: iso(atHour(addDays(now, -12), 16, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Fun',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 260,
      actualMinutes: 52,
      startedAt: iso(atHour(addDays(now, -12), 16, 0)),
      completedAt: iso(atHour(addDays(now, -12), 17, 0)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-connection': 2, 'force-activity': 1 },
    }),
    mkActivity({
      id: 'activity-screenshot-create-fun-2',
      goalId: 'goal-screenshot-create-fun',
      title: 'Watch a movie night (phone away)',
      type: 'task',
      tags: ['fun', 'boundaries'],
      notes: '',
      estimateMinutes: 90,
      priority: 3,
      scheduledDate: iso(atHour(addDays(now, -20), 20, 0)),
      status: 'done',
      steps: [],
      repeatRule: undefined,
      phase: 'Fun',
      planGroupId: null,
      scheduledAt: null,
      reminderAt: null,
      orderIndex: 261,
      actualMinutes: 105,
      startedAt: iso(atHour(addDays(now, -20), 20, 0)),
      completedAt: iso(atHour(addDays(now, -20), 22, 0)),
      creationSource: 'manual',
      forceActual: { ...defaultForceLevels(0), 'force-connection': 1 },
    }),
  ];

  let addedArcs = 0;
  let addedGoals = 0;
  let addedActivities = 0;

  for (const arc of arcs) {
    if (ensureAddArc(arc)) addedArcs += 1;
  }
  for (const goal of goals) {
    if (ensureAddGoal(goal)) addedGoals += 1;
  }
  for (const activity of activities) {
    if (ensureAddActivity(activity)) addedActivities += 1;
  }

  if (addedArcs === 0 && addedGoals === 0 && addedActivities === 0) {
    return { status: 'already_installed' };
  }
  if (generationError) {
    return {
      status: 'ai_unavailable',
      error: generationError,
      added: { arcs: addedArcs, goals: addedGoals, activities: addedActivities },
    };
  }
  return {
    status: 'installed',
    added: { arcs: addedArcs, goals: addedGoals, activities: addedActivities },
  };
}

export function removeScreenshotSeedPack(): RemoveResult {
  if (!__DEV__) return { status: 'skipped_not_dev' };
  if (!isScreenshotSeedInstalled()) return { status: 'not_installed' };
  const store = useAppStore.getState();
  let removed = 0;
  for (const arcId of SCREENSHOT_PACK_ARC_IDS) {
    if (store.arcs.some((a) => a.id === arcId)) {
      store.removeArc(arcId);
      removed += 1;
    }
  }
  return { status: 'removed', removed: { arcs: removed } };
}


