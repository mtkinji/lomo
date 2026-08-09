import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decodeState, decryptToken, encodeState, encryptToken, getSupabaseAdmin, requireUserId } from '../_shared/calendarUtils.ts';
import { buildKrogerAuthorizationUrl, exchangeKrogerToken } from '../_shared/krogerAdapter.ts';
import { validateKrogerStateClaims } from '../_shared/krogerAuthState.ts';

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
const env = (name: string) => Deno.env.get(name)?.trim() || null;
const appRedirect = (status: 'success'|'error', reason?: string) => `${env('KROGER_APP_REDIRECT') ?? 'kwilt://kroger-auth'}?status=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
function callbackUrl(req: Request) { const configured=env('KROGER_REDIRECT_URL'); if(configured)return configured; const url=new URL(req.url); url.search=''; url.hash=''; return url.toString(); }
function verifier() { const bytes=crypto.getRandomValues(new Uint8Array(64)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
async function challenge(value:string) { const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)); return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin=getSupabaseAdmin(), clientId=env('KROGER_CLIENT_ID'), clientSecret=env('KROGER_CLIENT_SECRET'), stateSecret=env('KROGER_OAUTH_STATE_SECRET'), tokenSecret=env('KROGER_TOKEN_SECRET');
  if (!admin || !clientId || !clientSecret || !stateSecret || !tokenSecret || env('FOOD_KROGER_HANDOFF_ENABLED') !== 'true') return response(503,{error:{code:'provider_unavailable',message:"Smith's connection is not configured yet."}});
  const url=new URL(req.url);
  if (req.method === 'GET') {
    const error=url.searchParams.get('error'); if(error)return Response.redirect(appRedirect('error',error==='access_denied'?'cancelled':'provider_denied'),302);
    const code=url.searchParams.get('code'), state=url.searchParams.get('state'); if(!code||!state)return Response.redirect(appRedirect('error','invalid_callback'),302);
    const claims=validateKrogerStateClaims(await decodeState(state,stateSecret)); if(!claims)return Response.redirect(appRedirect('error','invalid_state'),302);
    const {data:pending,error:pendingError}=await admin.from('kwilt_grocery_provider_oauth_states').select('nonce,user_id,verifier_payload,expires_at,consumed_at').eq('nonce',claims.nonce).maybeSingle();
    if(pendingError||!pending||pending.user_id!==claims.userId||pending.consumed_at||Date.parse(pending.expires_at)<=Date.now())return Response.redirect(appRedirect('error','expired_state'),302);
    const codeVerifier=await decryptToken(tokenSecret,pending.verifier_payload); if(!codeVerifier)return Response.redirect(appRedirect('error','invalid_state'),302);
    const token=await exchangeKrogerToken({clientId,clientSecret,redirectUri:callbackUrl(req),code,verifier:codeVerifier}).catch(()=>null); if(!token)return Response.redirect(appRedirect('error','token_exchange_failed'),302);
    const {data:binding}=await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id',claims.userId).eq('status','active').maybeSingle(); if(!binding?.person_id)return Response.redirect(appRedirect('error','account_unavailable'),302);
    const now=new Date().toISOString(); const expiresAt=token.expiresIn>0?new Date(Date.now()+token.expiresIn*1000).toISOString():null;
    const {data:account,error:accountError}=await admin.from('kwilt_grocery_provider_accounts').upsert({owner_person_id:binding.person_id,provider:'kroger',scopes:token.scope,token_vault_ref:`server_encrypted:kroger:${binding.person_id}`,state:'active',retailer_label:"Smith's",access_expires_at:expiresAt,updated_at:now},{onConflict:'owner_person_id,provider'}).select('id').single();
    if(accountError||!account?.id)return Response.redirect(appRedirect('error','account_save_failed'),302);
    const encrypted={access:await encryptToken(tokenSecret,token.accessToken),refresh:token.refreshToken?await encryptToken(tokenSecret,token.refreshToken):null,tokenType:token.tokenType,scope:token.scope};
    const {error:tokenError}=await admin.from('kwilt_grocery_provider_tokens').upsert({account_id:account.id,token_payload:encrypted,expires_at:expiresAt,updated_at:now},{onConflict:'account_id'}); if(tokenError)return Response.redirect(appRedirect('error','account_save_failed'),302);
    await admin.from('kwilt_grocery_provider_oauth_states').update({consumed_at:now}).eq('nonce',claims.nonce).is('consumed_at',null);
    return Response.redirect(appRedirect('success'),302);
  }
  if(req.method!=='POST')return response(405,{error:{code:'method_not_allowed'}});
  const userId=await requireUserId(req); if(!userId)return response(401,{error:{code:'unauthorized'}});
  const body=await req.json().catch(()=>({})) as Record<string,unknown>;
  if(body.action==='revoke') { const {data:binding}=await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id',userId).eq('status','active').maybeSingle(); if(binding?.person_id){const {data:account}=await admin.from('kwilt_grocery_provider_accounts').select('id').eq('owner_person_id',binding.person_id).eq('provider','kroger').maybeSingle(); if(account?.id)await admin.from('kwilt_grocery_provider_tokens').delete().eq('account_id',account.id); await admin.from('kwilt_grocery_provider_accounts').update({state:'revoked',updated_at:new Date().toISOString()}).eq('owner_person_id',binding.person_id).eq('provider','kroger');} return response(200,{state:'revoked'}); }
  const nonce=crypto.randomUUID(), codeVerifier=verifier(), issuedAt=Date.now(); const state=await encodeState({provider:'kroger',userId,nonce,issuedAt},stateSecret);
  const {error:insertError}=await admin.from('kwilt_grocery_provider_oauth_states').insert({nonce,user_id:userId,provider:'kroger',verifier_payload:await encryptToken(tokenSecret,codeVerifier),expires_at:new Date(issuedAt+10*60*1000).toISOString()}); if(insertError)return response(500,{error:{code:'state_save_failed'}});
  return response(200,{authUrl:buildKrogerAuthorizationUrl({clientId,redirectUri:callbackUrl(req),state,challenge:await challenge(codeVerifier)})});
});
