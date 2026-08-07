import { render } from '@testing-library/react-native';
import { getAccessibleLineHeight, Heading, Text } from './Typography';

describe('Typography accessibility contract', () => {
  it('exposes Heading as a navigable header by default', () => {
    const { getByRole } = render(<Heading>Plan your day</Heading>);

    expect(getByRole('header').props.children).toBe('Plan your day');
  });

  it('does not turn body copy into a header', () => {
    const { queryByRole } = render(<Text>One clear next step.</Text>);

    expect(queryByRole('header')).toBeNull();
  });

  it('releases fixed line heights at accessibility text sizes so glyphs are not clipped', () => {
    expect(getAccessibleLineHeight(24, 1)).toBe(24);
    expect(getAccessibleLineHeight(24, 1.35)).toBeUndefined();
  });
});
