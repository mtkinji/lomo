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

const mockOpenDropdownMenu = jest.fn();

jest.mock('../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const Trigger = React.forwardRef((props: object, ref: import('react').Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      open: mockOpenDropdownMenu,
      close: jest.fn(),
    }));
    return React.createElement(View, props);
  });

  return {
    DropdownMenu: View,
    DropdownMenuTrigger: Trigger,
    DropdownMenuContent: View,
    DropdownMenuItem: Pressable,
    DropdownMenuLabel: Text,
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
  onSetCapabilityPinned: jest.fn(),
};

const chats = [
  { id: 'chat-2', title: 'Plan the school week', updatedAt: '2026-07-22T18:00:00.000Z' },
  { id: 'chat-1', title: 'Tea tomorrow', updatedAt: '2026-07-21T18:00:00.000Z' },
];

const menuDestinations = CAPABILITY_MENU_REGISTRY
  .filter(({ availability }) => availability === 'active')
  .map(({ id, label }) => [id, label] as const);

function differentDestination(id: CapabilityMenuDestinationId): CapabilityMenuDestinationId {
  return id === 'goals' ? 'todos' : 'goals';
}

describe('CapabilityMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a Kwilt menu from a long press and pins only after choosing Pin', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(menu.getByLabelText('Expand More, 3 destinations'));
    fireEvent(menu.getByLabelText('Games'), 'longPress');

    expect(mockOpenDropdownMenu).toHaveBeenCalledTimes(1);
    expect(menu.getByTestId('capability.menu.games.pin-menu').props.align).toBe('start');
    expect(menu.getByLabelText('Pin Games').props.icon).toBe('pushPin');
    expect(handlers.onSetCapabilityPinned).not.toHaveBeenCalled();

    fireEvent.press(menu.getByLabelText('Pin Games'));
    expect(handlers.onSetCapabilityPinned).toHaveBeenCalledWith('games', true);
  });

  it('keeps normal navigation presses separate from the pin menu', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent.press(menu.getByLabelText('Budgets'));

    expect(mockOpenDropdownMenu).not.toHaveBeenCalled();
    expect(handlers.onSetCapabilityPinned).not.toHaveBeenCalled();
    expect(handlers.onSelectCapability).toHaveBeenCalledWith('money-summary');
  });

  it('offers Unpin in the Kwilt menu for a primary destination', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="chores" choresEnabled chats={chats} {...handlers} />,
    );

    fireEvent(menu.getByLabelText('Chores'), 'longPress');

    expect(mockOpenDropdownMenu).toHaveBeenCalledTimes(1);
    expect(menu.getByTestId('capability.menu.chores.pin-menu')).toBeTruthy();
    expect(menu.getByLabelText('Unpin Chores').props.icon).toBe('pushPinOff');
    fireEvent.press(menu.getByLabelText('Unpin Chores'));
    expect(handlers.onSetCapabilityPinned).toHaveBeenCalledWith('chores', false);
  });

  it('offers Pin and Unpin as equivalent accessibility actions', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    fireEvent(menu.getByLabelText('To-dos'), 'accessibilityAction', {
      nativeEvent: { actionName: 'unpin' },
    });
    fireEvent.press(menu.getByLabelText('Expand More, 3 destinations'));
    fireEvent(menu.getByLabelText('Games'), 'accessibilityAction', {
      nativeEvent: { actionName: 'pin' },
    });

    expect(handlers.onSetCapabilityPinned).toHaveBeenNthCalledWith(1, 'todos', false);
    expect(handlers.onSetCapabilityPinned).toHaveBeenNthCalledWith(2, 'games', true);
  });

  it('moves pinned and unpinned destinations while preserving the accepted order', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        choresEnabled
        chats={chats}
        pinOverrides={{ chores: false, games: true }}
        {...handlers}
      />,
    );

    const primaryLabels = within(menu.getByTestId('capability.menu.primary'))
      .getAllByRole('button')
      .map((row) => row.props.accessibilityLabel);
    expect(primaryLabels).toEqual([
      'Budgets',
      'Recipes',
      'Groceries',
      'To-dos',
      'Plans',
      'Goals',
      'Games',
    ]);

    expect(menu.getByText('MORE (3)')).toBeTruthy();
    fireEvent.press(menu.getByLabelText('Expand More, 3 destinations'));
    const moreLabels = within(menu.getByTestId('capability.menu.more.items'))
      .getAllByRole('button')
      .map((row) => row.props.accessibilityLabel);
    expect(moreLabels).toEqual(['Chores', 'Arcs', 'Chapters']);
  });

  it('renders the accepted hierarchy without a close control', () => {
    const { getByText, getByLabelText, getByTestId, queryByLabelText, queryByText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(getByText('Kwilt')).toBeTruthy();
    const header = getByTestId('capability.menu.header');
    expect(header.findByProps({ accessibilityLabel: 'Open profile and settings' })).toBeTruthy();
    expect(getByText('Goals')).toBeTruthy();
    expect(getByText('To-dos')).toBeTruthy();
    expect(getByText('Plans')).toBeTruthy();
    expect(getByText('Budgets')).toBeTruthy();
    expect(queryByText('Transactions')).toBeNull();
    expect(queryByText('Accounts')).toBeNull();
    expect(queryByLabelText('Money')).toBeNull();
    expect(queryByText('MONEY')).toBeNull();
    expect(queryByText('FOOD')).toBeNull();
    expect(queryByText('GOALS & PLANS')).toBeNull();
    expect(queryByText('FUN')).toBeNull();
    expect(getByText('MORE (3)')).toBeTruthy();
    expect(queryByText('Arcs')).toBeNull();
    expect(queryByText('Chapters')).toBeNull();
    expect(queryByText('Games')).toBeNull();
    expect(getByText('CHATS')).toBeTruthy();
    const footer = getByTestId('capability.menu.footer');
    expect(footer.findByProps({ accessibilityLabel: 'Search Kwilt' })).toBeTruthy();
    expect(footer.findByProps({ accessibilityLabel: 'Open chat' })).toBeTruthy();
    expect(getByLabelText('Search Kwilt')).toBeTruthy();
    expect(getByLabelText('Open chat')).toBeTruthy();
    expect(queryByText('Search')).toBeNull();
    expect(queryByLabelText(/close/i)).toBeNull();
  });

  it('groups the profile avatar and settings icon in one settings pill', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    const settingsButton = menu.getByLabelText('Open profile and settings');
    expect(StyleSheet.flatten(settingsButton.props.style)).toMatchObject({
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.gray100,
    });
    expect(menu.getAllByTestId('capability.menu.settings.icon').length).toBeGreaterThan(0);

    fireEvent.press(settingsButton);
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('orders primary destinations by household operations, food, then execution', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        choresEnabled
        displayName="Andy"
        chats={chats}
        {...handlers}
      />,
    );

    const primaryLabels = within(menu.getByTestId('capability.menu.primary'))
      .getAllByRole('button')
      .map((row) => row.props.accessibilityLabel);

    expect(primaryLabels).toEqual([
      'Budgets',
      'Chores',
      'Recipes',
      'Groceries',
      'To-dos',
      'Plans',
      'Goals',
    ]);
  });

  it('keeps Budgets as the only visible Money destination', () => {
    const { getByLabelText, queryByLabelText } = render(
      <CapabilityMenu
        activeCapabilityId="money-summary"
        displayName="Andy"
        chats={chats}
        {...handlers}
      />,
    );

    expect(getByLabelText('Budgets').props.accessibilityState).toEqual({ selected: true });
    expect(queryByLabelText('Transactions')).toBeNull();
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

      if (!menu.queryByTestId(`capability.menu.${id}`)) {
        fireEvent.press(menu.getByLabelText('Expand More, 4 destinations'));
      }
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
    expect(enabled.getByText('MORE (4)')).toBeTruthy();
    expect(enabled.getByLabelText('Collapse More, 4 destinations')).toBeTruthy();
    fireEvent.press(enabled.getByLabelText('Explore'));
    expect(onReselectCapability).toHaveBeenCalledWith('explore');
    expect(handlers.onSelectCapability).not.toHaveBeenCalled();
  });

  it('shows Games in More independently of the Explore feature flag', () => {
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

    expect(getByLabelText('Collapse More, 3 destinations')).toBeTruthy();
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

  it('keeps occasional destinations behind More and can reveal them', () => {
    const { getByLabelText, queryByText, getByText } = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(queryByText('Arcs')).toBeNull();
    expect(queryByText('Chapters')).toBeNull();
    expect(queryByText('Games')).toBeNull();

    expect(getByText('MORE (3)')).toBeTruthy();
    fireEvent.press(getByLabelText('Expand More, 3 destinations'));
    expect(getByText('Arcs')).toBeTruthy();
    expect(getByText('Chapters')).toBeTruthy();
    expect(getByText('Games')).toBeTruthy();

    fireEvent.press(getByLabelText('Collapse More, 3 destinations'));
    expect(queryByText('Arcs')).toBeNull();
  });

  it('counts only More destinations that are currently visible', () => {
    const hidden = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        chats={chats}
        hiddenCapabilityIds={['games']}
        {...handlers}
      />,
    );

    expect(hidden.getByText('MORE (2)')).toBeTruthy();
    expect(hidden.getByLabelText('Expand More, 2 destinations')).toBeTruthy();
  });

  it('reveals More when navigation changes to one of its destinations', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(menu.queryByText('Arcs')).toBeNull();

    menu.rerender(
      <CapabilityMenu activeCapabilityId="arcs" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(menu.getByLabelText('Collapse More, 3 destinations')).toBeTruthy();
    expect(menu.getByLabelText('Arcs').props.accessibilityState).toEqual({ selected: true });
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

  it('moves discovery to collapsed More until its destinations are revealed', () => {
    const menu = render(
      <CapabilityMenu
        activeCapabilityId="todos"
        displayName="Andy"
        chats={chats}
        unvisitedCapabilityIds={['arcs']}
        {...handlers}
      />,
    );

    expect(menu.getByTestId('capability.menu.more.discovery')).toBeTruthy();
    expect(menu.getByLabelText('Expand More, 3 destinations, contains unvisited destinations')).toBeTruthy();

    fireEvent.press(menu.getByLabelText('Expand More, 3 destinations, contains unvisited destinations'));
    expect(menu.queryByTestId('capability.menu.more.discovery')).toBeNull();
    expect(menu.getByTestId('capability.menu.arcs.discovery')).toBeTruthy();
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

  it('aligns the More disclosure and new-chat action in matching trailing slots', () => {
    const menu = render(
      <CapabilityMenu activeCapabilityId="todos" displayName="Andy" chats={chats} {...handlers} />,
    );

    expect(StyleSheet.flatten(menu.getByTestId('capability.menu.more.action').props.style))
      .toMatchObject({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' });
    expect(StyleSheet.flatten(menu.getByLabelText('New chat').props.style))
      .toMatchObject({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' });
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
