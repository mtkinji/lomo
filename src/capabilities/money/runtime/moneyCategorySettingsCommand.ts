import { categorySettingsRequestBody, categorySettingsRequestKey, parseCategorySettingsRequest,
  UNKNOWN_CATEGORY_SAVE, type CategorySettingsOutcome, type CategorySettingsRequest } from '../domain/categorySettingsCommand';
import type { CategorySettingsRemote } from '../data/categorySettingsRepository';

export type CategorySettingsJournal = {
  load: (actorUserId: string, categoryId: string) => Promise<CategorySettingsRequest | null>;
  save: (request: CategorySettingsRequest) => Promise<void>;
  remove: (actorUserId: string, categoryId: string) => Promise<void>;
};

// Survives provider remounts so two views cannot race to replace the same journal entry.
const inFlight = new Map<string, { body: string; promise: Promise<CategorySettingsOutcome> }>();
const previousSaveMessage = 'Resolve the previous save before changing these settings.';

export function createMoneyCategorySettingsCommand(journal: CategorySettingsJournal, remote: CategorySettingsRemote) {
  async function perform(request: CategorySettingsRequest): Promise<CategorySettingsOutcome> {
    const pending = await journal.load(request.actorUserId, request.categoryId);
    if (pending && categorySettingsRequestBody(pending) !== categorySettingsRequestBody(request)) throw new Error(previousSaveMessage);
    if (!pending) await journal.save(request);
    const clear = () => journal.remove(request.actorUserId, request.categoryId).catch(() => undefined);
    if (pending) {
      try {
        const receipt = await remote.findReceipt(request);
        if (receipt) { await clear(); return 'outcome' in receipt ? receipt : { outcome: 'confirmed', receipt }; }
      } catch {
        // Replaying an identical persisted request is safe at the server boundary.
      }
    }
    let result: CategorySettingsOutcome;
    try { result = await remote.send(request); }
    catch { result = { outcome: 'unknown', message: UNKNOWN_CATEGORY_SAVE }; }
    if (pending && result.outcome === 'rejected' && !result.resolvesPending) {
      result = { outcome: 'unknown', message: UNKNOWN_CATEGORY_SAVE };
    }
    if (result.outcome === 'unknown') {
      try {
        const receipt = await remote.findReceipt(request);
        if (receipt) result = 'outcome' in receipt ? receipt : { outcome: 'confirmed', receipt };
      } catch { /* Keep the original request for an explicit retry. */ }
    }
    if (result.outcome !== 'unknown') await clear();
    return result;
  }
  return {
    loadPending: journal.load,
    async execute(input: CategorySettingsRequest): Promise<CategorySettingsOutcome> {
      // Freeze the payload before the first await; UI draft edits cannot alter a retry.
      const request = parseCategorySettingsRequest(JSON.parse(JSON.stringify(input)));
      const key = categorySettingsRequestKey(request);
      const body = categorySettingsRequestBody(request);
      const active = inFlight.get(key);
      if (active) {
        if (active.body !== body) throw new Error(previousSaveMessage);
        return active.promise;
      }
      const promise = perform(request).finally(() => {
        if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
      });
      inFlight.set(key, { body, promise });
      return promise;
    },
  };
}
