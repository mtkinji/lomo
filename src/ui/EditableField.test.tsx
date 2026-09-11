import {useState} from 'react';
import {fireEvent} from '@testing-library/react-native';
import {renderWithProviders} from '../test/renderWithProviders';
import {EditableField} from './EditableField';

it('commits a changed value once when Done is followed by blur', () => {
  const changed = jest.fn();
  const submitted = jest.fn();
  function Form() {
    const [value, setValue] = useState('Original');
    return <EditableField label="Title" value={value} onChange={next => { changed(next); setValue(next); }} onSubmit={submitted} />;
  }
  const screen = renderWithProviders(<Form />);
  const input = screen.getByLabelText('Title');
  fireEvent(input, 'focus');
  fireEvent.changeText(input, 'Revised');
  fireEvent(input, 'submitEditing', {nativeEvent: {text: 'Revised'}});
  fireEvent(input, 'blur');
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith('Revised');
  expect(submitted).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue('Revised')).toBeTruthy();
});

it('does not commit a value rejected by validation', () => {
  const changed = jest.fn();
  const screen = renderWithProviders(<EditableField label="Title" value="Original" onChange={changed} validate={value => value.trim() ? null : 'Enter a title'} />);
  const input = screen.getByLabelText('Title');
  fireEvent(input, 'focus');
  fireEvent.changeText(input, '');
  fireEvent(input, 'submitEditing', {nativeEvent: {text: ''}});
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByText('Enter a title')).toBeTruthy();
});
