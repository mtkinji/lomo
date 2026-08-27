import fs from 'node:fs';
import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { EXTERNAL_MCP_CONTROL_COVERAGE } from '../../supabase/functions/_shared/externalMcp';
import { KWILT_OPERATION_REGISTRY } from './operations';
import { CHAT_CAPABILITY_COVERAGE } from '../features/unifiedChat/chatCapabilityCoverage';
import {
  assertFinalConversationalParity,
  buildConversationalParity,
  validateConversationalParity,
} from '../features/unifiedChat/conversationalParity';
import {
  UI_PARITY_SURFACES,
  projectUiParityInventory,
} from './uiParityInventory';

describe('UI parity inventory', () => {
  test('maps every canonical user operation to exactly one primary native surface', () => {
    const mappedOperationIds = UI_PARITY_SURFACES.flatMap((surface) =>
      surface.intents.flatMap((intent) => intent.operationIds),
    );

    expect(new Set(mappedOperationIds)).toEqual(new Set(KWILT_OPERATION_REGISTRY.map(({ id }) => id)));
    expect(new Set(mappedOperationIds).size).toBe(mappedOperationIds.length);
  });

  test('covers all included main capabilities and records deliberate surface exclusions', () => {
    const byId = new Map(UI_PARITY_SURFACES.map((surface) => [surface.id, surface]));

    for (const id of [
      'relationships-memory', 'household-settings', 'profile-settings', 'arcs', 'goals',
      'todos', 'plan', 'chapters', 'money', 'chores', 'recipes', 'meal-planning',
      'groceries', 'screen-time', 'account-settings',
    ]) {
      expect(byId.get(id)).toMatchObject({ scope: 'included' });
    }

    expect(byId.get('explore')).toMatchObject({ scope: 'excluded' });
    expect(byId.get('games')).toMatchObject({ scope: 'excluded' });
    expect(byId.get('developer-surfaces')).toMatchObject({ scope: 'excluded' });
  });

  test('keeps unsupported native intents visible and prioritized', () => {
    const gaps = UI_PARITY_SURFACES.flatMap((surface) => surface.gaps.map((gap) => ({
      surfaceId: surface.id,
      ...gap,
    })));

    expect(gaps.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'settings.appearance.update',
      'settings.ai_model.update',
      'settings.meals.update',
      'settings.weekly_chapters.update',
      'settings.phone_agent.update',
      'settings.connected_tools.manage',
      'settings.sharing.manage',
      'settings.haptics.update',
      'settings.widgets.configure',
      'settings.execution_targets.manage',
      'settings.destinations.manage',
      'settings.activity_areas.manage',
    ]));
    for (const gap of gaps) {
      expect(gap.reason.trim()).not.toBe('');
      expect(['p0', 'p1', 'p2', 'p3']).toContain(gap.priority);
    }
  });

  test('projects mobile, voice, and ChatGPT truth from the canonical manifest', () => {
    const rows = projectUiParityInventory(KWILT_CAPABILITY_MANIFEST, EXTERNAL_MCP_CONTROL_COVERAGE);
    const byOperation = new Map(rows.map((row) => [row.operationId, row]));

    expect(byOperation.get('activities.capture')).toMatchObject({
      surfaceId: 'todos',
      mobile: { state: 'live', outcome: 'proposal_or_receipt' },
      voice: { state: 'live', proof: 'source_only' },
      chatgpt: { state: 'exposed', outcome: 'server_execution' },
    });
    expect(byOperation.get('activities.attachments.update')).toMatchObject({
      surfaceId: 'todos',
      mobile: { state: 'confirmation_only', outcome: 'native_review' },
      voice: { state: 'confirmation_only', proof: 'source_only' },
      chatgpt: { state: 'exposed', outcome: 'device_handoff' },
    });
    expect(byOperation.get('recipes.create')).toMatchObject({
      surfaceId: 'recipes',
      mobile: { state: 'pending_provider' },
      voice: { state: 'pending_provider' },
      chatgpt: { state: 'pending_provider' },
    });
    expect(byOperation.get('games.open')).toMatchObject({
      surfaceId: 'games',
      mobile: { state: 'excluded' },
      voice: { state: 'excluded' },
      chatgpt: { state: 'excluded' },
    });
  });

  test('requires source and route evidence for every inventoried surface', () => {
    for (const surface of UI_PARITY_SURFACES) {
      expect(surface.sourcePaths.length).toBeGreaterThan(0);
      for (const sourcePath of surface.sourcePaths) expect(fs.existsSync(sourcePath)).toBe(true);
      expect(surface.routeRefs.length).toBeGreaterThan(0);
      expect(surface.scope === 'included' ? surface.intents.length + surface.gaps.length : surface.intents.length)
        .toBeGreaterThan(0);
      if (surface.scope === 'excluded') expect(surface.scopeReason?.trim()).not.toBe('');
    }
  });

  test('makes the final zero-gap parity gate executable without hiding the current baseline', () => {
    const rows = buildConversationalParity({
      surfaces: UI_PARITY_SURFACES,
      coverage: CHAT_CAPABILITY_COVERAGE,
      externalCoverage: EXTERNAL_MCP_CONTROL_COVERAGE,
      voiceConformanceOperationIds: [],
    });
    const errors = validateConversationalParity({ surfaces: UI_PARITY_SURFACES, rows });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Unresolved UI gap household.member.update'),
      expect.stringContaining('recipes.create mobile is missing_provider'),
      expect.stringContaining('activities.capture voice is missing_conformance'),
    ]));
    expect(() => assertFinalConversationalParity({ surfaces: UI_PARITY_SURFACES, rows }))
      .toThrow('Conversational control parity is incomplete');
  });
});
