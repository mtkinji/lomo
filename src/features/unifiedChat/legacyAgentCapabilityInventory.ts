export type LegacyAgentCapabilityKind = 'tool' | 'workflow' | 'context';
export type LegacyAgentMigrationState = 'planned' | 'adapted' | 'live';

export type LegacyAgentCapabilityInventoryItem = {
  legacyId: string;
  kind: LegacyAgentCapabilityKind;
  runtimeToolIds: readonly string[];
  provider: string;
  migrationState: LegacyAgentMigrationState;
  safetyNote: string;
};

/**
 * Coverage contract for behavior that existed in AgentWorkspace before Unified Chat.
 * An entry is not a runnable tool registration; it becomes discoverable only after
 * its provider, policy, proposal, receipt, and parity contracts are implemented.
 */
export const LEGACY_AGENT_CAPABILITY_INVENTORY = [
  {
    legacyId: 'get_user_profile',
    kind: 'tool',
    runtimeToolIds: ['profile.read'],
    provider: 'profile',
    migrationState: 'live',
    safetyNote: 'Return a bounded profile projection rather than the full application store.',
  },
  {
    legacyId: 'set_user_profile',
    kind: 'tool',
    runtimeToolIds: ['profile.update'],
    provider: 'profile',
    migrationState: 'live',
    safetyNote: 'Replace the legacy direct write with a typed patch and authoritative receipt.',
  },
  {
    legacyId: 'enter_focus_mode',
    kind: 'tool',
    runtimeToolIds: ['activities.open_focus'],
    provider: 'device',
    migrationState: 'adapted',
    safetyNote: 'A durable native handoff opens Focus UI without claiming that a focus session started.',
  },
  {
    legacyId: 'schedule_activity_on_calendar',
    kind: 'tool',
    runtimeToolIds: ['plan.schedule_activity'],
    provider: 'plan',
    migrationState: 'live',
    safetyNote: 'The legacy direct write is now a reviewed Plan operation with an authoritative calendar receipt.',
  },
  {
    legacyId: 'schedule_activity_chunks_on_calendar',
    kind: 'tool',
    runtimeToolIds: ['plan.schedule_chunks'],
    provider: 'plan',
    migrationState: 'live',
    safetyNote: 'Each chunk is a reviewed Plan proposal with sequential apply, a tracked provider event, and its own durable receipt and undo.',
  },
  {
    legacyId: 'activity_steps_edit',
    kind: 'tool',
    runtimeToolIds: ['activities.steps.update'],
    provider: 'activities',
    migrationState: 'live',
    safetyNote: 'The legacy direct write is now represented by stable-id versioned step operations and receipts.',
  },
  {
    legacyId: 'update_activity_fields',
    kind: 'tool',
    runtimeToolIds: ['activities.update'],
    provider: 'activities',
    migrationState: 'live',
    safetyNote: 'The legacy direct write now uses the durable Activity proposal executor and receipt recovery.',
  },
  {
    legacyId: 'goal_creation_workflow',
    kind: 'workflow',
    runtimeToolIds: ['goals.create'],
    provider: 'goals',
    migrationState: 'live',
    safetyNote: 'Preserve the structured draft while adopting it through a durable proposal.',
  },
  {
    legacyId: 'arc_creation_workflow',
    kind: 'workflow',
    runtimeToolIds: ['arcs.create'],
    provider: 'arcs',
    migrationState: 'live',
    safetyNote: 'Preserve deliberate identity review before adoption.',
  },
  {
    legacyId: 'workspace_snapshots',
    kind: 'context',
    runtimeToolIds: ['capability.evidence.read'],
    provider: 'capability-providers',
    migrationState: 'adapted',
    safetyNote: 'Use bounded typed evidence with visible scope instead of hidden broad strings.',
  },
] as const satisfies readonly LegacyAgentCapabilityInventoryItem[];
