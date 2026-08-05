import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { SharedHomeDelivery } from './sharedHomeTypes';
import { SharedHomeContent } from './SharedHomeScreen';

const pending: SharedHomeDelivery = {
  id: 'delivery-1', eventKind: 'game_turn', sourceCapability: 'games',
  sourceEntityType: 'game_session', sourceEntityId: 'room-1', actorDisplayName: 'Mina',
  title: 'Your turn', body: 'Mina passed the pattern to you.',
  destination: { kind: 'game_room', sessionId: 'room-1' }, state: 'pending',
  settledReason: null, createdAt: '2026-08-05T10:00:00.000Z',
  updatedAt: '2026-08-05T10:00:00.000Z', settledAt: null, expiresAt: null,
  retainUntil: '2026-09-04T10:00:00.000Z',
};

const checkin: SharedHomeDelivery = {
  id: 'delivery-2', eventKind: 'goal_checkin', sourceCapability: 'goals',
  sourceEntityType: 'goal_checkin', sourceEntityId: 'checkin-1', actorDisplayName: 'David',
  title: 'Plan our family camping trip', body: 'Made progress on the campground shortlist.',
  destination: { kind: 'goal', goalId: 'goal-1' }, state: 'available',
  settledReason: null, createdAt: '2026-08-05T11:00:00.000Z',
  updatedAt: '2026-08-05T11:00:00.000Z', settledAt: null, expiresAt: null,
  retainUntil: '2026-09-04T11:00:00.000Z',
};

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderContent(content: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>{content}</SafeAreaProvider>,
  );
}

describe('SharedHomeContent', () => {
  it('presents an exact pending handoff with one participation action', () => {
    const onOpen = jest.fn();
    const view = renderContent(
      <SharedHomeContent
        items={[pending]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        signedIn
        now={new Date('2026-08-05T12:00:00.000Z')}
        onOpen={onOpen}
        onRefresh={jest.fn()}
      />,
    );
    expect(view.getByText('Needs you')).toBeTruthy();
    expect(view.getByText('Games · 2h ago')).toBeTruthy();
    expect(view.queryByText('Unread')).toBeNull();
    fireEvent.press(view.getByText('Take your turn'));
    expect(onOpen).toHaveBeenCalledWith(pending);
  });

  it('redacts unavailable activity and offers no action', () => {
    const view = renderContent(
      <SharedHomeContent
        items={[{ ...pending, state: 'unavailable', title: 'No longer available', body: 'This shared item is no longer available.' }]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        signedIn
        now={new Date('2026-08-05T12:00:00.000Z')}
        onOpen={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
    expect(view.getByText('Shared with you')).toBeTruthy();
    expect(view.getByText('Unavailable')).toBeTruthy();
    expect(view.queryByText('Take your turn')).toBeNull();
  });

  it('presents available shared content with sender context and its source action', () => {
    const onOpen = jest.fn();
    const view = renderContent(
      <SharedHomeContent
        items={[checkin]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        signedIn
        now={new Date('2026-08-05T12:00:00.000Z')}
        onOpen={onOpen}
        onRefresh={jest.fn()}
      />,
    );
    expect(view.getByText('Shared with you')).toBeTruthy();
    expect(view.getByText('David')).toBeTruthy();
    expect(view.getByText('Goals · 1h ago')).toBeTruthy();
    expect(view.getByText('Plan our family camping trip')).toBeTruthy();
    fireEvent.press(view.getByText('Open Goal'));
    expect(onOpen).toHaveBeenCalledWith(checkin);
  });

  it('centers the empty state in the available page', () => {
    const view = renderContent(
      <SharedHomeContent
        items={[]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        signedIn
        onOpen={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
    expect(StyleSheet.flatten(view.getByTestId('sharedHome.empty').props.style)).toMatchObject({
      flex: 1,
      justifyContent: 'center',
    });
  });

  it('distinguishes stale saved activity from a blocking error', () => {
    const view = renderContent(
      <SharedHomeContent
        items={[pending]}
        loading={false}
        refreshing={false}
        stale
        error="Shared activity could not be refreshed."
        signedIn
        onOpen={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );
    expect(view.getByText('Showing saved activity. Pull to refresh.')).toBeTruthy();
    expect(view.queryByText('Shared activity could not be loaded')).toBeNull();
  });
});
