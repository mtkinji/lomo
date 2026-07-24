import { evaluateToolPolicy } from './policy';
import type {
  AgentToolDefinition,
  AgentToolExecutionResult,
  ToolProviderAvailability,
} from './types';

const AVAILABLE: ToolProviderAvailability = {
  server: true,
  device: true,
  channel: true,
  connector: true,
};

function tool(
  overrides: Partial<AgentToolDefinition> = {},
): AgentToolDefinition {
  return {
    id: 'plan.read_day_context',
    version: 1,
    capabilityId: 'plan',
    purpose: 'Read bounded planning context for one day.',
    providers: ['server'],
    effect: 'read',
    consequence: 'low',
    reversible: true,
    confirmation: 'none',
    canDeferToClient: false,
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    ...overrides,
  };
}

describe('evaluateToolPolicy', () => {
  test('executes an authorized read when a provider is available', () => {
    expect(evaluateToolPolicy(tool(), {
      authorized: true,
      explicitRequest: false,
      providerAvailability: AVAILABLE,
    })).toEqual({ decision: 'execute', provider: 'server' });
  });

  test('executes an explicit low-risk reversible capture when its tool allows it', () => {
    expect(evaluateToolPolicy(tool({
      id: 'activities.capture',
      capabilityId: 'todos',
      effect: 'write',
      providers: ['device', 'server'],
    }), {
      authorized: true,
      explicitRequest: true,
      providerAvailability: AVAILABLE,
    })).toEqual({ decision: 'execute', provider: 'device' });
  });

  test('proposes a low-risk write that was inferred rather than explicitly requested', () => {
    expect(evaluateToolPolicy(tool({
      id: 'plan.schedule_activity',
      effect: 'write',
      providers: ['connector'],
    }), {
      authorized: true,
      explicitRequest: false,
      providerAvailability: AVAILABLE,
    })).toEqual({ decision: 'propose', provider: 'connector' });
  });

  test.each([
    { consequence: 'consequential' as const, confirmation: 'none' as const },
    { consequence: 'low' as const, confirmation: 'explicit' as const },
  ])('requires confirmation for protected writes: %o', (protectedFields) => {
    expect(evaluateToolPolicy(tool({
      id: 'money.transfer',
      capabilityId: 'money',
      effect: 'write',
      ...protectedFields,
    }), {
      authorized: true,
      explicitRequest: true,
      providerAvailability: AVAILABLE,
    })).toEqual({ decision: 'require_confirmation', provider: 'server' });
  });

  test('returns a pending client action for a deferred device tool', () => {
    expect(evaluateToolPolicy(tool({
      id: 'screen_time.apply_shield',
      capabilityId: 'screenTime',
      effect: 'write',
      providers: ['device'],
      canDeferToClient: true,
    }), {
      authorized: true,
      explicitRequest: true,
      providerAvailability: { ...AVAILABLE, device: false },
    })).toEqual({ decision: 'pending_client_action', provider: 'device' });
  });

  test('reports an unavailable provider instead of success', () => {
    expect(evaluateToolPolicy(tool({ providers: ['connector'] }), {
      authorized: true,
      explicitRequest: false,
      providerAvailability: { ...AVAILABLE, connector: false },
    })).toEqual({ decision: 'unavailable', providers: ['connector'] });
  });

  test('represents every portable execution-result envelope', () => {
    const results: AgentToolExecutionResult[] = [
      { status: 'completed', output: { recommendations: [] }, receipt: null },
      { status: 'proposed', proposal: { id: 'proposal-1' } },
      { status: 'pending_client_action', provider: 'device', request: { toolId: 'screen_time.apply_shield' } },
      { status: 'needs_input', prompt: 'Which child?', fields: ['memberId'] },
      { status: 'unavailable', reason: 'No connected calendar.', retryable: true },
      { status: 'failed', code: 'provider_timeout', message: 'Calendar timed out.', retryable: true },
    ];

    expect(results.map((result) => result.status)).toEqual([
      'completed',
      'proposed',
      'pending_client_action',
      'needs_input',
      'unavailable',
      'failed',
    ]);
  });
});
