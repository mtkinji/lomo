import * as React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { EnumPickerField, PickerFieldTrigger, RelationPickerField } from './PickerFields';

jest.mock('./BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BottomDrawer: (props: { visible?: boolean; children?: React.ReactNode }) =>
      props.visible ? React.createElement(View, { testID: 'fixed-options-sheet' }, props.children) : null,
    BottomDrawerScrollView: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'fixed-options-sheet-scroll' }, props.children),
  };
});

describe('PickerFields', () => {
  it('keeps a unified read-only value inside an enabled trigger and clears without opening', () => {
    const open = jest.fn(), clear = jest.fn();
    renderWithProviders(<PickerFieldTrigger value="a" options={[{value: 'a', label: 'A'}]} placeholder="Choose" accessibilityLabel="Choose item" onPress={open} onClear={clear} />);
    expect(screen.getByLabelText('Choose item').props.accessibilityValue).toEqual({text: 'A'});
    fireEvent.press(screen.getByLabelText('Choose item'));
    expect(open).toHaveBeenCalledTimes(1);
    open.mockClear();
    const stopPropagation = jest.fn();
    fireEvent.press(screen.getByLabelText('Remove selection'), {stopPropagation});
    expect(clear).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });
  it('aligns the disclosure icon to the canonical field inset', () => {
    renderWithProviders(
      <PickerFieldTrigger
        value=""
        options={[]}
        placeholder="Condition"
        accessibilityLabel="Choose condition"
        allowDeselect={false}
        onPress={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('picker-field.chevron').props.style)).toMatchObject({
      width: 16,
      height: 28,
    });
  });

  it('renders fixed enum options without a search field', () => {
    renderWithProviders(
      <EnumPickerField
        value="active"
        onValueChange={jest.fn()}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'later', label: 'Later' },
        ]}
        title="Status"
        placeholder="Select status..."
        accessibilityLabel="Change status"
        allowDeselect={false}
      />,
    );

    fireEvent.press(screen.getByLabelText('Change status'));

    expect(screen.getByTestId('fixed-options-sheet')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  it('uses standard drawer header hierarchy and an explicit close action', () => {
    renderWithProviders(
      <EnumPickerField
        value="active"
        onValueChange={jest.fn()}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'later', label: 'Later' },
        ]}
        title="Status"
        placeholder="Select status..."
        accessibilityLabel="Change status"
        allowDeselect={false}
      />,
    );

    fireEvent.press(screen.getByLabelText('Change status'));

    expect(screen.getByTestId('bottom-drawer.header')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close status picker'));
    expect(screen.queryByTestId('fixed-options-sheet')).toBeNull();
  });

  it('supports custom triggers for row-style fixed fields', () => {
    renderWithProviders(
      <EnumPickerField
        value="medium"
        onValueChange={jest.fn()}
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
        ]}
        title="Difficulty"
        placeholder="Select difficulty..."
        accessibilityLabel="Edit difficulty"
        renderTrigger={({ selectedLabel, onPress }) => (
          <Pressable accessibilityRole="button" accessibilityLabel="Edit difficulty row" onPress={onPress}>
            <Text>{`Difficulty: ${selectedLabel}`}</Text>
          </Pressable>
        )}
      />,
    );

    expect(screen.getByText('Difficulty: Medium')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Edit difficulty row'));

    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('opens relation pickers with a pinned search field', () => {
    renderWithProviders(
      <View>
        <RelationPickerField
          value=""
          onValueChange={jest.fn()}
          options={[
            { value: 'goal-1', label: 'Create a family burn-rate plan' },
            { value: 'goal-2', label: 'Build a steady desk strength routine' },
          ]}
          title="Choose goal"
          placeholder="Select goal..."
          searchPlaceholder="Search goals..."
          accessibilityLabel="Change linked goal"
          leadingIcon="goals"
        />
      </View>,
    );

    fireEvent.press(screen.getByLabelText('Change linked goal'));

    expect(screen.getByText('Choose goal')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search goals...')).toBeTruthy();
    expect(screen.getByText('Create a family burn-rate plan')).toBeTruthy();
  });

  it('supports custom triggers for relation fields', () => {
    renderWithProviders(
      <View>
        <RelationPickerField
          value="goal-1"
          onValueChange={jest.fn()}
          options={[
            { value: 'goal-1', label: 'Elevate scheduling to a first-class capability' },
            { value: 'goal-2', label: 'Build a steady desk strength routine' },
          ]}
          title="Choose goal"
          placeholder="Select goal..."
          searchPlaceholder="Search goals..."
          accessibilityLabel="Change linked goal"
          renderTrigger={({ selectedLabel, onPress }) => (
            <Pressable accessibilityRole="button" accessibilityLabel="Change goal chip" onPress={onPress}>
              <Text>{selectedLabel}</Text>
            </Pressable>
          )}
        />
      </View>,
    );

    expect(screen.getByText('Elevate scheduling to a first-class capability')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Change goal chip'));

    expect(screen.getByText('Choose goal')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search goals...')).toBeTruthy();
  });
});

it('names the location clear action and does not open the picker when clearing', () => {
  const clear = jest.fn(), open = jest.fn();
  renderWithProviders(<PickerFieldTrigger value="park" options={[{value: 'park', label: 'Park'}]} placeholder="Choose place" accessibilityLabel="Location" clearAccessibilityLabel="Clear location" onPress={open} onClear={clear} />);
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByLabelText('Clear location'), {stopPropagation});
  expect(clear).toHaveBeenCalledTimes(1);
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
});

it('keeps relation query clearing local and resets it on reopen for compatibility callers', () => {
  const select = jest.fn();
  renderWithProviders(<RelationPickerField value="" onValueChange={select}
    options={[{value: 'one', label: 'First goal'}, {value: 'two', label: 'Second goal'}]}
    title="Choose goal" placeholder="Select goal" accessibilityLabel="Choose linked goal" />);
  fireEvent.press(screen.getByLabelText('Choose linked goal'));
  fireEvent.changeText(screen.getByLabelText('Search choose goal'), 'Second');
  expect(screen.queryByText('First goal')).toBeNull();
  fireEvent.press(screen.getByLabelText('Clear search'));
  expect(screen.getByText('First goal')).toBeTruthy();
  expect(select).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Search choose goal'), 'Second');
  fireEvent.press(screen.getByLabelText('Close picker'));
  fireEvent.press(screen.getByLabelText('Choose linked goal'));
  expect(screen.getByLabelText('Search choose goal').props.value).toBe('');
  fireEvent.press(screen.getByText('First goal'));
  expect(select).toHaveBeenCalledTimes(1);
  expect(select).toHaveBeenCalledWith('one');
});
