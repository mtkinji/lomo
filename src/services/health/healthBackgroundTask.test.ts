jest.mock('expo-task-manager', () => {
  const executors = new Map<string, () => Promise<number>>();
  const isTaskRegisteredAsync = jest.fn(async () => false);
  return {
    __executors: executors,
    __isTaskRegisteredAsync: isTaskRegisteredAsync,
    defineTask: jest.fn((name: string, executor: () => Promise<number>) => {
      executors.set(name, executor);
    }),
    isTaskRegisteredAsync,
  };
});

jest.mock('expo-background-task', () => {
  const getStatusAsync = jest.fn(async () => 2);
  const registerTaskAsync = jest.fn(async () => undefined);
  const unregisterTaskAsync = jest.fn(async () => undefined);
  return {
    BackgroundTaskResult: { Success: 1, Failed: 2 },
    BackgroundTaskStatus: { Restricted: 1, Available: 2 },
    getStatusAsync,
    registerTaskAsync,
    unregisterTaskAsync,
  };
});

jest.mock('./healthKit', () => ({
  syncYesterdayHealthDailyToSupabase: jest.fn(async () => ({ status: 'synced' })),
}));

import {
  HEALTH_DAILY_SYNC_TASK,
  registerHealthDailySyncTask,
  unregisterHealthDailySyncTask,
} from './healthBackgroundTask';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { syncYesterdayHealthDailyToSupabase } from './healthKit';

const mockHealthTaskRegistered = TaskManager.isTaskRegisteredAsync as jest.Mock;
const mockBackgroundTaskStatus = BackgroundTask.getStatusAsync as jest.Mock;
const mockRegisterBackgroundTask = BackgroundTask.registerTaskAsync as jest.Mock;
const mockUnregisterBackgroundTask = BackgroundTask.unregisterTaskAsync as jest.Mock;
const mockSyncYesterday = syncYesterdayHealthDailyToSupabase as jest.Mock;

describe('healthBackgroundTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthTaskRegistered.mockResolvedValue(false);
    mockBackgroundTaskStatus.mockResolvedValue(2);
    mockSyncYesterday.mockResolvedValue({ status: 'synced' });
    return AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the stable task name and requests a 12-hour minimum interval', async () => {
    await registerHealthDailySyncTask();

    expect(HEALTH_DAILY_SYNC_TASK).toBe('kwilt-health-daily-sync-v1');
    expect(mockRegisterBackgroundTask).toHaveBeenCalledWith(HEALTH_DAILY_SYNC_TASK, {
      minimumInterval: 12 * 60,
    });
  });

  it('does not register twice or when background work is restricted', async () => {
    mockHealthTaskRegistered.mockResolvedValueOnce(true);
    await registerHealthDailySyncTask();
    expect(mockRegisterBackgroundTask).not.toHaveBeenCalled();

    mockHealthTaskRegistered.mockResolvedValueOnce(false);
    mockBackgroundTaskStatus.mockResolvedValueOnce(1);
    await registerHealthDailySyncTask();
    expect(mockRegisterBackgroundTask).not.toHaveBeenCalled();
  });

  it('unregisters only when the task is registered', async () => {
    await unregisterHealthDailySyncTask();
    expect(mockUnregisterBackgroundTask).not.toHaveBeenCalled();

    mockHealthTaskRegistered.mockResolvedValueOnce(true);
    await unregisterHealthDailySyncTask();
    expect(mockUnregisterBackgroundTask).toHaveBeenCalledWith(HEALTH_DAILY_SYNC_TASK);
  });

  it('maps synced and no-data health outcomes to success, and exceptions to failure', async () => {
    const executor = (TaskManager as unknown as { __executors: Map<string, () => Promise<number>> })
      .__executors.get(HEALTH_DAILY_SYNC_TASK);
    expect(executor).toBeDefined();

    await expect(executor?.()).resolves.toBe(1);
    await AsyncStorage.clear();
    mockSyncYesterday.mockResolvedValueOnce({ status: 'skipped' });
    await expect(executor?.()).resolves.toBe(1);
    await AsyncStorage.clear();
    mockSyncYesterday.mockRejectedValueOnce(new Error('health unavailable'));
    await expect(executor?.()).resolves.toBe(2);
  });

  it('preserves the 12-hour health cadence when the shared worker wakes every 15 minutes', async () => {
    const executor = (TaskManager as unknown as { __executors: Map<string, () => Promise<number>> })
      .__executors.get(HEALTH_DAILY_SYNC_TASK);
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    await expect(executor?.()).resolves.toBe(1);
    now.mockReturnValue(1_000_000 + 15 * 60 * 1000);
    await expect(executor?.()).resolves.toBe(1);
    expect(mockSyncYesterday).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1_000_000 + 12 * 60 * 60 * 1000);
    await expect(executor?.()).resolves.toBe(1);
    expect(mockSyncYesterday).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});
