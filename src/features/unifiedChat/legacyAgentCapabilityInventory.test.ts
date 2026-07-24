import { LEGACY_AGENT_CAPABILITY_INVENTORY } from './legacyAgentCapabilityInventory';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

describe('LEGACY_AGENT_CAPABILITY_INVENTORY', () => {
  it('accounts for every tool and structured workflow from the legacy agent', () => {
    expect(LEGACY_AGENT_CAPABILITY_INVENTORY.map((item) => item.legacyId)).toEqual([
      'get_user_profile',
      'set_user_profile',
      'enter_focus_mode',
      'schedule_activity_on_calendar',
      'schedule_activity_chunks_on_calendar',
      'activity_steps_edit',
      'update_activity_fields',
      'goal_creation_workflow',
      'arc_creation_workflow',
      'workspace_snapshots',
    ]);
  });

  it('marks migrated durable operations live and keeps only honest boundaries non-live', () => {
    const byId = new Map<string, typeof LEGACY_AGENT_CAPABILITY_INVENTORY[number]>(
      LEGACY_AGENT_CAPABILITY_INVENTORY.map((item) => [item.legacyId, item]),
    );
    for (const id of [
      'set_user_profile', 'schedule_activity_on_calendar', 'schedule_activity_chunks_on_calendar', 'activity_steps_edit',
      'update_activity_fields', 'goal_creation_workflow', 'arc_creation_workflow',
    ]) expect(byId.get(id)?.migrationState).toBe('live');
    expect(byId.get('enter_focus_mode')?.migrationState).toBe('adapted');
  });

  it('points every live legacy operation at a currently registered runtime tool', () => {
    const registered = new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id));
    for (const item of LEGACY_AGENT_CAPABILITY_INVENTORY.filter((candidate) => candidate.migrationState === 'live')) {
      for (const toolId of item.runtimeToolIds) expect(registered).toContain(toolId);
    }
  });

  it('gives every legacy asset an explicit runtime destination and provider owner', () => {
    for (const item of LEGACY_AGENT_CAPABILITY_INVENTORY) {
      expect(item.runtimeToolIds.length).toBeGreaterThan(0);
      expect(item.provider.length).toBeGreaterThan(0);
      expect(item.safetyNote.length).toBeGreaterThan(0);
    }
  });
});
