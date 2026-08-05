import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../services/sharedGoals', () => ({
  listGoalSharing: jest.fn(),
  leaveSharedGoal: jest.fn(),
  removeGoalPartner: jest.fn(),
  revokeTargetedGoalInvite: jest.fn(),
}));

jest.mock('../../services/invites', () => ({
  declineTargetedGoalInvite: jest.fn(),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import * as sharedGoals from '../../services/sharedGoals';
import * as invites from '../../services/invites';
import { useJoinSharedGoalDrawerStore } from '../../store/useJoinSharedGoalDrawerStore';
import { GoalSharingSettingsSection } from './GoalSharingSettingsSection';

const sharing = sharedGoals as jest.Mocked<typeof sharedGoals>;
const invitation = invites as jest.Mocked<typeof invites>;

describe('GoalSharingSettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useJoinSharedGoalDrawerStore.setState({ visible: false, inviteCode: null, source: 'unknown' });
    sharing.revokeTargetedGoalInvite.mockResolvedValue({ ok: true });
    sharing.removeGoalPartner.mockResolvedValue({ ok: true });
    sharing.leaveSharedGoal.mockResolvedValue({ ok: true });
    invitation.declineTargetedGoalInvite.mockResolvedValue({ ok: true });
    sharing.listGoalSharing.mockResolvedValue([
      {
        direction: 'by_you',
        goalId: 'goal-1',
        goalTitle: 'Walk together',
        accessState: 'pending',
        counterpartName: 'Blaire',
        counterpartAvatarUrl: null,
        inviteId: 'invite-1',
        inviteCode: 'code-1',
        counterpartUserId: 'user-2',
        changedAt: '2026-08-05T01:00:00.000Z',
      },
      {
        direction: 'with_you',
        goalId: 'goal-2',
        goalTitle: 'Run a 5K',
        accessState: 'pending',
        counterpartName: 'Ruth',
        counterpartAvatarUrl: null,
        inviteId: 'invite-2',
        inviteCode: 'code-2',
        counterpartUserId: 'user-3',
        changedAt: '2026-08-05T02:00:00.000Z',
      },
    ]);
  });

  it('shows pending shares in both existing Sharing directions', async () => {
    const screen = renderWithProviders(<GoalSharingSettingsSection />);

    await waitFor(() => expect(screen.getByText('Shared by you')).toBeTruthy());
    expect(screen.getByText('Shared with you')).toBeTruthy();
    expect(screen.getByText('Walk together')).toBeTruthy();
    expect(screen.getByText('Waiting for Blaire')).toBeTruthy();
    expect(screen.getByText('Run a 5K')).toBeTruthy();
    expect(screen.getByText('Ruth invited you')).toBeTruthy();
  });

  it('opens recipient review without accepting automatically', async () => {
    const screen = renderWithProviders(<GoalSharingSettingsSection />);
    await waitFor(() => expect(screen.getByLabelText('Review invitation to Run a 5K')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Review invitation to Run a 5K'));

    expect(useJoinSharedGoalDrawerStore.getState()).toEqual(expect.objectContaining({
      visible: true,
      inviteCode: 'code-2',
      source: 'sharing',
    }));
    expect(invitation.declineTargetedGoalInvite).not.toHaveBeenCalled();
  });

  it('keeps creator revoke and recipient decline as explicit separate decisions', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const screen = renderWithProviders(<GoalSharingSettingsSection />);
    await waitFor(() => expect(screen.getByLabelText('Revoke invitation for Blaire')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Revoke invitation for Blaire'));
    const revokeOptions = alert.mock.calls[0]?.[2] ?? [];
    await act(async () => {
      revokeOptions.find((option) => option.text === 'Revoke')?.onPress?.();
    });
    await waitFor(() => expect(sharing.revokeTargetedGoalInvite).toHaveBeenCalledWith('invite-1'));

    fireEvent.press(screen.getByLabelText('Decline invitation to Run a 5K'));
    const declineOptions = alert.mock.calls[1]?.[2] ?? [];
    await act(async () => {
      declineOptions.find((option) => option.text === 'Decline')?.onPress?.();
    });
    await waitFor(() => expect(invitation.declineTargetedGoalInvite).toHaveBeenCalledWith('code-2'));
  });
});
