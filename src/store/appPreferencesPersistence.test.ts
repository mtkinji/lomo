import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './useAppStore';

it('does not serialize and rewrite all preferences for domain-sync status updates', async () => {
  await useAppStore.persist.rehydrate();
  useAppStore.setState({ domainSyncStatus: 'idle' });
  await Promise.resolve();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  const stringify = jest.spyOn(JSON, 'stringify');
  for (let index = 0; index < 20; index++) {
    useAppStore.setState({ domainSyncStatus: index % 2 ? 'ready' : 'pulling-remote' });
  }
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === 'kwilt-store')).toHaveLength(0);
  expect(stringify).not.toHaveBeenCalled();
  useAppStore.setState({ soundscapeEnabled: !useAppStore.getState().soundscapeEnabled });
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === 'kwilt-store')).toHaveLength(1);
  stringify.mockRestore();
});
