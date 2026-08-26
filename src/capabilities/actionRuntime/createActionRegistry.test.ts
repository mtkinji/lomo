import { createActionRegistry, type KwiltActionRegistration } from './createActionRegistry';

const registration = (operationId: string): KwiltActionRegistration<{}> => ({
  operationId, confirmation: 'none', reversible: false,
  execute: jest.fn(async () => ({ status: 'completed', resultRefs: [] })),
});

test('rejects duplicate operation IDs', () => {
  expect(() => createActionRegistry([registration('goals.read'), registration('goals.read')]))
    .toThrow('Duplicate action registration: goals.read');
});

test('resolves only concretely registered operations', () => {
  const goals = registration('goals.read');
  const registry = createActionRegistry([goals]);
  expect(registry.get('goals.read')).toBe(goals);
  expect(registry.get('goals.update')).toBeUndefined();
});
