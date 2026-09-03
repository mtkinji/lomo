import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { clearManagedChildAccess } from '../features/household/personalDevice/managedChildAccess';
import { resetCapabilityOnboardingForUser } from '../features/capability-onboarding/useCapabilityOnboardingStore';
import { useExploreStore } from '../capabilities/explore/runtime/useExploreStore';
import { useChoreLearningStore } from '../capabilities/chores/runtime/useChoreLearningStore';
import { useCheckinDraftStore } from '../store/useCheckinDraftStore';
import { useCheckinNudgeStore } from '../store/useCheckinNudgeStore';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { useMilestoneSharePromptStore } from '../store/useMilestoneSharePromptStore';
import { resetUserSpecificState, useAppStore } from '../store/useAppStore';
import { clearRevenueCatIdentity } from './entitlements';
import { clearPosthogIdentity } from './analytics/posthogClient';
import { resetSupabaseAuthStorage, getSupabaseClient } from './backend/supabaseClient';
import { unregisterHealthDailySyncTask } from './health/healthBackgroundTask';
import { unregisterNotificationReconcileTask } from './notifications/notificationBackgroundTask';
import { stopDomainSync } from './sync/domainSync';
import { stopStreakSync } from './sync/streakSync';
import { stopPushTokenSync } from './pushTokenService';

export const MANAGED_CHILD_ACCESS_SECURE_STORE_KEY = 'kwilt-managed-child-access-v1';

const ACCOUNT_WIDE_STORAGE_KEYS = new Set([
  'kwilt-domain-v1',
  'kwilt-entitlements',
  'kwilt-entitlements-cache-v1',
  'kwilt-pro-code-override-v1',
  'kwilt-admin-entitlements-override-v1',
  'kwilt-checkin-drafts-v1',
  'kwilt-checkin-nudge-v2',
  'kwilt-milestone-share-prompt-v1',
  'kwilt-capability-onboarding-v1',
  'kwilt-capability-discovery-v1',
  'kwilt-nav-state-v5',
  'kwilt-dev-coach-history-v1',
  'kwilt.heroImages.signedUrlCache.v1',
  'kwilt.chapters.readAt.v1',
  'kwilt.chapters.recDismissedAt.v1',
  'kwilt-chore-action-outbox-v1',
  'kwilt.nativeCrashBreadcrumbs.v1',
]);

const ACCOUNT_WIDE_STORAGE_PREFIXES = [
  'kwilt.notifications.',
  'kwilt:shared-home:',
  'kwilt-coach-summary:v1:',
  'kwilt.groceries.',
  'kwilt-groceries-',
  'kwilt.meal-',
  'kwilt-recipe-',
  'kwilt-games-',
  'kwilt-explore-',
  'kwilt-feedback-',
  'kwilt.health.',
];

export function selectAccountScopedAsyncStorageKeys(keys: string[], userId: string): string[] {
  const normalizedUserId = userId.trim();
  return keys.filter((key) => {
    if (normalizedUserId && key.includes(normalizedUserId)) return true;
    if (ACCOUNT_WIDE_STORAGE_KEYS.has(key)) return true;
    return ACCOUNT_WIDE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
  });
}

export type AccountDeletionLocalCleanupDependencies = {
  listAsyncStorageKeys(): Promise<string[]>;
  removeAsyncStorageKeys(keys: string[]): Promise<void>;
  removeSecureStoreKeys(keys: string[]): Promise<void>;
  cancelAccountNotifications(): Promise<void>;
  stopAccountBackgroundWork(): Promise<void>;
  clearRevenueCatIdentity(): Promise<void>;
  clearAnalyticsIdentity(): Promise<void>;
  closeRealtimeChannels(): Promise<void>;
  resetStores(): void;
  clearAuthSecrets(): Promise<void>;
};

function defaultDependencies(userId: string): AccountDeletionLocalCleanupDependencies {
  return {
    listAsyncStorageKeys: async () => Array.from(await AsyncStorage.getAllKeys()),
    removeAsyncStorageKeys: async (keys) => {
      if (keys.length) await AsyncStorage.multiRemove(keys);
    },
    removeSecureStoreKeys: async (keys) => {
      for (const key of keys) {
        if (key === MANAGED_CHILD_ACCESS_SECURE_STORE_KEY) await clearManagedChildAccess();
        else await SecureStore.deleteItemAsync(key);
      }
    },
    cancelAccountNotifications: async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    },
    stopAccountBackgroundWork: async () => {
      stopPushTokenSync();
      await Promise.all([
        unregisterHealthDailySyncTask(),
        unregisterNotificationReconcileTask(),
      ]);
    },
    clearRevenueCatIdentity,
    clearAnalyticsIdentity: async () => clearPosthogIdentity(),
    closeRealtimeChannels: async () => {
      stopDomainSync();
      stopStreakSync();
      await getSupabaseClient().removeAllChannels();
    },
    resetStores: () => {
      resetUserSpecificState();
      useAppStore.getState().clearAuthIdentity();
      useCheckinDraftStore.getState().reset();
      useCheckinNudgeStore.getState().reset();
      useMilestoneSharePromptStore.getState().reset();
      useEntitlementsStore.getState().clearSignedInEntitlements();
      useExploreStore.getState().clearHistory();
      useChoreLearningStore.getState().reset();
      resetCapabilityOnboardingForUser(userId);
    },
    clearAuthSecrets: resetSupabaseAuthStorage,
  };
}

export async function purgeDeletedAccountFromDevice(input: {
  userId: string;
  dependencies?: AccountDeletionLocalCleanupDependencies;
}): Promise<{ ok: true }> {
  const dependencies = input.dependencies ?? defaultDependencies(input.userId);
  let inventoryFailed = false;
  const keys = await dependencies.listAsyncStorageKeys().catch(() => {
    inventoryFailed = true;
    return [];
  });
  const accountKeys = selectAccountScopedAsyncStorageKeys(keys, input.userId);
  const results = await Promise.allSettled([
    dependencies.removeAsyncStorageKeys(accountKeys),
    dependencies.removeSecureStoreKeys([MANAGED_CHILD_ACCESS_SECURE_STORE_KEY]),
    dependencies.cancelAccountNotifications(),
    dependencies.stopAccountBackgroundWork(),
    dependencies.clearRevenueCatIdentity(),
    dependencies.clearAnalyticsIdentity(),
    dependencies.closeRealtimeChannels(),
    Promise.resolve().then(() => dependencies.resetStores()),
    dependencies.clearAuthSecrets(),
  ]);
  if (inventoryFailed || results.some((result) => result.status === 'rejected')) {
    throw new Error('Account was deleted, but this device could not finish clearing local data.');
  }
  return { ok: true };
}
