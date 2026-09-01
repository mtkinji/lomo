type CreatorAdmin = {
  from(table: string): any;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: any }>;
};

export type CreatorRouteResult = { status: number; body: Record<string, unknown> };

function enabled(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'true';
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleCreatorCampaignRoute(input: {
  route: string;
  admin: CreatorAdmin;
  installId: string;
  body: unknown;
  userId: string | null;
  pilotFlag: string | undefined;
  attributionPepper: string | undefined;
}): Promise<CreatorRouteResult | null> {
  if (input.route !== '/creator/resolve' && input.route !== '/creator/claim') return null;
  if (!enabled(input.pilotFlag)) return { status: 404, body: { error: { message: 'Creator campaign unavailable', code: 'not_found' } } };
  if (!input.installId) return { status: 400, body: { error: { message: 'Missing install identity', code: 'bad_request' } } };
  const record = input.body && typeof input.body === 'object' ? input.body as Record<string, unknown> : {};
  const code = typeof record.code === 'string' ? record.code.trim().toLowerCase() : '';
  if (!code) return { status: 400, body: { error: { message: 'Missing creator code', code: 'bad_request' } } };
  const { data: campaign, error: campaignError } = await input.admin.rpc('kwilt_resolve_creator_campaign', { p_code: code });
  if (campaignError) return { status: 503, body: { error: { message: 'Campaign lookup unavailable', code: 'provider_unavailable' } } };
  if (!campaign?.campaignId) return { status: 404, body: { error: { message: 'Creator campaign unavailable', code: 'not_found' } } };
  if (input.route === '/creator/resolve') return { status: 200, body: { campaign } };

  const pepper = (input.attributionPepper ?? '').trim();
  if (!pepper) return { status: 503, body: { error: { message: 'Creator claims unavailable', code: 'provider_unavailable' } } };
  const revenuecatAppUserId = typeof record.revenuecatAppUserId === 'string' ? record.revenuecatAppUserId.trim() : '';
  if (revenuecatAppUserId) {
    const { data: subscription } = await input.admin.from('kwilt_revenuecat_subscriptions')
      .select('is_pro').eq('revenuecat_app_user_id', revenuecatAppUserId).maybeSingle();
    if (subscription?.is_pro === true) return { status: 409, body: { error: { message: 'Existing subscriptions are not eligible', code: 'not_eligible' } } };
  }
  const { data: attributionId, error: claimError } = await input.admin.rpc('kwilt_claim_creator_campaign', {
    p_campaign_id: campaign.campaignId,
    p_install_hash: await sha256Hex(`${pepper}:${input.installId}`),
    p_user_id: input.userId,
    p_revenuecat_app_user_id: revenuecatAppUserId || null,
  });
  if (claimError) return { status: 409, body: { error: { message: 'Creator claim could not be saved', code: 'claim_conflict' } } };
  return { status: 200, body: { ok: true, attributionId, campaign } };
}

export async function recordCreatorSubscriptionEvent(admin: CreatorAdmin, event: Record<string, any>, input: {
  eventId: string;
  type: string;
  environment: string | null;
  appUserId: string;
}): Promise<boolean> {
  const { error } = await admin.rpc('kwilt_record_creator_subscription_event', {
    p_provider_event_id: input.eventId,
    p_event_type: input.type,
    p_period_type: typeof event.period_type === 'string' ? event.period_type : null,
    p_environment: input.environment,
    p_revenuecat_app_user_id: input.appUserId,
    p_transaction_id: typeof event.transaction_id === 'string' ? event.transaction_id : null,
    p_original_transaction_id: typeof event.original_transaction_id === 'string' ? event.original_transaction_id : null,
    p_is_family_share: event.is_family_share === true,
  });
  return !error;
}
