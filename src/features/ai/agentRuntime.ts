import type { ChatMode } from './workflowRegistry';
import type { WorkflowInstance } from '../../domain/workflows';

/**
 * Kinds of items that can appear in the agent's chat + cards timeline.
 *
 * This is a UI-facing concept (what the user can scroll back through), not a
 * direct OpenAI wire format. The backend / transport layer is free to build
 * whatever context window it needs from these items.
 */
export type AgentTimelineItemKind =
  | 'assistantMessage'
  | 'userMessage'
  | 'card'
  | 'systemEvent';

type AgentTimelineBase = {
  id: string;
  createdAt: string;
};

export type AgentTimelineTextMessage = AgentTimelineBase & {
  kind: 'assistantMessage' | 'userMessage';
  role: 'assistant' | 'user';
  content: string;
};

export type AgentTimelineCardItem = AgentTimelineBase & {
  kind: 'card';
  /**
   * Optional workflow step this card is associated with. This is purely a
   * bookkeeping hint for presenters and analytics; the card component itself
   * stays generic.
   */
  stepId?: string;
  /**
   * Optional identifier for the React component used to render this card
   * (for example, "QuestionCard" or "ArcProposalCard"). This lets future
   * server-driven flows describe UI without hard-coding components here.
   */
  componentId?: string;
  /**
   * Opaque props bag forwarded to the card renderer. The UI layer is
   * responsible for validating the shape.
   */
  props?: Record<string, unknown>;
};

export type AgentTimelineSystemEvent = AgentTimelineBase & {
  kind: 'systemEvent';
  event: 'info' | 'error' | 'workflowTransition';
  message?: string;
  data?: Record<string, unknown>;
};

export type AgentTimelineItem =
  | AgentTimelineTextMessage
  | AgentTimelineCardItem
  | AgentTimelineSystemEvent;

/**
 * Minimal history turn shape used when building chat contexts for the coach.
 * This intentionally mirrors the existing CoachChatTurn type without taking
 * a hard dependency on the services layer so it can be shared by a future
 * backend.
 */
export type CoachHistoryTurn = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

export type BuildCoachChatContextParams = {
  mode?: ChatMode;
  /**
   * Optional human-readable summary describing where and why the agent was
   * launched (source, intent, focused object, workspace snapshot). This is
   * typically derived from LaunchContext + any local workspace snapshot.
   */
  launchContextSummary?: string;
  /**
   * Optional running summary of older conversation turns, used to provide
   * continuity without sending the entire raw transcript on every call.
   *
   * This should be compact (roughly 500–1500 characters) and focus on stable
   * user facts, preferences, constraints, and current commitments.
   */
  conversationSummary?: string;
  /**
   * Optional in-memory workflow instance associated with this chat. In a
   * future backend-backed runtime this will map to a server-side record and
   * can be used to build richer summaries.
   */
  workflowInstance?: WorkflowInstance | null;
  /**
   * Flat history of user/assistant/system turns that we want the model to see
   * for this request. The caller is responsible for any sliding-window or
   * summarisation before passing history in.
   */
  history: CoachHistoryTurn[];
  /**
   * Max number of non-system turns to include verbatim (sliding window).
   * Defaults to 16.
   */
  recentTurnsMax?: number;
};

export type BuiltCoachChatContext = {
  /**
   * Messages to send to the LLM **after** the caller has injected any global
   * system prompt. This keeps the OS-level system prompt separate from the
   * per-conversation context built here.
   */
  openAiMessages: { role: 'assistant' | 'user' | 'system'; content: string }[];
};

/**
 * Default context builder for kwilt Coach chat.
 *
 * Today this is a light pass-through that simply normalises roles and preserves
 * ordering. As we add summaries, workflow metadata, and launch context, this
 * function becomes the single place where we decide what history the model
 * sees on each turn.
 */
export function buildCoachChatContext(params: BuildCoachChatContextParams): BuiltCoachChatContext {
  const { history, launchContextSummary, conversationSummary, recentTurnsMax } = params;

  const maxRecent = typeof recentTurnsMax === 'number' ? Math.max(0, recentTurnsMax) : 16;

  const normalizedHistory: Array<{ role: 'assistant' | 'user' | 'system'; content: string }> = history
    .filter((turn) => typeof turn?.content === 'string' && turn.content.trim().length > 0)
    .map((turn) => ({
      role: (turn.role === 'system' ? 'system' : turn.role) as 'assistant' | 'user' | 'system',
      content: turn.content.trim(),
    }));

  const systemTurns = normalizedHistory.filter((t) => t.role === 'system');
  const nonSystemTurns = normalizedHistory.filter((t) => t.role !== 'system');
  const recentNonSystemTurns = maxRecent > 0 ? nonSystemTurns.slice(-maxRecent) : [];

  // Only inject the launch context if it isn't already present in the
  // transcript as a system turn (AiChatPane usually seeds it on mount).
  const hasLaunchContextInHistory = systemTurns.some((t) =>
    t.content.toLowerCase().includes('launch source:')
  );
  const shouldInjectLaunchContext = Boolean(launchContextSummary && !hasLaunchContextInHistory);

  const summaryText = (conversationSummary ?? '').trim();
  const shouldInjectSummary = summaryText.length > 0;

  const openAiMessages = [
    ...(shouldInjectSummary
      ? [
          {
            role: 'system' as const,
            content:
              'Conversation memory summary (use only as background context; do not quote verbatim):\n' +
              summaryText,
          },
        ]
      : []),
    ...(shouldInjectLaunchContext
      ? [
          {
            role: 'system' as const,
            content:
              'Launch context (where/why this chat was opened; use as grounding context):\n' +
              String(launchContextSummary).trim(),
          },
        ]
      : []),
    // Preserve the most recent system turns (workflow/system prompts, etc.)
    // without flooding the context window.
    ...systemTurns.slice(-2),
    ...recentNonSystemTurns,
  ];

  return { openAiMessages };
}

