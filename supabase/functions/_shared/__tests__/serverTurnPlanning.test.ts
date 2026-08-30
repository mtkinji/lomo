import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import { planServerTurn } from '../serverTurnPlanning';

const allToolIds = SERVER_AGENT_TOOL_CATALOG.map((tool) => tool.id);

describe('server turn planning', () => {
  test('never exposes the full registry and caps each selected namespace at ten functions', async () => {
    const plan = await planServerTurn({
      prompt: 'Review my goals and plan, then update what needs attention.',
      tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure', 'tasks_plan'], confidence: 0.9, reason: 'Goals and Plan.',
      }),
    });
    expect(plan.visibleTools.length).toBeLessThan(SERVER_AGENT_TOOL_CATALOG.length);
    for (const namespace of plan.selectedNamespaces) {
      expect(plan.visibleTools.filter((tool) => tool.namespace === namespace)).toHaveLength(
        Math.min(10, plan.visibleTools.filter((tool) => tool.namespace === namespace).length),
      );
      expect(plan.visibleTools.filter((tool) => tool.namespace === namespace).length).toBeLessThanOrEqual(10);
    }
    expect(plan.deferredToolIds.length).toBeGreaterThan(0);
  });

  test.each([
    ['none', false, false],
    ['read', true, false],
  ] as const)('keeps writes absent under %s authorization', async (_label, canRead, canWrite) => {
    const plan = await planServerTurn({
      prompt: canRead ? 'What is on my plan?' : 'Hello',
      tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead, canWrite, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['tasks_plan'], confidence: 0.8, reason: 'Plan request.',
      }),
    });
    expect(plan.visibleTools.some((tool) => tool.effect === 'write')).toBe(false);
    expect(plan.policy.authorization.kind).toBe(canRead ? 'read' : 'none');
  });

  test('intersects planner selection with the executable actor/provider registry', async () => {
    const allowedToolIds = ['goals.read', 'goals.update', 'screen_time.configure'];
    const plan = await planServerTurn({
      prompt: 'Rename my goal.', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure', 'money'], confidence: 0.7, reason: 'Goal request.',
      }),
    });
    expect(plan.policy.allowedToolIds.every((id) => allowedToolIds.includes(id))).toBe(true);
    expect(plan.visibleTools.map((tool) => tool.id)).toEqual(expect.arrayContaining(['goals.read', 'goals.update']));
    expect(plan.visibleTools.some((tool) => tool.id === 'screen_time.configure')).toBe(false);
  });

  test('planner judgment cannot elevate a read question into write authority', async () => {
    const plan = await planServerTurn({
      prompt: 'What goals do I have?', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure'], confidence: 1, reason: 'Model requested everything.',
      }),
    });
    expect(plan.policy.authorization.kind).toBe('read');
    expect(plan.visibleTools.every((tool) => tool.effect === 'read')).toBe(true);
  });

  test('treats a scope-narrowing follow-up as read-only instead of withholding tools', async () => {
    const plan = await planServerTurn({
      prompt: 'Focus only on goals and to-dos.', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure', 'tasks_plan'], confidence: 0.99,
        reason: 'The user narrowed the requested review.',
      }),
    });

    expect(plan.policy.authorization.kind).toBe('read');
    expect(plan.policy.allowedToolIds).toEqual(expect.arrayContaining(['goals.read', 'activities.read']));
    expect(plan.visibleTools.every((tool) => tool.effect === 'read')).toBe(true);
  });

  test('keeps a terse goals-only steer authorized as a read', async () => {
    const plan = await planServerTurn({
      prompt: 'Goals only.', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure'], confidence: 0.99,
        reason: 'The user narrowed the active review to goals.',
      }),
    });

    expect(plan.policy.authorization.kind).toBe('read');
    expect(plan.policy.allowedToolIds).toContain('goals.read');
  });

  test('keeps to-do tools available when the model mistakes an item title for another domain', async () => {
    const plan = await planServerTurn({
      prompt: 'Rename the to-do Matrix direct capture to Matrix renamed.', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['account_navigation'], confidence: 0.99,
        reason: 'Matrix was mistaken for an account integration.',
      }),
    });

    expect(plan.selectedNamespaces).toContain('tasks_plan');
    expect(plan.policy.allowedToolIds).toEqual(expect.arrayContaining(['activities.read', 'activities.update']));
  });

  test('defers at least one function when the registry fits inside one namespace', async () => {
    const deviceTools = SERVER_AGENT_TOOL_CATALOG.filter((tool) =>
      ['screen_time.configure', 'notifications.configure'].includes(tool.id));
    const plan = await planServerTurn({
      prompt: 'Configure Screen Time for Charlie.', tools: deviceTools,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: deviceTools.map((tool) => tool.id) },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['device_wellbeing'], confidence: 0.9, reason: 'Device request.',
      }),
    });
    expect(plan.visibleTools.length).toBeLessThan(deviceTools.length);
    expect(plan.deferredToolIds).toHaveLength(1);
    expect(plan.toolSearchNamespaces).toEqual(['device_wellbeing']);
  });

  test('keeps native navigation available when the model classifies the destination by domain', async () => {
    const plan = await planServerTurn({
      prompt: 'Open Arcs.', tools: SERVER_AGENT_TOOL_CATALOG,
      actorPermissions: { canRead: true, canWrite: true, allowedToolIds: allToolIds },
      executionProvider: 'server',
      requestJudgment: async () => ({
        selectedNamespaces: ['life_structure'], confidence: 0.99, reason: 'Arcs are life structure.',
      }),
    });
    expect(plan.selectedNamespaces).toEqual(['life_structure', 'account_navigation']);
    expect(plan.policy.allowedToolIds).toContain('navigation.open_capability');
    expect([
      ...plan.visibleTools.map((tool) => tool.id),
      ...plan.deferredToolIds,
    ]).toContain('navigation.open_capability');
  });
});
