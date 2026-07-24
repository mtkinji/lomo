import { discoverAgentTools } from '@kwilt/agent-runtime';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

describe('UNIFIED_CHAT_TOOL_CATALOG', () => {
  test('discovers the Plan read and recommendation tools without unrelated mutation tools', () => {
    expect(discoverAgentTools(UNIFIED_CHAT_TOOL_CATALOG, {
      capabilityIds: ['plan'],
      effects: ['read'],
      providerAvailability: { server: true, device: true, channel: false, connector: true },
    }).map((entry) => entry.tool.id)).toEqual([
      'plan.read_day_context',
      'plan.recommend_day',
    ]);
  });

  test('records existing Activity mutation semantics in the shared catalog', () => {
    expect(UNIFIED_CHAT_TOOL_CATALOG.filter(
      (tool) => tool.capabilityId === 'todos' && tool.effect === 'write',
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'activities.capture', effect: 'write', reversible: true }),
      expect.objectContaining({ id: 'activities.update', effect: 'write', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.delete', consequence: 'consequential', reversible: true }),
      expect.objectContaining({ id: 'activities.steps.create', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.steps.complete', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.steps.reorder', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.reminder.update', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.repeat.update', confirmation: 'explicit' }),
      expect.objectContaining({ id: 'activities.focus_today', confirmation: 'explicit', reversible: true }),
    ]));
  });

  test('registers reviewed, reversible Plan schedule mutations', () => {
    expect(UNIFIED_CHAT_TOOL_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'plan.schedule_activity', reversible: true }),
      expect.objectContaining({ id: 'plan.reschedule_activity', reversible: true }),
      expect.objectContaining({ id: 'plan.remove_activity', consequence: 'consequential', reversible: true }),
      expect.objectContaining({ id: 'plan.schedule_chunks', confirmation: 'explicit', reversible: true }),
    ]));
  });

  test('registers Goal check-ins as a deferred native confirmation action', () => {
    expect(UNIFIED_CHAT_TOOL_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'goals.check_in', providers: ['device'], confirmation: 'explicit', canDeferToClient: true,
      }),
    ]));
  });

  test('exposes only reversible direct relationship writes and excludes whole-person forgetting', () => {
    expect(UNIFIED_CHAT_TOOL_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'relationships.remember', reversible: true }),
      expect.objectContaining({ id: 'relationships.correct', reversible: true }),
      expect.objectContaining({ id: 'relationships.forget', reversible: true }),
    ]));
    const forget = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === 'relationships.forget');
    expect(forget?.inputSchema).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        recordType: { type: 'string', enum: ['memory', 'event', 'cadence'] },
      }),
    }));
  });
});
