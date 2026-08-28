import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_MONEY_APP_CONTROL_SETTINGS,
  normalizeMoneyAppControlSettings,
  type MoneyAppControlSettings,
} from '../domain/moneyAppControl';

const STORAGE_KEY = 'kwilt:money:app-control:v1';
let currentSettings = DEFAULT_MONEY_APP_CONTROL_SETTINGS;
let loaded = false;

function emit(settings: MoneyAppControlSettings) {
  currentSettings = settings;
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

/**
 * Removes the pre-consolidation Money-owned Screen Time policy store.
 * The caller must clear each native selection before invoking this operation.
 */
export async function retireMoneyAppControlSettings(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  loaded = true;
  emit(DEFAULT_MONEY_APP_CONTROL_SETTINGS);
}

export function resetMoneyAppControlStorageForTests(): void {
  loaded = false;
  currentSettings = DEFAULT_MONEY_APP_CONTROL_SETTINGS;
}
