import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { ProfileAvatar } from './ProfileAvatar';

describe('ProfileAvatar fallback', () => {
  it('uses the first two letters of the first name to distinguish shared initials', () => {
    const screen = render(
      <>
        <ProfileAvatar name="Grace" />
        <ProfileAvatar name="Gavin" />
        <ProfileAvatar name="Mary Jane" />
      </>,
    );

    expect(screen.getByText('GR')).toBeTruthy();
    expect(screen.getByText('GA')).toBeTruthy();
    expect(screen.getByText('MA')).toBeTruthy();
  });

  it('uses a calm solid Kwilt brand surface instead of a gradient', () => {
    const screen = render(<ProfileAvatar name="Charlie" />);
    const avatar = screen.getByTestId('profile-avatar-fallback');
    const style = StyleSheet.flatten(avatar.props.style);

    expect([
      colors.pine100,
      colors.quiltBlue100,
      colors.turmeric100,
      colors.madder100,
    ]).toContain(style.backgroundColor);
  });
});
