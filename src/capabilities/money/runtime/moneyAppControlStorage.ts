import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MONEY_APP_CONTROL_SETTINGS,
  normalizeMoneyAppControlSettings,
  type MoneyAppControlSettings,
} from '../domain/moneyAppControl';

const STORAGE_KEY = 'kwilt:money:app-control:v1';
type Listener = (settings: MoneyAppControlSettings) => void;

let currentSettings = DEFAULT_MONEY_APP_CONTROL_SETTINGS;
let loaded = false;
const listeners = new Set<Listener>();

function emit(settings: MoneyAppControlSettings) {
  currentSettings = settings;
  listeners.forEach((listener) => listener(settings));
}

export async function loadMoneyAppControlSettings(): Promise<MoneyAppControlSettings> {
  if (loaded) return currentSettings;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    loaded = true;
    emit(normalizeMoneyAppControlSettings(raw ? JSON.parse(raw) : null));
  } catch {
    loaded = true;
    emit(DEFAULT_MONEY_APP_CONTROL_SETTINGS);
  }
  return currentSettings;
}

export async function saveMoneyAppControlSettings(
  updater: MoneyAppControlSettings | ((settings: MoneyAppControlSettings) => MoneyAppControlSettings),
): Promise<MoneyAppControlSettings> {
  const base = await loadMoneyAppControlSettings();
  const next = normalizeMoneyAppControlSettings(typeof updater === 'function' ? updater(base) : updater);
  const withTimestamp = { ...next, lastUpdated: new Date().toISOString() };
  emit(withTimestamp);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
  return withTimestamp;
}

export function useMoneyAppControlSettings() {
  const [settings, setSettings] = useState(currentSettings);
  const [hasLoaded, setHasLoaded] = useState(loaded);
  useEffect(() => {
    listeners.add(setSettings);
    void loadMoneyAppControlSettings().finally(() => setHasLoaded(true));
    return () => { listeners.delete(setSettings); };
  }, []);
  const save = useCallback((updater: Parameters<typeof saveMoneyAppControlSettings>[0]) => saveMoneyAppControlSettings(updater), []);
  return { settings, loaded: hasLoaded, save };
}
