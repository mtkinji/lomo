import { developmentNotificationLogFilters } from './developmentNotificationLogFilters';

describe('development notification log filters', () => {
  it('hides the known entitlement-less Simulator registration banner', () => {
    expect(developmentNotificationLogFilters({ isDev: true, isDevice: false })).toEqual([
      '[expo-notifications] Error reading persisted server registration info',
    ]);
  });

  it('keeps the diagnostic visible on physical devices and production builds', () => {
    expect(developmentNotificationLogFilters({ isDev: true, isDevice: true })).toEqual([]);
    expect(developmentNotificationLogFilters({ isDev: false, isDevice: false })).toEqual([]);
  });
});
