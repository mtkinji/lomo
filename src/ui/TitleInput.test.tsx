import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { TitleInput } from './TitleInput';

it('preserves the native editor and parent-owned draft through long title edits', () => {
  const ref = React.createRef<TextInput>();
  const change = jest.fn();
  const submit = jest.fn();
  const blur = jest.fn();
  const props = {accessibilityLabel: 'To-do title', onChangeText: change, onSubmitEditing: submit, onBlur: blur, returnKeyType: 'done' as const, blurOnSubmit: true};
  const {rerender} = render(<TitleInput ref={ref} {...props} value="Draft" />);
  const native = ref.current;
  const long = 'A long editorial title '.repeat(50);
  fireEvent.changeText(screen.getByLabelText('To-do title'), long);
  expect(change).toHaveBeenCalledWith(long);
  expect(submit).not.toHaveBeenCalled();
  expect(blur).not.toHaveBeenCalled();
  rerender(<TitleInput ref={ref} {...props} value={long} />);
  expect(ref.current).toBe(native);
  expect(screen.getByLabelText('To-do title').props.value).toBe(long);
  expect(screen.getByLabelText('To-do title').props.scrollEnabled).toBe(false);
  fireEvent(screen.getByLabelText('To-do title'), 'submitEditing', {nativeEvent: {text: long}});
  fireEvent(screen.getByLabelText('To-do title'), 'blur');
  expect(submit).toHaveBeenCalledTimes(1);
  expect(blur).toHaveBeenCalledTimes(1);
});
