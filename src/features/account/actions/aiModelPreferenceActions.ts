import type { LlmModel } from '../../../store/useAppStore';

export const AI_MODEL_IDS = ['gpt-4o-mini', 'gpt-4o', 'gpt-5.1', 'gpt-5.2'] as const;

export type AiModelPreferenceBoundary = {
  read(): { modelId: string; isPro: boolean };
  apply(input: { modelId: LlmModel }): void;
};

export class AiModelPreferenceConflictError extends Error {
  constructor() {
    super('The AI model changed after this update was reviewed.');
    this.name = 'AiModelPreferenceConflictError';
  }
}

function isModelId(value: string): value is LlmModel {
  return (AI_MODEL_IDS as readonly string[]).includes(value);
}

function availableModelIds(isPro: boolean): LlmModel[] {
  return isPro ? [...AI_MODEL_IDS] : ['gpt-4o-mini', 'gpt-4o'];
}

export function createAiModelPreferenceActions(boundary: AiModelPreferenceBoundary) {
  const read = () => {
    const current = boundary.read();
    const modelId = isModelId(current.modelId) ? current.modelId : 'gpt-4o-mini';
    return {
      modelId,
      availableModelIds: availableModelIds(current.isPro),
      policy: { gpt5RequiresPro: true as const, owner: 'this_device' as const },
    };
  };

  return {
    read,
    update(input: { expectedModelId: string; modelId: string }) {
      if (!isModelId(input.modelId)) throw new Error('Choose a supported AI model.');
      const before = read();
      if (before.modelId !== input.expectedModelId) throw new AiModelPreferenceConflictError();
      if (!before.availableModelIds.includes(input.modelId)) {
        throw new Error('That AI model requires Kwilt Pro.');
      }
      if (before.modelId === input.modelId) {
        return { previousModelId: before.modelId, modelId: before.modelId, changed: false };
      }
      boundary.apply({ modelId: input.modelId });
      const after = read();
      if (after.modelId !== input.modelId) throw new Error('Kwilt did not confirm the AI model update.');
      return { previousModelId: before.modelId, modelId: after.modelId, changed: true };
    },
  };
}
