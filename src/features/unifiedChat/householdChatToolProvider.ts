import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from '@kwilt/agent-runtime';
import {
  previewHouseholdInvitation,
  readHousehold,
  type HouseholdActionBoundary,
} from '../../capabilities/relationships/actions/relationshipActions';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { createHouseholdActionBoundary } from '../household/data/householdActionBoundary';

const failed = (
  code: string,
  message: string,
  retryable = false,
): AgentToolExecutionResult => ({ status: 'failed', code, message, retryable });

export function createHouseholdChatToolProvider({
  boundary,
}: {
  boundary?: HouseholdActionBoundary;
} = {}) {
  let resolvedBoundary = boundary;
  const getBoundary = () => {
    resolvedBoundary ??= createHouseholdActionBoundary(getSupabaseClient());
    return resolvedBoundary;
  };

  const execute = async (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult | null> => {
    if (call.toolId !== 'household.read' && call.toolId !== 'household.invitation.preview') return null;
    if (call.toolId !== tool.id) {
      return failed('tool_mismatch', 'The discovered Household tool does not match this call.');
    }

    try {
      if (call.toolId === 'household.read') {
        const receipt = await readHousehold(getBoundary());
        return { status: 'completed', output: { household: receipt.result }, receipt: null };
      }

      const code = typeof call.arguments.code === 'string'
        ? call.arguments.code.trim().toUpperCase()
        : '';
      if (!code || code.length > 200) {
        return failed(
          'invalid_household_invitation_code',
          'A valid Household invitation code is required.',
        );
      }
      const receipt = await previewHouseholdInvitation(code, getBoundary());
      return { status: 'completed', output: { invitation: receipt.result }, receipt: null };
    } catch {
      return failed(
        'household_provider_failed',
        'Kwilt could not read that Household information.',
        true,
      );
    }
  };

  return { execute };
}
