import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert, Image, StyleSheet } from 'react-native';
import { ChoresScreen } from './ChoresScreen';
import { resetChoreLearningStoreForTests, useChoreLearningStore } from '../runtime/useChoreLearningStore';
import { formatChoreEventTimestamp } from '../components/choreDetailPresentation';
import { useAppStore } from '../../../store/useAppStore';
import { colors, typography } from '../../../theme';
import { RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX } from '../../../ui/layout/restingComposerMetrics';

const mockOpenMenu = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
let mockCapabilityMenuOpen = false;
let mockActiveCapabilityId: 'chores' | null = 'chores';
const mockEnrichActivityWithAI = jest.fn();

jest.mock('../../../services/ai', () => ({
  ...jest.requireActual('../../../services/ai'),
  enrichActivityWithAI: (...args: unknown[]) => mockEnrichActivityWithAI(...args),
}));

jest.mock('../../../features/unifiedChat/UnifiedChatDrawer', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    UnifiedChatDrawer: ({ visible, scopeLabel }: { visible: boolean; scopeLabel: string }) => (
      visible
        ? React.createElement(View, { testID: 'chores.chat.drawer' }, React.createElement(Text, null, `Chat about ${scopeLabel}`))
        : null
    ),
  };
});

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: (...args: unknown[]) => mockRequestCameraPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
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
    DropdownMenu: ({ children, open: controlledOpen, onOpenChange }: {
      children: ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      const [localOpen, setLocalOpen] = React.useState(false);
      const open = controlledOpen ?? localOpen;
      const setOpen = (next: boolean) => {
        if (controlledOpen == null) setLocalOpen(next);
        onOpenChange?.(next);
      };
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
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: [] });
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
    mockEnrichActivityWithAI.mockResolvedValue(null);
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

  it('uses the standard ellipsis for caregiver Chores actions', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getAllByTestId('chores.header.overflow.icon.more').length).toBeGreaterThan(0);
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
    expect(within(readyRow).getByText('2 tokens')).toBeTruthy();
    expect(within(readyRow).getByLabelText('Earns 2 tokens')).toBeTruthy();
    expect(StyleSheet.flatten(within(readyRow).getByTestId('activity-completion-indicator').props.style))
      .toMatchObject({ width: 22, height: 22, borderRadius: 7 });

    const waitingRow = screen.getByTestId('chores.occurrence.activity-occurrence-charlie-entry-shoes-2026-08-17');
    expect(within(waitingRow).getByText('1 token · Waiting for approval')).toBeTruthy();
    expect(within(waitingRow).getByLabelText('Earns 1 token. Waiting for approval')).toBeTruthy();

    const completedRow = screen.getByTestId('chores.occurrence.activity-occurrence-charlie-breakfast-dishes-2026-08-17');
    expect(within(completedRow).getByText('1 token')).toBeTruthy();
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

  it('gives the caregiver one filterable routine inventory with assignee pills and cadence', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.queryByText('Household chores')).toBeNull();
    expect(screen.getByLabelText('Filter chores, All chores')).toBeTruthy();
    expect(screen.getByText('Feed Scout and refill the water bowl')).toBeTruthy();
    expect(screen.getByText('Take the recycling to the blue bin')).toBeTruthy();
    expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Household').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Daily').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('chores.assignee.member-charlie').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('chores.assignee.household').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('chores.assignee.household.icon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CH').length).toBeGreaterThan(0);
    expect(within(screen.getByTestId(
      'chores.series.activity-series-breakfast-dishes',
    )).queryByText('Completed')).toBeNull();

    fireEvent.press(screen.getByLabelText('Filter chores, All chores'));
    fireEvent.press(screen.getByLabelText('Show Charlie chores'));
    expect(screen.getByText('Feed Scout and refill the water bowl')).toBeTruthy();
    expect(screen.queryByText('Fold and put away the clean towels')).toBeNull();
    expect(screen.queryByText('Take the recycling to the blue bin')).toBeNull();
  });

  it('reuses the To-dos inventory rail treatment for the simplified chore filter', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getByTestId('chores.inventory-controls')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('chores.inventory-filter').props.style)).toMatchObject({
      backgroundColor: colors.canvas,
    });

    fireEvent.press(screen.getByLabelText('Filter chores, All chores'));
    fireEvent.press(screen.getByLabelText('Show Charlie chores'));

    expect(screen.getByLabelText('Filter chores, Charlie')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('chores.inventory-filter').props.style)).toMatchObject({
      backgroundColor: colors.sumi900,
    });
    expect(within(screen.getByTestId('chores.inventory-filter')).getByText('1')).toBeTruthy();
  });

  it('opens a caregiver row as the editable root chore rather than an occurrence receipt', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    fireEvent.press(screen.getByLabelText(/Edit Bring in the mail/));

    const editor = screen.getByTestId('chores.editor.drawer');
    expect(within(editor).getByDisplayValue('Bring in the mail')).toBeTruthy();
    expect(within(editor).getByDisplayValue('Weekdays')).toBeTruthy();
    expect(within(editor).getByDisplayValue('Olive')).toBeTruthy();
    expect(screen.getByLabelText('Save chore')).toBeTruthy();
    expect(screen.queryByTestId('chores.detail.drawer')).toBeNull();
    expect(within(editor).queryByText('Completed')).toBeNull();
    expect(within(editor).queryByText('Earned')).toBeNull();

    fireEvent.changeText(within(editor).getByLabelText('Chore'), 'Bring in and sort the mail');
    fireEvent.press(screen.getByLabelText('Save chore'));
    expect(screen.getByText('Bring in and sort the mail')).toBeTruthy();
    expect(screen.queryByText('Bring in the mail')).toBeNull();
  });

  it('opens the chore detail drawer from the row with one explicit completion action', () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    const drawer = screen.getByTestId('chores.detail.drawer');
    expect(within(drawer).getByText('What done looks like')).toBeTruthy();
    expect(within(drawer).getByText('Scout has food, and the water bowl is full of fresh water.')).toBeTruthy();
    expect(screen.getByLabelText('Take a photo of this chore')).toBeTruthy();
    expect(screen.getByText('Mark done')).toBeTruthy();
    expect(within(drawer).queryByText(/token/i)).toBeNull();
  });

  it('presents completed work as an identified, timestamped receipt', () => {
    const performedAtIso = '2026-08-17T13:10:00.000Z';
    act(() => {
      const record = useChoreLearningStore.getState().record;
      useChoreLearningStore.setState({
        record: {
          ...record,
          tokensEnabled: true,
          occurrences: record.occurrences.map((occurrence) => (
            occurrence.activityOccurrenceId === 'activity-occurrence-charlie-breakfast-dishes-2026-08-17'
              ? {
                ...occurrence,
                state: 'completed',
                performedByMemberId: 'member-charlie',
                performedAtIso,
                reviewedByMemberId: null,
                reviewedAtIso: null,
              }
              : occurrence
          )),
        },
      });
    });
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Open details for Put away the breakfast dishes'));

    const drawer = screen.getByTestId('chores.detail.drawer');
    expect(within(drawer).queryByText('Available to anyone')).toBeNull();
    expect(within(drawer).getByLabelText('Completed by Charlie')).toBeTruthy();
    expect(within(drawer).getByText('Completed')).toBeTruthy();
    expect(within(drawer).getByText(formatChoreEventTimestamp(performedAtIso)!)).toBeTruthy();
    expect(within(drawer).getByText('Earned')).toBeTruthy();
    expect(within(drawer).getByLabelText('Earned 1 token')).toBeTruthy();
    expect(within(drawer).queryByText('What done looks like')).toBeNull();
    expect(within(drawer).queryByText('Clean breakfast dishes are back in their cupboards and drawers.')).toBeNull();
    expect(within(drawer).queryByText('This chore is complete.')).toBeNull();
    expect(StyleSheet.flatten(within(drawer).getByText('Put away the breakfast dishes').props.style))
      .toMatchObject({ fontSize: typography.titleSm.fontSize });
  });

  it('includes caregiver approval in the completed receipt when review was required', () => {
    const performedAtIso = '2026-08-17T13:25:00.000Z';
    const reviewedAtIso = '2026-08-17T14:00:00.000Z';
    act(() => {
      const record = useChoreLearningStore.getState().record;
      useChoreLearningStore.setState({
        record: {
          ...record,
          occurrences: record.occurrences.map((occurrence) => (
            occurrence.activityOccurrenceId === 'activity-occurrence-charlie-entry-shoes-2026-08-17'
              ? {
                ...occurrence,
                state: 'completed',
                performedByMemberId: 'member-charlie',
                performedAtIso,
                reviewedByMemberId: 'member-andrew',
                reviewedAtIso,
              }
              : occurrence
          )),
        },
      });
    });
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Open details for Tidy the shoes by the front door'));

    const drawer = screen.getByTestId('chores.detail.drawer');
    expect(within(drawer).getByLabelText('Completed by Charlie')).toBeTruthy();
    expect(within(drawer).getByLabelText("Charlie's chore photo. Open full screen")).toBeTruthy();
    expect(within(drawer).getByText(formatChoreEventTimestamp(performedAtIso)!)).toBeTruthy();
    expect(within(drawer).getByText('Approved by Andrew')).toBeTruthy();
    expect(within(drawer).getByText(formatChoreEventTimestamp(reviewedAtIso)!)).toBeTruthy();
  });

  it('lets the active child take an optional photo from chore details', async () => {
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://camera/scout.jpg' }],
    });
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    fireEvent.press(screen.getByLabelText('Take a photo of this chore'));

    await waitFor(() => expect(screen.getByLabelText("Charlie's chore photo. Open full screen")).toBeTruthy());
    expect(mockLaunchCameraAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Retake photo of this chore')).toBeTruthy();
  });

  it('keeps choosing an existing photo as a quieter option', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picker/scout.jpg' }],
    });
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    fireEvent.press(screen.getByLabelText('Choose a photo for this chore'));

    await waitFor(() => expect(screen.getByLabelText("Charlie's chore photo. Open full screen")).toBeTruthy());
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1);
  });

  it('explains and blocks a required-photo chore until evidence is attached', async () => {
    act(() => {
      const record = useChoreLearningStore.getState().record;
      useChoreLearningStore.setState({
        record: {
          ...record,
          occurrences: record.occurrences.map((occurrence) => (
            occurrence.activityOccurrenceId === 'activity-occurrence-charlie-feed-scout-2026-08-17'
              ? { ...occurrence, photoPolicy: 'required' }
              : occurrence
          )),
        },
      });
    });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://camera/scout-required.jpg' }],
    });
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    expect(screen.getByText('Add a photo to finish this chore.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark done' }).props.accessibilityState)
      .toMatchObject({ disabled: true });

    fireEvent.press(screen.getByLabelText('Take a photo of this chore'));
    await waitFor(() => expect(screen.getByLabelText("Charlie's chore photo. Open full screen")).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark done' }).props.accessibilityState)
      .toMatchObject({ disabled: false });
  });

  it('keeps the completion drawer open when camera permission is denied', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Open details for Feed Scout and refill the water bowl'));

    fireEvent.press(screen.getByLabelText('Take a photo of this chore'));

    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      'Photo access needed',
      'Allow camera access in Settings to take a chore photo.',
    ));
    expect(screen.getByTestId('chores.detail.drawer')).toBeTruthy();
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
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

  it('opens completion review from the row control and completes only from the drawer', async () => {
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T18:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Complete Feed Scout and refill the water bowl'));

    await waitFor(() => expect(screen.getByTestId('chores.detail.drawer')).toBeTruthy());
    expect(screen.getByLabelText('Complete Feed Scout and refill the water bowl')).toBeTruthy();
    expect(screen.getByLabelText('Take a photo of this chore')).toBeTruthy();
    fireEvent.press(screen.getByText('Mark done'));

    await waitFor(() => expect(
      screen.getByLabelText('Mark Feed Scout and refill the water bowl incomplete'),
    ).toBeTruthy());
    expect(screen.getByText('Daily chores submitted · Choose 3 more by Friday')).toBeTruthy();
    expect(screen.queryByText(/token/i)).toBeNull();
  });

  it('unchecks genuinely completed work from the same row control', async () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Mark Put away the breakfast dishes incomplete'));

    await waitFor(() => expect(
      screen.getByLabelText('Complete Put away the breakfast dishes'),
    ).toBeTruthy());
    expect(screen.getByText('2 chores left today · Choose 3 more by Friday')).toBeTruthy();
  });

  it('opens approval review from the check control and submits only from the drawer', async () => {
    const screen = render(<ChoresScreen />);

    fireEvent.press(screen.getByLabelText('Take Wipe the kitchen counters after snack'));
    fireEvent.press(screen.getByLabelText('Complete Wipe the kitchen counters after snack'));

    const submittedRow = screen.getByTestId(
      'chores.occurrence.activity-occurrence-household-kitchen-counters-2026-08-17',
    );
    await waitFor(() => expect(screen.getByTestId('chores.detail.drawer')).toBeTruthy());
    expect(within(submittedRow).queryByText('Waiting for approval')).toBeNull();
    fireEvent.press(screen.getByText('Submit for approval'));

    await waitFor(() => expect(within(submittedRow).getByText('Waiting for approval')).toBeTruthy());
    expect(within(submittedRow).queryByLabelText(
      'Wipe the kitchen counters after snack, completed',
    )).toBeNull();
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

  it('shows counted caregiver review attention and resolves a single approval in detail', () => {
    act(() => {
      const record = useChoreLearningStore.getState().record;
      useChoreLearningStore.setState({
        record: {
          ...record,
          occurrences: record.occurrences.map((occurrence) => (
            occurrence.activityOccurrenceId === 'activity-occurrence-olive-dishwasher-2026-08-18'
              ? {
                ...occurrence,
                state: 'completed',
                reviewedByMemberId: 'member-andrew',
                reviewedAtIso: '2026-08-18T13:15:00.000Z',
              }
              : occurrence
          )),
        },
      });
    });
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T19:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getByLabelText('1 chore ready for review')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('1 chore ready for review'));
    const reviewDrawer = screen.getByTestId('chores.review.drawer');
    expect(within(reviewDrawer).getByText('What done looks like')).toBeTruthy();
    expect(within(reviewDrawer).queryByText('Done by Charlie')).toBeNull();
    expect(within(reviewDrawer).getByLabelText('Charlie')).toBeTruthy();
    expect(within(reviewDrawer).getByLabelText("Charlie's chore photo. Open full screen")).toBeTruthy();
    expect(screen.getAllByTestId('chores.review.approve.check').length).toBeGreaterThan(0);
    expect(screen.queryByText('Approve all')).toBeNull();
    fireEvent.press(screen.getByText('Approve'));
    expect(screen.queryByTestId('chores.review.action')).toBeNull();
  });

  it('keeps the review action off the launcher and other capabilities', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));
    expect(screen.getByTestId('chores.review.action')).toBeTruthy();

    mockCapabilityMenuOpen = true;
    screen.rerender(<ChoresScreen />);
    expect(screen.queryByTestId('chores.review.action')).toBeNull();

    mockCapabilityMenuOpen = false;
    mockActiveCapabilityId = null;
    screen.rerender(<ChoresScreen />);
    expect(screen.queryByTestId('chores.review.action')).toBeNull();
  });

  it('presents a queue for many approvals and returns one chore for another pass', async () => {
    const screen = render(<ChoresScreen now={() => new Date('2026-08-17T20:00:00.000Z')} />);

    fireEvent.press(screen.getByLabelText('Take Wipe the kitchen counters after snack'));
    fireEvent.press(screen.getByLabelText('Complete Wipe the kitchen counters after snack'));
    const submittedRow = screen.getByTestId('chores.occurrence.activity-occurrence-household-kitchen-counters-2026-08-17');
    await waitFor(() => expect(screen.getByTestId('chores.detail.drawer')).toBeTruthy());
    fireEvent.press(screen.getByText('Submit for approval'));
    await waitFor(() => expect(within(submittedRow).getByText('Waiting for approval')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getByLabelText('3 chores ready for review')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('3 chores ready for review'));
    const drawer = screen.getByTestId('chores.review.drawer');
    expect(within(drawer).getByLabelText('Review Wipe the kitchen counters after snack')).toBeTruthy();
    expect(screen.queryByText('Approve all')).toBeNull();
    fireEvent.press(within(drawer).getByLabelText('Review Wipe the kitchen counters after snack'));
    fireEvent.changeText(screen.getByLabelText('Note (optional)'), 'Please wipe the sticky corner.');
    fireEvent.press(screen.getByText('Needs another pass'));

    expect(within(drawer).getByText('Tidy the shoes by the front door')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close chore review'));
    expect(screen.getByLabelText('2 chores ready for review')).toBeTruthy();
  });

  it('opens the real chore editor from Quick Add and commits only from Add chore', async () => {
    let resolveEnrichment: (value: null) => void = () => undefined;
    mockEnrichActivityWithAI.mockReturnValue(new Promise<null>((resolve) => {
      resolveEnrichment = resolve;
    }));
    const screen = render(<ChoresScreen now={() => new Date('2026-08-18T14:00:00.000Z')} />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));
    const startingCount = useChoreLearningStore.getState().record.occurrences.length;

    fireEvent.press(screen.getByLabelText('Add a chore'));
    fireEvent.changeText(screen.getByLabelText('Chore description'), 'Sweep the porch every week');
    fireEvent.press(screen.getByLabelText('Continue creating chore'));

    expect(screen.getByTestId('chores.editor.drawer')).toBeTruthy();
    expect(screen.getByLabelText('Adding details')).toBeTruthy();
    expect(screen.getByLabelText('Chore').props.value).toBe('Sweep the porch every week');
    expect(useChoreLearningStore.getState().record.occurrences).toHaveLength(startingCount);

    fireEvent.changeText(screen.getByLabelText('Chore'), 'Sweep the front porch');
    await act(async () => resolveEnrichment(null));
    expect(screen.getByLabelText('Chore').props.value).toBe('Sweep the front porch');

    fireEvent.press(screen.getByLabelText('Add chore'));
    expect(useChoreLearningStore.getState().record.occurrences).toHaveLength(startingCount + 1);
    expect(useChoreLearningStore.getState().record.occurrences.at(-1)).toMatchObject({
      title: 'Sweep the front porch',
      state: 'available',
    });
    expect(screen.queryByTestId('chores.editor.drawer')).toBeNull();
  });

  it('keeps Chat as the stable far-right contextual dock action', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    expect(screen.getByTestId('chores.review.action')).toBeTruthy();
    expect(screen.getByTestId('chores.chat.action')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('chores.dock.actions').props.style))
      .toMatchObject({
        zIndex: 51,
        elevation: 51,
        bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
      });
    expect(StyleSheet.flatten(screen.getByTestId('quick-add-floating-dock').props.style))
      .toMatchObject({ bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX });
    fireEvent.press(screen.getByLabelText('Chat about chores'));

    expect(screen.getByTestId('chores.chat.drawer')).toBeTruthy();
    expect(screen.queryByTestId('chores.review.action')).toBeNull();
  });

  it('uses chore language for the shared Quick Add AI actions', () => {
    const screen = render(<ChoresScreen />);
    fireEvent.press(screen.getByLabelText('Switch household member, Charlie'));
    fireEvent.press(within(screen.getByTestId('chores.member.menu')).getByLabelText('Switch to Andrew'));

    fireEvent.press(screen.getByLabelText('Add a chore'));
    fireEvent.press(screen.getByLabelText('AI actions'));

    expect(screen.getByLabelText('AI clarify done')).toBeTruthy();
    expect(screen.getByLabelText('AI set a routine')).toBeTruthy();
    expect(screen.getByLabelText('AI add steps')).toBeTruthy();
    expect(screen.queryByLabelText('AI set triggers')).toBeNull();
    expect(screen.queryByLabelText('AI fill details')).toBeNull();
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
