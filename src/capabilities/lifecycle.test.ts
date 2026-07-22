import type { CapabilityDefinition, CapabilityId } from './types';
import { CapabilityLifecycleCoordinator } from './lifecycle';

function definition(
  id: CapabilityId,
  hooks: CapabilityDefinition['lifecycle'] = {},
  availability: CapabilityDefinition['availability'] = 'active',
): CapabilityDefinition {
  return {
    id,
    label: id,
    group: 'goals-plans',
    icon: 'navGoals',
    availability,
    rootRoute: { root: 'MainTabs', tab: 'PlanTab' },
    deepLinks: [],
    agent: { surfaces: ['inventory'], supportsObjectContext: false },
    lifecycle: hooks,
  };
}

describe('CapabilityLifecycleCoordinator', () => {
  it('activates a capability once and ignores duplicate activation', async () => {
    const activate = jest.fn(async () => undefined);
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: () => definition('todos', { activate }),
    });

    await coordinator.activate('todos');
    await coordinator.activate('todos');

    expect(activate).toHaveBeenCalledTimes(1);
    expect(coordinator.getActiveCapabilityId()).toBe('todos');
  });

  it('awaits deactivation before activating the next capability', async () => {
    const calls: string[] = [];
    const definitions = {
      todos: definition('todos', {
        activate: async () => {
          calls.push('activate:todos');
        },
        deactivate: async () => {
          calls.push('deactivate:todos');
        },
      }),
      plan: definition('plan', {
        activate: async () => {
          calls.push('activate:plan');
        },
      }),
    };
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: (id) => definitions[id as 'todos' | 'plan'],
    });

    await coordinator.activate('todos');
    await coordinator.activate('plan');

    expect(calls).toEqual(['activate:todos', 'deactivate:todos', 'activate:plan']);
    expect(coordinator.getActiveCapabilityId()).toBe('plan');
  });

  it('reports activation duration without private content', async () => {
    const report = jest.fn();
    const now = jest.fn().mockReturnValueOnce(10).mockReturnValueOnce(27);
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: () => definition('todos'),
      report,
      now,
    });

    await coordinator.activate('todos');

    expect(report).toHaveBeenCalledWith({
      type: 'activated',
      capabilityId: 'todos',
      durationMs: 17,
    });
  });

  it('reports a failed activation and leaves no capability active', async () => {
    const error = new Error('activation failed');
    const report = jest.fn();
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: () => definition('todos', { activate: async () => Promise.reject(error) }),
      report,
    });

    await expect(coordinator.activate('todos')).rejects.toBe(error);

    expect(coordinator.getActiveCapabilityId()).toBeNull();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activation_failed',
        capabilityId: 'todos',
        errorName: 'Error',
      }),
    );
  });

  it('deactivates and releases the current capability', async () => {
    const deactivate = jest.fn(async () => undefined);
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: () => definition('todos', { deactivate }),
    });

    await coordinator.activate('todos');
    await coordinator.deactivate();

    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(coordinator.getActiveCapabilityId()).toBeNull();
  });

  it('refuses to activate unavailable capability metadata', async () => {
    const coordinator = new CapabilityLifecycleCoordinator({
      getDefinition: () => definition('todos', {}, 'preview'),
    });

    await expect(coordinator.activate('todos')).rejects.toThrow('not active');
    expect(coordinator.getActiveCapabilityId()).toBeNull();
  });
});
