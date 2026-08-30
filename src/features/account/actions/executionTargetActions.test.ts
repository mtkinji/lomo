import {
  ExecutionTargetConflictError,
  createExecutionTargetActions,
  type ExecutionTargetActionsBoundary,
} from './executionTargetActions';

const definition = {
  id: 'cursor_mcp_v1', kind: 'cursor_repo', display_name: 'Cursor (MCP executor)', description: 'Execute work.',
  version: 1, config_schema: {}, requirements_schema: {}, playbook_schema: {},
  default_config: { repo_name: '', repo_url: null, branch_policy: 'feature_branch', verification_commands: [] },
  default_requirements: { requires_acceptance_criteria: true }, default_playbook: { style_notes: 'Follow conventions.' },
};

const target = {
  id: 'target-1', owner_id: 'private-user', definition_id: definition.id, kind: 'cursor_repo',
  display_name: 'Kwilt in Cursor',
  config: {
    repo_name: 'Kwilt', repo_url: 'https://secret.example/private?token=secret',
    branch_policy: 'feature_branch', verification_commands: ['npm test', 'dangerous command'],
  },
  requirements: definition.default_requirements, playbook: definition.default_playbook, is_enabled: true,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-02T00:00:00.000Z',
};

function boundary(initialTargets = [target]): ExecutionTargetActionsBoundary & {
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
} {
  let targets = [...initialTargets];
  const create = jest.fn(async (input) => {
    const created = { ...target, id: 'target-new', display_name: input.displayName, config: input.config,
      created_at: '2026-08-03T00:00:00.000Z', updated_at: '2026-08-03T00:00:00.000Z' };
    targets = [created, ...targets];
    return created;
  });
  const update = jest.fn(async (input) => {
    const current = targets.find((item) => item.id === input.id);
    if (!current) return null;
    const updated = { ...current, display_name: input.displayName ?? current.display_name,
      is_enabled: input.isEnabled ?? current.is_enabled, config: input.config ?? current.config,
      updated_at: '2026-08-04T00:00:00.000Z' };
    targets = targets.map((item) => item.id === updated.id ? updated : item);
    return updated;
  });
  const remove = jest.fn(async ({ id }) => {
    targets = targets.filter((item) => item.id !== id);
    return true;
  });
  return {
    loadDefinitions: async () => [definition], loadTargets: async () => targets, create, update, remove,
  };
}

test('lists and gets bounded execution targets without credentials, URLs, commands, or owner IDs', async () => {
  const actions = createExecutionTargetActions(boundary());
  const listed = await actions.list();
  const result = await actions.get({ targetId: target.id });

  expect(listed).toEqual({ targets: [{
    targetId: target.id, providerId: definition.id, kind: 'cursor_repo', displayName: 'Kwilt in Cursor',
    repoName: 'Kwilt', enabled: true, updatedAt: target.updated_at,
  }] });
  expect(result).toEqual({ target: listed.targets[0], nativeOnlyConfiguration: {
    repoUrlConfigured: true, branchPolicyConfigured: true, verificationCommandCount: 2,
  } });
  expect(JSON.stringify({ listed, result })).not.toMatch(/private-user|secret\.example|token=|npm test|dangerous command/);
});

test('creates only the curated Cursor target from safe fields and provider defaults', async () => {
  const provider = boundary([]);
  const result = await createExecutionTargetActions(provider).create({
    providerId: 'cursor_mcp_v1', displayName: 'My Cursor', repoName: 'Kwilt',
  });

  expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({
    definitionId: definition.id, kind: 'cursor_repo', displayName: 'My Cursor',
    config: expect.objectContaining({ repo_name: 'Kwilt', repo_url: null, verification_commands: [] }),
  }));
  expect(result).toMatchObject({ targetId: 'target-new', providerId: definition.id, repoName: 'Kwilt' });
});

test('updates only safe fields with optimistic concurrency and provider confirmation', async () => {
  const provider = boundary();
  const result = await createExecutionTargetActions(provider).update({
    targetId: target.id, expectedUpdatedAt: target.updated_at,
    fields: { displayName: 'Renamed', repoName: 'KwiltApp', enabled: false },
  });

  expect(provider.update).toHaveBeenCalledWith(expect.objectContaining({
    id: target.id, displayName: 'Renamed', isEnabled: false,
    config: expect.objectContaining({ repo_name: 'KwiltApp', verification_commands: target.config.verification_commands }),
  }));
  expect(result).toMatchObject({ displayName: 'Renamed', repoName: 'KwiltApp', enabled: false,
    updatedAt: '2026-08-04T00:00:00.000Z' });
});

test('rejects stale execution target updates without mutation', async () => {
  const provider = boundary();
  await expect(createExecutionTargetActions(provider).update({
    targetId: target.id, expectedUpdatedAt: 'stale', fields: { enabled: false },
  })).rejects.toThrow(ExecutionTargetConflictError);
  expect(provider.update).not.toHaveBeenCalled();
});

test('deletes the exact reviewed target and confirms removal', async () => {
  const provider = boundary();
  await expect(createExecutionTargetActions(provider).delete({
    targetId: target.id, expectedUpdatedAt: target.updated_at,
  })).resolves.toEqual({ targetId: target.id, deleted: true });
  expect(provider.remove).toHaveBeenCalledWith({ id: target.id });
});
