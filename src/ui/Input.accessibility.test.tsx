import { render } from '@testing-library/react-native';
import { Input } from './Input';

describe('Input accessibility contract', () => {
  it('programmatically names the text field from its visible label', () => {
    const { getByLabelText } = render(<Input label="Email address" value="" />);

    expect(getByLabelText('Email address')).toBeTruthy();
  });

  it('exposes validation feedback to assistive technology', () => {
    const { getByLabelText, getByText } = render(
      <Input label="Goal title" errorText="A title is required" value="" />,
    );

    expect(getByLabelText('Goal title').props.accessibilityHint).toBe('A title is required');
    expect(getByText('A title is required').props.accessibilityLiveRegion).toBe('polite');
    expect(getByText('A title is required').props.accessibilityRole).toBe('alert');
  });

  it('preserves an explicit accessible name and hint', () => {
    const { getByLabelText } = render(
      <Input
        label="Amount"
        accessibilityLabel="Monthly amount"
        accessibilityHint="Enter dollars"
        value=""
      />,
    );

    expect(getByLabelText('Monthly amount').props.accessibilityHint).toBe('Enter dollars');
  });
});
