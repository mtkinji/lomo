import type { ArchetypeAdmiredQualityId, ArchetypeRoleModelTypeId } from './archetypeTaps';

/**
 * Payload stored in Supabase `arc_drafts.payload` and passed between web ↔ app.
 * Keep this schema versioned and append-only (never mutate semantics in-place).
 */
export type ArcDraftPayloadV1 = {
  version: 1;

  dream: string;
  whyNowId: string | null;
  domainId: string;
  proudMomentId: string;
  motivationId: string;
  roleModelTypeId: ArchetypeRoleModelTypeId;
  admiredQualityIds: ArchetypeAdmiredQualityId[];
};

export type ArcDraftPayload = ArcDraftPayloadV1;


