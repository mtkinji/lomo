import {
  canSavePersonalRule,
  classifyFamilyScreenTimeAction,
  classifyPersonalRuleAccess,
} from './screenTimeAccessPolicy';

const conditions = {
  focus: { id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const },
  time: { id: 'time', type: 'time_of_day' as const, operator: 'after' as const, minuteOfDay: 480 },
  usage: { id: 'usage', type: 'daily_usage' as const, operator: 'reaches' as const, minutes: 30 },
  step: { id: 'step', type: 'real_step_complete' as const, operator: 'is' as const },
};

it('keeps unlimited one-condition Focus, time, and daily-usage rules Free', () => {
  expect(classifyPersonalRuleAccess({ conditions: [conditions.focus] })).toBe('free_basic');
  expect(classifyPersonalRuleAccess({ conditions: [conditions.time] })).toBe('free_basic');
  expect(classifyPersonalRuleAccess({ conditions: [conditions.usage] })).toBe('free_basic');
});

it('classifies compound and Kwilt-linked personal rules as Pro', () => {
  expect(classifyPersonalRuleAccess({ conditions: [conditions.focus, conditions.time] })).toBe('pro_advanced');
  expect(classifyPersonalRuleAccess({ conditions: [conditions.step] })).toBe('pro_advanced');
});

it('allows Free to deactivate a dormant advanced rule but not reactivate it', () => {
  expect(canSavePersonalRule({ rule: { enabled: false, conditions: [conditions.step] }, isPro: false })).toBe(true);
  expect(canSavePersonalRule({ rule: { enabled: true, conditions: [conditions.step] }, isPro: false })).toBe(false);
});

it('keeps family safety-reducing actions Free', () => {
  expect(classifyFamilyScreenTimeAction('release')).toBe('always_allowed');
  expect(classifyFamilyScreenTimeAction('cleanup')).toBe('always_allowed');
  expect(classifyFamilyScreenTimeAction('tighten')).toBe('requires_pro');
  expect(classifyFamilyScreenTimeAction('override')).toBe('requires_pro');
});
