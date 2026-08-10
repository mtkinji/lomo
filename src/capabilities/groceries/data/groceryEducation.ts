import AsyncStorage from '@react-native-async-storage/async-storage';

const ALREADY_HAVE_COACHMARK_KEY = 'kwilt-groceries-already-have-coachmark-v1';

function keyFor(userId: string | null): string {
  return `${ALREADY_HAVE_COACHMARK_KEY}:${userId ?? 'device'}`;
}

export const groceryEducation = {
  async hasSeenAlreadyHave(userId: string | null): Promise<boolean> {
    return (await AsyncStorage.getItem(keyFor(userId))) === 'seen';
  },

  async markAlreadyHaveSeen(userId: string | null): Promise<void> {
    await AsyncStorage.setItem(keyFor(userId), 'seen');
  },
};
