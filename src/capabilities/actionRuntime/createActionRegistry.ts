import type { KwiltActionReceiptStatus, KwiltActionRequest } from './types';

export type KwiltActionHandlerResult = {
  status: KwiltActionReceiptStatus;
  resultRefs: readonly { kind: string; id: string }[];
};

export type KwiltActionRegistration<Context> = {
  operationId: string;
  confirmation: 'none' | 'explicit';
  reversible: boolean;
  execute(request: KwiltActionRequest, context: Context): Promise<KwiltActionHandlerResult>;
};

export type KwiltActionRegistry<Context> = {
  registrations: readonly KwiltActionRegistration<Context>[];
  get(operationId: string): KwiltActionRegistration<Context> | undefined;
};

export function createActionRegistry<Context>(
  registrations: readonly KwiltActionRegistration<Context>[],
): KwiltActionRegistry<Context> {
  const byId = new Map<string, KwiltActionRegistration<Context>>();
  for (const registration of registrations) {
    if (!registration.operationId.trim()) throw new Error('Action registration requires an operation ID.');
    if (byId.has(registration.operationId)) {
      throw new Error(`Duplicate action registration: ${registration.operationId}`);
    }
    byId.set(registration.operationId, registration);
  }
  return Object.freeze({
    registrations: Object.freeze([...registrations]),
    get: (operationId: string) => byId.get(operationId),
  });
}
