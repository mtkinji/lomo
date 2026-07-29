import { render } from '@testing-library/react-native';
import { GameButton } from '../GameButton';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn(),
}));

describe('GameButton', () => {
  it('wraps interpolated label parts in a native Text component', () => {
    const screen = render(<GameButton>Bank {12}</GameButton>);

    expect(screen.getByText('Bank 12')).toBeTruthy();
  });
});
