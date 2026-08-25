import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CapabilityMenu } from './CapabilityMenu';
import { CAPABILITY_MENU_REGISTRY } from '../capabilities/registry';
import type { CapabilityMenuDestinationId } from '../capabilities/types';
import { colors, fonts, radii } from '../theme';

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

const menuDestinations = CAPABILITY_MENU_REGISTRY.map(({ id, label }) => [id, label] as const);

function differentDestination(id: CapabilityMenuDestinationId): CapabilityMenuDestinationId {
  return id === 'goals' ? 'todos' : 'goals';
}

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
    expect(getByText('Plans')).toBeTruthy();
    expect(getByText('Arcs')).toBeTruthy();
    expect(getByText('Chapters')).toBeTruthy();
    expect(getByText('MONEY')).toBeTruthy();
    expect(getByText('Budgets')).toBeTruthy();
    expect(getByText('Transactions')).toBeTruthy();
    expect(queryByText('Accounts')).toBeNull();
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

  it('selects each visible Money destination directly from the global menu', () => {
    const { getByLabelText } = render(
      <CapabilityMenu
        activeCapabilityId="money-summary"
        displayName="Andy"
        chats={chats}
        {...handlers}
      />,
    );

    expect(getByLabelText('Budgets').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Transactions'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('money-transactions');
  });

  it.each(menuDestinations)(
    'covers the menu without navigating when %s is already selected',
    (id, label) => {
      const onReselectCapability = jest.fn();
      const menu = render(
        <CapabilityMenu
          activeCapabilityId={id}
          chats={chats}
          {...handlers}
          exploreEnabled
          choresEnabled
          onReselectCapability={onReselectCapability}
        />,
      );

      fireEvent.press(menu.getByLabelText(label));

      expect(onReselectCapability).toHaveBeenCalledTimes(1);
      expect(onReselectCapability).toHaveBeenCalledWith(id);
      expect(handlers.onSelectCapability).not.toHaveBeenCalled();
    },
  );

  it.each(menuDestinations)(
    'navigates exactly once when selecting %s from another destination',
    (id) => {
      const onReselectCapability = jest.fn();
      const menu = render(
        <CapabilityMenu
          activeCapabilityId={differentDestination(id)}
          chats={chats}
          {...handlers}
          exploreEnabled
          choresEnabled
          onReselectCapability={onReselectCapability}
        />,
      );

      fireEvent.press(menu.getByTestId(`capability.menu.${id}`));

      expect(handlers.onSelectCapability).toHaveBeenCalledTimes(1);
      expect(handlers.onSelectCapability).toHaveBeenCalledWith(id);
      expect(onReselectCapability).not.toHaveBeenCalled();
    },
  );

  it('covers the menu without navigating when Budgets is already selected', () => {
    const onReselectCapability = jest.fn();
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="money-summary"
        chats={chats}
        {...handlers}
        onReselectCapability={onReselectCapability}
      />,
    );

    fireEvent.press(menu.getByLabelText('Budgets'));

    expect(onReselectCapability).toHaveBeenCalledWith('money-summary');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
  });

  it('can hide pristine Transactions without hiding Budgets', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId={null}
        chats={chats}
        hiddenCapabilityIds={['money-transactions']}
        {...handlers}
      />,
    );

    expect(menu.getByLabelText('Budgets')).toBeTruthy();
    expect(menu.queryByLabelText('Transactions')).toBeNull();
    expect(menu.queryByLabelText('Accounts')).toBeNull();
  });

  it('uses the user-facing Budgets name for the Money home destination', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="money-summary" displayName="Andy" chats={chats} {...handlers} />,
    );
    expect(menu.getByLabelText('Budgets').props.accessibilityState).toEqual({ selected: true });
    expect(menu.queryByLabelText('Summary')).toBeNull();
  });

  it('shows Explore only when its feature flag is enabled', () => {
    const onReselectCapability = jest.fn();
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
        onReselectCapability={onReselectCapability}
      />,
    );
    expect(enabled.getByLabelText('Explore').props.accessibilityState).toEqual({ selected: true });
    expect(enabled.getByLabelText('Collapse Fun')).toBeTruthy();
    fireEvent.press(enabled.getByLabelText('Explore'));
    expect(onReselectCapability).toHaveBeenCalledWith('explore');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
  });

  it('always shows Games under Fun independently of the Explore feature flag', () => {
    const onReselectCapability = jest.fn();
    const { getByLabelText } = render(
      <CapabilityMenu
        activeCapabilityId="games"
        displayName="Andy"
        chats={chats}
        {...handlers}
        onReselectCapability={onReselectCapability}
      />,
    );

    expect(getByLabelText('Collapse Fun')).toBeTruthy();
    expect(getByLabelText('Games').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByLabelText('Games'));
    expect(onReselectCapability).toHaveBeenCalledWith('games');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
  });

  it('shows Chores as a direct capability only after explicit Labs activation', () => {
    const onReselectCapability = jest.fn();
    const hidden = render(
      <CapabilityMenu activeCapabilityId={null} displayName="Andy" chats={chats} {...handlers} />,
    );
    expect(hidden.queryByLabelText('Chores')).toBeNull();

    const enabled = render(
      <CapabilityMenu
        activeCapabilityId="chores"
        choresEnabled
        displayName="Andy"
        chats={chats}
        {...handlers}
        onReselectCapability={onReselectCapability}
      />,
    );
    expect(enabled.getByLabelText('Chores').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(enabled.getByLabelText('Chores'));
    expect(onReselectCapability).toHaveBeenCalledWith('chores');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
  });

  it('shows a caregiver review count on Chores without creating a global inbox', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId={null}
        choresEnabled
        choresAttentionCount={2}
        displayName="Andy"
        chats={chats}
        {...handlers}
      />,
    );

    expect(menu.getByLabelText('Chores, 2 ready for review')).toBeTruthy();
    const attentionBadge = menu.getByTestId('capability.menu.chores.attention');
    expect(StyleSheet.flatten(attentionBadge.props.style))
      .toMatchObject({ backgroundColor: colors.actionAttention });
    expect(StyleSheet.flatten(within(attentionBadge).getByText('2').props.style))
      .toMatchObject({ color: colors.actionAttentionForeground });
    expect(menu.queryByText(/notification|inbox/i)).toBeNull();
  });

  it('always shows Recipes and Groceries as separate Food destinations', () => {
    const onReselectCapability = jest.fn();
    const enabled = render(
      <CapabilityMenu
        activeCapabilityId="recipes"
        displayName="Andy"
        chats={chats}
        {...handlers}
        onReselectCapability={onReselectCapability}
      />,
    );
    expect(enabled.getByLabelText('Recipes').props.accessibilityState).toEqual({ selected: true });
    expect(StyleSheet.flatten(enabled.getByText('Recipes').props.style))
      .toMatchObject({ fontFamily: fonts.bold });
    expect(enabled.queryByLabelText('Meal Plan')).toBeNull();
    expect(enabled.getByLabelText('Groceries')).toBeTruthy();
    fireEvent.press(enabled.getByLabelText('Recipes'));
    expect(onReselectCapability).toHaveBeenCalledWith('recipes');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
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
    fireEvent.press(getByLabelText('Plans'));
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('plan');
  });

  it('shows calm discovery dots only for destinations that remain unvisited', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        displayName="Andy"
        chats={chats}
        unvisitedCapabilityIds={['goals', 'plan', 'chores']}
        choresEnabled
        {...handlers}
      />,
    );

    const discoveryDot = menu.getByTestId('capability.menu.goals.discovery');
    expect(StyleSheet.flatten(discoveryDot.props.style)).toMatchObject({
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.navigationDiscovery,
    });
    expect(menu.getByTestId('capability.menu.plan.discovery')).toBeTruthy();
    expect(menu.getByTestId('capability.menu.chores.discovery')).toBeTruthy();
    expect(menu.queryByTestId('capability.menu.todos.discovery')).toBeNull();
    expect(menu.getByLabelText('Goals, not yet visited')).toBeTruthy();
  });

  it('shows recipient-owned Meal Plan attention on Recipes without turning it into a count', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        displayName="Andy"
        chats={chats}
        mealPlanNeedsAttention
        {...handlers}
      />,
    );

    expect(menu.getByTestId('capability.menu.recipes.attention')).toBeTruthy();
    expect(menu.getByLabelText('Recipes, new meal ideas')).toBeTruthy();
  });

  it('moves discovery to a collapsed group header until its destinations are revealed', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        displayName="Andy"
        chats={chats}
        unvisitedCapabilityIds={['goals']}
        {...handlers}
      />,
    );

    expect(menu.queryByTestId('capability.menu.group.goals-plans.discovery')).toBeNull();
    fireEvent.press(menu.getByLabelText('Collapse Goals & Plans'));
    expect(menu.getByTestId('capability.menu.group.goals-plans.discovery')).toBeTruthy();
    expect(menu.getByLabelText('Expand Goals & Plans, contains unvisited destinations')).toBeTruthy();
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
    expect(StyleSheet.flatten(getByLabelText('Open chat').props.style)).toMatchObject({
      minHeight: 44,
      paddingHorizontal: 20,
      gap: 8,
      borderRadius: radii.pill,
    });
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
