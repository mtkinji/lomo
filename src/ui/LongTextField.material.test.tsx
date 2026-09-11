import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { LongTextField } from './LongTextField';
import { PortalHost } from './Portal';

const mockInsertLink = jest.fn();
jest.mock('react-native-pell-rich-editor', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    actions: {},
    RichEditor: React.forwardRef((props: object, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        setContentHTML: jest.fn(), focusContentEditor: jest.fn(), insertLink: mockInsertLink,
      }));
      return React.createElement(View, { ...props, testID: 'rich-editor' });
    }),
  };
});
jest.mock('./BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? React.createElement(View, {}, children) : null };
});
jest.mock('./RichTextBlock', () => ({ RichTextBlock: () => null }));

describe('LongTextField shared field composition', () => {
  beforeEach(() => { jest.useFakeTimers(); mockInsertLink.mockClear(); });
  afterEach(() => jest.useRealTimers());

  it('names the link fields and inserts their trimmed values through the existing rich editor', () => {
    const view = renderWithProviders(<><LongTextField label="Notes" value="Original" onChange={jest.fn()} /><PortalHost /></>);
    fireEvent.press(view.getByLabelText('Edit Notes'));
    fireEvent.press(view.getByLabelText('Insert hyperlink'));
    fireEvent.changeText(view.getByLabelText('URL'), ' https://example.com ');
    fireEvent.changeText(view.getByLabelText('Label (optional)'), ' Example ');
    fireEvent.press(view.getByText('Insert', { exact: true }));
    expect(mockInsertLink).toHaveBeenCalledTimes(1);
    expect(mockInsertLink).toHaveBeenCalledWith('Example', 'https://example.com');
    expect(view.queryByLabelText('URL')).toBeNull();
  });

  it('uses the URL for an empty link label and Cancel never inserts a link', () => {
    const view = renderWithProviders(<><LongTextField label="Notes" value="Original" onChange={jest.fn()} /><PortalHost /></>);
    fireEvent.press(view.getByLabelText('Edit Notes'));
    fireEvent.press(view.getByLabelText('Insert hyperlink'));
    fireEvent.changeText(view.getByLabelText('URL'), 'https://example.com');
    fireEvent.press(view.getByText('Cancel', { exact: true }));
    expect(mockInsertLink).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText('Insert hyperlink'));
    fireEvent.changeText(view.getByLabelText('URL'), ' https://example.org ');
    fireEvent.press(view.getByText('Insert', { exact: true }));
    expect(mockInsertLink).toHaveBeenCalledWith('https://example.org', 'https://example.org');
  });

  it('retains an open rich draft when the parent rerenders', () => {
    const onChange = jest.fn();
    const view = renderWithProviders(<LongTextField label="Notes" value="Original" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('Edit Notes'));
    fireEvent(view.getByTestId('rich-editor'), 'change', '<p><b>Keep this draft</b></p>');
    view.rerender(<LongTextField label="Notes" value="Original" onChange={onChange} />);
    expect(view.getByTestId('rich-editor').props.initialContentHTML).toBe('<p><b>Keep this draft</b></p>');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText('Done'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p><b>Keep this draft</b></p>');
  });

  it('keeps a disabled filled preview readable without opening its editor', () => {
    const view = renderWithProviders(<LongTextField label="Notes" value="Original" disabled onChange={jest.fn()} />);
    const trigger = view.getByLabelText('Edit Notes');
    expect(trigger.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(trigger);
    expect(view.queryByTestId('rich-editor')).toBeNull();
  });
});
