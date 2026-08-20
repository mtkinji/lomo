import AsyncStorage from '@react-native-async-storage/async-storage';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

const VOICE_GUIDE_KEY = 'kwilt.recipe-cook-mode.voice-guide.v1';
const FOOD_MEAL_LOOP_COOK_KEY = 'kwilt.recipe-cook-mode.food-meal-loop.v1';
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
    async hasSeenFoodMealLoopCookGuide(identityId: string): Promise<boolean> {
      if (!identityId.trim()) return false;
      try {
        return (await storage.getItem(`${FOOD_MEAL_LOOP_COOK_KEY}:${identityId}`)) === ACKNOWLEDGED;
      } catch {
        return false;
      }
    },
    async markFoodMealLoopCookGuideSeen(identityId: string): Promise<void> {
      if (!identityId.trim()) return;
      await storage.setItem(`${FOOD_MEAL_LOOP_COOK_KEY}:${identityId}`, ACKNOWLEDGED);
    },
  };
}

export const cookModeEducationCache = createCookModeEducationCache(AsyncStorage);
