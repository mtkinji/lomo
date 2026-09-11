import {createRef} from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {TextInput} from 'react-native';
import {SearchField} from './SearchField';

describe('SearchField', () => {
  it('clears once without submitting and retains a single clear control', () => {
    const change = jest.fn(), submit = jest.fn(), clear = jest.fn();
    const ref = createRef<TextInput>();
    const {getByLabelText} = render(<SearchField ref={ref} accessibilityLabel="Search goals" value="walk" onChangeText={change} onSubmitEditing={submit} onClear={clear} clearAccessibilityLabel="Clear goal search" />);
    const focus = jest.spyOn(ref.current!, 'focus');
    fireEvent.press(getByLabelText('Clear goal search'));
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith('');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(getByLabelText('Search goals').props.clearButtonMode).toBe('never');
  });
  it('does not expose clearing for an empty or noneditable query', () => {
    const field = (value: string, editable = true) => <SearchField accessibilityLabel="Search" value={value} editable={editable} onChangeText={jest.fn()} />;
    const {queryByLabelText, rerender} = render(field(''));
    expect(queryByLabelText('Clear search')).toBeNull();
    rerender(field('walk', false));
    expect(queryByLabelText('Clear search')).toBeNull();
  });
});
