import { render } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';
import { FormField } from './FormField';

describe('FormField', () => {
  it('binds a label and description to a custom control', () => {
    const { getByLabelText, getByText } = render(
      <FormField label="View name" description="Shown in your Views menu.">
        {(controlProps) => <TextInput {...controlProps} value="Today" />}
      </FormField>,
    );

    expect(getByText('View name')).toBeTruthy();
    expect(getByText('Shown in your Views menu.')).toBeTruthy();
    expect(getByLabelText('View name').props.accessibilityHint).toBe('Shown in your Views menu.');
  });

  it('announces an error and exposes invalid state to the control', () => {
    const { getByLabelText, getByRole } = render(
      <FormField label="View name" error="Enter a name.">
        {(controlProps) => <TextInput {...controlProps} />}
      </FormField>,
    );

    expect(getByRole('alert')).toHaveTextContent('Enter a name.');
    expect(getByLabelText('View name').props['aria-invalid']).toBe(true);
  });

  it('carries disabled state without making helper copy look interactive', () => {
    const { getByLabelText } = render(
      <FormField label="Layout" disabled>
        {(controlProps) => <TextInput {...controlProps} />}
      </FormField>,
    );

    expect(getByLabelText('Layout').props.accessibilityState).toMatchObject({ disabled: true });
  });
});
