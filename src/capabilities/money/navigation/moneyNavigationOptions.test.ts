import { getMoneyPlaceScreenOptions } from './moneyNavigationOptions';

describe('getMoneyPlaceScreenOptions', () => {
  it('suppresses the native stack animation for the automatic entry handoff', () => {
    expect(getMoneyPlaceScreenOptions({ entryTransition: 'none' })).toEqual({
      animation: 'none',
    });
  });

  it('keeps the native default animation for ordinary Money navigation', () => {
    expect(getMoneyPlaceScreenOptions(undefined)).toEqual({});
    expect(getMoneyPlaceScreenOptions({})).toEqual({});
  });
});
