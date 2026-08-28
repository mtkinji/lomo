import type {
  ExecutionTargetDefinitionRow,
  ExecutionTargetRow,
} from '../../../services/executionTargets/executionTargets';

export const SUPPORTED_EXECUTION_TARGET_PROVIDER_IDS = ['cursor_mcp_v1'] as const;
export type SupportedExecutionTargetProviderId = typeof SUPPORTED_EXECUTION_TARGET_PROVIDER_IDS[number];

export type SafeExecutionTargetFields = {
  displayName?: string;
  repoName?: string;
  enabled?: boolean;
};

export type ExecutionTargetActionsBoundary = {
  loadDefinitions(): Promise<ExecutionTargetDefinitionRow[]>;
  loadTargets(): Promise<ExecutionTargetRow[]>;
  create(input: {
    definitionId: string;
    displayName: string;
    kind: string;
    config: unknown;
    requirements: unknown;
    playbook: unknown;
  }): Promise<ExecutionTargetRow | null>;
  update(input: {
    id: string;
    displayName?: string;
    isEnabled?: boolean;
    config?: unknown;
  }): Promise<ExecutionTargetRow | null>;
  remove(input: { id: string }): Promise<boolean>;
};

export class ExecutionTargetConflictError extends Error {
  constructor() {
    super('The execution target changed after this update was reviewed.');
    this.name = 'ExecutionTargetConflictError';
  }
}

function cleanRequiredText(value: unknown, label: string, maxLength = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} must be between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

function cleanOptionalRepositoryUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 500) throw new Error('Repository URL is invalid.');
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('Repository URL is invalid.');
    }
    return url.toString();
  } catch {
    throw new Error('Use an HTTPS repository URL without credentials, query parameters, or fragments.');
  }
}

function targetSummary(target: ExecutionTargetRow) {
  const config = target.config && typeof target.config === 'object' ? target.config as Record<string, unknown> : {};
  return {
    targetId: target.id,
    providerId: target.definition_id,
    kind: target.kind,
    displayName: target.display_name,
    repoName: typeof config.repo_name === 'string' ? config.repo_name : '',
    enabled: target.is_enabled,
    updatedAt: target.updated_at,
  };
}

function nativeOnlyConfiguration(target: ExecutionTargetRow) {
  const config = target.config && typeof target.config === 'object' ? target.config as Record<string, unknown> : {};
  return {
    repoUrlConfigured: typeof config.repo_url === 'string' && Boolean(config.repo_url.trim()),
    branchPolicyConfigured: typeof config.branch_policy === 'string' && Boolean(config.branch_policy.trim()),
    verificationCommandCount: Array.isArray(config.verification_commands) ? config.verification_commands.length : 0,
  };
}

async function supportedDefinition(boundary: ExecutionTargetActionsBoundary, providerId: string) {
  if (!(SUPPORTED_EXECUTION_TARGET_PROVIDER_IDS as readonly string[]).includes(providerId)) {
    throw new Error('Choose a supported execution-target provider.');
  }
  const definitions = await boundary.loadDefinitions();
  const definition = definitions.find((item) => item.id === providerId && item.kind === 'cursor_repo');
  if (!definition) throw new Error('That execution-target provider is not available.');
  return definition;
}

export function createExecutionTargetActions(boundary: ExecutionTargetActionsBoundary) {
  const loadNativeInventory = async () => Promise.all([boundary.loadDefinitions(), boundary.loadTargets()])
    .then(([definitions, targets]) => ({ definitions, targets }));

  return {
    loadNativeInventory,
    async createNativeCursor(input: {
      definitionId: string;
      displayName: string;
      repoName: string;
      repoUrl: string | null;
      branchPolicy: string;
      verificationCommands: string[];
    }) {
      const definition = await supportedDefinition(boundary, input.definitionId);
      const displayName = cleanRequiredText(input.displayName, 'Display name', 80);
      const repoName = cleanRequiredText(input.repoName, 'Repo name', 100);
      const branchPolicy = cleanRequiredText(input.branchPolicy, 'Branch policy', 80);
      const verificationCommands = input.verificationCommands
        .map((command) => cleanRequiredText(command, 'Verification instruction', 300)).slice(0, 20);
      const defaultConfig = definition.default_config && typeof definition.default_config === 'object'
        ? definition.default_config as Record<string, unknown> : {};
      const created = await boundary.create({
        definitionId: definition.id, kind: definition.kind, displayName,
        config: {
          ...defaultConfig, repo_name: repoName, repo_url: cleanOptionalRepositoryUrl(input.repoUrl),
          branch_policy: branchPolicy, verification_commands: verificationCommands,
        },
        requirements: definition.default_requirements ?? {}, playbook: definition.default_playbook ?? {},
      });
      if (!created) throw new Error('The provider did not create the execution target.');
      return created;
    },
    async updateNativeCursor(input: {
      targetId: string;
      expectedUpdatedAt: string;
      displayName: string;
      repoName: string;
      repoUrl: string | null;
      branchPolicy: string;
      verificationCommands: string[];
      enabled?: boolean;
    }) {
      const targets = await boundary.loadTargets();
      const target = targets.find((item) => item.id === input.targetId && item.kind === 'cursor_repo');
      if (!target) throw new Error('That execution target is not available.');
      if (target.updated_at !== input.expectedUpdatedAt) throw new ExecutionTargetConflictError();
      const currentConfig = target.config && typeof target.config === 'object'
        ? target.config as Record<string, unknown> : {};
      const updated = await boundary.update({
        id: target.id, displayName: cleanRequiredText(input.displayName, 'Display name', 80),
        ...(input.enabled === undefined ? {} : { isEnabled: input.enabled }),
        config: {
          ...currentConfig,
          repo_name: cleanRequiredText(input.repoName, 'Repo name', 100),
          repo_url: cleanOptionalRepositoryUrl(input.repoUrl),
          branch_policy: cleanRequiredText(input.branchPolicy, 'Branch policy', 80),
          verification_commands: input.verificationCommands
            .map((command) => cleanRequiredText(command, 'Verification instruction', 300)).slice(0, 20),
        },
      });
      if (!updated) throw new Error('The provider did not update the execution target.');
      return updated;
    },
    async list() {
      const targets = await boundary.loadTargets();
      return { targets: targets.filter((item) => item.kind === 'cursor_repo').map(targetSummary) };
    },
    async get(input: { targetId: string }) {
      const targets = await boundary.loadTargets();
      const target = targets.find((item) => item.id === input.targetId && item.kind === 'cursor_repo');
      if (!target) throw new Error('That execution target is not available.');
      return { target: targetSummary(target), nativeOnlyConfiguration: nativeOnlyConfiguration(target) };
    },
    async create(input: {
      providerId: SupportedExecutionTargetProviderId;
      displayName: string;
      repoName: string;
    }) {
      const definition = await supportedDefinition(boundary, input.providerId);
      const existing = await boundary.loadTargets();
      if (existing.some((item) => item.definition_id === definition.id)) {
        throw new Error('That execution-target provider is already installed.');
      }
      const displayName = cleanRequiredText(input.displayName, 'Display name', 80);
      const repoName = cleanRequiredText(input.repoName, 'Repo name', 100);
      const defaultConfig = definition.default_config && typeof definition.default_config === 'object'
        ? definition.default_config as Record<string, unknown> : {};
      const created = await boundary.create({
        definitionId: definition.id,
        kind: definition.kind,
        displayName,
        config: { ...defaultConfig, repo_name: repoName },
        requirements: definition.default_requirements ?? {},
        playbook: definition.default_playbook ?? {},
      });
      if (!created) throw new Error('The provider did not create the execution target.');
      const confirmed = (await boundary.loadTargets()).find((item) => item.id === created.id);
      if (!confirmed) throw new Error('The provider did not confirm the execution target.');
      return targetSummary(confirmed);
    },
    async update(input: {
      targetId: string;
      expectedUpdatedAt: string;
      fields: SafeExecutionTargetFields;
    }) {
      const targets = await boundary.loadTargets();
      const target = targets.find((item) => item.id === input.targetId && item.kind === 'cursor_repo');
      if (!target) throw new Error('That execution target is not available.');
      if (target.updated_at !== input.expectedUpdatedAt) throw new ExecutionTargetConflictError();
      if (!input.fields || typeof input.fields !== 'object' || Object.keys(input.fields).length === 0) {
        throw new Error('Choose at least one safe execution-target field to update.');
      }
      const displayName = input.fields.displayName === undefined
        ? undefined : cleanRequiredText(input.fields.displayName, 'Display name', 80);
      const repoName = input.fields.repoName === undefined
        ? undefined : cleanRequiredText(input.fields.repoName, 'Repo name', 100);
      if (input.fields.enabled !== undefined && typeof input.fields.enabled !== 'boolean') {
        throw new Error('Enabled must be true or false.');
      }
      const currentConfig = target.config && typeof target.config === 'object'
        ? target.config as Record<string, unknown> : {};
      const updated = await boundary.update({
        id: target.id,
        ...(displayName === undefined ? {} : { displayName }),
        ...(input.fields.enabled === undefined ? {} : { isEnabled: input.fields.enabled }),
        ...(repoName === undefined ? {} : { config: { ...currentConfig, repo_name: repoName } }),
      });
      if (!updated) throw new Error('The provider did not update the execution target.');
      const confirmed = (await boundary.loadTargets()).find((item) => item.id === target.id);
      if (!confirmed || confirmed.updated_at === target.updated_at) {
        throw new Error('The provider did not confirm the execution-target update.');
      }
      return targetSummary(confirmed);
    },
    async delete(input: { targetId: string; expectedUpdatedAt: string }) {
      const targets = await boundary.loadTargets();
      const target = targets.find((item) => item.id === input.targetId && item.kind === 'cursor_repo');
      if (!target) throw new Error('That execution target is not available.');
      if (target.updated_at !== input.expectedUpdatedAt) throw new ExecutionTargetConflictError();
      if (!(await boundary.remove({ id: target.id }))) throw new Error('The provider did not delete the execution target.');
      if ((await boundary.loadTargets()).some((item) => item.id === target.id)) {
        throw new Error('The provider did not confirm execution-target deletion.');
      }
      return { targetId: target.id, deleted: true as const };
    },
  };
}
