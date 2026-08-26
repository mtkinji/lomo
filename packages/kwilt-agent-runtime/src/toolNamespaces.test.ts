import { KWILT_CAPABILITY_MANIFEST } from './kwiltCapabilityManifest';
import {
  KWILT_TOOL_NAMESPACES,
  namespaceForCapability,
  namespaceForTool,
} from './toolNamespaces';

describe('Kwilt tool namespaces', () => {
  test('defines the seven stable public namespace ids', () => {
    expect(KWILT_TOOL_NAMESPACES.map((namespace) => namespace.id)).toEqual([
      'life_structure', 'tasks_plan', 'household', 'money', 'food',
      'device_wellbeing', 'account_navigation',
    ]);
  });

  test('assigns every canonical executable tool to exactly one namespace', () => {
    const assignments = KWILT_CAPABILITY_MANIFEST.flatMap((operation) => operation.tools.map((tool) => ({
      toolId: tool.id,
      namespace: namespaceForTool({
        id: tool.id,
        capabilityId: tool.capabilityId ?? operation.owner,
      }),
    })));
    expect(assignments.length).toBeGreaterThan(40);
    expect(assignments.every(({ namespace }) => KWILT_TOOL_NAMESPACES.some(({ id }) => id === namespace))).toBe(true);
    const namespacesByTool = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const namespaces = namespacesByTool.get(assignment.toolId) ?? new Set<string>();
      namespaces.add(assignment.namespace);
      namespacesByTool.set(assignment.toolId, namespaces);
    }
    expect([...namespacesByTool.values()].every((namespaces) => namespaces.size === 1)).toBe(true);
  });

  test.each([
    ['relationships', 'life_structure'], ['todos', 'tasks_plan'], ['chores', 'household'],
    ['money', 'money'], ['recipes', 'food'], ['screenTime', 'device_wellbeing'],
    ['account', 'account_navigation'],
  ] as const)('maps %s to %s', (capabilityId, expected) => {
    expect(namespaceForCapability(capabilityId)).toBe(expected);
  });
});
