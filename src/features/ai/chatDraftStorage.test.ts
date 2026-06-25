import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ARC_CREATION_DRAFT_STORAGE_KEY,
  loadArcCreationDraft,
  saveArcCreationDraft,
  type ChatDraft,
} from './chatDraftStorage';

describe('chat draft storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no draft exists', async () => {
    await expect(loadArcCreationDraft()).resolves.toBeNull();
  });

  it('returns null for invalid or incomplete draft payloads', async () => {
    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, JSON.stringify({ input: 'hello' }));

    await expect(loadArcCreationDraft()).resolves.toBeNull();
  });

  it('loads a valid draft payload', async () => {
    const draft: ChatDraft = {
      messages: [{ id: 'm1', role: 'user', content: 'Help me make an Arc.' }],
      input: 'draft input',
      updatedAt: '2026-06-25T00:00:00.000Z',
    };
    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));

    await expect(loadArcCreationDraft()).resolves.toEqual(draft);
  });

  it('persists non-empty drafts', async () => {
    const draft: ChatDraft = {
      messages: [{ id: 'm1', role: 'assistant', content: 'Tell me what matters.' }],
      input: '',
      updatedAt: '2026-06-25T00:00:00.000Z',
    };

    await saveArcCreationDraft(draft);

    await expect(AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY)).resolves.toBe(JSON.stringify(draft));
  });

  it('removes null and empty-message drafts', async () => {
    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, 'existing');

    await saveArcCreationDraft({ messages: [], input: '', updatedAt: '2026-06-25T00:00:00.000Z' });
    await expect(AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY)).resolves.toBeNull();

    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, 'existing');
    await saveArcCreationDraft(null);
    await expect(AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY)).resolves.toBeNull();
  });
});
