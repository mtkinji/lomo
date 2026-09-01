import type {
  PersonalCompositeScreenTimeRule,
  PersonalRuleCondition,
} from './personalCompositeScreenTimeRule';

export type PersonalRuleAccessClass = 'free_basic' | 'pro_advanced';

export function classifyPersonalRuleAccess(input: Pick<PersonalCompositeScreenTimeRule, 'conditions'>): PersonalRuleAccessClass {
  if (input.conditions.length !== 1) return 'pro_advanced';
  const type = input.conditions[0]?.type;
  return type === 'focus_active' || type === 'time_of_day' || type === 'daily_usage'
    ? 'free_basic'
    : 'pro_advanced';
}

export function conditionRequiresPro(condition: Pick<PersonalRuleCondition, 'type'>): boolean {
  return condition.type === 'real_step_complete' || condition.type === 'budget';
}

export type FamilyScreenTimeAction =
  | 'read'
  | 'release'
  | 'disable'
  | 'revoke'
  | 'cleanup'
  | 'enroll'
  | 'select'
  | 'deliver'
  | 'create'
  | 'tighten'
  | 'extend'
  | 'override';

export function classifyFamilyScreenTimeAction(action: FamilyScreenTimeAction): 'always_allowed' | 'requires_pro' {
  return ['read', 'release', 'disable', 'revoke', 'cleanup'].includes(action)
    ? 'always_allowed'
    : 'requires_pro';
}

export function canSavePersonalRule(params: {
  rule: Pick<PersonalCompositeScreenTimeRule, 'conditions' | 'enabled'>;
  isPro: boolean;
}): boolean {
  if (!params.rule.enabled) return true;
  return classifyPersonalRuleAccess(params.rule) === 'free_basic' || params.isPro;
}
