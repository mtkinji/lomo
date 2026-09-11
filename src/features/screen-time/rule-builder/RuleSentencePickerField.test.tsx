import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { RuleSentencePickerField } from './RuleSentencePickerField';

it('announces the current sentence choice on its single actionable trigger', () => {
  const onPress = jest.fn();
  const view = renderWithProviders(<RuleSentencePickerField accessibilityLabel="Choose a limit" value="30 minutes" onPress={onPress} />);
  const trigger = view.getByRole('button', { name: 'Choose a limit' });
  expect(trigger.props.accessibilityValue).toEqual({ text: '30 minutes' });
  expect(view.queryAllByRole('button')).toHaveLength(1);
  fireEvent.press(trigger);
  expect(onPress).toHaveBeenCalledTimes(1);
});
