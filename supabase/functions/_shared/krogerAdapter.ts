export type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export class RetailerAdapterError extends Error { constructor(code: string) { super(code); this.name = 'RetailerAdapterError'; } }
const API = 'https://api.kroger.com/v1';
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const cents = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : null;
const coordinate = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const imageSizePreference = ['small', 'thumbnail', 'medium', 'large', 'xlarge'];
function productThumbnail(value: unknown): string | null { const images=Array.isArray(value)?value.map(asRecord):[];const front=images.find((image)=>string(image.perspective).toLowerCase()==='front');const preferred=front??images.find((image)=>image.featured===true||image.default===true)??images[0];const sizes=Array.isArray(preferred?.sizes)?preferred.sizes.map(asRecord):[];for(const preferredSize of imageSizePreference){const url=string(sizes.find((image)=>string(image.size).toLowerCase()===preferredSize)?.url);if(url)return url;}return string(sizes.find((image)=>string(image.url))?.url)||null; }

export function buildKrogerAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }) {
  const url = new URL(`${API}/connect/oauth2/authorize`);
  Object.entries({ scope: 'cart.basic:write', response_type: 'code', client_id: input.clientId, redirect_uri: input.redirectUri, state: input.state, code_challenge: input.challenge, code_challenge_method: 'S256' }).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function basic(clientId: string, clientSecret: string) { return `Basic ${btoa(`${clientId}:${clientSecret}`)}`; }
async function tokenRequest(input: { clientId: string; clientSecret: string; body: URLSearchParams; fetcher?: Fetcher }) {
  const response = await (input.fetcher ?? fetch)(`${API}/connect/oauth2/token`, { method: 'POST', headers: { authorization: basic(input.clientId, input.clientSecret), 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: input.body.toString() });
  const body = asRecord(await response.json().catch(() => null));
  if (!response.ok || !string(body.access_token)) throw new RetailerAdapterError('provider_token_failed');
  const scopes = string(body.scope).split(/\s+/).filter(Boolean);
  return { accessToken: string(body.access_token), refreshToken: string(body.refresh_token) || null, expiresIn: Number(body.expires_in ?? 0), tokenType: string(body.token_type) || 'bearer', scope: scopes };
}
export function exchangeKrogerToken(input: { clientId: string; clientSecret: string; redirectUri: string; code: string; verifier: string; fetcher?: Fetcher }) {
  return tokenRequest({ ...input, body: new URLSearchParams({ grant_type: 'authorization_code', code: input.code, redirect_uri: input.redirectUri, code_verifier: input.verifier }) }).then((token) => { if (!token.scope.includes('cart.basic:write')) throw new RetailerAdapterError('provider_scope_missing'); return token; });
}
export function refreshKrogerToken(input: { clientId: string; clientSecret: string; refreshToken: string; fetcher?: Fetcher }) {
  return tokenRequest({ ...input, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: input.refreshToken }) });
}
export async function getKrogerClientToken(input: { clientId: string; clientSecret: string; fetcher?: Fetcher }) {
  return await tokenRequest({ ...input, body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'product.compact' }) });
}
async function krogerGet(path: string, token: string, fetcher: Fetcher = fetch) { const response = await fetcher(`${API}${path}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } }); if (!response.ok) throw new RetailerAdapterError(response.status === 429 ? 'provider_rate_limited' : 'provider_failed'); return await response.json(); }
export async function searchKrogerLocations(input: { zipCode: string; token: string; fetcher?: Fetcher }) { return parseKrogerLocations(await krogerGet(`/locations?filter.zipCode.near=${encodeURIComponent(input.zipCode)}&filter.limit=10`, input.token, input.fetcher)); }
export async function searchKrogerProducts(input: { term: string; locationId: string; token: string; fetcher?: Fetcher }) { return parseKrogerProducts(await krogerGet(`/products?filter.term=${encodeURIComponent(input.term)}&filter.locationId=${encodeURIComponent(input.locationId)}&filter.fulfillment=csp&filter.limit=5`, input.token, input.fetcher)); }

export type KrogerLocation = { id: string; name: string; banner: string; address: string; latitude: number | null; longitude: number | null };
export function parseKrogerLocations(value: unknown): KrogerLocation[] { const data = asRecord(value).data; return (Array.isArray(data) ? data : []).flatMap((raw) => { const row=asRecord(raw), address=asRecord(row.address), geolocation=asRecord(row.geolocation), id=string(row.locationId), name=string(row.name), chain=string(row.chain); if(!id||!name)return []; const locality=[string(address.city), string(address.state), string(address.zipCode)].filter(Boolean).join(' '); return [{ id, name, banner: /smith/i.test(`${chain} ${name}`) ? "Smith's" : name, address: [string(address.addressLine1), locality].filter(Boolean).join(' · '), latitude: coordinate(geolocation.latitude), longitude: coordinate(geolocation.longitude) }]; }); }
export type KrogerProduct = { id: string; upc: string; title: string; brand: string|null; size: string|null; thumbnailUrl?: string|null; regularPriceCents: number|null; promoPriceCents: number|null; pickupAvailable: boolean };
export function parseKrogerProducts(value: unknown): KrogerProduct[] { const data=asRecord(value).data; return (Array.isArray(data)?data:[]).flatMap((raw)=>{ const row=asRecord(raw), items=Array.isArray(row.items)?row.items:[], item=asRecord(items[0]), price=asRecord(item.price), fulfillment=asRecord(item.fulfillment), id=string(row.productId), upc=string(row.upc)||id, title=string(row.description); if(!id||!upc||!title)return []; return [{id,upc,title,brand:string(row.brand)||null,size:string(item.size)||null,thumbnailUrl:productThumbnail(row.images),regularPriceCents:cents(price.regular),promoPriceCents:cents(price.promo),pickupAvailable:fulfillment.curbside===true}]; }); }
export function buildKrogerCartPayload(items: Array<{upc:string;quantity:number}>) { if(!items.length) throw new RetailerAdapterError('provider.cart_empty'); return {items:items.map(({upc,quantity})=>{const clean=upc.trim(), count=Math.floor(quantity); if(!clean||!Number.isFinite(count)||count<1)throw new RetailerAdapterError('provider.cart_item_invalid'); return {upc:clean,quantity:count,modality:'PICKUP'};})}; }
export async function addToKrogerCart(input:{items:Array<{upc:string;quantity:number}>;accessToken:string;fetcher?:Fetcher;timeoutMs?:number}) { const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),input.timeoutMs??10000); try { const response=await (input.fetcher??fetch)(`${API}/cart/add`,{method:'PUT',headers:{authorization:`Bearer ${input.accessToken}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(buildKrogerCartPayload(input.items)),signal:controller.signal}); if(response.status===401)throw new RetailerAdapterError('provider_unauthorized'); if(response.status===429)throw new RetailerAdapterError('provider_rate_limited'); if(!response.ok)throw new RetailerAdapterError('provider_failed'); return {acknowledged:true}; } catch(error) { if(error instanceof RetailerAdapterError)throw error; if(error instanceof DOMException&&error.name==='AbortError')throw new RetailerAdapterError('provider_write_ambiguous'); throw new RetailerAdapterError('provider_write_ambiguous'); } finally {clearTimeout(timeout);} }
