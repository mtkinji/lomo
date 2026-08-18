import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Image, StyleSheet } from 'react-native';
import { ChoresScreen } from './ChoresScreen';
import { resetChoreLearningStoreForTests } from '../runtime/useChoreLearningStore';
import { useAppStore } from '../../../store/useAppStore';
import { colors } from '../../../theme';

const mockOpenMenu = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
let mockCapabilityMenuOpen = false;
let mockActiveCapabilityId: 'chores' | null = 'chores';

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

jest.mock('../../../utils/persistImageUri', () => ({
  persistImageUri: async ({ uri }: { uri: string }) => `file://persisted-${uri.split('/').pop()}`,
}));

jest.mock('../../../navigation/CapabilityShellContext', () => ({
  useCapabilityShell: () => ({ openMenu: mockOpenMenu, activeCapabilityId: mockActiveCapabilityId }),
}));

jest.mock('../../../navigation/CapabilityMenuStateContext', () => ({
  useCapabilityMenuOpen: () => mockCapabilityMenuOpen,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
}));

jest.mock('../../../ui/BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children, bottomAccessory }: {
      visible: boolean;
      children: ReactNode;
      bottomAccessory?: ReactNode;
    }) => visible ? React.createElement(View, null, children, bottomAccessory) : null,
    BottomDrawerScrollView: ({ children, ...props }: { children: ReactNode }) => (
      React.createElement(View, props, children)
    ),
    useBottomDrawerParentActionInsets: () => ({ inline: 0, bottom: 0 }),
  };
});

jest.mock('../../../ui/BottomGuide', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomGuide: ({ visible, children }: { visible: boolean; children: ReactNode }) => (
      visible ? React.createElement(View, { testID: 'chores.review.guide' }, children) : null
    ),
  };
});

jest.mock('../../../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const MenuContext = React.createContext({
    open: false,
    setOpen: (_open: boolean) => undefined,
  });

  return {
    DropdownMenu: ({ children }: { children: ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      return React.createElement(MenuContext.Provider, { value: { open, setOpen } }, children);
    },
    DropdownMenuTrigger: ({ children, accessibilityLabel }: {
      children: ReactNode;
      accessibilityLabel?: string;
    }) => {
      const { setOpen } = React.useContext(MenuContext);
      return React.createElement(
        Pressable,
        { accessibilityLabel, accessibilityRole: 'button', onPress: () => setOpen(true) },
        children,
      );
    },
    DropdownMenuContent: ({ children, testID }: { children: ReactNode; testID?: string }) => {
      const { open } = React.useContext(MenuContext);
      return open ? React.createElement(View, { testID }, children) : null;
    },
    DropdownMenuLabel: ({ children }: { children: ReactNode }) => React.createElement(Text, null, children),
    DropdownMenuItem: ({ children, label, accessibilityLabel, selected, onPress }: {
      children?: ReactNode;
      label?: string;
      accessibilityLabel?: string;
      selected?: boolean;
      onPress?: () => void;
    }) => {
      const { setOpen } = React.useContext(MenuContext);
      return React.createElement(
        Pressable,
        {
          accessibilityLabel: accessibilityLabel ?? label,
          accessibilityRole: 'menuitem',
          accessibilityState: { selected },
          onPress: () => { onPress?.(); setOpen(false); },
        },
        children ?? React.createElement(Text, null, label),
      );
    },
  };
});

describe('ChoresScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilityMenuOpen = false;
    mockActiveCapabilityId = 'chores';
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
    act(() => resetChoreLearningStoreForTests());
    useAppStore.setState({ authIdentity: null });
  });

  it('renders the quiet member-first inventory with token language absent by default', () => {
    const screen = render(<ChoresScreen />);

    expect(screen.getByText('Chores')).toBeTruthy();
    expect(screen.getByLabelText('Switch household member, Charlie')).toBeTruthy();
    expect(screen.queryByText('1 of 3 chores')).toBeNull();
    expect(screen.getByText('My chores')).toBeTruthy();
    expect(screen.getByText('Choose a chore')).toBeTruthy();
    expect(screen.getByText('1 chore left today · Choose 3 more by Friday')).toBeTruthy();
    expect(screen.getByText('1 waiting for approval · Needed for weekend Screen Time')).toBeTruthy();
    expect(screen.getByText('Waiting for approval')).toBeTruthy();
    expect(screen.queryByText(/token/i)).toBeNull();
    expect(screen.queryByText(/dashboard|ranking|streak/i)).toBeNull();
  });

  it('uses the shared To-do row grammar and keeps rewards in one metadata line', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));
    fireEvent.press(screen.getByLabelText('Chore settings'));
    fireEvent.press(within(screen.getByTestId('chores.settings.drawer')).getByLabelText('Use tokens'));
    fireEvent.press(screen.getByLabelText('Switch household member, Andrew'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Charlie'));

    const readyRow = screen.getByTestId('chores.occurrence.activity-occurrence-charlie-feed-scout-2026-08-17');
    expect(within(readyRow).getByText('2')).toBeTruthy();
    expect(within(readyRow).getByLabelText('Earns 2 tokens')).toBeTruthy();
    expect(StyleSheet.flatten(within(readyRow).getByTestId('activity-completion-indicator').props.style))
      .toMatchObject({ width: 22, height: 22, borderRadius: 7 });

    const waitingRow = screen.getByTestId('chores.occurrence.activity-occurrence-charlie-entry-shoes-2026-08-17');
    expect(within(waitingRow).getByText('1 · Waiting for approval')).toBeTruthy();
    expect(within(waitingRow).getByLabelText('Earns 1 token. Waiting for approval')).toBeTruthy();

    const completedRow = screen.getByTestId('chores.occurrence.activity-occurrence-charlie-breakfast-dishes-2026-08-17');
    expect(within(completedRow).getByText('1')).toBeTruthy();
    expect(within(completedRow).queryByText('Done')).toBeNull();
    expect(StyleSheet.flatten(within(completedRow).getByTestId('activity-completion-indicator').props.style))
      .toMatchObject({
        width: 22,
        height: 22,
        borderRadius: 7,
        borderColor: colors.primary,
        backgroundColor: colors.primary,
      });
  });

  it('shows the signed-in caregiver avatar when viewing chores as that caregiver', () => {
    useAppStore.setState({
      authIdentity: {
        userId: 'andrew-user',
        name: 'Andrew',
        avatarUrl: 'https://example.test/andrew.jpg',
      },
    });
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.UNSAFE_getAllByType(Image).some((avatar) => (
      avatar.props.source?.uri === 'https://example.test/andrew.jpg'
    ))).toBe(true);
  });

  it('opens a lightweight detail drawer from the row while keeping completion direct', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    const drawer = screen.getByTestId('chores.detail.drawer');
    expect(within(drawer).getByText('What done looks like')).toBeTruthy();
    expect(within(drawer).getByText('Scout has food, and the water bowl is full of fresh water.')).toBeTruthy();
    expect(screen.getByText('Mark done')).toBeTruthy();
    expect(within(drawer).queryByText(/token/i)).toBeNull();
  });

  it('lets the active child attach an optional photo from chore details', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picker/scout.jpg' }],
    });
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    fireEvent.press(screen.getByLabelText('Add chore photo'));

    await waitFor(() => expect(screen.getByLabelText("Charlie's chore photo")).toBeTruthy());
    expect(screen.getByLabelText('Change chore photo')).toBeTruthy();
  });

  it('moves a household occurrence into the member list with Take', () => {
    const screen = render(<ChoresScreen />);
    const household = screen.getByTestId('chores.section.household');

    fireEvent.press(within(household).getByLabelText('Take Take the recycling to the blue bin'));

    expect(within(screen.getByTestId('chores.section.for-member')).getByText('Take the recycling to the blue bin')).toBeTruthy();
    expect(within(screen.getByTestId('chores.section.household')).queryByText('Take the recycling to the blue bin')).toBeNull();
    const claimedRow = screen.getByTestId('chores.occurrence.activity-occurrence-household-recycling-2026-08-17');
    const claimedMenu = within(claimedRow).getByLabelText('More options for Take the recycling to the blue bin');
    expect(within(claimedRow).queryByTestId('activity-meta-row')).toBeNull();
    fireEvent.press(claimedMenu);
    expect(screen.getByText('Return to family list')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Return Take the recycling to the blue bin to the family list'));
    expect(within(screen.getByTestId('chores.section.household')).getByText('Take the recycling to the blue bin')).toBeTruthy();
  });

  it('completes trusted assigned work from the row control', async () => {
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T18:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Complete Feed Scout and refill the water bowl'));

    await waitFor(() => expect(screen.getByLabelText('Feed Scout and refill the water bowl, completed')).toBeTruthy());
    expect(screen.getByText('Daily chores submitted · Choose 3 more by Friday')).toBeTruthy();
    expect(screen.queryByText(/token/i)).toBeNull();
  });

  it('lets a caregiver opt the household into tokens', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));
    fireEvent.press(screen.getByLabelText('Chore settings'));
    fireEvent.press(within(screen.getByTestId('chores.settings.drawer')).getByLabelText('Use tokens'));
    fireEvent.press(screen.getByLabelText('Switch household member, Andrew'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Charlie'));

    expect(screen.getByLabelText('8 tokens')).toBeTruthy();
    expect(screen.getAllByLabelText('Earns 2 tokens').length).toBeGreaterThan(0);
    expect(screen.queryByText(/earned/i)).toBeNull();
  });

  it('opens the active agreement without exposing inactive policy vocabulary', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('How my chores work'));

    const drawer = screen.getByTestId('chores.agreement.drawer');
    expect(within(drawer).getByText('Every day')).toBeTruthy();
    expect(within(drawer).getByText('Finish your daily chores.')).toBeTruthy();
    expect(within(drawer).getByText('By Friday')).toBeTruthy();
    expect(within(drawer).getByText('Choose 12 chores from the family list.')).toBeTruthy();
    expect(within(drawer).getByText('Weekend Screen Time')).toBeTruthy();
    expect(within(drawer).queryByText(/token/i)).toBeNull();
  });

  it('shows caregiver review attention and resolves a single approval in detail', () => {
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T19:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(within(screen.getByTestId('chores.review.guide')).getByText('1 chore ready for review')).toBeTruthy();
    fireEvent.press(screen.getByText('Review'));
    const reviewDrawer = screen.getByTestId('chores.review.drawer');
    expect(within(reviewDrawer).getByText('What done looks like')).toBeTruthy();
    expect(within(reviewDrawer).queryByText('Done by Charlie')).toBeNull();
    expect(within(reviewDrawer).getByLabelText('Charlie')).toBeTruthy();
    expect(within(reviewDrawer).getByLabelText("Charlie's chore photo")).toBeTruthy();
    expect(screen.getAllByTestId('chores.review.approve.check').length).toBeGreaterThan(0);
    expect(screen.queryByText('Approve all')).toBeNull();
    fireEvent.press(screen.getByText('Approve'));
    expect(screen.queryByTestId('chores.review.guide')).toBeNull();
  });

  it('keeps the review guide off the launcher and other capabilities', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));
    expect(screen.getByTestId('chores.review.guide')).toBeTruthy();

    mockCapabilityMenuOpen = true;
    screen.rerender(<ChoresScreen />);
    expect(screen.queryByTestId('chores.review.guide')).toBeNull();

    mockCapabilityMenuOpen = false;
    mockActiveCapabilityId = null;
    screen.rerender(<ChoresScreen />);
    expect(screen.queryByTestId('chores.review.guide')).toBeNull();
  });

  it('presents a queue for many approvals and returns one chore for another pass', async () => {
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T20:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Take Wipe the kitchen counters after snack'));
    fireEvent.press(screen.getByLabelText('Complete Wipe the kitchen counters after snack'));
    const submittedRow = screen.getByTestId('chores.occurrence.activity-occurrence-household-kitchen-counters-2026-08-17');
    await waitFor(() => expect(within(submittedRow).getByText('Waiting for approval')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getByText('2 chores ready for review')).toBeTruthy();
    fireEvent.press(screen.getByText('Review'));
    const drawer = screen.getByTestId('chores.review.drawer');
    expect(within(drawer).getByLabelText('Review Wipe the kitchen counters after snack')).toBeTruthy();
    expect(screen.queryByText('Approve all')).toBeNull();
    fireEvent.press(within(drawer).getByLabelText('Review Wipe the kitchen counters after snack'));
    fireEvent.changeText(screen.getByLabelText('Note (optional)'), 'Please wipe the sticky corner.');
    fireEvent.press(screen.getByText('Needs another pass'));

    expect(screen.getByText('Tidy the shoes by the front door')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close chore review'));
    expect(screen.getByText('1 chore ready for review')).toBeTruthy();
  });

  it('opens an anchored member menu and switches the simulated active child', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    const menu = within(screen.getByTestId('chores.member.menu'));
    expect(menu.getByText('View chores as')).toBeTruthy();
    expect(menu.getByLabelText('Switch to Charlie').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByTestId('chores.member.drawer')).toBeNull();
    fireEvent.press(menu.getByLabelText('Switch to Olive'));

    expect(screen.getByLabelText('Switch household member, Olive')).toBeTruthy();
    expect(screen.getByText('My chores')).toBeTruthy();
    expect(screen.getByText('1 chore left today')).toBeTruthy();
    expect(screen.queryByText('Feed Scout and refill the water bowl')).toBeNull();
  });
});
