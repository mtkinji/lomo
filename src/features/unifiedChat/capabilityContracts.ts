import type { UnifiedChatCapabilityId } from './requestPolicy';

export type CapabilityObjectRef = {
  type: string;
  id: string;
  label: string;
  secondaryLabel?: string;
};

export type CapabilityEvidenceAuthority = 'authoritative' | 'derived' | 'user_supplied';
export type CapabilityEvidenceFreshness = 'current' | 'recent' | 'stale' | 'unknown';

export type CapabilityEvidenceSource = {
  capabilityId: UnifiedChatCapabilityId;
  object: CapabilityObjectRef;
  searchableText: string;
  summary: string;
  authority: CapabilityEvidenceAuthority;
  observedAt?: string | null;
};

export type EvidenceRefDraft = {
  id: string;
  capabilityId: UnifiedChatCapabilityId;
  object: CapabilityObjectRef;
  summary: string;
  authority: CapabilityEvidenceAuthority;
  freshness: CapabilityEvidenceFreshness;
  observedAt: string | null;
  includedBecause: string;
  sufficient: boolean;
};

export type EvidenceOmission = {
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
  label: string;
  authority: CapabilityEvidenceAuthority;
  freshness: CapabilityEvidenceFreshness;
  observedAt: string | null;
  reason: string;
};

export type EvidenceCoverage = {
  sufficient: boolean;
  consideredCount: number;
  includedCount: number;
  omittedCount: number;
  note: string;
};

export type BuiltRunContext = {
  evidence: EvidenceRefDraft[];
  omissions: EvidenceOmission[];
  coverage: EvidenceCoverage;
};

export type CapabilityOperationKind =
  | 'create_activity'
  | 'update_activity'
  | 'delete_activity'
  | 'create_activity_step'
  | 'update_activity_step'
  | 'complete_activity_step'
  | 'delete_activity_step'
  | 'reorder_activity_steps'
  | 'create_goal'
  | 'update_goal'
  | 'delete_goal'
  | 'create_arc'
  | 'update_arc'
  | 'delete_arc'
  | 'update_profile'
  | 'update_chapter_note';

export type CapabilityNativeReturnTarget = {
  capabilityId: UnifiedChatCapabilityId;
  object: Pick<CapabilityObjectRef, 'type' | 'id'>;
  label: string;
  route: {
    name: 'MainTabs' | 'Settings';
    params: Record<string, unknown>;
  };
};

export type CapabilityChatAdapter<Snapshot> = {
  capabilityId: UnifiedChatCapabilityId;
  context: {
    dataClassification: 'private_kwilt_data';
    readOnly: boolean;
  };
  evidence: {
    list: (snapshot: Snapshot) => CapabilityEvidenceSource[];
  };
  proposal: {
    operationKinds: readonly CapabilityOperationKind[];
  };
  apply: {
    operationKinds: readonly CapabilityOperationKind[];
  };
  receipt: {
    reloadAuthoritativeObject: boolean;
  };
  undo: {
    operationKinds: readonly CapabilityOperationKind[];
  };
  return: {
    targetFor: (object: CapabilityObjectRef) => CapabilityNativeReturnTarget;
  };
};
