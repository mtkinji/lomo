import { groceryCompileError } from './groceryCompileError';

describe('grocery compilation failures', () => {
  it('reads a cloned response and keeps the original failure for diagnostics', async () => {
    const json = jest.fn().mockResolvedValue({ error: { code: 'stale_household_plan' } });
    const originalJson = jest.fn();
    const failure = { context: { status: 409, clone: () => ({ json }), json: originalJson } };
    await expect(groceryCompileError(failure)).resolves.toMatchObject({
      message: 'This meal plan changed. Refresh Meals and try again.', code: 'stale_household_plan', status: 409, cause: failure,
    });
    expect(originalJson).not.toHaveBeenCalled();
  });

  it('makes an expired session actionable even when the gateway body is unreadable', async () => {
    await expect(groceryCompileError({ context: { status: 401, json: async () => { throw new Error('not JSON'); } } }))
      .resolves.toMatchObject({ message: 'Sign in again to update meals and groceries.', status: 401 });
  });

  it.each([null, new Error('Network request failed'), { context: { status: 500, json: async () => ({ error: { code: 'internal', message: 'private SQL details' } }) } }])
    ('uses a useful fallback for an unknown or unreachable failure', async (failure) => {
      await expect(groceryCompileError(failure)).resolves.toMatchObject({ message: 'Meals and groceries could not be updated. Try again in a moment.' });
    });
});
