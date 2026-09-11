import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { InlineViewCreator } from './InlineViewCreator';

it('keeps a description local until an explicit create action', () => {
  const create = jest.fn();
  const { getByText, getByLabelText } = renderWithProviders(
    <InlineViewCreator goals={[]} onCreateView={jest.fn()} onCreateAiView={create} />,
  );
  fireEvent.press(getByText('Or describe what you want to see...'));
  const input = getByLabelText('Describe a new view');
  fireEvent.changeText(input, '  High priority this week  ');
  fireEvent(input, 'blur');
  expect(create).not.toHaveBeenCalled();
  fireEvent.press(getByLabelText('Create AI view'));
  expect(create).toHaveBeenCalledWith('High priority this week');
});
