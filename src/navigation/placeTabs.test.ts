import { PLACE_TABS } from './placeTabs';

describe('PLACE_TABS', () => {
  it('keeps capability-local roots out of the host place bar', () => {
    expect(PLACE_TABS.map(({ name, label }) => [name, label])).toEqual([
      ['GoalsTab', 'Goals'],
      ['ActivitiesTab', 'To-dos'],
      ['PlanTab', 'Plan'],
      ['MoreTab', 'More'],
    ]);
  });
});
