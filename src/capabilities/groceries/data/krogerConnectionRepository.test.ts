import type { SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { createKrogerConnectionRepository } from './krogerConnectionRepository';

jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), openBrowserAsync: jest.fn() }));

describe('Kroger connection repository', () => {
  it('starts OAuth in a system auth session and refreshes status after return', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { authUrl: 'https://api.kroger.com/auth' }, error: null })
      .mockResolvedValueOnce({ data: { configured: true, connection: { state: 'active' } }, error: null });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'success', url: 'kwilt://kroger-auth?status=success' });
    const repository = createKrogerConnectionRepository({ functions: { invoke } } as unknown as SupabaseClient);
    await expect(repository.connect()).resolves.toMatchObject({ connection: { state: 'active' } });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://api.kroger.com/auth', 'kwilt://kroger-auth');
  });

  it('sends explicit store and product choices to the server', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { state: 'confirmed' }, error: null });
    const repository = createKrogerConnectionRepository({ functions: { invoke } } as unknown as SupabaseClient);
    const location={id:'store-1',name:'Smiths',banner:"Smith's",address:'689 N Redwood Rd'};
    await repository.confirmMapping('list-1', 'item-1', { id:'p',upc:'001',title:'Milk',brand:null,size:null,regularPriceCents:null,promoPriceCents:null,pickupAvailable:true }, 2, location);
    expect(invoke).toHaveBeenCalledWith('kroger-api', { body: expect.objectContaining({ action: 'confirm_mapping', groceryItemId: 'item-1', quantity: 2, location }) });
  });
});
