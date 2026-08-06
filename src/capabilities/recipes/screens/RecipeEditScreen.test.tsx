import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RecipeEditView, type RecipeEditorDraft } from './RecipeEditScreen';

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
});
