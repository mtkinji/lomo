import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type ScreenTimeClient = {
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<QueryResult>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableText(value: unknown): string | null | undefined {
  return value === null ? null : text(value) ?? undefined;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function inSet(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === 'string' && allowed.includes(value) ? value : null;
}

function integerInRange(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : null;
}

function normalizeAgreementRule(value: unknown): Record<string, unknown> | null {
  const input = record(value);
  if (!input || !Array.isArray(input.weekdays)) return null;
  const weekdays = input.weekdays.map((day) => integerInRange(day, 0, 6));
  const startMinute = integerInRange(input.startMinute, 0, 1439);
  const endMinute = integerInRange(input.endMinute, 1, 1440);
  const dailyLimitMinutes = input.dailyLimitMinutes === null
    ? null
    : integerInRange(input.dailyLimitMinutes, 1, 1440);
  if (!weekdays.length || weekdays.some((day) => day === null) || startMinute === null ||
      endMinute === null || (dailyLimitMinutes === null && input.dailyLimitMinutes !== null)) return null;
  const output: Record<string, unknown> = {
    weekdays, startMinute, endMinute, dailyLimitMinutes,
  };
  if (input.prerequisiteActivity !== undefined) {
    const prerequisite = record(input.prerequisiteActivity);
    const selectionId = text(prerequisite?.selectionId);
    const thresholdMinutes = integerInRange(prerequisite?.thresholdMinutes, 1, 1440);
    const reset = inSet(prerequisite?.reset, ['daily']);
    if (!selectionId || thresholdMinutes === null || !reset) return null;
    output.prerequisiteActivity = { selectionId, thresholdMinutes, reset };
  }
  return output;
}

function mapArray(
  value: unknown,
  mapper: (item: Record<string, unknown>) => Record<string, unknown> | null,
): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null;
  const mapped = value.map((item) => {
    const input = record(item);
    return input ? mapper(input) : null;
  });
  return mapped.some((item) => item === null) ? null : mapped as Record<string, unknown>[];
}

function normalizeChild(value: Record<string, unknown>): Record<string, unknown> | null {
  const membershipId = text(value.membershipId);
  const displayName = text(value.displayName);
  const desiredPolicyVersion = finiteNumber(value.desiredPolicyVersion);
  const selections = mapArray(value.selections, (item) => {
    const id = text(item.id);
    const label = text(item.label);
    const status = inSet(item.status, ['active', 'revoked']);
    return id && label && status ? { id, label, status } : null;
  });
  const agreements = mapArray(value.agreements, (item) => {
    const id = text(item.id);
    const selectionId = text(item.selectionId);
    const rule = normalizeAgreementRule(item.rule);
    const version = finiteNumber(item.version);
    const updatedAt = text(item.updatedAt);
    return id && selectionId && rule && typeof item.active === 'boolean' && version !== null && updatedAt
      ? { id, selectionId, rule, active: item.active, version, updatedAt }
      : null;
  });
  const activeOverrides = mapArray(value.activeOverrides, (item) => {
    const id = text(item.id);
    const selectionId = text(item.selectionId);
    const action = inSet(item.action, ['block', 'allow']);
    const timeBasis = inSet(item.timeBasis, ['wall_clock', 'foreground_usage']);
    const startsAt = text(item.startsAt);
    const expiresAt = nullableText(item.expiresAt);
    const usageMinutes = item.usageMinutes === null ? null : finiteNumber(item.usageMinutes);
    const provenance = inSet(item.provenance, ['caregiver_direct', 'child_request_approved']);
    const policyVersion = finiteNumber(item.policyVersion);
    const status = inSet(item.status, ['active', 'cancelled', 'expired']);
    return id && selectionId && action && timeBasis && startsAt && expiresAt !== undefined &&
      (usageMinutes !== null || item.usageMinutes === null) && provenance && policyVersion !== null && status
      ? { id, selectionId, action, timeBasis, startsAt, expiresAt, usageMinutes, provenance, policyVersion, status }
      : null;
  });
  const pendingRequests = mapArray(value.pendingRequests, (item) => {
    const id = text(item.id);
    const selectionId = text(item.selectionId);
    const kind = inSet(item.kind, ['use_now', 'more_time', 'something_wrong']);
    const requestedMinutes = item.requestedMinutes === null ? null : finiteNumber(item.requestedMinutes);
    const message = nullableText(item.message);
    const status = inSet(item.status, ['pending', 'approved', 'denied', 'cancelled', 'expired']);
    const expiresAt = text(item.expiresAt);
    const createdAt = text(item.createdAt);
    return id && selectionId && kind && (requestedMinutes !== null || item.requestedMinutes === null) &&
      message !== undefined && status && expiresAt && createdAt
      ? { id, selectionId, kind, requestedMinutes, message, status, expiresAt, createdAt }
      : null;
  });
  const devices = mapArray(value.devices, (item) => {
    const readiness = inSet(item.readiness, ['pending', 'ready', 'blocked', 'released']);
    const authorizationStatus = inSet(item.authorizationStatus, ['unknown', 'pending', 'authorized', 'denied', 'revoked']);
    const lastSeenAt = nullableText(item.lastSeenAt);
    const releasedAt = nullableText(item.releasedAt);
    return readiness && authorizationStatus && lastSeenAt !== undefined && releasedAt !== undefined
      ? { readiness, authorizationStatus, lastSeenAt, releasedAt }
      : null;
  });
  const receiptInput = value.latestDeviceReceipt === null ? null : record(value.latestDeviceReceipt);
  const latestDeviceReceipt = receiptInput === null ? null : (() => {
    const policyVersion = finiteNumber(receiptInput.policyVersion);
    const outcome = inSet(receiptInput.outcome, ['received', 'applied', 'failed', 'expired', 'released']);
    const failureCode = nullableText(receiptInput.failureCode);
    const occurredAt = text(receiptInput.occurredAt);
    return policyVersion !== null && outcome && failureCode !== undefined && occurredAt
      ? { policyVersion, outcome, failureCode, occurredAt }
      : undefined;
  })();

  if (!membershipId || !displayName || desiredPolicyVersion === null || !selections || !agreements ||
      !activeOverrides || !pendingRequests || !devices || latestDeviceReceipt === undefined) return null;
  return {
    membershipId, displayName, desiredPolicyVersion, selections, agreements,
    activeOverrides, pendingRequests, devices, latestDeviceReceipt,
  };
}

function normalizeProjection(value: unknown): Record<string, unknown> | null {
  const input = record(value);
  const children = mapArray(input?.children, normalizeChild);
  return children ? { children } : null;
}

function normalizeChildFilter(value: unknown): string[] | null | undefined {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const children = value.map(text);
  if (children.some((child) => child === null)) return undefined;
  return [...new Set(children as string[])];
}

type OverrideInput = {
  action: 'block' | 'allow';
  targets: Array<{ childMembershipId: string; selectionId: string; expectedVersion: number }>;
  expiresAt: string;
};

function normalizeOverrideInput(call: ServerAgentToolCall, now: Date): OverrideInput | null {
  if (call.toolId !== 'screen_time.override.block' && call.toolId !== 'screen_time.override.allow') return null;
  const input = call.arguments;
  if (input.timeBasis !== 'wall_clock' || !Array.isArray(input.targets) ||
      input.targets.length < 1 || input.targets.length > 20 || typeof input.expiresAt !== 'string') return null;
  const targets = input.targets.map((value) => {
    const target = record(value);
    if (!target || Object.keys(target).some((key) => ![
      'childMembershipId', 'selectionId', 'expectedVersion',
    ].includes(key))) return null;
    const childMembershipId = text(target?.childMembershipId);
    const selectionId = text(target?.selectionId);
    const expectedVersion = integerInRange(target?.expectedVersion, 0, Number.MAX_SAFE_INTEGER);
    return childMembershipId && selectionId && expectedVersion !== null
      ? { childMembershipId, selectionId, expectedVersion }
      : null;
  });
  if (targets.some((target) => target === null)) return null;
  const parsedTargets = targets as OverrideInput['targets'];
  if (new Set(parsedTargets.map((target) => target.childMembershipId)).size !== parsedTargets.length) return null;
  const expiresAt = new Date(input.expiresAt);
  const duration = expiresAt.getTime() - now.getTime();
  if (!Number.isFinite(expiresAt.getTime()) || duration <= 0 || duration > 7 * 24 * 60 * 60_000) return null;
  return {
    action: call.toolId === 'screen_time.override.block' ? 'block' : 'allow',
    targets: parsedTargets,
    expiresAt: expiresAt.toISOString(),
  };
}

type AgreementInput = {
  childMembershipId: string;
  targetSelectionId: string;
  expectedPolicyVersion: number;
  rule: Record<string, unknown> & {
    prerequisiteActivity: { selectionId: string; thresholdMinutes: number; reset: 'daily' };
  };
};

function normalizeAgreementInput(call: ServerAgentToolCall): AgreementInput | null {
  if (call.toolId !== 'screen_time.agreement.create') return null;
  if (Object.keys(call.arguments).some((key) => ![
    'childMembershipId', 'targetSelectionId', 'expectedPolicyVersion', 'rule',
  ].includes(key))) return null;
  const rawRule = record(call.arguments.rule);
  const rawPrerequisite = record(rawRule?.prerequisiteActivity);
  if (!rawRule || Object.keys(rawRule).some((key) => ![
    'weekdays', 'startMinute', 'endMinute', 'dailyLimitMinutes', 'prerequisiteActivity',
  ].includes(key)) || !rawPrerequisite || Object.keys(rawPrerequisite).some((key) => ![
    'selectionId', 'thresholdMinutes', 'reset',
  ].includes(key))) return null;
  const childMembershipId = text(call.arguments.childMembershipId);
  const targetSelectionId = text(call.arguments.targetSelectionId);
  const expectedPolicyVersion = integerInRange(call.arguments.expectedPolicyVersion, 0, Number.MAX_SAFE_INTEGER);
  const rule = normalizeAgreementRule(call.arguments.rule);
  const prerequisite = record(rule?.prerequisiteActivity);
  const prerequisiteSelectionId = text(prerequisite?.selectionId);
  const thresholdMinutes = integerInRange(prerequisite?.thresholdMinutes, 1, 1440);
  if (!childMembershipId || !targetSelectionId || expectedPolicyVersion === null || !rule ||
      !prerequisiteSelectionId || thresholdMinutes === null || prerequisite?.reset !== 'daily' ||
      prerequisiteSelectionId === targetSelectionId ||
      new Set(rule.weekdays as number[]).size !== (rule.weekdays as number[]).length ||
      Number(rule.endMinute) <= Number(rule.startMinute)) return null;
  return {
    childMembershipId, targetSelectionId, expectedPolicyVersion,
    rule: {
      ...rule,
      prerequisiteActivity: { selectionId: prerequisiteSelectionId, thresholdMinutes, reset: 'daily' },
    },
  };
}

function staleTargetResult(): ServerAgentToolResult {
  return {
    status: 'failed', code: 'screen_time_target_stale',
    message: 'A child, saved app selection, or Screen Time version changed. Refresh before continuing.',
    retryable: true,
  };
}

export async function executeServerScreenTimeTool({
  client, userId, call, stageProposal, now = new Date(),
}: {
  client: ScreenTimeClient;
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  now?: Date;
}): Promise<ServerAgentToolResult | null> {
  if (![
    'screen_time.read', 'screen_time.agreement.create',
    'screen_time.override.block', 'screen_time.override.allow',
  ].includes(call.toolId)) return null;
  if (!client.rpc) {
    return { status: 'unavailable', reason: 'server_screen_time_provider_unavailable', retryable: false };
  }
  const override = normalizeOverrideInput(call, now);
  const agreement = normalizeAgreementInput(call);
  const isWrite = call.toolId !== 'screen_time.read';
  if (isWrite && !override && !agreement) {
    return {
      status: 'failed', code: call.toolId === 'screen_time.agreement.create'
        ? 'invalid_screen_time_agreement'
        : 'invalid_screen_time_override',
      message: call.toolId === 'screen_time.agreement.create'
        ? 'Choose one child, one required app, one target app group, and a valid daily threshold.'
        : 'Choose a bounded wall-clock duration and at least one valid child target.',
      retryable: false,
    };
  }
  const childMembershipIds = call.toolId === 'screen_time.read'
    ? normalizeChildFilter(call.arguments.childMembershipIds)
    : agreement ? [agreement.childMembershipId] : [...new Set(override!.targets.map((target) => target.childMembershipId))];
  if (childMembershipIds === undefined) {
    return {
      status: 'failed', code: 'invalid_screen_time_children',
      message: 'Choose up to 20 valid children to read.', retryable: false,
    };
  }
  const { data, error } = await client.rpc('get_kwilt_agent_screen_time_snapshot', {
    p_user_id: userId, p_child_membership_ids: childMembershipIds,
  });
  if (error) {
    return {
      status: 'failed', code: 'screen_time_read_failed',
      message: 'Kwilt could not read the current Screen Time state.', retryable: true,
    };
  }
  const output = normalizeProjection(data);
  if (!output) {
    return {
      status: 'failed', code: 'invalid_screen_time_projection',
      message: 'Kwilt received an invalid Screen Time projection.', retryable: false,
    };
  }
  if (call.toolId !== 'screen_time.read') {
    const children = output.children as Record<string, unknown>[];
    if (agreement) {
      const child = children.find((candidate) => candidate.membershipId === agreement.childMembershipId);
      const selections = Array.isArray(child?.selections) ? child.selections as Record<string, unknown>[] : [];
      const target = selections.find((selection) => selection.id === agreement.targetSelectionId && selection.status === 'active');
      const prerequisite = selections.find((selection) => (
        selection.id === agreement.rule.prerequisiteActivity.selectionId && selection.status === 'active'
      ));
      if (!child || child.desiredPolicyVersion !== agreement.expectedPolicyVersion || !target || !prerequisite) {
        return staleTargetResult();
      }
      if (!stageProposal) {
        return { status: 'unavailable', reason: 'server_proposal_persistence_unavailable', retryable: false };
      }
      const title = `Use ${String(prerequisite.label)} before ${String(target.label)}`;
      return {
        status: 'proposed',
        proposal: await stageProposal({
          capabilityId: 'screenTime', title,
          body: `${String(child.displayName)} uses ${String(prerequisite.label)} for ${agreement.rule.prerequisiteActivity.thresholdMinutes} minutes before ${String(target.label)} become available each day.`,
          operation: {
            type: 'create_family_screen_time_prerequisite_agreement', targetType: null, targetId: null,
            summary: title,
            payload: agreement,
          },
        }),
      };
    }
    const resolved = override!.targets.map((target) => {
      const child = children.find((candidate) => candidate.membershipId === target.childMembershipId);
      const selections = Array.isArray(child?.selections) ? child.selections as Record<string, unknown>[] : [];
      const selection = selections.find((candidate) => candidate.id === target.selectionId && candidate.status === 'active');
      return child && selection && child.desiredPolicyVersion === target.expectedVersion ? { child, selection } : null;
    });
    if (resolved.some((target) => target === null)) return staleTargetResult();
    if (!stageProposal) {
      return { status: 'unavailable', reason: 'server_proposal_persistence_unavailable', retryable: false };
    }
    const authorized = resolved as Array<{ child: Record<string, unknown>; selection: Record<string, unknown> }>;
    const selectionLabels = [...new Set(authorized.map((target) => String(target.selection.label)))];
    const selectionLabel = selectionLabels.length === 1 ? selectionLabels[0] : 'selected apps';
    const childLabel = authorized.map((target) => String(target.child.displayName)).join(', ');
    const verb = override!.action === 'block' ? 'Block' : 'Allow';
    return {
      status: 'proposed',
      proposal: await stageProposal({
        capabilityId: 'screenTime', title: `${verb} ${selectionLabel}`,
        body: override!.action === 'allow'
          ? `${childLabel} · for Kwilt family restrictions · until ${override!.expiresAt}`
          : `${childLabel} · until ${override!.expiresAt}`,
        operation: {
          type: `${override!.action}_family_screen_time_selection`, targetType: null, targetId: null,
          summary: `${verb} ${selectionLabel} for ${childLabel} until ${override!.expiresAt}`,
          payload: { targets: override!.targets, timeBasis: 'wall_clock', expiresAt: override!.expiresAt },
        },
      }),
    };
  }
  return { status: 'completed', output, receipt: null };
}
