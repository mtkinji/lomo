jest.mock('../health/healthBackgroundTask', () => ({
  registerHealthDailySyncTask: jest.fn(),
}));
jest.mock('../notifications/notificationBackgroundTask', () => ({
  registerNotificationReconcileTask: jest.fn(),
}));

import { registerHealthDailySyncTask } from '../health/healthBackgroundTask';
import { registerNotificationReconcileTask } from '../notifications/notificationBackgroundTask';
import { registerKwiltBackgroundTasks } from './registerKwiltBackgroundTasks';

describe('registerKwiltBackgroundTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers notification reconciliation last so it owns the shared 15-minute interval', async () => {
    const order: string[] = [];
    (registerHealthDailySyncTask as jest.Mock).mockImplementationOnce(async () => { order.push('health'); });
    (registerNotificationReconcileTask as jest.Mock).mockImplementationOnce(async () => { order.push('notifications'); });

    await registerKwiltBackgroundTasks();

    expect(order).toEqual(['health', 'notifications']);
  });

  it('still registers notification reconciliation when optional health registration fails', async () => {
    (registerHealthDailySyncTask as jest.Mock).mockRejectedValueOnce(new Error('Health unavailable'));

    await expect(registerKwiltBackgroundTasks()).rejects.toThrow('Health unavailable');
    expect(registerNotificationReconcileTask).toHaveBeenCalledTimes(1);
  });
});
