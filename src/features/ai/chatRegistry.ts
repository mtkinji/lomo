import type { GeneratedArc } from '../../services/ai';

/**
 * High-level modes that describe what job the AI chat is doing.
 * We start with arcCreation and can grow this list over time.
 */
export type ChatMode = 'arcCreation';

/**
 * Logical identifiers for tools the AI can call.
 * These are intentionally broader than the current implementation so we can
 * evolve from client-side helpers to server-side / 3rd party tools without
 * changing the calling code.
 */
export type ChatToolId =
  | 'generateArcs'
  | 'adoptArc'
  | 'listActivitiesForGoal'
  | 'suggestScheduleForActivities'
  | 'scheduleActivitiesOnCalendar';

export type ChatToolKind = 'internal_ai' | 'internal_store' | 'external_integration';

export type ChatToolConfig = {
  id: ChatToolId;
  /**
   * Human-readable description used in prompts / documentation.
   */
  description: string;
  /**
   * Rough category so we can reason about where the tool executes.
   * - internal_ai: calls OpenAI or similar to generate suggestions.
   * - internal_store: reads/writes LOMO’s own data.
   * - external_integration: talks to 3rd party services (calendar, tasks, etc).
   */
  kind: ChatToolKind;
  /**
   * Whether this tool requires the user to have connected a 3rd party account.
   * (e.g. calendar integrations).
   */
  requiresAuth?: boolean;
  /**
   * Optional server endpoint or logical operation name, so a future
   * server-side agent/orchestrator can map tools to real capabilities.
   */
  serverOperation?: string;
};

export type ChatModeConfig = {
  mode: ChatMode;
  label: string;
  /**
   * Tools that the AI is allowed to use in this mode.
   */
  tools: ChatToolConfig[];
};

export const CHAT_MODE_REGISTRY: Record<ChatMode, ChatModeConfig> = {
  arcCreation: {
    mode: 'arcCreation',
    label: 'Arc Coach',
    tools: [
      {
        id: 'generateArcs',
        description:
          'Analyze the user’s longings, time horizon, and constraints to propose 2–3 identity Arcs.',
        kind: 'internal_ai',
        serverOperation: 'ai.generateArcs',
      },
      {
        id: 'adoptArc',
        description:
          'Take a suggested Arc (name, north star, narrative, status) and create it in the user’s workspace.',
        kind: 'internal_store',
        serverOperation: 'arc.createFromSuggestion',
      },
    ],
  },
};

/**
 * Example payload shape for tools that surface Arc suggestions back into the UI.
 * As we add more modes and tools, we can introduce richer discriminated unions.
 */
export type ArcSuggestionToolPayload = {
  mode: 'arcCreation';
  suggestions: GeneratedArc[];
};


