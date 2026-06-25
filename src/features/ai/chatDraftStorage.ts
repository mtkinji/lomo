import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatMessageRole = 'assistant' | 'user' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
};

export type ChatDraft = {
  messages: ChatMessage[];
  input: string;
  updatedAt: string;
};

export const ARC_CREATION_DRAFT_STORAGE_KEY = 'kwilt-coach-draft:arcCreation:v1';

export async function loadArcCreationDraft(): Promise<ChatDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatDraft;
    if (!parsed || !Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load Kwilt Coach arc draft', err);
    return null;
  }
}

export async function saveArcCreationDraft(draft: ChatDraft | null): Promise<void> {
  try {
    if (!draft || draft.messages.length === 0) {
      await AsyncStorage.removeItem(ARC_CREATION_DRAFT_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Failed to save Kwilt Coach arc draft', err);
  }
}
