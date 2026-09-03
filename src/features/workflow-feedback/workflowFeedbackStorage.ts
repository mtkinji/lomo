import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkflowFeedbackIdentity = Readonly<{
  kind: 'user' | 'install';
  id: string;
}>;

export type WorkflowFeedbackPromptSuppression = {
  encounterCount: number;
  lastTerminalAt?: string;
};

export type WorkflowFeedbackSuppressionState = {
  schemaVersion: 1;
  lastShownAt?: string;
  lastSubmittedAt?: string;
  lastDismissedAt?: string;
  unresolvedExposure: boolean;
  prompts: Record<string, WorkflowFeedbackPromptSuppression>;
};

export function createEmptyWorkflowFeedbackState(): WorkflowFeedbackSuppressionState {
  return {
    schemaVersion: 1,
    unresolvedExposure: false,
    prompts: {},
  };
}

export function workflowFeedbackStorageKey(identity: WorkflowFeedbackIdentity): string {
  return `workflow-feedback:v1:${identity.kind}:${encodeURIComponent(identity.id)}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseState(value: string | null): WorkflowFeedbackSuppressionState {
  if (!value) return createEmptyWorkflowFeedbackState();
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.unresolvedExposure !== 'boolean') {
      return createEmptyWorkflowFeedbackState();
    }
    const rawPrompts = parsed.prompts;
    if (!rawPrompts || typeof rawPrompts !== 'object' || Array.isArray(rawPrompts)) {
      return createEmptyWorkflowFeedbackState();
    }
    const prompts: Record<string, WorkflowFeedbackPromptSuppression> = {};
    for (const [key, rawPrompt] of Object.entries(rawPrompts)) {
      if (!rawPrompt || typeof rawPrompt !== 'object' || Array.isArray(rawPrompt)) continue;
      const prompt = rawPrompt as Record<string, unknown>;
      if (!Number.isInteger(prompt.encounterCount) || Number(prompt.encounterCount) < 0) continue;
      prompts[key] = {
        encounterCount: Number(prompt.encounterCount),
        ...(optionalString(prompt.lastTerminalAt) ? { lastTerminalAt: String(prompt.lastTerminalAt) } : {}),
      };
    }
    return {
      schemaVersion: 1,
      unresolvedExposure: parsed.unresolvedExposure,
      prompts,
      ...(optionalString(parsed.lastShownAt) ? { lastShownAt: String(parsed.lastShownAt) } : {}),
      ...(optionalString(parsed.lastSubmittedAt) ? { lastSubmittedAt: String(parsed.lastSubmittedAt) } : {}),
      ...(optionalString(parsed.lastDismissedAt) ? { lastDismissedAt: String(parsed.lastDismissedAt) } : {}),
    };
  } catch {
    return createEmptyWorkflowFeedbackState();
  }
}

export async function loadWorkflowFeedbackState(
  identity: WorkflowFeedbackIdentity,
): Promise<WorkflowFeedbackSuppressionState> {
  return parseState(await AsyncStorage.getItem(workflowFeedbackStorageKey(identity)));
}

async function updateState(
  identity: WorkflowFeedbackIdentity,
  update: (current: WorkflowFeedbackSuppressionState) => WorkflowFeedbackSuppressionState,
): Promise<WorkflowFeedbackSuppressionState> {
  const next = update(await loadWorkflowFeedbackState(identity));
  await AsyncStorage.setItem(workflowFeedbackStorageKey(identity), JSON.stringify(next));
  return next;
}

export function recordWorkflowFeedbackEncounter(
  identity: WorkflowFeedbackIdentity,
  promptKey: string,
): Promise<WorkflowFeedbackSuppressionState> {
  return updateState(identity, (current) => ({
    ...current,
    prompts: {
      ...current.prompts,
      [promptKey]: {
        ...current.prompts[promptKey],
        encounterCount: (current.prompts[promptKey]?.encounterCount ?? 0) + 1,
      },
    },
  }));
}

export function recordWorkflowFeedbackShown(
  identity: WorkflowFeedbackIdentity,
  shownAt: string,
): Promise<WorkflowFeedbackSuppressionState> {
  return updateState(identity, (current) => ({
    ...current,
    lastShownAt: shownAt,
    unresolvedExposure: true,
  }));
}

export function recordWorkflowFeedbackSubmitted(
  identity: WorkflowFeedbackIdentity,
  promptKey: string,
  submittedAt: string,
): Promise<WorkflowFeedbackSuppressionState> {
  return updateState(identity, (current) => ({
    ...current,
    lastSubmittedAt: submittedAt,
    unresolvedExposure: false,
    prompts: {
      ...current.prompts,
      [promptKey]: {
        encounterCount: current.prompts[promptKey]?.encounterCount ?? 0,
        lastTerminalAt: submittedAt,
      },
    },
  }));
}

export function recordWorkflowFeedbackDismissed(
  identity: WorkflowFeedbackIdentity,
  promptKey: string,
  dismissedAt: string,
): Promise<WorkflowFeedbackSuppressionState> {
  return updateState(identity, (current) => ({
    ...current,
    lastDismissedAt: dismissedAt,
    unresolvedExposure: false,
    prompts: {
      ...current.prompts,
      [promptKey]: {
        encounterCount: current.prompts[promptKey]?.encounterCount ?? 0,
        lastTerminalAt: dismissedAt,
      },
    },
  }));
}
