import { discoverAgentTools } from './discovery';
import type { AgentToolDefinition } from './types';

const tools: AgentToolDefinition[] = [
  {
    id: 'plan.read_day_context', version: 1, capabilityId: 'plan',
    purpose: 'Read a day.', providers: ['server', 'device'], effect: 'read',
    consequence: 'low', reversible: true, confirmation: 'none', canDeferToClient: false,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
  {
    id: 'plan.recommend_day', version: 1, capabilityId: 'plan',
    purpose: 'Recommend a day.', providers: ['device'], effect: 'read',
    consequence: 'low', reversible: true, confirmation: 'none', canDeferToClient: true,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
  {
    id: 'activities.capture', version: 1, capabilityId: 'todos',
    purpose: 'Capture an Activity.', providers: ['server'], effect: 'write',
    consequence: 'low', reversible: true, confirmation: 'none', canDeferToClient: false,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
];

describe('discoverAgentTools', () => {
  test('loads only tools for the requested capability', () => {
    expect(discoverAgentTools(tools, {
      capabilityIds: ['plan'],
      providerAvailability: { server: true, device: true, channel: false, connector: false },
    }).map((entry) => entry.tool.id)).toEqual([
      'plan.read_day_context',
      'plan.recommend_day',
    ]);
  });

  test('progressively limits question turns to read tools', () => {
    expect(discoverAgentTools(tools, {
      capabilityIds: ['plan', 'todos'],
      effects: ['read'],
      providerAvailability: { server: true, device: true, channel: false, connector: false },
    }).map((entry) => entry.tool.id)).toEqual([
      'plan.read_day_context',
      'plan.recommend_day',
    ]);
  });

  test('loads no tools for an ordinary general answer', () => {
    expect(discoverAgentTools(tools, {
      capabilityIds: [],
      providerAvailability: { server: true, device: true, channel: true, connector: true },
    })).toEqual([]);
  });

  test('keeps unavailable prerequisites visible to the coordinator', () => {
    expect(discoverAgentTools(tools, {
      capabilityIds: ['plan'],
      providerAvailability: { server: true, device: false, channel: false, connector: false },
    })).toEqual([
      expect.objectContaining({
        tool: expect.objectContaining({ id: 'plan.read_day_context' }),
        availableProviders: ['server'],
        unavailableProviders: ['device'],
      }),
      expect.objectContaining({
        tool: expect.objectContaining({ id: 'plan.recommend_day' }),
        availableProviders: [],
        unavailableProviders: ['device'],
      }),
    ]);
  });
});
