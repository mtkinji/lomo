import { handleCreatorCampaignRoute, recordCreatorSubscriptionEvent } from '../creatorAcquisition';

function admin(options?: { campaign?: Record<string, unknown>; subscription?: Record<string, unknown> | null }) {
  const rpc = jest.fn(async (name: string) => {
    if (name === 'kwilt_resolve_creator_campaign') {
      return { data: options?.campaign ?? { campaignId: 'campaign-1', code: 'maya' }, error: null };
    }
    if (name === 'kwilt_claim_creator_campaign') return { data: 'attribution-1', error: null };
    return { data: null, error: null };
  });
  const maybeSingle = jest.fn(async () => ({ data: options?.subscription ?? null, error: null }));
  const query: any = { select: jest.fn(() => query), eq: jest.fn(() => query), maybeSingle };
  return { client: { rpc, from: jest.fn(() => query) }, rpc, maybeSingle };
}

test('creator routes fail closed while the pilot is disabled', async () => {
  const mock = admin();
  await expect(handleCreatorCampaignRoute({
    route: '/creator/resolve', admin: mock.client, installId: 'install-1', body: { code: 'maya' },
    userId: null, pilotFlag: undefined, attributionPepper: undefined,
  })).resolves.toMatchObject({ status: 404 });
  expect(mock.rpc).not.toHaveBeenCalled();
});

test('a valid pre-purchase claim records attribution without changing entitlement', async () => {
  const mock = admin();
  const result = await handleCreatorCampaignRoute({
    route: '/creator/claim', admin: mock.client, installId: 'install-1',
    body: { code: 'maya', revenuecatAppUserId: 'user-1' }, userId: 'user-1',
    pilotFlag: 'true', attributionPepper: 'test-pepper',
  });
  expect(result).toMatchObject({ status: 200, body: { attributionId: 'attribution-1' } });
  expect(mock.rpc).toHaveBeenCalledWith('kwilt_claim_creator_campaign', expect.objectContaining({
    p_campaign_id: 'campaign-1', p_user_id: 'user-1', p_revenuecat_app_user_id: 'user-1',
  }));
  expect(mock.rpc.mock.calls.map(([name]) => name)).not.toContain('kwilt_has_active_pro');
});

test('production subscription events project only into the creator commission reducer', async () => {
  const mock = admin();
  await expect(recordCreatorSubscriptionEvent(mock.client, {
    period_type: 'NORMAL', transaction_id: 'txn-1', original_transaction_id: 'original-1', is_family_share: false,
  }, { eventId: 'event-1', type: 'RENEWAL', environment: 'PRODUCTION', appUserId: 'user-1' })).resolves.toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith('kwilt_record_creator_subscription_event', expect.objectContaining({
    p_provider_event_id: 'event-1', p_event_type: 'RENEWAL', p_revenuecat_app_user_id: 'user-1',
  }));
});
