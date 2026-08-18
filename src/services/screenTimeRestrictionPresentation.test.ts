import {
  projectScreenTimeShieldPresentation,
  type ActiveScreenTimeRestriction,
} from './screenTimeRestrictionPresentation';

const restriction = (
  id: string,
  reason: ActiveScreenTimeRestriction['reason'],
  label?: string,
): ActiveScreenTimeRestriction => ({ id, reason, label: label ?? null });

describe('projectScreenTimeShieldPresentation', () => {
  it('explains a reached personal daily limit without implying a Kwilt prerequisite', () => {
    expect(projectScreenTimeShieldPresentation({
      appName: 'Instagram',
      restrictions: [restriction('daily', 'personal_usage_limit_reached', 'Daily app limit')],
    })).toMatchObject({
      title: 'That’s today’s limit.',
      subtitle: 'You can use Instagram again tomorrow, or change this rule in Kwilt.',
      buttonLabel: 'Open Screen Time',
      destination: 'kwilt://settings/screen-time',
    });
  });

  it('leads with the more specific Money action without inventing an order for overlapping rules', () => {
    const result = projectScreenTimeShieldPresentation({
      appName: 'Home Depot',
      restrictions: [
        restriction('default', 'meaningful_first_locked'),
        restriction('money_groceries', 'money_review_required', 'Groceries'),
      ],
    });

    expect(result).toEqual({
      leadReason: 'money_review_required',
      title: 'Two rules are pausing Home Depot.',
      subtitle: 'Review Groceries in Kwilt Money. Also complete a to-do, record progress, or finish Focus in Kwilt.',
      buttonLabel: 'Review in Money',
      destination: 'kwilt://money?source=screen-time',
    });
  });

  it('shows the remaining rule after one independent store clears', () => {
    const result = projectScreenTimeShieldPresentation({
      appName: 'Home Depot',
      restrictions: [restriction('default', 'meaningful_first_locked')],
    });

    expect(result).toEqual({
      leadReason: 'meaningful_first_locked',
      title: 'Do one thing first.',
      subtitle: 'Complete a to-do, record progress, or finish Focus in Kwilt to open Home Depot today.',
      buttonLabel: 'Open Today',
      destination: 'kwilt://today?source=screen-time&highlightSuggested=1',
    });
  });

  it('orders active Focus, family, Money, and general Kwilt rules deterministically', () => {
    const result = projectScreenTimeShieldPresentation({
      appName: 'YouTube',
      restrictions: [
        restriction('default', 'meaningful_first_locked'),
        restriction('money_fun', 'money_over_limit', 'Fun'),
        restriction('family_scripture', 'family_prerequisite', 'Use Gospel Library for 5 minutes'),
        restriction('focus', 'focus_session_active'),
      ],
    });

    expect(result.leadReason).toBe('focus_session_active');
    expect(result.title).toBe('Four rules are pausing YouTube.');
    expect(result.subtitle).toBe('Return to Focus in Kwilt. Also use Gospel Library for 5 minutes. 2 more rules also apply.');
    expect(result.buttonLabel).toBe('Open Focus');
    expect(result.destination).toBe('kwilt://focus?source=screen-time');
  });
});
