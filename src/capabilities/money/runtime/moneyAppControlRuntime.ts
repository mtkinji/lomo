import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import type { MoneySnapshot } from '../data/moneySnapshot';
import {
  evaluateMoneyAppControlPolicy,
  moneyAppControlSelectionId,
  type MoneyAppControlSettings,
} from '../domain/moneyAppControl';
import { loadMoneyAppControlSettings } from './moneyAppControlStorage';
import { reconcileScreenTimeRestrictions } from '../../../services/screenTimeProtectionRuntime';

let latestSnapshot: MoneySnapshot | null = null;
let latestSettings: MoneyAppControlSettings | null = null;

export async function reconcileMoneyAppControls(
  snapshot: MoneySnapshot,
  suppliedSettings?: MoneyAppControlSettings,
): Promise<void> {
  latestSnapshot = snapshot;
  const settings = suppliedSettings ?? await loadMoneyAppControlSettings();
  latestSettings = settings;
  await Promise.all(snapshot.categories.map(async (category) => {
    const policy = settings.policies[category.sourceId];
    const selectionId = moneyAppControlSelectionId(category.sourceId);
    const evaluation = evaluateMoneyAppControlPolicy({ settings, snapshot, category, now: new Date() });
    if (!evaluation.restricted || !policy) {
      await clearScreenTimeRestrictionsForSelection(selectionId);
      return;
    }
    await applyScreenTimeRestrictions({
      settings: {
        selectedApps: policy.selectedApps,
        selectedCategories: policy.selectedCategories,
      },
      reasons: [evaluation.reason!],
      selectionId,
      ruleId: selectionId,
      reason: evaluation.reason!,
      restrictionLabel: category.name,
    });
  }));
  await reconcileScreenTimeRestrictions({ focusSessionActive: false, moneySnapshot: snapshot });
}

export async function reconcileLatestMoneyAppControls(): Promise<void> {
  if (!latestSnapshot) return;
  await reconcileMoneyAppControls(latestSnapshot, latestSettings ?? undefined);
}

export function resetLatestMoneyAppControlSnapshotForTests(): void {
  latestSnapshot = null;
  latestSettings = null;
}
