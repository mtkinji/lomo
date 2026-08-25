import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { HapticsService } from '../services/HapticsService';
import { Pressable, TouchableOpacity } from './HapticPressable';

let mockTriggerSequence = 0;
jest.mock('../services/HapticsService', () => ({
  HapticsService: {
    getTriggerSequence: jest.fn(() => mockTriggerSequence),
    trigger: jest.fn(async () => {
      mockTriggerSequence += 1;
    }),
  },
}));

describe('app-owned press feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerSequence = 0;
  });

  it.each([
    ['Pressable', Pressable],
    ['TouchableOpacity', TouchableOpacity],
  ])('gives every enabled %s a subtle default haptic', (_name, Control) => {
    const onPress = jest.fn();
    const screen = render(
      <Control accessibilityRole="button" accessibilityLabel="Open" onPress={onPress}>
        <Text>Open</Text>
      </Control>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open' }));

    expect(HapticsService.trigger).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.selection');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('allows a specialized interaction to own its semantic haptic', () => {
    const onPress = jest.fn();
    const screen = render(
      <Pressable accessibilityRole="button" accessibilityLabel="Add" haptic="canvas.toggle.on" onPress={onPress}>
        <Text>Add</Text>
      </Pressable>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    expect(HapticsService.trigger).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.toggle.on');
  });

  it('does not add a generic pulse when the handler already triggers semantic feedback', () => {
    const screen = render(
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add"
        onPress={() => { void HapticsService.trigger('canvas.toggle.on'); }}
      >
        <Text>Add</Text>
      </Pressable>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    expect(HapticsService.trigger).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.toggle.on');
  });

  it('does not fire when the control is disabled or explicitly opts out', () => {
    const screen = render(
      <>
        <Pressable accessibilityRole="button" accessibilityLabel="Disabled" disabled onPress={jest.fn()}>
          <Text>Disabled</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Silent" haptic={false} onPress={jest.fn()}>
          <Text>Silent</Text>
        </Pressable>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Disabled' }).props.onPress).toBeUndefined();
    fireEvent.press(screen.getByRole('button', { name: 'Silent' }));

    expect(HapticsService.trigger).not.toHaveBeenCalled();
  });
});
