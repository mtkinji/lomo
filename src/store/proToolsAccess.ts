/**
 * Centralized "Pro Tools" access check.
 *
 * Pro Tools features (views, focus, attachments, banners, etc.) are available to:
 * 1. Full Pro subscribers
 * 2. Pro Tools Trial users
 * 3. Users with an active streak-based Pro preview for the specific feature
 *
 * Structural limits (Arc count, Goal count, AI credit cap) are NOT included
 * here — those remain gated on `isPro` alone.
 */
import { useEntitlementsStore } from './useEntitlementsStore';
import { useAppStore } from './useAppStore';
import { openPaywallInterstitial } from '../services/paywall';
import { useToastStore } from './useToastStore';

const PREVIEW_FEATURE_LABELS: Record<string, string> = {
  focus_mode: 'Focus Mode',
  saved_views: 'Saved Views',
  unsplash_banners: 'Banner Search',
};

export function canUseProTools(feature?: string): boolean {
  const ent = useEntitlementsStore.getState();
  if (ent.isPro || ent.isProToolsTrial) return true;
  if (feature) {
    const preview = useAppStore.getState().proPreview;
    if (preview && preview.feature === feature) {
      if (Date.now() < preview.expiresAtMs) return true;
      useAppStore.getState().clearProPreview();
      const label = PREVIEW_FEATURE_LABELS[feature] ?? feature;
      setTimeout(() => {
        openPaywallInterstitial({
          reason: 'pro_only_focus_mode',
          source: 'pro_preview_expired',
        });
        useToastStore.getState().showToast({
          message: `Liked ${label}? Keep it with Pro.`,
          variant: 'default',
        });
      }, 100);
    }
  }
  return false;
}

export function useCanUseProTools(feature?: string): boolean {
  const isPro = useEntitlementsStore((s) => s.isPro);
  const isProToolsTrial = useEntitlementsStore((s) => s.isProToolsTrial);
  const proPreview = useAppStore((s) => s.proPreview);
  if (isPro || isProToolsTrial) return true;
  if (feature && proPreview && proPreview.feature === feature && Date.now() < proPreview.expiresAtMs) {
    return true;
  }
  return false;
}
