import { fireEvent, render } from '@testing-library/react-native';
import { PlanActionDock } from './PlanActionDock';

describe('PlanActionDock', () => {
  test('keeps planning dominant and Chat distinct', () => {
    const onOpenRecommendations = jest.fn();
    const onOpenChat = jest.fn();
    const { getByLabelText } = render(
      <PlanActionDock
        recommendationsCount={2}
        onOpenRecommendations={onOpenRecommendations}
        onOpenChat={onOpenChat}
      />,
    );

    fireEvent.press(getByLabelText('Plan this day · 2'));
    fireEvent.press(getByLabelText('Chat about this day'));

    expect(onOpenRecommendations).toHaveBeenCalledTimes(1);
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  test('does not announce a zero recommendation badge', () => {
    const { getByLabelText, queryByLabelText } = render(
      <PlanActionDock
        recommendationsCount={0}
        onOpenRecommendations={jest.fn()}
        onOpenChat={jest.fn()}
      />,
    );

    expect(getByLabelText('Plan this day')).toBeTruthy();
    expect(queryByLabelText('Plan this day · 0')).toBeNull();
  });
});
