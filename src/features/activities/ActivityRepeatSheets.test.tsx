import { fireEvent } from '@testing-library/react-native';
import { Picker } from '@react-native-picker/picker';
import type { Activity } from '../../domain/types';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ActivityRepeatSheets } from './ActivityRepeatSheets';
import { useActivityRepeatEditor } from './useActivityRepeatEditor';

const activity = {
  id: 'monthly-repeat-test',
  repeatRule: 'custom',
  repeatCustom: { cadence: 'months', interval: 1 },
} as Activity;

function Editor({ updateActivity, supportsMonthlyWeekday = true }: {
  updateActivity: jest.Mock;
  supportsMonthlyWeekday?: boolean;
}) {
  const controller = useActivityRepeatEditor({
    activity, updateActivity, onClose: jest.fn(), onOpenCustom: jest.fn(), onReturnToPresets: jest.fn(),
  });
  return <ActivityRepeatSheets presetVisible={false} customVisible controller={{
    ...controller,
    setMonthlyWeekday: supportsMonthlyWeekday ? controller.setMonthlyWeekday : undefined,
  }} />;
}

it('selects third Sunday with the paired wheels and saves the full rule', () => {
  const updateActivity = jest.fn();
  const screen = renderWithProviders(<Editor updateActivity={updateActivity} />);
  expect(screen.queryByTestId('e2e.activityDetail.customRepeat.month.ordinal')).toBeNull();
  fireEvent.press(screen.getByText('Same week each month'));
  const picker = (field: string) => screen.UNSAFE_getAllByType(Picker)
    .find((node) => node.props.testID === `e2e.activityDetail.customRepeat.month.${field}`)!;
  fireEvent(picker('ordinal'), 'valueChange', 3);
  fireEvent(picker('weekday'), 'valueChange', 0);
  expect(picker('ordinal').props.selectedValue).toBe(3);
  expect(picker('weekday').props.selectedValue).toBe(0);
  fireEvent.press(screen.getByLabelText('Set custom repeat rule'));
  expect(updateActivity.mock.calls[0][1](activity).repeatCustom).toEqual({
    cadence: 'months', interval: 1, monthlyWeekday: { ordinal: 3, weekday: 0 },
  });
  fireEvent.press(screen.getByText('Same day each month'));
  expect(screen.queryByTestId('e2e.activityDetail.customRepeat.month.ordinal')).toBeNull();
  fireEvent.press(screen.getByLabelText('Set custom repeat rule'));
  expect(updateActivity.mock.calls[1][1](activity).repeatCustom).toEqual({ cadence: 'months', interval: 1 });
});

it('does not offer monthly weekday rules for editors without scheduler support', () => {
  const screen = renderWithProviders(<Editor updateActivity={jest.fn()} supportsMonthlyWeekday={false} />);
  expect(screen.queryByText('Same week each month')).toBeNull();
});
