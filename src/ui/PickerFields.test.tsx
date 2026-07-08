import * as React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { EnumPickerField, RelationPickerField } from './PickerFields';

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
