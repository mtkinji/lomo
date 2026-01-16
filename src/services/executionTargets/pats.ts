import { getSupabaseClient } from '../backend/supabaseClient';
import { getEdgeFunctionUrlCandidates } from '../edgeFunctions';
import { getAccessToken } from '../backend/auth';
import { getKwiltMcpBaseUrl } from './executionTargets';

export type CreatePatResult = {
  token: string;
  tokenPrefix: string;
  patId: string;
};

function getPatsCreateUrlCandidates(): string[] {
  // Best-effort: prefer the derived MCP host (often *.functions.supabase.co), then fall back to
  // generic edge function URL derivation (supabaseUrl and/or aiProxy-derived functions host).
  const kwiltMcp = getKwiltMcpBaseUrl();
  const fromMcp = kwiltMcp ? [kwiltMcp.replace(/\/kwilt-mcp$/, '/pats-create')] : [];
  const generic = getEdgeFunctionUrlCandidates('pats-create');
  const urls = [...fromMcp, ...generic].filter((u) => typeof u === 'string' && u.length > 0);
  // De-dupe while keeping order.
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const json = await res.json().catch(() => null);
    const msg =
      (typeof (json as any)?.error?.message === 'string' && (json as any).error.message) ||
      (typeof (json as any)?.message === 'string' && (json as any).message) ||
      null;
    if (msg) return msg;
  } catch {
    // ignore
  }
  try {
    const txt = await res.text();
    if (txt.trim()) return txt.trim().slice(0, 300);
  } catch {
    // ignore
  }
  return `HTTP ${res.status}`;
}

export async function createPat(args?: { label?: string | null }): Promise<CreatePatResult> {
  const label = (args?.label ?? '').trim() || null;
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('You must be signed in to create a PAT.');

  const urls = getPatsCreateUrlCandidates();
  if (urls.length === 0) throw new Error('Unable to determine Edge Function URL for pats-create.');

  const errors: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label }),
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(res);
        errors.push(`${msg} (from ${url})`);
        continue;
      }

      const data = (await res.json().catch(() => null)) as any;
      const token = typeof data?.token === 'string' ? String(data.token) : '';
      const tokenPrefix = typeof data?.tokenPrefix === 'string' ? String(data.tokenPrefix) : '';
      const patId = typeof data?.patId === 'string' ? String(data.patId) : '';

      if (!token || !patId) {
        throw new Error(`PAT creation returned an invalid response (from ${url})`);
      }

      return { token, tokenPrefix, patId };
    } catch (e: any) {
      errors.push(`${typeof e?.message === 'string' ? e.message : String(e)} (from ${url})`);
    }
  }

  const combined = errors.slice(0, 3).join('\n');
  const looksLikeMissingFn = errors.some((e) => e.toLowerCase().includes('requested function was not found'));
  if (looksLikeMissingFn) {
    throw new Error(
      `pats-create is not deployed on this Supabase project.\n\nDeploy it, then retry.\n\nDetails:\n${combined}`,
    );
  }

  throw new Error(combined || 'Unable to create PAT');
}


