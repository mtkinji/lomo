import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RecipeEditView, reviewedDataFromEditorDraft, type RecipeEditorDraft } from './RecipeEditScreen';
import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'stable-id' }));

const empty: RecipeEditorDraft = {
  title: '', description: '', servings: '', ingredients: [], instructions: [],
  sourceTitle: '', sourceAuthor: '', notes: '',
};

const renderEditor = (element: React.ReactElement) => render(
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
    {element}
  </SafeAreaProvider>,
);

describe('Recipe editor', () => {
  it('carries only still-grounded model equipment into the reviewed save payload', () => {
    const draft: RecipeEditorDraft = {
      ...empty,
      title: 'Zucchini noodles',
      instructions: [{ id: 'step-1', text: 'Cut the zucchini with a spiralizer.' }],
    };
    const reviewed = reviewedDataFromEditorDraft(draft, { method: 'text' }, [
      { id: 'spiralizer', label: 'Spiralizer', searchQuery: 'vegetable spiralizer', necessity: 'required', confidence: 0.94, evidenceText: 'Cut the zucchini with a spiralizer.', substitute: null },
      { id: 'air-fryer', label: 'Air fryer', searchQuery: 'air fryer', necessity: 'required', confidence: 0.99, evidenceText: 'Cook in an air fryer.', substitute: null },
    ]);

    expect(reviewed.equipmentRequirements).toEqual([
      expect.objectContaining({ id: 'spiralizer', confidence: 0.94 }),
    ]);
  });

  it('requires only a title and preserves literal ingredient text', () => {
    const onSave = jest.fn();
    const screen = renderEditor(<RecipeEditView initial={empty} saving={false} error={null} onSave={onSave} onBack={jest.fn()} />);
    expect(screen.getByText('Save')).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Title'), 'Tomato toast');
    fireEvent.press(screen.getByText('Add ingredient'));
    fireEvent.changeText(screen.getByLabelText('Ingredient'), '2 ripe tomatoes, chopped');
    fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Tomato toast', ingredients: [expect.objectContaining({ originalText: '2 ripe tomatoes, chopped' })],
    }));
  });

  it('only reports unsaved changes after a real edit and keeps save errors visible', () => {
    const onBack = jest.fn();
    const screen = renderEditor(<RecipeEditView initial={empty} saving={false} error="Recipe could not be saved." onSave={jest.fn()} onBack={onBack} />);
    expect(screen.getByText('Recipe could not be saved.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Go back from New recipe'));
    expect(onBack).toHaveBeenLastCalledWith(false);
    fireEvent.changeText(screen.getByLabelText('Title'), 'Toast');
    fireEvent.press(screen.getByLabelText('Go back from New recipe'));
    expect(onBack).toHaveBeenLastCalledWith(true);
  });

  it('lets AI prepare changes in the same manually editable draft without saving them', async () => {
    const initial: RecipeEditorDraft = { ...empty, title: 'Cake', servings: '8', ingredients: [{ id: 'ingredient-2', originalText: '2 eggs' }] };
    const onSave = jest.fn();
    const aiSuggest = jest.fn().mockResolvedValue({
      summary: 'Use four eggs.',
      operations: [{ kind: 'replace_ingredient', lineId: 'ingredient-2', value: '4 eggs' }],
    });
    const screen = renderEditor(<RecipeEditView
      initial={initial}
      currentVersion={recipeVersionContractFixture()}
      aiSuggest={aiSuggest}
      saving={false}
      error={null}
      onSave={onSave}
      onBack={jest.fn()}
    />);
    fireEvent.changeText(screen.getByLabelText('Tell Kwilt what changed'), 'Double the eggs.');
    fireEvent.press(screen.getByText('Suggest changes'));
    await waitFor(() => expect(screen.getByText('Use four eggs.')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Apply to draft'));
    expect(screen.getByDisplayValue('4 eggs')).toBeTruthy();
  });

  it('keeps direct editing available when AI help is unavailable', async () => {
    const initial: RecipeEditorDraft = { ...empty, title: 'Cake' };
    const screen = renderEditor(<RecipeEditView
      initial={initial}
      currentVersion={recipeVersionContractFixture()}
      aiSuggest={jest.fn().mockRejectedValue(new Error('offline'))}
      saving={false}
      error={null}
      onSave={jest.fn()}
      onBack={jest.fn()}
    />);
    fireEvent.changeText(screen.getByLabelText('Tell Kwilt what changed'), 'Use less sugar.');
    fireEvent.press(screen.getByText('Suggest changes'));
    await waitFor(() => expect(screen.getByText('AI help isn’t available. You can still update every field below.')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Title'), 'Cabin cake');
    expect(screen.getByDisplayValue('Cabin cake')).toBeTruthy();
  });
});
