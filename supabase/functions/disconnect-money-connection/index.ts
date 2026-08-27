import { corsHeaders } from '../_shared/cors.ts';
import { assertPlaidEnvironmentAllowedForSupabase, plaidPost } from '../_shared/plaid.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import {
  DisconnectMoneyConnectionError,
  disconnectMoneyConnection,
} from './disconnectMoneyConnection.ts';

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const receipt = await disconnectMoneyConnection({
      userId: user.id,
      connectionId: body.connectionId,
      expectedUpdatedAt: body.expectedUpdatedAt,
    }, {
      async loadOwnedConnection(userId, connectionId) {
        const { data, error } = await supabase.from('budget_financial_connections')
          .select('id,updated_at,budget_financial_accounts(count)')
          .eq('user_id', userId).eq('id', connectionId).maybeSingle();
        if (error || !data) return null;
        const accountRelation = data.budget_financial_accounts;
        const accountCount = Array.isArray(accountRelation)
          ? Number((accountRelation[0] as { count?: unknown } | undefined)?.count ?? 0)
          : 0;
        return { id: data.id, updatedAt: data.updated_at, accountCount };
      },
      async loadAccessToken(connectionId) {
        const { data, error } = await supabase.rpc('get_budget_plaid_access_token', {
          p_connection_id: connectionId,
        });
        return error || typeof data !== 'string' || !data.trim() ? null : data;
      },
      async removeProviderItem(accessToken) {
        assertPlaidEnvironmentAllowedForSupabase();
        await plaidPost('/item/remove', { access_token: accessToken });
      },
      async markDisconnected({ userId, connectionId, expectedUpdatedAt }) {
        const { data, error } = await supabase.from('budget_financial_connections')
          .update({ status: 'disconnected', sync_cursor: null, last_error: null })
          .eq('user_id', userId).eq('id', connectionId).eq('updated_at', expectedUpdatedAt)
          .select('updated_at').maybeSingle();
        return error || !data ? null : { confirmedAt: data.updated_at };
      },
    });
    return json(receipt);
  } catch (error) {
    if (isAuthenticationError(error)) return json({ error: error.message, code: 'unauthorized' }, 401);
    if (error instanceof DisconnectMoneyConnectionError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error('[disconnect-money-connection] failed', error);
    return json({ error: 'The financial provider could not confirm the disconnect.', code: 'provider_disconnect_failed' }, 502);
  }
});
