import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { Icon } from './Icon';

describe('Icon optical sizing', () => {
  it('renders the Kwilt token two points larger than its requested semantic size', () => {
    const token = render(<Icon name="token" size={19} color="#111" />);

    expect(token.UNSAFE_getByType(Svg).props).toMatchObject({
      width: 21,
      height: 21,
    });
  });

  it('keeps other Kwilt icons at their requested size', () => {
    const focus = render(<Icon name="focus" size={19} color="#111" />);

    expect(focus.UNSAFE_getByType(Svg).props).toMatchObject({
      width: 19,
      height: 19,
    });
  });
});
