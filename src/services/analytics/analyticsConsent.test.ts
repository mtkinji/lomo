import {
  ANALYTICS_CONSENT_VERSION,
  resolveAnalyticsConsent,
  transitionAnalyticsConsent,
  useAnalyticsConsentStore,
} from './analyticsConsent';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('analytics consent policy', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAnalyticsConsentStore.setState({ status: 'unknown', policyVersion: null, hydrated: true });
  });

  it.each([
    ['denied', { status: 'denied', policyVersion: ANALYTICS_CONSENT_VERSION }],
    ['withdrawn', { status: 'withdrawn', policyVersion: ANALYTICS_CONSENT_VERSION }],
  ] as const)('keeps %s preference off', (_label, consent) => {
    expect(resolveAnalyticsConsent(consent)).toEqual({ enabled: false, needsChoice: false });
  });

  it('defaults analytics on before an explicit preference is stored', () => {
    expect(resolveAnalyticsConsent({ status: 'unknown', policyVersion: null })).toEqual({
      enabled: true,
      needsChoice: true,
    });
  });

  it('keeps analytics on for an explicit grant', () => {
    expect(resolveAnalyticsConsent({
      status: 'granted',
      policyVersion: ANALYTICS_CONSENT_VERSION,
    })).toEqual({ enabled: true, needsChoice: false });
  });

  it('does not silently disable an older grant when the disclosure version changes', () => {
    expect(resolveAnalyticsConsent({ status: 'granted', policyVersion: 0 })).toEqual({
      enabled: true,
      needsChoice: true,
    });
  });

  it('preserves a withdrawal when the disclosure version changes', () => {
    expect(resolveAnalyticsConsent({ status: 'withdrawn', policyVersion: 0 })).toEqual({
      enabled: false,
      needsChoice: true,
    });
  });

  it('distinguishes initial denial from withdrawal and can renew consent', () => {
    expect(transitionAnalyticsConsent({ status: 'unknown', policyVersion: null }, false)).toEqual({
      status: 'withdrawn',
      policyVersion: ANALYTICS_CONSENT_VERSION,
    });
    expect(transitionAnalyticsConsent({ status: 'granted', policyVersion: ANALYTICS_CONSENT_VERSION }, false)).toEqual({
      status: 'withdrawn',
      policyVersion: ANALYTICS_CONSENT_VERSION,
    });
    expect(transitionAnalyticsConsent({ status: 'withdrawn', policyVersion: ANALYTICS_CONSENT_VERSION }, true)).toEqual({
      status: 'granted',
      policyVersion: ANALYTICS_CONSENT_VERSION,
    });
  });

  it('persists the explicit choice and restores it across a relaunch hydration', async () => {
    useAnalyticsConsentStore.getState().setEnabled(true);
    await Promise.resolve();
    const persisted = await AsyncStorage.getItem('kwilt-analytics-consent');
    expect(persisted).toContain('"status":"granted"');

    useAnalyticsConsentStore.setState({ status: 'unknown', policyVersion: null, hydrated: false });
    await AsyncStorage.setItem('kwilt-analytics-consent', persisted!);
    await useAnalyticsConsentStore.persist.rehydrate();

    expect(useAnalyticsConsentStore.getState()).toEqual(expect.objectContaining({
      status: 'granted',
      policyVersion: ANALYTICS_CONSENT_VERSION,
      hydrated: true,
    }));
  });
});
