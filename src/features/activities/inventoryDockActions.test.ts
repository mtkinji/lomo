import {
  openActivitiesInventorySearch,
  scrollActiveInventoryToTop,
} from './inventoryDockActions';

describe('inventory dock actions', () => {
  it('opens global Search with Activities as the initial scope', () => {
    const openGlobalSearch = jest.fn();

    openActivitiesInventorySearch(openGlobalSearch);

    expect(openGlobalSearch).toHaveBeenCalledWith({ initialScope: 'activities' });
  });

  it.each([
    ['grouped', true, false, 'scrollGrouped'],
    ['manual', false, true, 'requestManual'],
    ['standard', false, false, 'scrollStandard'],
  ] as const)(
    'routes %s inventory to its one authoritative scroll implementation',
    (_name, groupingApplied, manualOrderEffective, expectedCallback) => {
      const callbacks = {
        scrollGrouped: jest.fn(),
        requestManual: jest.fn(),
        scrollStandard: jest.fn(),
      };

      scrollActiveInventoryToTop({
        groupingApplied,
        manualOrderEffective,
        ...callbacks,
      });

      expect(callbacks[expectedCallback]).toHaveBeenCalledTimes(1);
      expect(
        Object.values(callbacks).reduce((total, callback) => total + callback.mock.calls.length, 0),
      ).toBe(1);
    },
  );
});
