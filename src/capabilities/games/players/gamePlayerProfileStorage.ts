import AsyncStorage from '@react-native-async-storage/async-storage';
import { gamePlayerProfileFromRow, gamePlayerProfileToRow, type GamePlayerProfile, type GamePlayerProfileRow } from './gamePlayerProfile';

const keyFor = (userId: string) => `kwilt-games.player-profile.v1.${userId}`;

export const gamePlayerProfileStorage = {
  async load(userId: string): Promise<GamePlayerProfile | null> {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    try {
      const row = JSON.parse(raw) as GamePlayerProfileRow;
      if (row.user_id !== userId) return null;
      return gamePlayerProfileFromRow(row);
    } catch { return null; }
  },
  save(userId: string, profile: GamePlayerProfile) {
    if (profile.userId !== userId) throw new Error('Cannot cache another player profile.');
    return AsyncStorage.setItem(keyFor(userId), JSON.stringify(gamePlayerProfileToRow(profile)));
  },
  remove(userId: string) { return AsyncStorage.removeItem(keyFor(userId)); },
};
