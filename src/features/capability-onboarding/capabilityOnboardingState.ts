import {
  CAPABILITY_ONBOARDING_PATHS,
  type CapabilityOnboardingPathId,
} from './capabilityOnboardingContracts';

export type CapabilityOnboardingPageId = 'welcome' | CapabilityOnboardingPathId;
export type CapabilityOnboardingUniversalState = 'reel' | 'chosen' | 'explored';

export type CapabilityOnboardingCompletion = {
  receiptId: string;
  completedAt: number;
};

export type CapabilityOnboardingRecord = {
  schemaVersion: 2;
  universalState: CapabilityOnboardingUniversalState;
  activePageId: CapabilityOnboardingPageId;
  selectedPathId: CapabilityOnboardingPathId | null;
  checkpoint: string | null;
  pathCheckpoints: Partial<Record<CapabilityOnboardingPathId, string>>;
  completedPaths: Partial<
    Record<CapabilityOnboardingPathId, CapabilityOnboardingCompletion>
  >;
  updatedAt: number | null;
};

export type CapabilityOnboardingAction =
  | { type: 'view-page'; pageId: CapabilityOnboardingPageId; now: number }
  | { type: 'select-path'; pathId: CapabilityOnboardingPathId; now: number }
  | { type: 'checkpoint'; checkpoint: string; now: number }
  | { type: 'choose-another-door'; now: number }
  | { type: 'explore'; now: number }
  | {
      type: 'complete-path';
      pathId: CapabilityOnboardingPathId;
      receiptId: string;
      now: number;
    }
  | { type: 'reset' };

const FIRST_DOOR_ID: CapabilityOnboardingPathId = 'budget-app-controls';
const PATH_IDS = new Set<CapabilityOnboardingPathId>(
  CAPABILITY_ONBOARDING_PATHS.map(({ id }) => id),
);

function isPathId(value: unknown): value is CapabilityOnboardingPathId {
  return typeof value === 'string' && PATH_IDS.has(value as CapabilityOnboardingPathId);
}

function isPageId(value: unknown): value is CapabilityOnboardingPageId {
  return value === 'welcome' || isPathId(value);
}

function normalizeCheckpoints(
  value: unknown,
): CapabilityOnboardingRecord['pathCheckpoints'] {
  const pathCheckpoints: CapabilityOnboardingRecord['pathCheckpoints'] = {};
  if (!value || typeof value !== 'object') return pathCheckpoints;
  for (const [pathId, checkpoint] of Object.entries(value)) {
    if (isPathId(pathId) && typeof checkpoint === 'string' && checkpoint.trim()) {
      pathCheckpoints[pathId] = checkpoint;
    }
  }
  return pathCheckpoints;
}

function normalizeCompletions(
  value: unknown,
): CapabilityOnboardingRecord['completedPaths'] {
  const completedPaths: CapabilityOnboardingRecord['completedPaths'] = {};
  if (!value || typeof value !== 'object') return completedPaths;
  for (const [pathId, completion] of Object.entries(value)) {
    if (!isPathId(pathId) || !completion || typeof completion !== 'object') continue;
    const parsed = completion as Partial<CapabilityOnboardingCompletion>;
    if (
      typeof parsed.receiptId === 'string' &&
      parsed.receiptId.trim() &&
      typeof parsed.completedAt === 'number' &&
      Number.isFinite(parsed.completedAt)
    ) {
      completedPaths[pathId] = {
        receiptId: parsed.receiptId,
        completedAt: parsed.completedAt,
      };
    }
  }
  return completedPaths;
}

export function createCapabilityOnboardingRecord(): CapabilityOnboardingRecord {
  return {
    schemaVersion: 2,
    universalState: 'reel',
    activePageId: 'welcome',
    selectedPathId: null,
    checkpoint: null,
    pathCheckpoints: {},
    completedPaths: {},
    updatedAt: null,
  };
}

function migrateVersionOne(candidate: Record<string, unknown>): CapabilityOnboardingRecord {
  const universalState = candidate.universalState;
  const selectedPathId = isPathId(candidate.selectedPathId) ? candidate.selectedPathId : null;
  const pathCheckpoints = normalizeCheckpoints(candidate.pathCheckpoints);
  const completedPaths = normalizeCompletions(candidate.completedPaths);
  const updatedAt =
    typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
      ? candidate.updatedAt
      : null;

  if (universalState === 'chosen') {
    if (!selectedPathId) return createCapabilityOnboardingRecord();
    const checkpoint =
      typeof candidate.checkpoint === 'string' && candidate.checkpoint.trim()
        ? candidate.checkpoint
        : pathCheckpoints[selectedPathId] ?? 'selected';
    return {
      schemaVersion: 2,
      universalState: 'chosen',
      activePageId: selectedPathId,
      selectedPathId,
      checkpoint,
      pathCheckpoints: { ...pathCheckpoints, [selectedPathId]: checkpoint },
      completedPaths,
      updatedAt,
    };
  }

  if (universalState === 'looked-around' || universalState === 'something-else') {
    return {
      schemaVersion: 2,
      universalState: 'explored',
      activePageId: selectedPathId ?? FIRST_DOOR_ID,
      selectedPathId: null,
      checkpoint: null,
      pathCheckpoints,
      completedPaths,
      updatedAt,
    };
  }

  if (universalState === 'welcome' || universalState === 'chooser') {
    return {
      schemaVersion: 2,
      universalState: 'reel',
      activePageId: universalState === 'welcome' ? 'welcome' : FIRST_DOOR_ID,
      selectedPathId: null,
      checkpoint: null,
      pathCheckpoints,
      completedPaths,
      updatedAt,
    };
  }

  return createCapabilityOnboardingRecord();
}

export function normalizeCapabilityOnboardingRecord(
  value: unknown,
): CapabilityOnboardingRecord {
  if (!value || typeof value !== 'object') return createCapabilityOnboardingRecord();
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion === 1) return migrateVersionOne(candidate);
  if (candidate.schemaVersion !== 2) return createCapabilityOnboardingRecord();

  const universalState = candidate.universalState;
  if (universalState !== 'reel' && universalState !== 'chosen' && universalState !== 'explored') {
    return createCapabilityOnboardingRecord();
  }
  const activePageId = isPageId(candidate.activePageId) ? candidate.activePageId : 'welcome';
  const selectedPathId = isPathId(candidate.selectedPathId) ? candidate.selectedPathId : null;
  if (universalState === 'chosen' && !selectedPathId) {
    return createCapabilityOnboardingRecord();
  }
  const pathCheckpoints = normalizeCheckpoints(candidate.pathCheckpoints);
  const checkpoint =
    universalState === 'chosen' &&
    selectedPathId &&
    typeof candidate.checkpoint === 'string' &&
    candidate.checkpoint.trim()
      ? candidate.checkpoint
      : null;

  return {
    schemaVersion: 2,
    universalState,
    activePageId: universalState === 'chosen' && selectedPathId ? selectedPathId : activePageId,
    selectedPathId: universalState === 'chosen' ? selectedPathId : null,
    checkpoint,
    pathCheckpoints,
    completedPaths: normalizeCompletions(candidate.completedPaths),
    updatedAt:
      typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : null,
  };
}

export function reduceCapabilityOnboarding(
  record: CapabilityOnboardingRecord,
  action: CapabilityOnboardingAction,
): CapabilityOnboardingRecord {
  switch (action.type) {
    case 'reset':
      return createCapabilityOnboardingRecord();
    case 'view-page':
      return {
        ...record,
        universalState: 'reel',
        activePageId: action.pageId,
        selectedPathId: null,
        checkpoint: null,
        updatedAt: action.now,
      };
    case 'select-path': {
      const checkpoint = record.pathCheckpoints[action.pathId] ?? 'selected';
      return {
        ...record,
        universalState: 'chosen',
        activePageId: action.pathId,
        selectedPathId: action.pathId,
        checkpoint,
        pathCheckpoints: {
          ...record.pathCheckpoints,
          [action.pathId]: checkpoint,
        },
        updatedAt: action.now,
      };
    }
    case 'checkpoint': {
      const checkpoint = action.checkpoint.trim();
      if (!record.selectedPathId || !checkpoint) return record;
      return {
        ...record,
        checkpoint,
        pathCheckpoints: {
          ...record.pathCheckpoints,
          [record.selectedPathId]: checkpoint,
        },
        updatedAt: action.now,
      };
    }
    case 'choose-another-door':
      return {
        ...record,
        universalState: 'reel',
        activePageId: record.selectedPathId ?? record.activePageId,
        selectedPathId: null,
        checkpoint: null,
        updatedAt: action.now,
      };
    case 'explore':
      return {
        ...record,
        universalState: 'explored',
        selectedPathId: null,
        checkpoint: null,
        updatedAt: action.now,
      };
    case 'complete-path': {
      const receiptId = action.receiptId.trim();
      if (!receiptId) return record;
      const isSelectedPath = record.selectedPathId === action.pathId;
      return {
        ...record,
        checkpoint: isSelectedPath ? 'complete' : record.checkpoint,
        pathCheckpoints: {
          ...record.pathCheckpoints,
          [action.pathId]: 'complete',
        },
        completedPaths: {
          ...record.completedPaths,
          [action.pathId]: { receiptId, completedAt: action.now },
        },
        updatedAt: action.now,
      };
    }
  }
}
