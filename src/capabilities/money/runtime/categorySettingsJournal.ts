import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseCategorySettingsRequest, type CategorySettingsRequest } from '../domain/categorySettingsCommand';
import type { CategorySettingsJournal } from './moneyCategorySettingsCommand';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
const keyFor = (actor: string, category: string) => `kwilt:money:category-settings:v1:${encodeURIComponent(actor)}:${encodeURIComponent(category)}`;

export function createCategorySettingsJournal(storage: Storage): CategorySettingsJournal {
  return {
    async load(actorUserId, categoryId) {
      const raw = await storage.getItem(keyFor(actorUserId, categoryId));
      if (raw === null) return null;
      try {
        const request = parseCategorySettingsRequest(JSON.parse(raw));
        if (request.actorUserId !== actorUserId || request.categoryId !== categoryId) throw new Error('Wrong request scope');
        return request;
      } catch {
        // Losing this ID could replay an already committed change as a new operation.
        throw new Error('The pending save could not be read on this device. Contact support to check it before saving again.');
      }
    },
    async save(request: CategorySettingsRequest) {
      const valid = parseCategorySettingsRequest(request);
      await storage.setItem(keyFor(valid.actorUserId, valid.categoryId), JSON.stringify(valid));
    },
    async remove(actorUserId, categoryId) {
      await storage.removeItem(keyFor(actorUserId, categoryId));
    },
  };
}

export const categorySettingsJournal = createCategorySettingsJournal(AsyncStorage);
