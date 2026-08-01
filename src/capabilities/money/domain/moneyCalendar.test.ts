import { getLocalMoneyDayId, getLocalMoneyPeriodId } from './moneyCalendar';

describe('getLocalMoneyPeriodId', () => {
  it('uses the customer local month after UTC has crossed into the next month', () => {
    const localJuly = new Date(2026, 6, 31, 18, 28, 57);
    jest.spyOn(localJuly, 'toISOString').mockReturnValue('2026-08-01T00:28:57.000Z');

    expect(getLocalMoneyPeriodId(localJuly)).toBe('2026-07');
    expect(getLocalMoneyDayId(localJuly)).toBe('2026-07-31');
  });
});
