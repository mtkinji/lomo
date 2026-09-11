import { createRef } from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { TextInput } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { TagEntryField } from './TagEntryField';

it('forwards drafts and native commit events without parsing or persisting tags', () => {
  const changed = jest.fn(), blur = jest.fn(), submit = jest.fn(), key = jest.fn(), removed = jest.fn();
  const ref = createRef<TextInput>();
  const screen = renderWithProviders(<TagEntryField ref={ref} tags={['Home']} value="" accessibilityLabel="Add tags" onRemoveTag={removed} onChangeText={changed} onBlur={blur} onSubmitEditing={submit} onKeyPress={key} />);
  const input = screen.getByLabelText('Add tags');
  expect(ref.current).toBeTruthy();
  fireEvent.changeText(input, 'outside, next');
  expect(changed).toHaveBeenCalledWith('outside, next');
  expect(removed).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
  fireEvent(input, 'submitEditing', {nativeEvent: {text: 'next'}});
  fireEvent(input, 'blur', {});
  fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});
  expect(submit).toHaveBeenCalledTimes(1);
  expect(blur).toHaveBeenCalledTimes(1);
  expect(key).toHaveBeenCalledTimes(1);
});

it('removes only the selected chip without triggering field focus preparation', () => {
  const remove = jest.fn(), prepare = jest.fn();
  const screen = renderWithProviders(<TagEntryField tags={['Home', 'Outside']} value="" accessibilityLabel="Add tags" onRemoveTag={remove} onPressField={prepare} />);
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByLabelText('Remove tag Outside'), {stopPropagation});
  expect(remove).toHaveBeenCalledWith('Outside');
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(prepare).not.toHaveBeenCalled();
});
