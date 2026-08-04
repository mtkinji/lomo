import { render } from '@testing-library/react-native';
import { BrandLockup } from './BrandLockup';

describe('BrandLockup accessibility contract', () => {
  it('keeps the decorative wordmark from overwhelming large-text layouts', () => {
    const { getByText } = render(<BrandLockup />);

    expect(getByText('Kwilt').props).toMatchObject({
      maxFontSizeMultiplier: 1.4,
      numberOfLines: 1,
    });
  });
});
