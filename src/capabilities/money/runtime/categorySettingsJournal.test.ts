import { createCategorySettingsJournal } from './categorySettingsJournal';
import type { CategorySettingsRequest } from '../domain/categorySettingsCommand';

const request: CategorySettingsRequest = {
  schemaVersion: 1, requestId: '10000000-0000-4000-8000-000000000001',
  actorUserId: '10000000-0000-4000-8000-000000000002', categoryId: '10000000-0000-4000-8000-000000000003',
  expectedCategoryUpdatedAt: '2026-11-01T10:00:00Z', expectedPlanUpdatedAt: '2026-11-01T10:00:00Z',
  settings: { name: 'Household', budgetCents: 50000, fundingRhythm: 'monthly', rolloverEnabled: false,
    rolloverPolicy: null, planRole: 'flexible', expectedNeedCents: null, expectedNeedDueMonth: null }, governance: null,
};
function setup() {
  const rows = new Map<string, string>();
  const adapter = {
    getItem: jest.fn(async (key: string) => rows.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { rows.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { rows.delete(key); }),
  };
  return { rows, adapter, journal: createCategorySettingsJournal(adapter) };
}
describe('category settings request journal', () => {
  it('restores the exact request across controller lifetimes and isolates accounts', async () => {
    const { adapter, journal } = setup();
    await journal.save(request);
    const restored = createCategorySettingsJournal(adapter);
    expect(await restored.load(request.actorUserId, request.categoryId)).toEqual(request);
    expect(await restored.load('10000000-0000-4000-8000-000000000004', request.categoryId)).toBeNull();
    await restored.remove(request.actorUserId, request.categoryId);
    expect(await restored.load(request.actorUserId, request.categoryId)).toBeNull();
  });
  it('does not treat corrupted storage as permission to replace an unresolved request', async () => {
    const { adapter, journal } = setup();
    adapter.getItem.mockResolvedValue('{broken');
    await expect(journal.load(request.actorUserId, request.categoryId)).rejects.toThrow('pending save');
    expect(adapter.removeItem).not.toHaveBeenCalled();
  });
  it('rejects an envelope belonging to another account or category', async () => {
    const { adapter, journal } = setup();
    adapter.getItem.mockResolvedValue(JSON.stringify({ ...request, actorUserId: '10000000-0000-4000-8000-000000000004' }));
    await expect(journal.load(request.actorUserId, request.categoryId)).rejects.toThrow('pending save');
  });
});
