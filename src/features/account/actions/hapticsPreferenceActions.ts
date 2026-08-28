export type HapticsPreferenceBoundary = {
  read(): { enabled: boolean };
  apply(input: { enabled: boolean }): void;
};

export class HapticsPreferenceConflictError extends Error {
  constructor() {
    super('The haptics preference changed after this request was reviewed.');
    this.name = 'HapticsPreferenceConflictError';
  }
}

export function createHapticsPreferenceActions(boundary: HapticsPreferenceBoundary) {
  return {
    read() {
      return { enabled: boundary.read().enabled, owner: 'this_device' as const };
    },
    update(input: { expectedEnabled: boolean; enabled: boolean }) {
      const current = boundary.read();
      if (current.enabled !== input.expectedEnabled) throw new HapticsPreferenceConflictError();
      const changed = current.enabled !== input.enabled;
      if (changed) boundary.apply({ enabled: input.enabled });
      return {
        previousEnabled: current.enabled,
        enabled: input.enabled,
        changed,
        owner: 'this_device' as const,
      };
    },
  };
}
