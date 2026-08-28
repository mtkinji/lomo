import {
  AiModelPreferenceConflictError,
  createAiModelPreferenceActions,
  type AiModelPreferenceBoundary,
} from './aiModelPreferenceActions';

function boundary(initialModel = 'gpt-4o-mini', isPro = false): AiModelPreferenceBoundary & { apply: jest.Mock } {
  let modelId = initialModel;
  const apply = jest.fn(({ modelId: next }) => { modelId = next; });
  return { read: () => ({ modelId, isPro }), apply } as AiModelPreferenceBoundary & { apply: jest.Mock };
}

test('reads the current model and only the models available to the current plan', () => {
  expect(createAiModelPreferenceActions(boundary()).read()).toEqual({
    modelId: 'gpt-4o-mini',
    availableModelIds: ['gpt-4o-mini', 'gpt-4o'],
    policy: { gpt5RequiresPro: true, owner: 'this_device' },
  });
  expect(createAiModelPreferenceActions(boundary('gpt-5.2', true)).read().availableModelIds)
    .toEqual(['gpt-4o-mini', 'gpt-4o', 'gpt-5.1', 'gpt-5.2']);
});

test('applies an exact reviewed model and confirms the local result', () => {
  const model = boundary('gpt-4o-mini', true);
  expect(createAiModelPreferenceActions(model).update({
    expectedModelId: 'gpt-4o-mini', modelId: 'gpt-5.2',
  })).toEqual({ previousModelId: 'gpt-4o-mini', modelId: 'gpt-5.2', changed: true });
  expect(model.apply).toHaveBeenCalledWith({ modelId: 'gpt-5.2' });
});

test('rejects stale, unavailable, and unknown model changes', () => {
  const actions = createAiModelPreferenceActions(boundary());
  expect(() => actions.update({ expectedModelId: 'gpt-4o', modelId: 'gpt-4o-mini' }))
    .toThrow(AiModelPreferenceConflictError);
  expect(() => actions.update({ expectedModelId: 'gpt-4o-mini', modelId: 'gpt-5.2' }))
    .toThrow('Pro');
  expect(() => actions.update({ expectedModelId: 'gpt-4o-mini', modelId: 'arbitrary-model' }))
    .toThrow('supported');
});
