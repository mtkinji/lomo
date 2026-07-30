import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import {
  ActivityDurationEditor,
  type ActivityDurationEditorHandle,
} from './ActivityDurationEditor';

const mockActivity = {
  id: 'activity-1',
  title: 'Call Jenny',
  estimateMinutes: 30,
} as Activity;

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? children : null,
}));

jest.mock('./DurationPicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    DurationPicker: ({ onChangeMinutes }: { onChangeMinutes: (minutes: number) => void }) => (
      <Pressable accessibilityLabel="Set 45 minutes" onPress={() => onChangeMinutes(45)}>
        <Text>45 minutes</Text>
      </Pressable>
    ),
  };
});

describe('ActivityDurationEditor', () => {
  beforeEach(() => useAppStore.setState({ activities: [mockActivity] }));
  afterEach(() => act(() => useAppStore.setState({ activities: [] })));

  it('saves a changed duration through the activity store', () => {
    const ref = React.createRef<ActivityDurationEditorHandle>();
    render(<ActivityDurationEditor ref={ref} />);

    act(() => ref.current?.open('activity-1'));
    fireEvent.press(screen.getByLabelText('Set 45 minutes'));
    fireEvent.press(screen.getByText('Save'));

    expect(useAppStore.getState().activities[0]).toMatchObject({ estimateMinutes: 45 });
  });
});
