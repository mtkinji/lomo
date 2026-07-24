import {
  KWILT_CAPABILITY_MANIFEST,
  type KwiltCapabilityOperationId,
  type KwiltOperationOwner,
} from '@kwilt/agent-runtime';

export type { KwiltOperationOwner };
export type KwiltOperationId = KwiltCapabilityOperationId;

type KwiltOperationDefinition = {
  id: KwiltOperationId;
  owner: KwiltOperationOwner;
};

/** Product-owned projection of the canonical user-meaningful capability manifest. */
export const KWILT_OPERATION_REGISTRY: readonly KwiltOperationDefinition[] =
  KWILT_CAPABILITY_MANIFEST.map(({ id, owner }) => ({
    id: id as KwiltOperationId,
    owner: owner as KwiltOperationOwner,
  }));

const OPERATION_BY_ID = new Map<string, KwiltOperationDefinition>(
  KWILT_OPERATION_REGISTRY.map((operation) => [operation.id, operation]),
);

export function getKwiltOperation(id: string): KwiltOperationDefinition {
  const operation = OPERATION_BY_ID.get(id);
  if (!operation) throw new Error(`Unknown Kwilt operation: ${id}`);
  return operation;
}
