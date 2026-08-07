import {
  FOOD_OPERATION_CONTRACTS,
  type FoodOperationAuthority,
  type FoodOperationId,
} from '@kwilt/agent-runtime';

const contractById = new Map(FOOD_OPERATION_CONTRACTS.map((contract) => [contract.id, contract] as const));

export function foodAuthorityForOperation(operationId: FoodOperationId): FoodOperationAuthority {
  const contract = contractById.get(operationId);
  if (!contract) throw new Error(`Unknown Food operation: ${operationId}`);
  return contract.authority;
}

export type FoodChannelPlan = {
  nativeFood: 'pending_executor' | 'native_review' | 'provider_owned';
  unifiedChat: 'pending_executor' | 'native_handoff' | 'honest_boundary';
  phone: 'pending_provider' | 'device_handoff' | 'honest_boundary';
  connectorIngestion: 'pending_provider' | 'draft_only' | 'honest_boundary';
};

export function foodChannelPlanForOperation(operationId: FoodOperationId): FoodChannelPlan {
  const authority = foodAuthorityForOperation(operationId);
  if (authority === 'excluded') {
    return {
      nativeFood: 'provider_owned',
      unifiedChat: 'honest_boundary',
      phone: 'honest_boundary',
      connectorIngestion: 'honest_boundary',
    };
  }
  if (authority === 'native_handoff') {
    return {
      nativeFood: 'native_review',
      unifiedChat: 'native_handoff',
      phone: 'device_handoff',
      connectorIngestion: 'honest_boundary',
    };
  }
  return {
    nativeFood: 'pending_executor',
    unifiedChat: 'pending_executor',
    phone: 'pending_provider',
    connectorIngestion: operationId === 'recipes.import.prepare' || operationId === 'receipt.extract'
      ? 'pending_provider'
      : 'pending_provider',
  };
}
