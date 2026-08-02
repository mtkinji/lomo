import type { MeaningfulAction } from "./pet-state.ts";

export type ContextualChatAction = "existing-todo" | "short-focus" | "small-next-action";
export type ContextualChatPhase = "closed" | "choosing" | "ready" | "complete";

export interface ContextualChatState {
  phase: ContextualChatPhase;
  context: {
    capability: "Pet";
    object: "Moss's becoming tree";
  };
  selection: ContextualChatAction | null;
  threadCreated: boolean;
}

export const CONTEXTUAL_CHAT_ACTIONS: ReadonlyArray<{
  id: ContextualChatAction;
  label: string;
  detail: string;
  actionLabel: string;
  completion: string;
}> = [
  {
    id: "existing-todo",
    label: "Choose an existing To-do",
    detail: "Move one thing you already meant to do.",
    actionLabel: "Complete ‘Pack my bag’",
    completion: "That To-do is complete. One new branch is ready in the meadow.",
  },
  {
    id: "short-focus",
    label: "Begin a short Focus",
    detail: "Give one small thing your full attention.",
    actionLabel: "Finish a short Focus",
    completion: "You stayed with it. The meadow kept that quiet attention.",
  },
  {
    id: "small-next-action",
    label: "Create one small next action",
    detail: "Make the next move tiny enough to begin now.",
    actionLabel: "Do ‘Put one thing away’",
    completion: "You made the next step real and finished it. Moss can see the difference.",
  },
] as const;

export function createContextualChatState(): ContextualChatState {
  return {
    phase: "closed",
    context: { capability: "Pet", object: "Moss's becoming tree" },
    selection: null,
    threadCreated: false,
  };
}

export function openTreeContextualChat(state: ContextualChatState): ContextualChatState {
  return { ...state, phase: "choosing", selection: null };
}

export function chooseContextualChatAction(
  state: ContextualChatState,
  selection: ContextualChatAction,
): ContextualChatState {
  if (state.phase === "closed") return state;
  return { ...state, phase: "ready", selection };
}

export function completeContextualChatAction(state: ContextualChatState): {
  state: ContextualChatState;
  source: MeaningfulAction | null;
} {
  if (state.phase !== "ready" || !state.selection) return { state, source: null };
  const source: MeaningfulAction = state.selection === "short-focus" ? "focus" : "todo";
  return {
    state: { ...state, phase: "complete", threadCreated: true },
    source,
  };
}

export function returnToPet(state: ContextualChatState): ContextualChatState {
  void state;
  return createContextualChatState();
}
