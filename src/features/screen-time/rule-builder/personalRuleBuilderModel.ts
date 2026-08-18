import type { PersonalScreenTimeRuleKind } from '../../../services/screenTimeProtection';

export type PersonalRuleBuilderEntry = 'inventory' | 'contextual';
export type PersonalRuleBuilderStep = 'apps' | 'behavior' | 'review';

export function getPersonalRuleBuilderStep(params: {
  kind: PersonalScreenTimeRuleKind | null;
  targetCount: number;
  appsConfirmed: boolean;
}): PersonalRuleBuilderStep {
  if (params.targetCount === 0 || !params.appsConfirmed) return 'apps';
  return params.kind ? 'review' : 'behavior';
}

export function getPersonalRuleBuilderCopy(params: {
  entry: PersonalRuleBuilderEntry;
  kind: PersonalScreenTimeRuleKind | null;
  step: PersonalRuleBuilderStep;
  targetLabel?: string;
  limitMinutes?: number;
  suggestedAppLabel?: string;
}): { title: string; question: string; support: string | null } {
  if (params.entry === 'contextual' && params.kind === 'daily_limit') {
    const minutes = params.limitMinutes ?? 10;
    return {
      title: 'Set a daily app limit',
      question: params.suggestedAppLabel
        ? `Choose ${params.suggestedAppLabel} in Screen Time`
        : 'Which apps should have this limit?',
      support: `It will pause after ${minutes} minute${minutes === 1 ? '' : 's'} of use each day.`,
    };
  }
  if (params.step === 'review') {
    return {
      title: params.entry === 'contextual' && params.kind === 'focus'
        ? 'Protect Focus'
        : params.entry === 'contextual' && params.kind === 'real_step'
          ? 'Complete something in Kwilt first'
          : 'Add rule',
      question: 'Your rule is ready.',
      support: 'You can change either answer before adding it.',
    };
  }
  if (params.entry === 'contextual' && params.kind === 'focus') {
    return {
      title: 'Protect Focus',
      question: 'Which apps should pause during Focus?',
      support: 'They’ll be available again when Focus ends.',
    };
  }
  if (params.entry === 'contextual' && params.kind === 'real_step') {
    return {
      title: 'Complete something in Kwilt first',
      question: 'Which apps should unlock afterward?',
      support: 'They’ll unlock after you complete a to-do, record progress, or finish Focus.',
    };
  }
  if (params.targetLabel) {
    return {
      title: 'Add rule',
      question: `When should ${params.targetLabel} be available?`,
      support: null,
    };
  }
  return {
    title: 'Add rule',
    question: 'Which apps should this rule manage?',
    support: 'You’ll decide when they’re available next.',
  };
}

export function personalRuleBehaviorLabel(kind: PersonalScreenTimeRuleKind, limitMinutes = 10): string {
  if (kind === 'daily_limit') {
    return `Pause after ${limitMinutes} minute${limitMinutes === 1 ? '' : 's'} each day`;
  }
  return kind === 'focus'
    ? 'Pause until Focus ends'
    : 'Unlock after a to-do, progress update, or Focus';
}

export function personalRuleSentence(
  kind: PersonalScreenTimeRuleKind,
  targetLabel: string,
  limitMinutes = 10,
): string {
  if (kind === 'daily_limit') {
    return `${targetLabel} will pause after ${limitMinutes} minute${limitMinutes === 1 ? '' : 's'} of use each day.`;
  }
  return kind === 'focus'
    ? `${targetLabel} will pause while Focus is running.`
    : `${targetLabel} will unlock after you complete a to-do, record progress, or finish Focus.`;
}
