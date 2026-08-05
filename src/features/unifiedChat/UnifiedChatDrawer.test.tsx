import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { UnifiedChatLaunchContext } from './launchContext';
import { UnifiedChatDrawer } from './UnifiedChatDrawer';

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({
    children,
    snapIndex,
    contentExtendsIntoBottomSafeArea,
    sheetStyle,
    onSnapIndexChange,
    chrome,
  }: {
    children: React.ReactNode;
    snapIndex: number;
    contentExtendsIntoBottomSafeArea?: boolean;
    sheetStyle?: unknown;
    onSnapIndexChange: (index: number, change: { previousIndex: number | null; direction: string }) => void;
    chrome?: string;
  }) => {
    const {
      Pressable: MockPressable,
      StyleSheet: MockStyleSheet,
      View: MockView,
    } = require('react-native');
    return (
      <MockView
        testID="chat-bottom-drawer"
        accessibilityValue={{
          min: MockStyleSheet.flatten(sheetStyle)?.paddingBottom ?? 0,
          now: snapIndex,
          text: contentExtendsIntoBottomSafeArea ? 'workbench-owns-bottom-inset' : 'drawer-owns-bottom-inset',
        }}
        accessibilityHint={JSON.stringify({ chrome })}
      >
        {children}
        <MockPressable
          accessibilityLabel="Collapse contextual Chat"
          onPress={() => onSnapIndexChange(0, { previousIndex: 1, direction: 'down' })}
        />
      </MockView>
    );
  },
}));

jest.mock('./UnifiedChatScreen', () => ({
  UnifiedChatScreen: ({
    onComposerFocusChange,
    onThreadIdChange,
    routeParams,
    collapseRequestId,
  }: {
    onComposerFocusChange: (focused: boolean) => void;
    onThreadIdChange: (threadId: string) => void;
    routeParams: { entry?: string; source?: string; threadId?: string; launchContext?: unknown };
    collapseRequestId?: number;
  }) => {
    const {
      Pressable: MockPressable,
      Text: MockText,
      View: MockView,
    } = require('react-native');
    return (
    <MockView>
      <MockText testID="chat-route-state">
        {`${routeParams.entry ?? 'thread'}:${routeParams.threadId ?? 'none'}:${routeParams.launchContext ? 'context' : 'no-context'}`}
      </MockText>
      <MockText testID="chat-route-source">{routeParams.source ?? 'none'}</MockText>
      <MockText testID="chat-collapse-request">{collapseRequestId ?? 0}</MockText>
      <MockPressable accessibilityLabel="Focus embedded Chat" onPress={() => onComposerFocusChange(true)} />
      <MockPressable accessibilityLabel="Create embedded Chat thread" onPress={() => onThreadIdChange('thread-1')} />
    </MockView>
    );
  },
}));

const launchContext: UnifiedChatLaunchContext = {
  capabilityId: 'todos',
  surface: 'inventory',
  returnTarget: { name: 'MainTabs', params: { screen: 'ActivitiesTab' } },
};

describe('UnifiedChatDrawer', () => {
  it('starts as a contextual unsaved draft and expands when the composer focuses', () => {
    const { getByLabelText, getByTestId } = render(
      <UnifiedChatDrawer
        visible
        onClose={jest.fn()}
        launchContext={launchContext}
        scopeLabel="All to-dos"
        threadId={null}
        onThreadIdChange={jest.fn()}
      />,
    );

    expect(getByTestId('chat-route-state').props.children).toBe('fresh:none:context');
    expect(getByTestId('chat-bottom-drawer').props.accessibilityValue.now).toBe(0);
    expect(getByTestId('chat-bottom-drawer').props.accessibilityValue.text).toBe('workbench-owns-bottom-inset');
    expect(JSON.parse(getByTestId('chat-bottom-drawer').props.accessibilityHint)).toEqual({ chrome: 'immersive' });

    fireEvent.press(getByLabelText('Focus embedded Chat'));

    expect(getByTestId('chat-bottom-drawer').props.accessibilityValue.now).toBe(1);
    fireEvent.press(getByLabelText('Collapse contextual Chat'));

    expect(getByTestId('chat-bottom-drawer').props.accessibilityValue.now).toBe(0);
    expect(getByTestId('chat-collapse-request').props.children).toBe(1);
  });

  it('reopens the durable thread without reattaching launch context', () => {
    const onThreadIdChange = jest.fn();
    const { getByLabelText, getByTestId, rerender } = render(
      <UnifiedChatDrawer
        visible
        onClose={jest.fn()}
        launchContext={launchContext}
        scopeLabel="All to-dos"
        threadId={null}
        onThreadIdChange={onThreadIdChange}
      />,
    );

    fireEvent.press(getByLabelText('Create embedded Chat thread'));
    expect(onThreadIdChange).toHaveBeenCalledWith('thread-1');

    rerender(
      <UnifiedChatDrawer
        visible
        onClose={jest.fn()}
        launchContext={launchContext}
        scopeLabel="All to-dos"
        threadId="thread-1"
        onThreadIdChange={onThreadIdChange}
      />,
    );

    expect(getByTestId('chat-route-state').props.children).toBe('thread:thread-1:no-context');
  });

  it('labels a fresh Goal-context drawer launch distinctly', () => {
    const goalLaunchContext: UnifiedChatLaunchContext = {
      capabilityId: 'goals',
      surface: 'detail',
      object: { type: 'goal', id: 'goal-1' },
      returnTarget: { name: 'MainTabs' },
    };
    const { getByTestId } = render(
      <UnifiedChatDrawer
        visible
        onClose={jest.fn()}
        launchContext={goalLaunchContext}
        scopeLabel="Read together"
        source="goal_contextual_drawer"
        threadId={null}
        onThreadIdChange={jest.fn()}
      />,
    );

    expect(getByTestId('chat-route-source').props.children).toBe('goal_contextual_drawer');
  });
});
