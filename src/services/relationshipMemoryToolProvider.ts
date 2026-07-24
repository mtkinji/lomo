import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from '@kwilt/agent-runtime';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getMaybeRefreshedAccessToken } from './backend/auth';
import { getEdgeFunctionUrlCandidates } from './edgeFunctions';

type RelationshipToolContext = { threadId: string; runId: string; messageId: string };
export type RelationshipReceiptUndoResult = {
  receiptId: string;
  proposalId: string;
  undoneAt: string;
  replayed: boolean;
};
type Dependencies = {
  getAccessToken: () => Promise<string | null>;
  getUrls: () => string[];
  getPublishableKey: () => string | null | undefined;
  fetchImpl: typeof fetch;
};

const RELATIONSHIP_TOOL_IDS = new Set([
  'relationships.read',
  'relationships.remember',
  'relationships.correct',
  'relationships.forget',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asExecutionResult(value: unknown): AgentToolExecutionResult | null {
  const result = asRecord(value);
  if (!['completed', 'proposed', 'pending_client_action', 'needs_input', 'unavailable', 'failed'].includes(String(result.status))) {
    return null;
  }
  return result as AgentToolExecutionResult;
}

export function createRelationshipMemoryToolProvider({
  context,
  dependencies,
}: {
  context?: RelationshipToolContext;
  dependencies?: Partial<Dependencies>;
}) {
  const deps: Dependencies = {
    getAccessToken: dependencies?.getAccessToken ?? getMaybeRefreshedAccessToken,
    getUrls: dependencies?.getUrls ?? (() => getEdgeFunctionUrlCandidates('relationship-memory')),
    getPublishableKey: dependencies?.getPublishableKey ?? getSupabasePublishableKey,
    fetchImpl: dependencies?.fetchImpl ?? fetch,
  };

  return {
    execute: async (
      call: AgentToolCall,
      tool: AgentToolDefinition,
    ): Promise<AgentToolExecutionResult | null> => {
      if (!RELATIONSHIP_TOOL_IDS.has(call.toolId)) return null;
      if (call.toolId !== tool.id) {
        return { status: 'failed', code: 'tool_mismatch', message: 'The discovered relationship tool does not match this call.', retryable: false };
      }
      if (!context) {
        return { status: 'unavailable', reason: 'relationship_memory_run_context_required', retryable: false };
      }
      const token = await deps.getAccessToken();
      if (!token) {
        return { status: 'unavailable', reason: 'relationship_memory_authentication_required', retryable: true };
      }
      const urls = deps.getUrls();
      if (urls.length === 0) {
        return { status: 'unavailable', reason: 'relationship_memory_provider_not_configured', retryable: true };
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-kwilt-client': 'kwilt-mobile',
      };
      const publishableKey = deps.getPublishableKey()?.trim();
      if (publishableKey) headers.apikey = publishableKey;
      let lastFailure = 'relationship_memory_provider_failed';
      for (const url of urls) {
        try {
          const response = await deps.fetchImpl(url, {
            method: 'POST', headers,
            body: JSON.stringify({ call, context }),
          });
          const text = await response.text();
          const body = text ? asRecord(JSON.parse(text)) : {};
          const result = response.ok && body.ok === true ? asExecutionResult(body.result) : null;
          if (result) return result;
          lastFailure = typeof body.error === 'string' ? body.error : `relationship_memory_status_${response.status}`;
        } catch (error) {
          lastFailure = error instanceof Error ? error.message : String(error);
        }
      }
      return { status: 'failed', code: 'relationship_memory_provider_failed', message: lastFailure, retryable: true };
    },
    undoReceipt: async (receiptId: string): Promise<RelationshipReceiptUndoResult> => {
      const normalizedReceiptId = receiptId.trim();
      if (!normalizedReceiptId || normalizedReceiptId.length > 200) {
        throw new Error('This relationship receipt is not available to undo.');
      }
      const token = await deps.getAccessToken();
      if (!token) throw new Error('Sign in again to undo that relationship change.');
      const urls = deps.getUrls();
      if (urls.length === 0) throw new Error('Relationship undo is not configured on this device.');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-kwilt-client': 'kwilt-mobile',
      };
      const publishableKey = deps.getPublishableKey()?.trim();
      if (publishableKey) headers.apikey = publishableKey;
      let lastFailure = 'relationship_undo_failed';
      for (const url of urls) {
        try {
          const response = await deps.fetchImpl(url, {
            method: 'POST', headers,
            body: JSON.stringify({ undo: { receiptId: normalizedReceiptId } }),
          });
          const text = await response.text();
          const body = text ? asRecord(JSON.parse(text)) : {};
          const undo = body.ok === true && response.ok ? asRecord(body.undo) : {};
          const returnedReceiptId = typeof undo.receiptId === 'string' ? undo.receiptId : '';
          const proposalId = typeof undo.proposalId === 'string' ? undo.proposalId : '';
          const undoneAt = typeof undo.undoneAt === 'string' ? undo.undoneAt : '';
          if (undo.status === 'undone' && returnedReceiptId && proposalId && undoneAt) {
            return {
              receiptId: returnedReceiptId, proposalId, undoneAt,
              replayed: undo.replayed === true,
            };
          }
          lastFailure = typeof body.error === 'string' ? body.error : `relationship_undo_status_${response.status}`;
        } catch (error) {
          lastFailure = error instanceof Error ? error.message : String(error);
        }
      }
      throw new Error(lastFailure);
    },
  };
}
