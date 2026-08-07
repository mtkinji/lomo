import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { buildMealPlanningReminderActivity, MealPlanningReminderOfferDrawer, nextMealPlanningReminderAt } from './MealPlanningReminderOfferDrawer';

describe('Meal Planning reminder offer', () => {
  it('starts off and reveals weekly timing only after selection', () => {
    const screen = renderWithProviders(<MealPlanningReminderOfferDrawer visible onClose={jest.fn()} onCreate={jest.fn()} />);
    expect(screen.queryByLabelText('Reminder time')).toBeNull();
    fireEvent.press(screen.getByText('Every week'));
    expect(screen.getByLabelText('Reminder time')).toBeTruthy();
    expect(screen.getByLabelText('Sunday')).toBeTruthy();
  });

  it('creates Activity-owned one-time and recurring reminders', () => {
    const common = { householdId: 'household', reminderAt: '2026-08-09T17:00:00.000Z', nowIso: '2026-08-06T12:00:00.000Z' };
    const once = buildMealPlanningReminderActivity({ ...common, id: 'once', mode: 'once' });
    const weekly = buildMealPlanningReminderActivity({ ...common, id: 'weekly', mode: 'weekly' });
    expect(once).toEqual(expect.objectContaining({ repeatRule: undefined, actionCardBinding: expect.objectContaining({ providerId: 'meal_planning' }) }));
    expect(weekly).toEqual(expect.objectContaining({ repeatRule: 'weekly', repeatBasis: 'scheduled' }));
  });

  it('moves a past one-time clock to tomorrow rather than a week away', () => {
    const result = new Date(nextMealPlanningReminderAt('once', 0, '17:00', new Date(2026, 7, 6, 18))!);
    expect([result.getDate(), result.getHours()]).toEqual([7, 17]);
  });
});
