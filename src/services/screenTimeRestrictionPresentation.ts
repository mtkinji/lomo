import type { ScreenTimeRestrictionReason } from './screenTimeProtection';
import { routeForScreenTimeShieldReason } from './screenTimeShieldHandoff';

export type ActiveScreenTimeRestriction = {
  id: string;
  reason: ScreenTimeRestrictionReason | 'family_prerequisite' | 'focus';
  label: string | null;
};

export type ScreenTimeShieldPresentation = {
  leadReason: ActiveScreenTimeRestriction['reason'];
  title: string;
  subtitle: string;
  buttonLabel: string;
  destination: string;
};

const priority = (reason: ActiveScreenTimeRestriction['reason']): number => {
  if (reason === 'focus_session_active' || reason === 'focus') return 400;
  if (reason === 'family_prerequisite') return 300;
  if (reason.startsWith('money_')) return 200;
  if (reason === 'personal_usage_limit_reached' || reason === 'personal_composite_rule') return 150;
  if (reason === 'meaningful_first_locked' || reason === 'meaningful_first_bypass') return 100;
  return 0;
};

const numberWord = (count: number): string => {
  if (count === 2) return 'Two';
  if (count === 3) return 'Three';
  if (count === 4) return 'Four';
  return String(count);
};

const lowerInitial = (value: string): string => value
  ? `${value.charAt(0).toLocaleLowerCase()}${value.slice(1)}`
  : value;

const upperInitial = (value: string): string => value
  ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`
  : value;

const nextAction = (restriction: ActiveScreenTimeRestriction): string => {
  if (restriction.reason === 'focus_session_active' || restriction.reason === 'focus') {
    return 'return to Focus in Kwilt';
  }
  if (restriction.reason === 'family_prerequisite') {
    return lowerInitial(restriction.label?.trim() || 'complete the family requirement');
  }
  if (restriction.reason.startsWith('money_')) {
    return `review ${restriction.label?.trim() || 'the required category'} in Kwilt Money`;
  }
  if (restriction.reason === 'meaningful_first_bypass') return 'wait for the Kwilt pause to end';
  if (restriction.reason === 'personal_usage_limit_reached') {
    return 'wait until tomorrow or change this limit in Kwilt';
  }
  return 'complete a to-do, record progress, or finish Focus in Kwilt';
};

const singleCopy = (
  restriction: ActiveScreenTimeRestriction,
  appName: string,
): Pick<ScreenTimeShieldPresentation, 'title' | 'subtitle' | 'buttonLabel'> => {
  if (restriction.reason === 'focus_session_active' || restriction.reason === 'focus') {
    return { title: 'Stay with your focus.', subtitle: `End Focus in Kwilt to open ${appName}.`, buttonLabel: 'Open Focus' };
  }
  if (restriction.reason === 'family_prerequisite') {
    return { title: 'One family agreement applies.', subtitle: `${nextAction(restriction)} to open ${appName}.`, buttonLabel: 'Open Screen Time' };
  }
  if (restriction.reason.startsWith('money_')) {
    return { title: 'Review this category first.', subtitle: `Review ${restriction.label?.trim() || 'this category'} in Kwilt Money to open ${appName}.`, buttonLabel: 'Review in Money' };
  }
  if (restriction.reason === 'meaningful_first_bypass') {
    return { title: 'Your Kwilt pause is active.', subtitle: 'Wait for this short pause to end, or open Kwilt to change it.', buttonLabel: 'Open Screen Time' };
  }
  if (restriction.reason === 'personal_usage_limit_reached') {
    return {
      title: 'That’s today’s limit.',
      subtitle: `You can use ${appName} again tomorrow, or change this rule in Kwilt.`,
      buttonLabel: 'Open Screen Time',
    };
  }
  if (restriction.reason === 'personal_composite_rule') {
    return {
      title: 'This Screen Time rule is active.',
      subtitle: `Open Kwilt to review what needs to change before using ${appName}.`,
      buttonLabel: 'Open Screen Time',
    };
  }
  return {
    title: 'Do one thing first.',
    subtitle: `Complete a to-do, record progress, or finish Focus in Kwilt to open ${appName} today.`,
    buttonLabel: 'Open Today',
  };
};

export function projectScreenTimeShieldPresentation(params: {
  appName: string;
  restrictions: ActiveScreenTimeRestriction[];
}): ScreenTimeShieldPresentation {
  const ordered = [...params.restrictions].sort((left, right) => (
    priority(right.reason) - priority(left.reason) || left.id.localeCompare(right.id)
  ));
  const lead = ordered[0] ?? { id: 'default', reason: 'meaningful_first_locked' as const, label: null };
  const destination = routeForScreenTimeShieldReason(lead.reason);
  if (ordered.length <= 1) {
    return { leadReason: lead.reason, ...singleCopy(lead, params.appName), destination };
  }

  const remaining = ordered.length - 2;
  const suffix = remaining > 0 ? ` ${remaining} more rules also apply.` : '';
  return {
    leadReason: lead.reason,
    title: `${numberWord(ordered.length)} rules are pausing ${params.appName}.`,
    subtitle: `${upperInitial(nextAction(lead))}. Also ${nextAction(ordered[1])}.${suffix}`,
    buttonLabel: singleCopy(lead, params.appName).buttonLabel,
    destination,
  };
}
