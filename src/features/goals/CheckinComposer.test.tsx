import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { CheckinComposer } from './CheckinComposer';
import { submitCheckin } from '../../services/checkins';

jest.mock('../../services/checkins', () => ({ submitCheckin: jest.fn() }));

it('keeps multiline text local until explicit Send and clears after success', async () => {
  const submit = jest.mocked(submitCheckin);
  submit.mockResolvedValueOnce({} as Awaited<ReturnType<typeof submitCheckin>>);
  const submitted = jest.fn();
  const { getByLabelText, getByText } = renderWithProviders(
    <CheckinComposer goalId="goal-1" compact onCheckinSubmitted={submitted} />,
  );
  const input = getByLabelText('Check-in message');
  fireEvent.changeText(input, '  Finished the outline.\nNext: review it.  ');
  fireEvent(input, 'blur');
  expect(submit).not.toHaveBeenCalled();
  fireEvent.press(getByText('Send'));
  await waitFor(() => expect(submitted).toHaveBeenCalledTimes(1));
  expect(submit).toHaveBeenCalledWith({ goalId: 'goal-1', preset: null, text: 'Finished the outline.\nNext: review it.' });
  expect(getByLabelText('Check-in message').props.value).toBe('');
});
