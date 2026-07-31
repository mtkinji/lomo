import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { NotificationService } from '../../../services/NotificationService';
import { createWeeklyMoneySavedCheck } from '../domain/moneySavedCheck';
import { moneySavedCheckStorage } from '../runtime/moneySavedCheckStorage';
import { MoneyWeeklyCheckRow } from './MoneyWeeklyCheckRow';

jest.mock('../runtime/moneySavedCheckStorage', () => ({
  moneySavedCheckStorage: {
    load: jest.fn(), save: jest.fn(), setActive: jest.fn(), remove: jest.fn(),
  },
}));

describe('MoneyWeeklyCheckRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (moneySavedCheckStorage.load as jest.Mock).mockResolvedValue(null);
    jest.spyOn(NotificationService, 'scheduleMoneyCheck').mockResolvedValue('notification-1');
    jest.spyOn(NotificationService, 'cancelMoneyCheck').mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('explains the private Friday check before requesting permission and enables it', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = renderWithProviders(
      <MoneyWeeklyCheckRow userId="user-a" now={() => new Date('2026-07-31T12:00:00.000Z')} timezone="America/Denver" />,
    );
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());

    fireEvent.press(view.getByLabelText('Weekly Budget check'));
    expect(alert).toHaveBeenCalledWith(
      'Weekly Budget check',
      'Every Friday at 9:00 AM, Kwilt can privately remind you to open Budget. The notification will not show financial details.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => { await buttons.find((button) => button.text === 'Turn on')?.onPress?.(); });

    expect(NotificationService.scheduleMoneyCheck).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    expect(moneySavedCheckStorage.save).toHaveBeenCalledWith('user-a', expect.objectContaining({ notificationId: 'notification-1' }));
    expect(view.getByText('Friday · 9:00 AM')).toBeTruthy();
  });

  it('keeps the row off when permission is denied', async () => {
    jest.spyOn(NotificationService, 'scheduleMoneyCheck').mockResolvedValue(null);
    const alert = jest.spyOn(Alert, 'alert');
    const view = renderWithProviders(<MoneyWeeklyCheckRow userId="user-a" timezone="America/Denver" />);
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());
    fireEvent.press(view.getByLabelText('Weekly Budget check'));
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => { await buttons.find((button) => button.text === 'Turn on')?.onPress?.(); });
    expect(moneySavedCheckStorage.save).not.toHaveBeenCalled();
    expect(view.getByText('Off')).toBeTruthy();
  });

  it('cancels the new notification if local check persistence fails', async () => {
    (moneySavedCheckStorage.save as jest.Mock).mockRejectedValue(new Error('storage unavailable'));
    const alert = jest.spyOn(Alert, 'alert');
    const view = renderWithProviders(<MoneyWeeklyCheckRow userId="user-a" timezone="America/Denver" />);
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());
    fireEvent.press(view.getByLabelText('Weekly Budget check'));
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => { await buttons.find((button) => button.text === 'Turn on')?.onPress?.(); });

    expect(NotificationService.cancelMoneyCheck).toHaveBeenCalledWith('notification-1');
    expect(view.getByText('Off')).toBeTruthy();
  });

  it('makes pause and removal discoverable without permanent extra rows', async () => {
    const check = {
      ...createWeeklyMoneySavedCheck({ nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver' }),
      notificationId: 'notification-1',
    };
    (moneySavedCheckStorage.load as jest.Mock).mockResolvedValue(check);
    (moneySavedCheckStorage.setActive as jest.Mock).mockResolvedValue({ ...check, active: false, notificationId: null });
    const alert = jest.spyOn(Alert, 'alert');
    const view = renderWithProviders(<MoneyWeeklyCheckRow userId="user-a" timezone="America/Denver" />);
    await waitFor(() => expect(view.getByText('Friday · 9:00 AM')).toBeTruthy());

    fireEvent.press(view.getByLabelText('Weekly Budget check'));
    const buttons = alert.mock.calls[0][2] ?? [];
    expect(buttons.map((button) => button.text)).toEqual(['Keep on', 'Pause', 'Remove']);
    await act(async () => { await buttons.find((button) => button.text === 'Pause')?.onPress?.(); });

    expect(NotificationService.cancelMoneyCheck).toHaveBeenCalledWith('notification-1');
    expect(moneySavedCheckStorage.setActive).toHaveBeenCalledWith('user-a', false, expect.any(String));
    expect(view.getByText('Paused')).toBeTruthy();
  });
});
