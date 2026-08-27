import type { AgentToolDefinition } from '../types';
import { resolveTurnPolicy } from './resolveTurnPolicy';

const tools: AgentToolDefinition[] = [
  {
    id: 'goals.read', version: 1, capabilityId: 'goals', purpose: 'Read goals.',
    providers: ['server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
  {
    id: 'goals.update', version: 1, capabilityId: 'goals', purpose: 'Update a goal.',
    providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
  {
    id: 'goals.delete', version: 1, capabilityId: 'goals', purpose: 'Delete a goal.',
    providers: ['server'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: false,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
  {
    id: 'screen_time.configure', version: 1, capabilityId: 'screenTime', purpose: 'Open Screen Time configuration.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
  },
];

const base = {
  tools,
  advisoryToolIds: ['goals.read'],
  unresolvedReferences: [],
  actorPermissions: { canRead: true, canWrite: true, allowedToolIds: tools.map((tool) => tool.id) },
  executionProvider: 'server' as const,
  acceptedPriorSuggestion: false,
};

describe('resolveTurnPolicy', () => {
  test('blocks an ambiguous reference before any tool is authorized', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Delete it.',
      advisoryToolIds: ['goals.delete'],
      unresolvedReferences: ['it'],
    })).toEqual({
      authorization: { kind: 'none', reason: 'unresolved_reference' },
      allowedEffects: [],
      allowedToolIds: [],
      unresolvedReferences: ['it'],
    });
  });

  test('does not let an advisory write turn an observation into an explicit request', () => {
    const result = resolveTurnPolicy({
      ...base,
      prompt: 'My dentist appointment is Friday.',
      advisoryToolIds: ['goals.update'],
    });
    expect(result.authorization).toEqual({ kind: 'none', reason: 'write_not_explicit' });
    expect(result.allowedToolIds).toEqual([]);
  });

  test('authorizes an explicit destructive request only for review', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Delete my old fitness goal.',
      advisoryToolIds: ['goals.read', 'goals.delete'],
    })).toMatchObject({
      authorization: { kind: 'write', explicit: true, confirmation: 'review' },
      allowedEffects: ['read', 'write'],
      allowedToolIds: ['goals.read', 'goals.delete'],
    });
  });

  test('keeps a read-only request read-only when a model suggests a write too', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Show me my current goals.',
      advisoryToolIds: ['goals.read', 'goals.update'],
    })).toMatchObject({
      authorization: { kind: 'read' },
      allowedEffects: ['read'],
      allowedToolIds: ['goals.read'],
    });
  });

  test('turns a device-only server action into native confirmation', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Set up Screen Time for me.',
      advisoryToolIds: ['screen_time.configure'],
    })).toMatchObject({
      authorization: { kind: 'write', explicit: true, confirmation: 'native' },
      allowedToolIds: ['screen_time.configure'],
    });
  });

  test('accepts a prior suggestion only from affirmative user language and trusted context', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Yes, do that.',
      advisoryToolIds: ['goals.update'],
      acceptedPriorSuggestion: true,
    }).authorization).toEqual({ kind: 'write', explicit: true, confirmation: 'none' });
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'That sounds interesting.',
      advisoryToolIds: ['goals.update'],
      acceptedPriorSuggestion: true,
    }).authorization).toEqual({ kind: 'none', reason: 'write_not_explicit' });
  });

  test('actor permissions override contradictory model and prompt context', () => {
    expect(resolveTurnPolicy({
      ...base,
      prompt: 'Update my goal title.',
      advisoryToolIds: ['goals.update'],
      actorPermissions: { ...base.actorPermissions, canWrite: false },
    })).toMatchObject({
      authorization: { kind: 'none', reason: 'actor_write_forbidden' },
      allowedEffects: [],
      allowedToolIds: [],
    });
  });
});
