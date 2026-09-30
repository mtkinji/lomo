import type { MeaningfulFirstSettings } from '../../../services/screenTimeProtection';

export function realStepExplanation(settings: MeaningfulFirstSettings): string {
  const actions = settings.qualifyingActions.map((action) => {
    if (action === 'activity_completed') return 'completing a to-do';
    if (action === 'activity_progress_recorded') return 'recording progress on a to-do';
    return `completing a Focus session of at least ${settings.minFocusMinutes} minutes`;
  });
  return `What counts: ${actions.join(' or ')}.`;
}
