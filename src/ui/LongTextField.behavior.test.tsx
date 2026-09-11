import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { LongTextField } from './LongTextField';

jest.mock('react-native-pell-rich-editor', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    actions: {},
    RichEditor: React.forwardRef((props: object, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ setContentHTML: jest.fn(), focusContentEditor: jest.fn() }));
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

describe('LongTextField persistence compatibility', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens the established rich editor and flushes formatted text on Done before debounce', () => {
    const onChange = jest.fn();
    const view = renderWithProviders(<LongTextField label="Notes" value="Original" onChange={onChange} />);
    expect(view.queryByTestId('rich-editor')).toBeNull();
    fireEvent.press(view.getByLabelText('Edit Notes'));
    fireEvent(view.getByTestId('rich-editor'), 'change', '<p><b>Formatted draft</b></p>');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText('Done'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p><b>Formatted draft</b></p>');
    expect(view.queryByTestId('rich-editor')).toBeNull();
    act(() => jest.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('autosaves once after debounce and does not write again on Done', () => {
    const onChange = jest.fn();
    const view = renderWithProviders(<LongTextField label="Notes" value="Original" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('Edit Notes'));
    fireEvent(view.getByTestId('rich-editor'), 'change', '<p>Draft</p>');
    act(() => jest.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledWith('<p>Draft</p>');
    fireEvent.press(view.getByLabelText('Done'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
