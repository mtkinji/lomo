import type { AgentRunTriggerKind } from './agentRuntime.ts';

export type AgentWorkEvidence = {
  runStatus?: 'complete' | 'partial' | 'failed';
  deliveryCheckpointed?: boolean;
  receiptStatus?: 'reserved' | 'applied' | 'failed' | 'undone';
  clientActionStatus?: 'pending_client_action' | 'presenting' | 'completed' | 'declined' | 'failed';
  observationPersisted?: boolean;
};

export function resolveAgentWorkCompletion({
  kind,
  evidence,
}: {
  kind: Exclude<AgentRunTriggerKind, 'user_message'>;
  evidence: AgentWorkEvidence;
}): { decision: 'complete' } | { decision: 'pending'; reason: string } {
  switch (kind) {
    case 'reminder':
      return evidence.deliveryCheckpointed
        ? { decision: 'complete' }
        : { decision: 'pending', reason: 'delivery_not_checkpointed' };
    case 'recurring_kwilt_action':
      return evidence.receiptStatus === 'applied'
        ? { decision: 'complete' }
        : { decision: 'pending', reason: 'capability_receipt_not_applied' };
    case 'monitor':
      return evidence.observationPersisted && evidence.deliveryCheckpointed
        ? { decision: 'complete' }
        : { decision: 'pending', reason: evidence.observationPersisted ? 'delivery_not_checkpointed' : 'observation_not_persisted' };
    case 'background_analysis':
      return evidence.runStatus === 'complete' || evidence.runStatus === 'partial'
        ? { decision: 'complete' }
        : { decision: 'pending', reason: 'analysis_not_persisted' };
    case 'native_device_enforcement':
      return evidence.clientActionStatus === 'completed'
        ? { decision: 'complete' }
        : { decision: 'pending', reason: 'native_action_not_completed' };
  }
}
