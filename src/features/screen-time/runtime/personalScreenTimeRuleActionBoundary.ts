import { useAppStore } from '../../../store/useAppStore';
import {
  activatePersonalCompositeScreenTimeRule,
  deactivatePersonalCompositeScreenTimeRule,
} from '../../../services/screenTimeProtectionRuntime';
import type { PersonalScreenTimeRuleActionBoundary } from '../domain/personalScreenTimeRuleActions';
import type { PersonalCompositeRuleActionBoundary } from '../domain/personalCompositeRuleActions';
import { canSavePersonalRule } from '../domain/screenTimeAccessPolicy';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { isAdvancedScreenTimePaywallEnabled } from './screenTimeMonetizationFlag';

export function createPersonalScreenTimeRuleActionBoundary(): PersonalScreenTimeRuleActionBoundary {
  return {
    readSettings: () => useAppStore.getState().screenTimeProtection,
    persistSettings: (settings) => useAppStore.getState().setScreenTimeProtection(settings),
    activateRule: (rule) => activatePersonalCompositeScreenTimeRule({ rule }),
    deactivateRule: deactivatePersonalCompositeScreenTimeRule,
  };
}

export function createPersonalCompositeRuleActionBoundary(): PersonalCompositeRuleActionBoundary {
  return {
    readSettings: () => useAppStore.getState().screenTimeProtection,
    persistSettings: (settings) => useAppStore.getState().setScreenTimeProtection(settings),
    activateRule: (rule) => activatePersonalCompositeScreenTimeRule({ rule }),
    deactivateRule: deactivatePersonalCompositeScreenTimeRule,
    requireProForRule: (rule) => {
      const isPro = useEntitlementsStore.getState().isPro || !isAdvancedScreenTimePaywallEnabled();
      if (!canSavePersonalRule({ rule, isPro })) {
        throw new Error('screen_time_advanced_rule_pro_required');
      }
    },
  };
}
