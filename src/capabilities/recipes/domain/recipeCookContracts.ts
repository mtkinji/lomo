export type RecipeCookDevice = { deviceId: string; platform: 'ios' | 'android'; appVersion: string; observedAt: string };
export type CookTimer = {
  id: string; cueId: string; label: string; durationSeconds: number; remainingSeconds: number;
  startedAt: string; pausedAt: string | null; firesAt: string | null;
  status: 'running' | 'paused' | 'fired' | 'cancelled'; notificationId: string | null; syncState: 'local' | 'synced';
};
export type RecipeCookSession = {
  id: string; ownerPersonId: string; recipeId: string; recipeVersionId: string; recipeVersion: number;
  servingScale: number; status: 'active' | 'paused' | 'completed' | 'abandoned'; currentCueIndex: number; cueCount: number;
  revision: number; startedAt: string; pausedAt: string | null; completedAt: string | null; updatedAt: string;
  lastDevice: RecipeCookDevice; timers: CookTimer[];
};
export type CookCue = {
  id: string; instructionId: string; position: number; section: string | null; displayText: string; actionText: string;
  supportingCue: { kind: 'ready_when'; text: string } | null; accessibilityLabel: string;
  media: { assetId: string; storageRef: string; mediaType: string; altText: string | null } | null;
  ingredientReferences: Array<{ ingredientLineId: string; concept: string; displayAmount: string | null }>;
  timerSuggestions: Array<{ durationSeconds: number; label: string }>;
};
export type RecipeCookRecord = {
  id: string; sessionId: string; ownerPersonId: string; recipeId: string; recipeVersionId: string; servingScale: number;
  completed: boolean; wouldMakeAgain: boolean | null; privateNote: string | null; completedAt: string; provenance: 'cook_session';
};

export class RecipeCookContractError extends Error {
  constructor(public readonly code: string, message: string, public readonly recoveryChoices: string[] = []) { super(message); this.name = 'RecipeCookContractError'; }
}
function date(value: string, label: string) { if (!Number.isFinite(Date.parse(value))) throw new RecipeCookContractError('recipe_cook.date_invalid', `${label} is invalid.`); }

export function parseRecipeCookSession(value: RecipeCookSession): RecipeCookSession {
  if (!value.id || !value.ownerPersonId || !value.recipeId || !value.recipeVersionId || !Number.isInteger(value.recipeVersion) || value.recipeVersion < 1 || !Number.isInteger(value.revision) || value.revision < 1) {
    throw new RecipeCookContractError('recipe_cook.identity_invalid', 'Cook Session identity and exact Recipe version are required.');
  }
  if (!Number.isFinite(value.servingScale) || value.servingScale <= 0) throw new RecipeCookContractError('recipe_cook.scale_invalid', 'Serving scale must be positive.');
  if (!Number.isInteger(value.cueCount) || value.cueCount < 1 || !Number.isInteger(value.currentCueIndex) || value.currentCueIndex < 0 || value.currentCueIndex >= value.cueCount) {
    throw new RecipeCookContractError('recipe_cook.cue_invalid', 'Cook cue position is outside this Recipe version.');
  }
  date(value.startedAt, 'startedAt'); date(value.updatedAt, 'updatedAt'); date(value.lastDevice.observedAt, 'lastDevice.observedAt');
  if (!value.lastDevice.deviceId || !value.lastDevice.appVersion || !['ios', 'android'].includes(value.lastDevice.platform)) throw new RecipeCookContractError('recipe_cook.device_invalid', 'Last-device metadata is required.');
  const timers = value.timers.map((timer) => {
    if (!timer.id || !timer.cueId || !timer.label || !Number.isInteger(timer.durationSeconds) || timer.durationSeconds < 1 || !Number.isInteger(timer.remainingSeconds) || timer.remainingSeconds < 0 || !timer.startedAt || !['running','paused','fired','cancelled'].includes(timer.status)) {
      throw new RecipeCookContractError('recipe_cook.timer_invalid', 'Cook timers require deterministic identity, cue origin, duration, and state.');
    }
    date(timer.startedAt, 'timer.startedAt'); if (timer.pausedAt) date(timer.pausedAt, 'timer.pausedAt'); if (timer.firesAt) date(timer.firesAt, 'timer.firesAt');
    return { ...timer };
  });
  return { ...value, lastDevice: { ...value.lastDevice }, timers };
}
