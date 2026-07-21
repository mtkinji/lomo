import { getCapability } from './registry';
import type { CapabilityDefinition, CapabilityId } from './types';

export type CapabilityLifecycleEvent =
  | {
      type: 'activated' | 'deactivated';
      capabilityId: CapabilityId;
      durationMs: number;
    }
  | {
      type: 'activation_failed';
      capabilityId: CapabilityId;
      durationMs: number;
      errorName: string;
    };

type CapabilityLifecycleCoordinatorOptions = {
  getDefinition?: (id: CapabilityId) => CapabilityDefinition;
  report?: (event: CapabilityLifecycleEvent) => void;
  now?: () => number;
};

function defaultNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function errorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}

export class CapabilityLifecycleCoordinator {
  private activeCapabilityId: CapabilityId | null = null;
  private transition: Promise<void> = Promise.resolve();
  private readonly getDefinition: (id: CapabilityId) => CapabilityDefinition;
  private readonly report: (event: CapabilityLifecycleEvent) => void;
  private readonly now: () => number;

  constructor(options: CapabilityLifecycleCoordinatorOptions = {}) {
    this.getDefinition = options.getDefinition ?? getCapability;
    this.report = options.report ?? (() => undefined);
    this.now = options.now ?? defaultNow;
  }

  getActiveCapabilityId(): CapabilityId | null {
    return this.activeCapabilityId;
  }

  activate(id: CapabilityId): Promise<void> {
    return this.enqueue(() => this.activateNow(id));
  }

  deactivate(): Promise<void> {
    return this.enqueue(() => this.deactivateNow());
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.transition.then(operation);
    this.transition = result.catch(() => undefined);
    return result;
  }

  private async activateNow(id: CapabilityId): Promise<void> {
    if (id === this.activeCapabilityId) return;

    const next = this.getDefinition(id);
    if (next.availability !== 'active') {
      throw new Error(`Capability ${id} is not active`);
    }

    await this.deactivateNow();

    const startedAt = this.now();
    try {
      await next.lifecycle.activate?.();
      this.activeCapabilityId = id;
      this.report({
        type: 'activated',
        capabilityId: id,
        durationMs: Math.max(0, this.now() - startedAt),
      });
    } catch (error) {
      this.activeCapabilityId = null;
      this.report({
        type: 'activation_failed',
        capabilityId: id,
        durationMs: Math.max(0, this.now() - startedAt),
        errorName: errorName(error),
      });
      throw error;
    }
  }

  private async deactivateNow(): Promise<void> {
    if (!this.activeCapabilityId) return;

    const id = this.activeCapabilityId;
    const current = this.getDefinition(id);
    const startedAt = this.now();
    await current.lifecycle.deactivate?.();
    this.activeCapabilityId = null;
    this.report({
      type: 'deactivated',
      capabilityId: id,
      durationMs: Math.max(0, this.now() - startedAt),
    });
  }
}
