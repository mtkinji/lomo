import AsyncStorage from '@react-native-async-storage/async-storage';
import { isExistingKwiltInstallation } from './capabilityDiscovery';

const MAIN_APP_STORAGE_KEY = 'kwilt-store';
const INSTALL_ID_STORAGE_KEY = 'kwilt-install-id-v1';

// index.ts imports this before App, so these reads enter AsyncStorage's queue
// before app hydration or startup services can create either marker.
export const existingInstallationAtStartup = AsyncStorage.multiGet([
  MAIN_APP_STORAGE_KEY,
  INSTALL_ID_STORAGE_KEY,
])
  .then((entries) => isExistingKwiltInstallation(entries[0]?.[1] ?? null, entries[1]?.[1] ?? null))
  .catch(() => true);
