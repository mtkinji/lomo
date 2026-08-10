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
  it('leads with the more specific Money action and discloses the remaining Kwilt action', () => {
    const result = projectScreenTimeShieldPresentation({
      appName: 'Home Depot',
      restrictions: [
        restriction('default', 'meaningful_first_locked'),
        restriction('money_groceries', 'money_review_required', 'Groceries'),
      ],
    });

    expect(result).toEqual({
      leadReason: 'money_review_required',
      title: 'Two things before Home Depot.',
      subtitle: 'First, review Groceries in Kwilt Money. Then complete a to-do, record progress, or finish Focus in Kwilt.',
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
    expect(result.title).toBe('Four things before YouTube.');
    expect(result.subtitle).toBe('First, return to Focus in Kwilt. Then use Gospel Library for 5 minutes. 2 more rules will still apply.');
    expect(result.buttonLabel).toBe('Open Focus');
    expect(result.destination).toBe('kwilt://focus?source=screen-time');
  });
});
