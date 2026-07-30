import { fireEvent, render } from '@testing-library/react-native';
import { HapticsService } from '../../../services/HapticsService';
import { GameButton } from './GameButton';

jest.mock('../../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn() },
}));

describe('GameButton', () => {
  it('routes feedback through the host haptics preference owner', () => {
    const onPress = jest.fn();
    const screen = render(<GameButton onPress={onPress}>Roll</GameButton>);

    fireEvent.press(screen.getByText('Roll'));

    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.primary.confirm');
    expect(onPress).toHaveBeenCalled();
  });
});
