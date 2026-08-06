import type {
  StoryAdventurePlan,
  StoryOutcome,
  StorySceneResult,
} from '@/src/capabilities/games/domain/storyAdventure';
import {
  requestStoryGameJson,
  type StoryGameAiTransport,
  type StoryGameAiRequest,
} from './storyGameTransport';

export type { StoryGameAiTransport, StoryGameAiRequest } from './storyGameTransport';

const STORY_AI_TIMEOUT_MS = 3000;

const fictionOnlySystemPrompt = [
  'You are the quiet story director for a mixed-age cooperative family game.',
  'Write vivid, playful, concise fiction that sends attention back to the people in the room.',
  'Never change rules, choices, Trouble, resources, or outcomes. Those are owned by deterministic code.',
  'Do not judge whether an idea is clever, infer personality, or reward eloquence.',
  'Do not profile the players or infer real family relationships.',
  'Keep danger adventurous rather than graphic. Never permanently harm a child, family member, or pet.',
  'Return only JSON matching the supplied schema.',
].join('\n');

export const STORY_PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 48 },
    goal: { type: 'string', minLength: 12, maxLength: 180 },
    promise: { type: 'string', minLength: 8, maxLength: 140 },
    opening: { type: 'string', minLength: 8, maxLength: 200 },
    sceneFrames: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string', minLength: 3, maxLength: 200 },
    },
    twist: { type: 'string', minLength: 3, maxLength: 180 },
    endings: {
      type: 'object',
      properties: {
        bright: { type: 'string', minLength: 3, maxLength: 220 },
        costly: { type: 'string', minLength: 3, maxLength: 220 },
        heroic: { type: 'string', minLength: 3, maxLength: 220 },
      },
      required: ['bright', 'costly', 'heroic'],
      additionalProperties: false,
    },
  },
  required: ['title', 'goal', 'promise', 'opening', 'sceneFrames', 'twist', 'endings'],
  additionalProperties: false,
};

const STORY_TWIST_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: { twist: { type: 'string', minLength: 3, maxLength: 180 } },
  required: ['twist'],
  additionalProperties: false,
};

const STORY_ENDING_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    ending: { type: 'string', minLength: 3, maxLength: 240 },
    callbacks: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string', minLength: 3, maxLength: 140 },
    },
  },
  required: ['ending', 'callbacks'],
  additionalProperties: false,
};

type StoryPrompt = { system: string; user: string };

export function buildStoryPlanPrompt({
  fallback,
  playerCount,
}: {
  fallback: StoryAdventurePlan;
  playerCount: number;
}): StoryPrompt {
  return {
    system: fictionOnlySystemPrompt,
    user: [
      'Create a new fiction skin for this fixed three-scene adventure.',
      `Flavor: ${fallback.flavor}`,
      `Players: ${Math.max(2, Math.min(6, Math.floor(playerCount)))}`,
      'Scene 1 mechanic: find a way using three approaches.',
      'Scene 2 mechanic: hold together while three things need attention.',
      'Scene 3 mechanic: finish the Goal while keeping the Promise.',
      'The Goal must be one repeatable sentence. The Promise must name what the group refuses to sacrifice.',
      'Scene frames should be one or two short spoken sentences. Do not name or describe the real players.',
    ].join('\n'),
  };
}

export function buildStoryTwistPrompt({
  plan,
  result,
}: {
  plan: StoryAdventurePlan;
  result: StorySceneResult;
}): StoryPrompt {
  const powerSeats = result.newlySpentPowerSeatIndexes.map((seat) => seat + 1);
  return {
    system: `${fictionOnlySystemPrompt}\nThe mechanical scene result is already final. Return one callback twist only.`,
    user: [
      `Adventure: ${plan.title}`,
      `Goal: ${plan.goal}`,
      `Promise: ${plan.promise}`,
      `Recorded commitments: ${result.commitments.map(({ seatIndex, choiceId }) => `seat ${seatIndex + 1}=${choiceId}`).join(', ') || 'none'}`,
      `Power seats: ${powerSeats.join(', ') || 'none'}`,
      `Trouble after the scene: ${result.nextTrouble}`,
      'Return a short twist that brings back one recorded choice without changing the result.',
    ].join('\n'),
  };
}

export function buildStoryEndingPrompt({
  plan,
  outcome,
  results,
}: {
  plan: StoryAdventurePlan;
  outcome: StoryOutcome;
  results: StorySceneResult[];
}): StoryPrompt {
  return {
    system: `${fictionOnlySystemPrompt}\nThe outcome is already final. Express it faithfully and do not upgrade or downgrade it.`,
    user: [
      `Adventure: ${plan.title}`,
      `Goal: ${plan.goal}`,
      `Promise: ${plan.promise}`,
      `Final outcome: ${outcome.kind}`,
      `Outcome meaning: ${outcome.summary}`,
      `Scene record: ${results.map((result) => `scene ${result.sceneIndex + 1}: coverage ${result.coverage}, Trouble +${result.troubleAdded}, choices ${result.commitments.map(({ choiceId }) => choiceId).join('/')}`).join('; ') || 'no scene detail'}`,
      'Write one short ending and one to three concrete callbacks. Do not mention scores or mechanics.',
    ].join('\n'),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedString(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length >= min && next.length <= max ? next : null;
}

const unsafeStoryPattern = /\b(?:blood|bloody|gore|gory|kill(?:ed|er|ing)?|murder(?:ed|er|ing)?|suicide|dismember(?:ed|ment)?|sexual|nude|naked|firearm|gun)\b/i;

function storyTextIsSafe(values: string[]) {
  return values.every((value) => !unsafeStoryPattern.test(value));
}

export function parseGeneratedStoryPlan(value: unknown, fallback: StoryAdventurePlan): StoryAdventurePlan | null {
  const input = record(value);
  const endingInput = record(input?.endings);
  const frames = Array.isArray(input?.sceneFrames) ? input.sceneFrames : null;
  if (!input || !endingInput || !frames || frames.length !== 3) return null;

  const title = boundedString(input.title, 3, 48);
  const goal = boundedString(input.goal, 12, 180);
  const promise = boundedString(input.promise, 8, 140);
  const opening = boundedString(input.opening, 8, 200);
  const sceneFrames = frames.map((frame) => boundedString(frame, 3, 200));
  const twist = boundedString(input.twist, 3, 180);
  const bright = boundedString(endingInput.bright, 3, 220);
  const costly = boundedString(endingInput.costly, 3, 220);
  const heroic = boundedString(endingInput.heroic, 3, 220);
  if (!title || !goal || !promise || !opening || sceneFrames.some((frame) => !frame) || !twist || !bright || !costly || !heroic) return null;
  const allText = [title, goal, promise, opening, ...(sceneFrames as string[]), twist, bright, costly, heroic];
  if (!storyTextIsSafe(allText)) return null;

  return {
    ...fallback,
    id: `generated-${fallback.id}`,
    source: 'generated',
    title,
    goal,
    promise,
    opening,
    twist,
    scenes: fallback.scenes.map((scene, index) => ({ ...scene, frame: sceneFrames[index]! })) as StoryAdventurePlan['scenes'],
    endings: { bright, costly, heroic },
  };
}

export function parseGeneratedStoryTwist(value: unknown): string | null {
  const twist = boundedString(record(value)?.twist, 3, 180);
  return twist && storyTextIsSafe([twist]) ? twist : null;
}

export type GeneratedStoryEnding = { ending: string; callbacks: string[] };

export function parseGeneratedStoryEnding(value: unknown): GeneratedStoryEnding | null {
  const input = record(value);
  const ending = boundedString(input?.ending, 3, 240);
  const rawCallbacks = Array.isArray(input?.callbacks) ? input.callbacks : null;
  if (!ending || !rawCallbacks || rawCallbacks.length < 1 || rawCallbacks.length > 3) return null;
  const callbacks = rawCallbacks.map((callback) => boundedString(callback, 3, 140));
  if (callbacks.some((callback) => !callback)) return null;
  const safeCallbacks = callbacks as string[];
  if (!storyTextIsSafe([ending, ...safeCallbacks])) return null;
  return { ending, callbacks: safeCallbacks };
}

async function safelyRequest(
  transport: StoryGameAiTransport,
  request: StoryGameAiRequest,
): Promise<unknown | null> {
  try {
    return await transport(request);
  } catch {
    return null;
  }
}

export async function generateStoryPlan({
  fallback,
  playerCount,
  transport = requestStoryGameJson,
}: {
  fallback: StoryAdventurePlan;
  playerCount: number;
  transport?: StoryGameAiTransport;
}): Promise<StoryAdventurePlan | null> {
  const prompt = buildStoryPlanPrompt({ fallback, playerCount });
  const value = await safelyRequest(transport, {
    schemaName: 'story_adventure_plan',
    schema: STORY_PLAN_SCHEMA,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    timeoutMs: STORY_AI_TIMEOUT_MS,
  });
  return parseGeneratedStoryPlan(value, fallback);
}

export async function generateStoryTwist({
  plan,
  result,
  transport = requestStoryGameJson,
}: {
  plan: StoryAdventurePlan;
  result: StorySceneResult;
  transport?: StoryGameAiTransport;
}): Promise<string | null> {
  const prompt = buildStoryTwistPrompt({ plan, result });
  const value = await safelyRequest(transport, {
    schemaName: 'story_adventure_twist',
    schema: STORY_TWIST_SCHEMA,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    timeoutMs: STORY_AI_TIMEOUT_MS,
  });
  return parseGeneratedStoryTwist(value);
}

export async function generateStoryEnding({
  plan,
  outcome,
  results,
  transport = requestStoryGameJson,
}: {
  plan: StoryAdventurePlan;
  outcome: StoryOutcome;
  results: StorySceneResult[];
  transport?: StoryGameAiTransport;
}): Promise<GeneratedStoryEnding | null> {
  const prompt = buildStoryEndingPrompt({ plan, outcome, results });
  const value = await safelyRequest(transport, {
    schemaName: 'story_adventure_ending',
    schema: STORY_ENDING_SCHEMA,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    timeoutMs: STORY_AI_TIMEOUT_MS,
  });
  return parseGeneratedStoryEnding(value);
}
