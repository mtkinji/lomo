import {fireEvent} from '@testing-library/react-native';
import {renderWithProviders} from '../../test/renderWithProviders';
import {GoalsInventorySearchBar} from './GoalsInventorySearchBar';

it('clears the query once and preserves the host clear effect without changing sort', () => {
  const change = jest.fn();
  const cleared = jest.fn();
  const sort = jest.fn();
  const {getByLabelText} = renderWithProviders(<GoalsInventorySearchBar value="walk" onChangeText={change} onClear={cleared} sortMode="titleAsc" onSortModeChange={sort} />);
  fireEvent.press(getByLabelText('Clear goal search'));
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith('');
  expect(cleared).toHaveBeenCalledTimes(1);
  expect(sort).not.toHaveBeenCalled();
});
