import type { SupabaseClient } from '@supabase/supabase-js';
import { createCategorySettingsRepository } from './categorySettingsRepository';
import type { CategorySettingsRequest } from '../domain/categorySettingsCommand';

const request: CategorySettingsRequest = {
  schemaVersion: 1, requestId: '10000000-0000-4000-8000-000000000001',
  actorUserId: '10000000-0000-4000-8000-000000000002', categoryId: '10000000-0000-4000-8000-000000000003',
  expectedCategoryUpdatedAt: '2026-11-01T10:00:00Z', expectedPlanUpdatedAt: '2026-11-01T10:00:00Z',
  settings: { name: 'Household', budgetCents: 50000, fundingRhythm: 'monthly', rolloverEnabled: false,
    rolloverPolicy: null, planRole: 'flexible', expectedNeedCents: null, expectedNeedDueMonth: null }, governance: null,
};
const receipt = { requestId: request.requestId, categoryId: request.categoryId, confirmedAt: '2026-11-01T10:01:00Z',
  categoryUpdatedAt: '2026-11-01T10:01:00Z', planUpdatedAt: '2026-11-01T10:01:00Z', activeVersionId: null, changes: request.settings };
function setup() {
  const rpc = jest.fn().mockResolvedValue({ data: receipt, error: null });
  const getUser = jest.fn().mockResolvedValue({ data: { user: { id: request.actorUserId } }, error: null });
  const repository = createCategorySettingsRepository({ rpc, auth: { getUser } } as unknown as SupabaseClient);
  return { repository, rpc, getUser };
}
describe('category settings RPC adapter', () => {
  it('recovers and validates the original request from a server receipt on a different device', async () => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data: { ...receipt, request }, error: null });
    await expect(repository.findOperation(request.actorUserId, request.requestId)).resolves.toEqual({ request, result: { outcome: 'confirmed', receipt } });
    rpc.mockResolvedValue({ data: { ...receipt, request: { ...request, actorUserId: '10000000-0000-4000-8000-000000000009' } }, error: null });
    await expect(repository.findOperation(request.actorUserId, request.requestId)).rejects.toThrow();
  });

  it('sends all settings through one atomic command with expected versions', async () => {
    const { repository, rpc } = setup();
    await expect(repository.send(request)).resolves.toEqual({ outcome: 'confirmed', receipt });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('save_budget_category_settings', {
      p_expected_actor_user_id: request.actorUserId, p_request_id: request.requestId, p_category_id: request.categoryId,
      p_expected_category_updated_at: request.expectedCategoryUpdatedAt, p_expected_plan_updated_at: request.expectedPlanUpdatedAt,
      p_settings: request.settings, p_governance: null,
    });
  });
  it.each(['40001','42501','22023','23514','P0001','PGRST202'])('distinguishes a rejected command (%s) from an uncertain response', async (code) => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data: null, error: { code, message: 'Rejected' } });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'rejected' });
  });
  it('does not guess that a connection error means the write failed', async () => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'Connection lost' } });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'unknown' });
  });
  it.each([
    { ...receipt, requestId: '10000000-0000-4000-8000-000000000004' },
    { ...receipt, planUpdatedAt: null },
    { ...receipt, changes: { ...request.settings, budgetCents: 0 } },
  ])('does not claim confirmation from an invalid or mismatched receipt', async (data) => {
    const { repository, rpc } = setup(); rpc.mockResolvedValue({ data, error: null });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'unknown' });
  });
  it('does not replay an old account request under a new login', async () => {
    const { repository, rpc, getUser } = setup();
    getUser.mockResolvedValue({ data: { user: { id: 'different-user' } }, error: null });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'unknown' });
    await expect(repository.findReceipt(request)).rejects.toThrow('Sign in');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('binds dispatch and recovery to the initiating actor even if the session changes after getUser', async () => {
    const { repository, rpc, getUser } = setup();
    let sessionActor = request.actorUserId;
    getUser.mockImplementation(async () => {
      const checkedUser = { id: sessionActor };
      sessionActor = '10000000-0000-4000-8000-000000000009';
      return { data: { user: checkedUser }, error: null };
    });
    rpc.mockImplementation(async (_name, args) => args.p_expected_actor_user_id !== sessionActor
      ? { data: null, error: { code: '42501', message: 'Account changed' } }
      : { data: receipt, error: null });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'rejected' });
    expect(rpc.mock.calls[0][1].p_expected_actor_user_id).toBe(request.actorUserId);
  });

  it('recognizes only a locked server rejection as resolving an earlier uncertain save', async () => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data: { outcome: 'rejected', requestId: request.requestId, categoryId: request.categoryId, code: '40001', message: 'Stale category' }, error: null });
    await expect(repository.send(request)).resolves.toMatchObject({ outcome: 'rejected', resolvesPending: true });
  });

  it.each([
    null,
    { startMonth: '2026-01', startingBalanceCents: 1, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'UTC' },
    { startMonth: '2026-02', startingBalanceCents: 0, monthlyAmounts: { '2026-02': 10000 }, timeZone: 'UTC' },
    { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'America/Denver' },
    { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 20000 }, timeZone: 'UTC' },
  ])('rejects an unrelated rollover policy in a confirmation', async (policy) => {
    const { repository, rpc } = setup();
    const settings = { ...request.settings, rolloverEnabled: true,
      rolloverPolicy: { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'UTC' } };
    rpc.mockResolvedValue({ data: { ...receipt, changes: { ...settings, rolloverPolicy: policy } }, error: null });
    await expect(repository.send({ ...request, settings })).resolves.toMatchObject({ outcome: 'unknown' });
  });

  it('accepts the database trigger adding the confirmed month contribution', async () => {
    const { repository, rpc } = setup();
    const policy = { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'UTC' };
    const settings = { ...request.settings, rolloverEnabled: true, rolloverPolicy: policy };
    rpc.mockResolvedValue({ data: { ...receipt, changes: { ...settings,
      rolloverPolicy: { ...policy, monthlyAmounts: { ...policy.monthlyAmounts, '2026-11': settings.budgetCents } } } }, error: null });
    await expect(repository.send({ ...request, settings })).resolves.toMatchObject({ outcome: 'confirmed' });
  });

  it('looks up a receipt without resubmitting the write', async () => {
    const { repository, rpc } = setup();
    await expect(repository.findReceipt(request)).resolves.toEqual(receipt);
    expect(rpc).toHaveBeenCalledWith('get_budget_category_settings_receipt', { p_expected_actor_user_id: request.actorUserId, p_request_id: request.requestId });
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(repository.findReceipt(request)).resolves.toBeNull();
  });
});
