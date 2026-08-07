import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ActionDockSplitContent } from './ActionDockSplitContent';

jest.mock('./DropdownMenu', () => {
  const ReactNative = require('react-native');
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <ReactNative.View>{children}</ReactNative.View>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <ReactNative.View>{children}</ReactNative.View>,
    DropdownMenuItem: ({ children, disabled, onPress, testID }: { children: React.ReactNode; disabled?: boolean; onPress?: () => void; testID?: string }) => (
      <ReactNative.Pressable accessibilityRole="menuitem" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID}>
        {children}
      </ReactNative.Pressable>
    ),
    DropdownMenuSeparator: () => <ReactNative.View />,
    DropdownMenuTrigger: ({ children, accessibilityLabel }: { children: React.ReactNode; accessibilityLabel?: string }) => (
      <ReactNative.Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}>{children}</ReactNative.Pressable>
    ),
  };
});

describe('ActionDockSplitContent', () => {
  it('keeps the primary action direct and exposes labeled alternatives through the menu', () => {
    const onActionPress = jest.fn();
    const screen = render(
      <ActionDockSplitContent
        recommendedAction={{ id: 'get', label: 'Get ingredients', icon: 'cart', accessibilityLabel: 'Get ingredients for this Meal' }}
        menuActions={[
          { id: 'cook', label: 'Start cooking', icon: 'play', accessibilityLabel: 'Start cooking' },
          { id: 'plan', label: 'Add to Meal Plan', icon: 'plus', accessibilityLabel: 'Add to Meal Plan' },
        ]}
        disabledActionIds={{ plan: true }}
        menuAccessibilityLabel="Show other Meal actions"
        getMenuTestID={(id) => `meal-action-${id}`}
        onActionPress={onActionPress}
      />,
    );

    fireEvent.press(screen.getByLabelText('Get ingredients for this Meal'));
    fireEvent.press(screen.getByTestId('meal-action-cook'));

    expect(onActionPress).toHaveBeenNthCalledWith(1, 'get', 'primary');
    expect(onActionPress).toHaveBeenNthCalledWith(2, 'cook', 'menu');
    expect(screen.getByLabelText('Show other Meal actions')).toBeTruthy();
    expect(screen.getByTestId('meal-action-plan').props.accessibilityState).toEqual({ disabled: true });
  });
});
