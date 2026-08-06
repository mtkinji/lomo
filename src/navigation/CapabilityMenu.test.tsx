import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CapabilityMenu } from './CapabilityMenu';
import { colors } from '../theme';

type MockSwipeableProps = {
  children: import('react').ReactNode;
  renderLeftActions?: (
    progress: null,
    translation: null,
    instance: { close: () => void },
  ) => import('react').ReactNode;
  renderRightActions?: (
    progress: null,
    translation: null,
    instance: { close: () => void },
  ) => import('react').ReactNode;
};

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const swipeable = { close: jest.fn() };
  return {
    __esModule: true,
    default: ({ children, renderLeftActions, renderRightActions }: MockSwipeableProps) =>
      React.createElement(
        View,
        null,
        renderLeftActions?.(null, null, swipeable),
        children,
        renderRightActions?.(null, null, swipeable),
      ),
  };
});

const handlers = {
  onSelectCapability: jest.fn(),
  onSelectChat: jest.fn(),
  onArchiveChat: jest.fn(),
  onDeleteChat: jest.fn(),
  onCreateChat: jest.fn(),
  onOpenSearch: jest.fn(),
  onOpenSettings: jest.fn(),
  onOpenHome: jest.fn(),
  onOpenChat: jest.fn(),
};

const chats = [
  { id: 'chat-2', title: 'Plan the school week', updatedAt: '2026-07-22T18:00:00.000Z' },
  { id: 'chat-1', title: 'Tea tomorrow', updatedAt: '2026-07-21T18:00:00.000Z' },
];

describe('CapabilityMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the accepted hierarchy without a close control', () => {
    const { getByText, getByLabelText, getByTestId, queryByLabelText, queryByText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByText('Kwilt')).toBeTruthy();
    const header = getByTestId('capability.menu.header');
    expect(header.findByProps({ accessibilityLabel: 'Open profile and settings' })).toBeTruthy();
    expect(getByText('GOALS & PLANS')).toBeTruthy();
    expect(getByText('Goals')).toBeTruthy();
    expect(getByText('To-dos')).toBeTruthy();
    expect(getByText('Plan')).toBeTruthy();
    expect(getByText('Arcs')).toBeTruthy();
    expect(getByText('Chapters')).toBeTruthy();
    expect(getByText('MONEY')).toBeTruthy();
    expect(getByText('Summary')).toBeTruthy();
    expect(getByText('Transactions')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
    expect(queryByLabelText('Money')).toBeNull();
    expect(getByText('FUN')).toBeTruthy();
    expect(getByText('CHATS')).toBeTruthy();
    const footer = getByTestId('capability.menu.footer');
    expect(footer.findByProps({ accessibilityLabel: 'Search Kwilt' })).toBeTruthy();
    expect(footer.findByProps({ accessibilityLabel: 'Open chat' })).toBeTruthy();
    expect(getByLabelText('Search Kwilt')).toBeTruthy();
    expect(getByLabelText('Open chat')).toBeTruthy();
    expect(queryByText('Search')).toBeNull();
    expect(queryByLabelText(/close/i)).toBeNull();
  });

  it('selects each Money destination directly from the global menu', () => {
    const { getByLabelText } = render(
      <CapabilityMenu
        activeCapabilityId="money-summary"
        displayName="Andy"
        chats={chats}
        {...handlers}
      />,
    );

    expect(getByLabelText('Summary').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Transactions'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('money-transactions');
  });

  it('calls the Money summary destination Budget only when the living-limit answer is enabled', () => {
    const enabled = render(
      <CapabilityMenu activeCapabilityId="money-summary" displayName="Andy" chats={chats} moneyLivingLimitEnabled {...handlers} />,
    );
    expect(enabled.getByLabelText('Budget').props.accessibilityState).toEqual({ selected: true });
    expect(enabled.queryByLabelText('Summary')).toBeNull();
  });

  it('shows Explore only when its feature flag is enabled', () => {
    const hidden = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );
    expect(hidden.queryByLabelText('Explore')).toBeNull();
    hidden.unmount();

    const enabled = render(
      <CapabilityMenu
        activeCapabilityId="explore"
        displayName="Andy"
        chats={chats}
        exploreEnabled
        {...handlers}
      />,
    );
    expect(enabled.getByLabelText('Explore').props.accessibilityState).toEqual({ selected: true });
    expect(enabled.getByLabelText('Collapse Fun')).toBeTruthy();
    fireEvent.press(enabled.getByLabelText('Explore'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('explore');
  });

  it('always shows Games under Fun independently of the Explore feature flag', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="games" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByLabelText('Collapse Fun')).toBeTruthy();
    expect(getByLabelText('Games').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Games'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('games');
  });

  it('shows three Food capabilities only when food-loop-v1 is enabled', () => {
    const hidden = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );
    expect(hidden.queryByLabelText('Recipes')).toBeNull();
    expect(hidden.queryByLabelText('Meal Planning')).toBeNull();
    expect(hidden.queryByLabelText('Groceries')).toBeNull();
    hidden.unmount();

    const enabled = render(
      <CapabilityMenu activeCapabilityId="meal-planning" displayName="Andy" chats={chats} foodEnabled {...handlers} />,
    );
    expect(enabled.getByLabelText('Recipes')).toBeTruthy();
    expect(enabled.getByLabelText('Meal Planning').props.accessibilityState).toEqual({ selected: true });
    expect(enabled.getByLabelText('Groceries')).toBeTruthy();
    fireEvent.press(enabled.getByLabelText('Groceries'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('groceries');
  });

  it('collapses and expands a capability group', () => {
    const { getByLabelText, queryByText, getByText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(getByLabelText('Collapse Goals & Plans'));
    expect(queryByText('To-dos')).toBeNull();

    fireEvent.press(getByLabelText('Expand Goals & Plans'));
    expect(getByText('To-dos')).toBeTruthy();
  });

  it('marks and selects the active capability', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByLabelText('To-dos').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Plan'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('plan');
  });

  it('uses neutral launcher chrome rather than Pine accents', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(StyleSheet.flatten(getByLabelText('To-dos').props.style)?.backgroundColor).toBe(
      colors.gray100,
    );
    expect(StyleSheet.flatten(getByLabelText('Open chat').props.style)?.backgroundColor).toBe(
      colors.sumi900,
    );
  });

  it('reuses global search and settings and opens durable Chat', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(getByLabelText('Search Kwilt'));
    fireEvent.press(getByLabelText('Open profile and settings'));
    fireEvent.press(getByLabelText('Open chat'));

    expect(handlers.onOpenSearch).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('replaces the single Chat footer action with distinct Home and Ask actions when enabled', () => {
    const { getByLabelText, queryByLabelText } = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        displayName="Andy"
        chats={chats}
        sharedHomeEnabled
        {...handlers}
      />,
    );

    expect(queryByLabelText('Open chat')).toBeNull();
    fireEvent.press(getByLabelText('Open Home'));
    fireEvent.press(getByLabelText('Ask Kwilt'));
    expect(handlers.onOpenHome).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('renders and opens every chat from the scrollable menu and owns chat creation there', () => {
    const { getByLabelText, getByText } = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByText('Plan the school week')).toBeTruthy();
    expect(getByText('Tea tomorrow')).toBeTruthy();
    fireEvent.press(getByLabelText('New chat'));
    fireEvent.press(getByLabelText('Open chat Plan the school week'));

    expect(handlers.onCreateChat).toHaveBeenCalledTimes(1);
    expect(handlers.onSelectChat).toHaveBeenCalledWith('chat-2');
  });

  it('exposes archive to the right and delete to the left for each chat', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(getByLabelText('Archive Plan the school week'));
    fireEvent.press(getByLabelText('Delete Plan the school week'));

    expect(handlers.onArchiveChat).toHaveBeenCalledWith('chat-2');
    expect(handlers.onDeleteChat).toHaveBeenCalledWith('chat-2');
  });

  it('offers the same cleanup actions without requiring a swipe', () => {
    const { getByLabelText } = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );
    const row = getByLabelText('Open chat Plan the school week');

    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'archive' } });
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });

    expect(handlers.onArchiveChat).toHaveBeenCalledWith('chat-2');
    expect(handlers.onDeleteChat).toHaveBeenCalledWith('chat-2');
  });
});
