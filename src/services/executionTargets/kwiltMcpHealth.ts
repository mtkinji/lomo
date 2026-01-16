import { getKwiltMcpBaseUrl } from './executionTargets';

export type KwiltMcpHealthResult =
  | { ok: true; tools: string[] }
  | { ok: false; message: string };

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

export async function testKwiltMcpConnection(args: {
  token: string;
  url?: string | null;
}): Promise<KwiltMcpHealthResult> {
  const url = (args.url ?? getKwiltMcpBaseUrl())?.trim() || '';
  if (!url) return { ok: false, message: 'Missing MCP URL.' };
  const token = (args.token ?? '').trim();
  if (!token) return { ok: false, message: 'Missing Cursor Key.' };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });

  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    return { ok: false, message: msg };
  }

  const json = (await res.json().catch(() => null)) as any;
  const tools = Array.isArray(json?.result?.tools)
    ? json.result.tools
        .map((t: any) => (typeof t?.name === 'string' ? t.name : null))
        .filter((t: any) => typeof t === 'string')
    : [];

  if (tools.length === 0) {
    return { ok: false, message: 'Connected, but no tools were returned.' };
  }

  return { ok: true, tools };
}



