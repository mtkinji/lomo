import { useAppStore } from '../../../store/useAppStore';
import {
  activatePersonalScreenTimeRule,
  deactivatePersonalScreenTimeRule,
  activatePersonalCompositeScreenTimeRule,
  deactivatePersonalCompositeScreenTimeRule,
} from '../../../services/screenTimeProtectionRuntime';
import type { PersonalScreenTimeRuleActionBoundary } from '../domain/personalScreenTimeRuleActions';
import type { PersonalCompositeRuleActionBoundary } from '../domain/personalCompositeRuleActions';

export function createPersonalScreenTimeRuleActionBoundary(): PersonalScreenTimeRuleActionBoundary {
  return {
    readSettings: () => useAppStore.getState().screenTimeProtection,
    persistSettings: (settings) => useAppStore.getState().setScreenTimeProtection(settings),
    activateRule: (rule) => activatePersonalScreenTimeRule({ rule, focusSessionActive: false }),
    deactivateRule: deactivatePersonalScreenTimeRule,
  };
}

export function createPersonalCompositeRuleActionBoundary(): PersonalCompositeRuleActionBoundary {
  return {
    readSettings: () => useAppStore.getState().screenTimeProtection,
    persistSettings: (settings) => useAppStore.getState().setScreenTimeProtection(settings),
    activateRule: (rule) => activatePersonalCompositeScreenTimeRule({ rule }),
    deactivateRule: deactivatePersonalCompositeScreenTimeRule,
  };
}
