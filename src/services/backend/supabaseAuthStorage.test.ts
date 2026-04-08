import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseAuthStorage } from './supabaseAuthStorage';

describe('SupabaseAuthStorage.clearAuthSessionKeys', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('coalesces concurrent clear calls into one storage sweep', async () => {
    await AsyncStorage.setItem('kwilt.supabase.auth', '{"access_token":"a","refresh_token":"b","user":{}}');
    await AsyncStorage.setItem('sb-legacy-auth-token', '{"access_token":"a","refresh_token":"b","user":{}}');

    const storage = new SupabaseAuthStorage();
    const getAllKeysSpy = jest.spyOn(AsyncStorage, 'getAllKeys');

    await Promise.all([storage.clearAuthSessionKeys(), storage.clearAuthSessionKeys()]);

    expect(getAllKeysSpy).toHaveBeenCalledTimes(1);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).not.toContain('kwilt.supabase.auth');
    expect(keys).not.toContain('sb-legacy-auth-token');
  });

  it('allows repeated clear calls across time (not one-shot forever)', async () => {
    const storage = new SupabaseAuthStorage();
    const getAllKeysSpy = jest.spyOn(AsyncStorage, 'getAllKeys');

    await AsyncStorage.setItem('kwilt.supabase.auth', '{"access_token":"a","refresh_token":"b","user":{}}');
    await storage.clearAuthSessionKeys();

    await AsyncStorage.setItem('kwilt.supabase.auth', '{"access_token":"c","refresh_token":"d","user":{}}');
    await storage.clearAuthSessionKeys();

    expect(getAllKeysSpy).toHaveBeenCalledTimes(2);
    const value = await AsyncStorage.getItem('kwilt.supabase.auth');
    expect(value).toBeNull();
  });
});
