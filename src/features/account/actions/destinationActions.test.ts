import {
  DestinationConflictError,
  createDestinationActions,
  type DestinationActionsBoundary,
} from './destinationActions';

function boundary(initial: Record<string, boolean> = {}): DestinationActionsBoundary & { setEnabled: jest.Mock } {
  let enabled = { ...initial };
  const setEnabled = jest.fn((kind: string, value: boolean) => { enabled = { ...enabled, [kind]: value }; });
  return { readEnabled: () => enabled, setEnabled };
}

test('lists and gets only the curated retailer destinations', () => {
  const actions = createDestinationActions(boundary({ amazon: true, arbitrary_url: true }));
  expect(actions.list().destinations).toEqual([
    expect.objectContaining({ destinationId: 'amazon', displayName: 'Amazon', installed: true }),
    expect.objectContaining({ destinationId: 'home_depot', installed: false }),
    expect.objectContaining({ destinationId: 'instacart', installed: false }),
    expect.objectContaining({ destinationId: 'doordash', installed: false }),
  ]);
  expect(actions.get({ destinationId: 'amazon' })).toMatchObject({ destinationId: 'amazon', installed: true });
  expect(() => actions.get({ destinationId: 'arbitrary_url' })).toThrow('supported');
});

test('installs an allow-listed destination and confirms device state', () => {
  const provider = boundary();
  expect(createDestinationActions(provider).install({ kind: 'instacart' })).toMatchObject({
    destinationId: 'instacart', installed: true,
  });
  expect(provider.setEnabled).toHaveBeenCalledWith('instacart', true);
});

test('rejects an unsafe destination kind without mutation', () => {
  const provider = boundary();
  expect(() => createDestinationActions(provider).install({ kind: 'https://evil.example' as never })).toThrow('supported');
  expect(provider.setEnabled).not.toHaveBeenCalled();
});

test('uninstalls the exact reviewed destination and rejects stale state', () => {
  const provider = boundary({ amazon: true });
  const actions = createDestinationActions(provider);
  expect(actions.uninstall({ destinationId: 'amazon', expectedInstalled: true })).toMatchObject({
    destinationId: 'amazon', installed: false,
  });
  expect(() => actions.uninstall({ destinationId: 'amazon', expectedInstalled: true }))
    .toThrow(DestinationConflictError);
});
