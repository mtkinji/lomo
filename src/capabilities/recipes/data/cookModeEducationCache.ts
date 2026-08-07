import AsyncStorage from '@react-native-async-storage/async-storage';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

const VOICE_GUIDE_KEY = 'kwilt.recipe-cook-mode.voice-guide.v1';
const ACKNOWLEDGED = 'acknowledged';

export function createCookModeEducationCache(storage: Storage) {
  return {
    async hasAcknowledgedVoiceGuide(): Promise<boolean> {
      try {
        return (await storage.getItem(VOICE_GUIDE_KEY)) === ACKNOWLEDGED;
      } catch {
        return false;
      }
    },
    async acknowledgeVoiceGuide(): Promise<void> {
      await storage.setItem(VOICE_GUIDE_KEY, ACKNOWLEDGED);
    },
  };
}

export const cookModeEducationCache = createCookModeEducationCache(AsyncStorage);
