import type { MoneySnapshot } from '../data/moneySnapshot';
import type { CategorySettingsRequest } from '../domain/categorySettingsCommand';
import { createMoneyBudgetActionCommand, MoneyBudgetOutcomeUnknownError } from './moneyBudgetActionCommand';

const actor = '10000000-0000-4000-8000-000000000001';
const categoryId = '10000000-0000-4000-8000-000000000002';
const requestId = '10000000-0000-8000-8000-000000000003';
const version = '2026-11-01T10:00:00.000Z';
const input = { requestId: 'chat:proposal-1', month: '2026-11', categoryId, expectedUpdatedAt: version, plannedCents: 60000 };
const category = { id: 'household', sourceId: categoryId, name: 'Household', plannedCents: 50000,
  updatedAt: version, categoryUpdatedAt: version, planUpdatedAt: version, fundingRhythm: 'monthly',
  planRole: 'protected', rolloverEnabled: false, rolloverPolicy: null, expectedNeed: null };
const request: CategorySettingsRequest = { schemaVersion: 1, actorUserId: actor, requestId, categoryId,
  expectedCategoryUpdatedAt: version, expectedPlanUpdatedAt: version, governance: null,
  settings: { name: category.name, budgetCents: 60000, fundingRhythm: 'monthly', planRole: 'protected',
    rolloverEnabled: false, rolloverPolicy: null, expectedNeedCents: null, expectedNeedDueMonth: null } };
const confirmed = { outcome: 'confirmed' as const, receipt: { requestId, categoryId, confirmedAt: '2026-11-01T10:01:00Z',
  categoryUpdatedAt: '2026-11-01T10:01:00Z', planUpdatedAt: '2026-11-01T10:01:00Z', activeVersionId: null, changes: request.settings } };
function setup() {
  const deps = {
    getActor: jest.fn().mockResolvedValue(actor), requestIdFor: jest.fn().mockResolvedValue(requestId),
    findOperation: jest.fn().mockResolvedValue(null),
    command: { loadPending: jest.fn().mockResolvedValue(null), execute: jest.fn().mockResolvedValue(confirmed) },
    loadSnapshot: jest.fn().mockResolvedValue({ generatedAt: '2026-11-01T10:00:00Z', categories: [category] } as unknown as MoneySnapshot),
    preview: jest.fn().mockResolvedValue(null),
  };
  return { deps, command: createMoneyBudgetActionCommand(deps) };
}

test('Chat saves one atomic request and does not load a snapshot after confirmation', async () => {
  const { deps, command } = setup();
  deps.loadSnapshot.mockResolvedValueOnce({ generatedAt: '2026-11-01T10:00:00Z', categories: [category] }).mockRejectedValue(new Error('offline after commit'));
  await expect(command(input)).resolves.toMatchObject({ categoryId, name: 'Household', plannedCents: 60000, updatedAt: confirmed.receipt.planUpdatedAt });
  expect(deps.loadSnapshot).toHaveBeenCalledTimes(1);
  expect(deps.command.execute).toHaveBeenCalledWith(request);
  expect(deps.preview).toHaveBeenCalledWith(actor, category, 60000);
});

test('recovers the original server receipt after relaunch or another edit, without rebuilding a request', async () => {
  const { deps, command } = setup();
  deps.findOperation.mockResolvedValue({ request, result: confirmed });
  deps.loadSnapshot.mockRejectedValue(new Error('offline snapshot'));
  await expect(command(input)).resolves.toMatchObject({ plannedCents: 60000 });
  expect(deps.loadSnapshot).not.toHaveBeenCalled();
  expect(deps.preview).not.toHaveBeenCalled();
  expect(deps.command.execute).not.toHaveBeenCalled();
});

test('replays the exact locally pending request before checking a now-stale category', async () => {
  const { deps, command } = setup();
  deps.command.loadPending.mockResolvedValue(request);
  deps.loadSnapshot.mockRejectedValue(new Error('do not rebase'));
  await expect(command(input)).resolves.toMatchObject({ plannedCents: 60000 });
  expect(deps.command.execute).toHaveBeenCalledWith(request);
  expect(deps.loadSnapshot).not.toHaveBeenCalled();
});

test('an uncertain save stays recoverable and a later invocation can resolve it', async () => {
  const { deps, command } = setup();
  deps.command.execute.mockResolvedValueOnce({ outcome: 'unknown', message: 'Check save' });
  await expect(command(input)).rejects.toBeInstanceOf(MoneyBudgetOutcomeUnknownError);
  deps.findOperation.mockResolvedValue({ request, result: confirmed });
  await expect(command(input)).resolves.toMatchObject({ plannedCents: 60000 });
  expect(deps.command.execute).toHaveBeenCalledTimes(1);
});

test('unavailable recovery cannot cause a replacement write', async () => {
  const { deps, command } = setup();
  deps.findOperation.mockRejectedValue(new Error('offline'));
  await expect(command(input)).rejects.toBeInstanceOf(MoneyBudgetOutcomeUnknownError);
  expect(deps.loadSnapshot).not.toHaveBeenCalled();
  expect(deps.command.execute).not.toHaveBeenCalled();
});

test('preserves another pending drawer save instead of replacing it', async () => {
  const { deps, command } = setup();
  deps.command.loadPending.mockResolvedValue({ ...request, requestId: '10000000-0000-4000-8000-000000000009' });
  await expect(command(input)).rejects.toThrow('previous save');
  expect(deps.command.execute).not.toHaveBeenCalled();
});

test.each([
  { ...input, expectedUpdatedAt: '2026-10-31T10:00:00Z' },
  { ...input, month: '2026-10' },
])('rejects stale proposals before preview or save', async (stale) => {
  const { deps, command } = setup();
  await expect(command(stale)).rejects.toThrow('money_target_stale');
  expect(deps.command.execute).not.toHaveBeenCalled();
  expect(deps.preview).not.toHaveBeenCalled();
});

test('rejects a recovered receipt for different settings', async () => {
  const { deps, command } = setup();
  deps.findOperation.mockResolvedValue({ request: { ...request, settings: { ...request.settings, budgetCents: 70000 } }, result: confirmed });
  await expect(command(input)).rejects.toBeInstanceOf(MoneyBudgetOutcomeUnknownError);
  expect(deps.command.execute).not.toHaveBeenCalled();
});

test('clears a matching pending journal after server recovery so the next Chat edit can proceed', async () => {
  const { deps, command } = setup();
  deps.findOperation.mockResolvedValue({ request, result: confirmed });
  deps.command.loadPending.mockResolvedValue(request);
  await expect(command(input)).resolves.toMatchObject({ plannedCents: 60000 });
  expect(deps.command.execute).toHaveBeenCalledWith(request);
});
