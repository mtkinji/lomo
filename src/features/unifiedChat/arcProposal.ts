import type { Arc } from '../../domain/types';

export type ArcMutationPatch = {
  name?: string;
  narrative?: string | null;
  identityStatement?: string | null;
  status?: Arc['status'];
};

export type ArcCreateInput = {
  name: string;
  narrative?: string;
  identityStatement?: string;
  status?: Arc['status'];
};

export type ArcProposalOperation =
  | { type: 'create_arc'; targetId: null; expectedUpdatedAt: null; payload: ArcCreateInput }
  | { type: 'update_arc'; targetId: string; expectedUpdatedAt: string; payload: ArcMutationPatch }
  | { type: 'delete_arc'; targetId: string; expectedUpdatedAt: string; payload: Record<string, never> };

export function parseArcMutationPatch(value: unknown): ArcMutationPatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(['name', 'narrative', 'identityStatement', 'status']);
  if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.has(key))) return null;
  const patch: ArcMutationPatch = {};
  if ('name' in input) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 160) return null;
    patch.name = input.name.trim();
  }
  if ('narrative' in input) {
    if (input.narrative !== null && (typeof input.narrative !== 'string' || input.narrative.length > 5_000)) return null;
    patch.narrative = typeof input.narrative === 'string' ? input.narrative.trim() : null;
  }
  if ('identityStatement' in input) {
    if (input.identityStatement !== null &&
        (typeof input.identityStatement !== 'string' || input.identityStatement.length > 1_000)) return null;
    patch.identityStatement = typeof input.identityStatement === 'string' ? input.identityStatement.trim() : null;
  }
  if ('status' in input) {
    if (!['active', 'paused', 'archived'].includes(input.status as string)) return null;
    patch.status = input.status as Arc['status'];
  }
  return patch;
}

export function parseArcCreateInput(value: unknown): ArcCreateInput | null {
  const patch = parseArcMutationPatch(value);
  if (!patch?.name) return null;
  return {
    name: patch.name,
    ...(typeof patch.narrative === 'string' && patch.narrative ? { narrative: patch.narrative } : {}),
    ...(typeof patch.identityStatement === 'string' && patch.identityStatement
      ? { identityStatement: patch.identityStatement }
      : {}),
    ...(patch.status ? { status: patch.status } : {}),
  };
}
