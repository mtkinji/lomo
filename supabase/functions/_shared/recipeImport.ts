export const MAX_RECIPE_SOURCE_TEXT = 50_000;
export const MAX_RECIPE_HTML_BYTES = 2_000_000;
export const MAX_RECIPE_IMAGES = 10;
export const MAX_RECIPE_IMAGE_DATA_CHARS = 8_000_000;

export type RecipeImportRequest = {
  method: 'url' | 'photo' | 'scan' | 'text' | 'voice';
  sourceUrl: string | null;
  sourceText: string | null;
  imageDataUrls: string[];
  idempotencyKey: string;
};

type ParseResult<T> = { ok: true; value: T } | { ok: false; code: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateExternalRecipeUrl(raw: unknown): ParseResult<URL> {
  if (typeof raw !== 'string' || raw.length > 2048) return { ok: false, code: 'invalid_source_url' };
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || url.username || url.password || !hostname) return { ok: false, code: 'unsafe_source_url' };
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return { ok: false, code: 'unsafe_source_url' };
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return { ok: false, code: 'unsafe_source_url' };
    if (isPrivateAddress(hostname)) return { ok: false, code: 'unsafe_source_url' };
    return { ok: true, value: url };
  } catch {
    return { ok: false, code: 'invalid_source_url' };
  }
}

export function parseRecipeImportRequest(body: unknown): ParseResult<RecipeImportRequest> {
  if (!isRecord(body)) return { ok: false, code: 'invalid_request' };
  const allowed = new Set(['method', 'sourceUrl', 'sourceText', 'imageDataUrls', 'idempotencyKey']);
  if (Object.keys(body).some((key) => !allowed.has(key))) return { ok: false, code: 'unknown_request_field' };
  if (!['url', 'photo', 'scan', 'text', 'voice'].includes(String(body.method))) return { ok: false, code: 'invalid_import_method' };
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!idempotencyKey || idempotencyKey.length > 200) return { ok: false, code: 'invalid_idempotency_key' };
  const sourceText = body.sourceText == null ? null : typeof body.sourceText === 'string' ? body.sourceText.trim() : '';
  if (sourceText !== null && (!sourceText || sourceText.length > MAX_RECIPE_SOURCE_TEXT)) return { ok: false, code: 'invalid_source_text' };
  const imageDataUrls = body.imageDataUrls == null ? [] : Array.isArray(body.imageDataUrls) ? body.imageDataUrls : [];
  if (imageDataUrls.length > MAX_RECIPE_IMAGES || imageDataUrls.some((item) => typeof item !== 'string' || item.length > MAX_RECIPE_IMAGE_DATA_CHARS || !/^data:image\/(jpeg|png|webp);base64,/i.test(item))) {
    return { ok: false, code: 'invalid_recipe_images' };
  }
  const method = body.method as RecipeImportRequest['method'];
  let sourceUrl: string | null = null;
  if (method === 'url') {
    const parsedUrl = validateExternalRecipeUrl(body.sourceUrl);
    if (!parsedUrl.ok) return parsedUrl;
    sourceUrl = parsedUrl.value.toString();
  } else if ((method === 'photo' || method === 'scan') && imageDataUrls.length === 0) return { ok: false, code: 'recipe_image_required' };
  else if ((method === 'text' || method === 'voice') && !sourceText) return { ok: false, code: 'source_text_required' };
  return { ok: true, value: { method, sourceUrl, sourceText, imageDataUrls: imageDataUrls as string[], idempotencyKey } };
}

function recipeNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) { const found = recipeNode(item); if (found) return found; }
    return null;
  }
  if (!isRecord(value)) return null;
  if (Array.isArray(value['@graph'])) { const found = recipeNode(value['@graph']); if (found) return found; }
  const type = value['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return value;
  return null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function authorName(value: unknown): string | null {
  if (typeof value === 'string') return text(value, 512);
  if (Array.isArray(value)) return authorName(value[0]);
  return isRecord(value) ? text(value.name, 512) : null;
}

function instructionTexts(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(instructionTexts);
  if (!isRecord(value)) return [];
  if (value['@type'] === 'HowToSection') return instructionTexts(value.itemListElement);
  return text(value.text ?? value.name, 8_000) ? [text(value.text ?? value.name, 8_000)!] : [];
}

function parseYield(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = typeof raw === 'string' ? raw.match(/\d+(?:\.\d+)?/) : null;
  const result = typeof raw === 'number' ? raw : match ? Number(match[0]) : null;
  return result !== null && Number.isFinite(result) && result > 0 ? result : null;
}

function durationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value);
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : null;
}

export type ExtractedSchemaRecipe = {
  title: string;
  description: string | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: Array<{ id: string; originalText: string }>;
  instructions: Array<{ id: string; text: string }>;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourceUrl: string;
};

export function extractSchemaRecipe(html: string, sourceUrl: string): ExtractedSchemaRecipe | null {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].replace(/^\s*<!--|-->\s*$/g, '').trim());
      const recipe = recipeNode(parsed);
      const title = recipe ? text(recipe.name, 160) : null;
      if (!recipe || !title) continue;
      const rawIngredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
      const ingredients = rawIngredients.flatMap((item, index) => {
        const originalText = text(item, 1_000);
        return originalText ? [{ id: `url-ingredient-${index + 1}`, originalText }] : [];
      }).slice(0, 200);
      const instructions = instructionTexts(recipe.recipeInstructions).slice(0, 200).map((step, index) => ({ id: `url-step-${index + 1}`, text: step }));
      return {
        title, description: text(recipe.description, 4_000), yieldQuantity: parseYield(recipe.recipeYield),
        yieldUnit: parseYield(recipe.recipeYield) === null ? null : 'servings', prepMinutes: durationMinutes(recipe.prepTime),
        cookMinutes: durationMinutes(recipe.cookTime), ingredients, instructions,
        sourceTitle: title, sourceAuthor: authorName(recipe.author), sourceUrl,
      };
    } catch { /* Try another JSON-LD block. */ }
  }
  return null;
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized)) return true;
  if (normalized === '::' || normalized === '::1' || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('::ffff:')) return true;
  return false;
}

async function assertPublicDns(url: URL): Promise<void> {
  if (/^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) return;
  const addresses = await Deno.resolveDns(url.hostname, 'A').catch(() => [] as string[]);
  const ipv6 = await Deno.resolveDns(url.hostname, 'AAAA').catch(() => [] as string[]);
  if (addresses.length + ipv6.length === 0 || [...addresses, ...ipv6].some(isPrivateAddress)) throw new Error('unsafe_source_url');
}

async function boundedResponseText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_RECIPE_HTML_BYTES) throw new Error('source_too_large');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RECIPE_HTML_BYTES) { await reader.cancel(); throw new Error('source_too_large'); }
    chunks.push(value);
  }
  const merged = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(merged);
}

export async function fetchRecipeHtml(rawUrl: string, fetcher: typeof fetch = fetch): Promise<{ html: string; finalUrl: string }> {
  let current = validateExternalRecipeUrl(rawUrl);
  if (!current.ok) throw new Error(current.code);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    await assertPublicDns(current.value);
    const response = await fetcher(current.value, { redirect: 'manual', headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'KwiltRecipeImport/1.0' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) throw new Error('unsafe_redirect');
      current = validateExternalRecipeUrl(new URL(location, current.value).toString());
      if (!current.ok) throw new Error(current.code);
      continue;
    }
    if (!response.ok) throw new Error('source_fetch_failed');
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('unsupported_source_type');
    return { html: await boundedResponseText(response), finalUrl: current.value.toString() };
  }
  throw new Error('unsafe_redirect');
}
