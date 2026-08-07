import {
  RecipeContractError,
  asRecord,
  assertExactKeys,
  isoDateString,
  nullableString,
  parseRecipe,
  parseRecipeVersion,
  requiredString,
  type Recipe,
  type RecipeVersion,
} from './recipeContracts';

export type RecipeImportMethod = 'url' | 'photo' | 'scan' | 'text' | 'voice' | 'email';

export type RecipeImportArtifact = {
  id: string;
  storageRef: string | null;
  page: number;
  mediaType: string;
  contentHash: string;
};

export type RecipeImportFieldEvidence = {
  fieldPath: string;
  sourceArtifactId: string;
  sourceRegion: { x: number; y: number; width: number; height: number } | null;
  sourceText: string | null;
  confidence: number;
  warning: string | null;
};

export type RecipeImportDraft = {
  id: string;
  ownerPersonId: string;
  version: number;
  method: RecipeImportMethod;
  sourceArtifacts: RecipeImportArtifact[];
  sourceMetadata: {
    sourceUrl: string | null;
    sourceTitle: string | null;
    sourceAuthor: string | null;
  };
  extractedRecipe: Record<string, unknown>;
  fieldEvidence: RecipeImportFieldEvidence[];
  modelVersion: string | null;
  promptVersion: string | null;
  state: 'extracting' | 'needs_review' | 'approved' | 'discarded' | 'expired';
  createdAt: string;
  expiresAt: string;
};

export type RecipeImportApproval = {
  draftId: string;
  expectedDraftVersion: number;
  idempotencyKey: string;
  reviewedRecipe: Recipe;
  reviewedVersion: RecipeVersion;
};

export type RecipeImportApprovalReceipt = {
  id: string;
  idempotencyKey: string;
  draftId: string;
  recipeId: string;
  recipeVersionId: string;
  effectiveVersion: number;
  appliedAt: string;
};

function integer(value: unknown, path: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must be an integer of at least ${minimum}.`, path);
  }
  return value;
}

function parseArtifact(value: unknown, index: number): RecipeImportArtifact {
  const path = `recipeImport.sourceArtifacts[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'storageRef', 'page', 'mediaType', 'contentHash'], path);
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    storageRef: nullableString(object.storageRef, `${path}.storageRef`, 1_024),
    page: integer(object.page, `${path}.page`, 1),
    mediaType: requiredString(object.mediaType, `${path}.mediaType`, 128),
    contentHash: requiredString(object.contentHash, `${path}.contentHash`, 256),
  };
}

function parseRegion(value: unknown, path: string): RecipeImportFieldEvidence['sourceRegion'] {
  if (value === null) return null;
  const object = asRecord(value, path);
  assertExactKeys(object, ['x', 'y', 'width', 'height'], path);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    if (typeof object[key] !== 'number' || object[key] < 0 || object[key] > 1) {
      throw new RecipeContractError('recipe.field.invalid', `${path}.${key} must be between zero and one.`, `${path}.${key}`);
    }
  }
  return { x: object.x as number, y: object.y as number, width: object.width as number, height: object.height as number };
}

function parseEvidence(value: unknown, index: number): RecipeImportFieldEvidence {
  const path = `recipeImport.fieldEvidence[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['fieldPath', 'sourceArtifactId', 'sourceRegion', 'sourceText', 'confidence', 'warning'], path);
  if (typeof object.confidence !== 'number' || !Number.isFinite(object.confidence) || object.confidence < 0 || object.confidence > 1) {
    throw new RecipeContractError('recipe.import.confidence_invalid', 'Import confidence must be between zero and one.', `${path}.confidence`);
  }
  return {
    fieldPath: requiredString(object.fieldPath, `${path}.fieldPath`, 320),
    sourceArtifactId: requiredString(object.sourceArtifactId, `${path}.sourceArtifactId`, 128),
    sourceRegion: parseRegion(object.sourceRegion, `${path}.sourceRegion`),
    sourceText: nullableString(object.sourceText, `${path}.sourceText`, 8_000),
    confidence: object.confidence,
    warning: nullableString(object.warning, `${path}.warning`, 1_000),
  };
}

export function parseRecipeImportDraft(
  value: unknown,
  options: { now?: string } = {},
): RecipeImportDraft {
  const object = asRecord(value, 'recipeImport');
  assertExactKeys(object, ['id', 'ownerPersonId', 'version', 'method', 'sourceArtifacts', 'sourceMetadata', 'extractedRecipe', 'fieldEvidence', 'modelVersion', 'promptVersion', 'state', 'createdAt', 'expiresAt'], 'recipeImport');
  if (!Array.isArray(object.sourceArtifacts) || object.sourceArtifacts.length === 0 || object.sourceArtifacts.length > 20) {
    throw new RecipeContractError('recipe.field.invalid', 'Import must include between one and twenty source artifacts.', 'recipeImport.sourceArtifacts');
  }
  if (!Array.isArray(object.fieldEvidence) || object.fieldEvidence.length > 1_000) {
    throw new RecipeContractError('recipe.field.invalid', 'Import field evidence must be a bounded array.', 'recipeImport.fieldEvidence');
  }
  const sourceArtifacts = object.sourceArtifacts.map(parseArtifact);
  if (sourceArtifacts.some((artifact, index) => artifact.page !== index + 1)) {
    throw new RecipeContractError('recipe.import.artifact_order_invalid', 'Import artifact pages must be ordered and contiguous from one.', 'recipeImport.sourceArtifacts');
  }
  const sourceMetadataObject = asRecord(object.sourceMetadata, 'recipeImport.sourceMetadata');
  assertExactKeys(sourceMetadataObject, ['sourceUrl', 'sourceTitle', 'sourceAuthor'], 'recipeImport.sourceMetadata');
  const extractedRecipe = asRecord(object.extractedRecipe, 'recipeImport.extractedRecipe');
  const expiresAt = isoDateString(object.expiresAt, 'recipeImport.expiresAt');
  if (options.now && Date.parse(expiresAt) <= Date.parse(options.now)) {
    throw new RecipeContractError('recipe.import.expired', 'Recipe import draft has expired.', 'recipeImport.expiresAt');
  }
  const method = String(object.method);
  if (!['url', 'photo', 'scan', 'text', 'voice', 'email'].includes(method)) {
    throw new RecipeContractError('recipe.field.invalid', 'Unsupported Recipe import method.', 'recipeImport.method');
  }
  const state = String(object.state);
  if (!['extracting', 'needs_review', 'approved', 'discarded', 'expired'].includes(state)) {
    throw new RecipeContractError('recipe.field.invalid', 'Unsupported Recipe import state.', 'recipeImport.state');
  }
  const fieldEvidence = object.fieldEvidence.map(parseEvidence);
  const artifactIds = new Set(sourceArtifacts.map((artifact) => artifact.id));
  if (fieldEvidence.some((evidence) => !artifactIds.has(evidence.sourceArtifactId))) {
    throw new RecipeContractError('recipe.field.invalid', 'Field evidence must reference a source artifact in the draft.', 'recipeImport.fieldEvidence');
  }
  return {
    id: requiredString(object.id, 'recipeImport.id', 128),
    ownerPersonId: requiredString(object.ownerPersonId, 'recipeImport.ownerPersonId', 128),
    version: integer(object.version, 'recipeImport.version', 1),
    method: method as RecipeImportMethod,
    sourceArtifacts,
    sourceMetadata: {
      sourceUrl: nullableString(sourceMetadataObject.sourceUrl, 'recipeImport.sourceMetadata.sourceUrl', 2_048),
      sourceTitle: nullableString(sourceMetadataObject.sourceTitle, 'recipeImport.sourceMetadata.sourceTitle', 512),
      sourceAuthor: nullableString(sourceMetadataObject.sourceAuthor, 'recipeImport.sourceMetadata.sourceAuthor', 512),
    },
    extractedRecipe,
    fieldEvidence,
    modelVersion: nullableString(object.modelVersion, 'recipeImport.modelVersion', 256),
    promptVersion: nullableString(object.promptVersion, 'recipeImport.promptVersion', 256),
    state: state as RecipeImportDraft['state'],
    createdAt: isoDateString(object.createdAt, 'recipeImport.createdAt'),
    expiresAt,
  };
}

export function parseRecipeImportApproval(value: unknown): RecipeImportApproval {
  const object = asRecord(value, 'recipeImportApproval');
  assertExactKeys(
    object,
    ['draftId', 'expectedDraftVersion', 'idempotencyKey', 'reviewedRecipe', 'reviewedVersion'],
    'recipeImportApproval',
    'recipe.import.approval_field.unknown',
  );
  const reviewedRecipe = parseRecipe(object.reviewedRecipe);
  const reviewedVersion = parseRecipeVersion(object.reviewedVersion);
  if (reviewedVersion.recipeId !== reviewedRecipe.id || reviewedVersion.id !== reviewedRecipe.currentVersionId) {
    throw new RecipeContractError('recipe.field.invalid', 'Reviewed Recipe and version identities do not agree.', 'recipeImportApproval');
  }
  return {
    draftId: requiredString(object.draftId, 'recipeImportApproval.draftId', 128),
    expectedDraftVersion: integer(object.expectedDraftVersion, 'recipeImportApproval.expectedDraftVersion', 1),
    idempotencyKey: requiredString(object.idempotencyKey, 'recipeImportApproval.idempotencyKey', 256),
    reviewedRecipe,
    reviewedVersion,
  };
}

export function approveRecipeImport(
  state: { receiptsByIdempotencyKey: Map<string, RecipeImportApprovalReceipt> },
  approval: RecipeImportApproval,
  options: { now: string },
): RecipeImportApprovalReceipt {
  const existing = state.receiptsByIdempotencyKey.get(approval.idempotencyKey);
  if (existing) return existing;
  const receipt: RecipeImportApprovalReceipt = {
    id: `receipt:${approval.idempotencyKey}`,
    idempotencyKey: approval.idempotencyKey,
    draftId: approval.draftId,
    recipeId: approval.reviewedRecipe.id,
    recipeVersionId: approval.reviewedVersion.id,
    effectiveVersion: approval.reviewedVersion.version,
    appliedAt: isoDateString(options.now, 'recipeImportApproval.appliedAt'),
  };
  state.receiptsByIdempotencyKey.set(approval.idempotencyKey, receipt);
  return receipt;
}
