import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'kwilt:money:privacy-lock:v1';
export const MONEY_PRIVACY_RELOCK_AFTER_MS = 30_000;

export type MoneyPrivacyLockSettings = { enabled: boolean; lastUpdated?: string };
export type MoneyPrivacyLockAvailability = { available: boolean; label: string; reason?: string };

const DEFAULT_SETTINGS: MoneyPrivacyLockSettings = { enabled: false };
type Listener = (settings: MoneyPrivacyLockSettings) => void;
let currentSettings = DEFAULT_SETTINGS;
let hasLoaded = false;
const listeners = new Set<Listener>();

function normalizeSettings(value: unknown): MoneyPrivacyLockSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const raw = value as { enabled?: unknown; lastUpdated?: unknown };
  return {
    enabled: raw.enabled === true,
    ...(typeof raw.lastUpdated === 'string' && raw.lastUpdated.trim() ? { lastUpdated: raw.lastUpdated.trim() } : {}),
  };
}

function emit(settings: MoneyPrivacyLockSettings) {
  currentSettings = settings;
  listeners.forEach((listener) => listener(settings));
}

export async function loadMoneyPrivacyLockSettings(): Promise<MoneyPrivacyLockSettings> {
  if (hasLoaded) return currentSettings;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    hasLoaded = true;
    emit(normalizeSettings(raw ? JSON.parse(raw) : null));
  } catch {
    hasLoaded = true;
    emit(DEFAULT_SETTINGS);
  }
  return currentSettings;
}

export async function saveMoneyPrivacyLockSettings(enabled: boolean): Promise<MoneyPrivacyLockSettings> {
  await loadMoneyPrivacyLockSettings();
  const next = { enabled, lastUpdated: new Date().toISOString() };
  emit(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function useMoneyPrivacyLockSettings() {
  const [settings, setSettings] = useState(currentSettings);
  const [loaded, setLoaded] = useState(hasLoaded);
  useEffect(() => {
    listeners.add(setSettings);
    void loadMoneyPrivacyLockSettings().finally(() => setLoaded(true));
    return () => { listeners.delete(setSettings); };
  }, []);
  const save = useCallback((enabled: boolean) => saveMoneyPrivacyLockSettings(enabled), []);
  return { settings, loaded, save };
}

export async function getMoneyPrivacyLockAvailability(): Promise<MoneyPrivacyLockAvailability> {
  if (Platform.OS === 'web') return { available: false, label: 'device lock', reason: 'Privacy lock is available in the mobile app.' };
  const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
  const isEnrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
  const types: LocalAuthentication.AuthenticationType[] = await LocalAuthentication
    .supportedAuthenticationTypesAsync()
    .catch((): LocalAuthentication.AuthenticationType[] => []);
  const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ? Platform.OS === 'ios' ? 'Face ID' : 'face unlock'
    : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint unlock'
      : 'device lock';
  if (!hasHardware) return { available: false, label, reason: 'This device does not support biometric authentication.' };
  if (!isEnrolled) return { available: false, label, reason: `Set up ${label} in device settings before turning this on.` };
  return { available: true, label };
}

export function authenticateMoneyPrivacyLock() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Kwilt Money',
    fallbackLabel: 'Use Passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'strong',
  });
}
