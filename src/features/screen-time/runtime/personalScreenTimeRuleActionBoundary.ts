import { useAppStore } from '../../../store/useAppStore';
import {
  activatePersonalScreenTimeRule,
  deactivatePersonalScreenTimeRule,
} from '../../../services/screenTimeProtectionRuntime';
import type { PersonalScreenTimeRuleActionBoundary } from '../domain/personalScreenTimeRuleActions';

export function createPersonalScreenTimeRuleActionBoundary(): PersonalScreenTimeRuleActionBoundary {
  return {
    readSettings: () => useAppStore.getState().screenTimeProtection,
    persistSettings: (settings) => useAppStore.getState().setScreenTimeProtection(settings),
    activateRule: (rule) => activatePersonalScreenTimeRule({ rule, focusSessionActive: false }),
    deactivateRule: deactivatePersonalScreenTimeRule,
  };
}
