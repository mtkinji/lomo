import type {
  ExternalActionHistoryItem,
  ExternalConnection,
  ExternalConnectionsResult,
} from '../../services/externalConnections';

export type ExternalActionReceipt = {
  id: string;
  summary: string;
  sourceName: string;
  createdAt: string;
};

const RECEIPT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_HOME_RECEIPTS = 3;

function surfaceName(surface: string): string {
  switch (surface.toLowerCase()) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'cursor': return 'Cursor';
    case 'codex': return 'Codex';
    default: return 'AI app';
  }
}

function fallbackSummary(action: ExternalActionHistoryItem): string {
  const summaries: Record<string, string> = {
    capture_activity: 'Added a To-do.',
    mark_activity_done: 'Marked a To-do done.',
    set_focus_today: 'Updated today’s focus.',
    create_goal: 'Created a Goal.',
    update_activity: 'Updated a To-do.',
  };
  return summaries[action.tool_name] ?? 'Made a change in Kwilt.';
}

function sourceFor(
  action: ExternalActionHistoryItem,
  connections: Map<string, ExternalConnection>,
): string {
  const connection = action.client_id ? connections.get(action.client_id) : null;
  return connection?.client_name?.trim() || surfaceName(connection?.surface ?? action.surface);
}

function isTerminalDomainWrite(action: ExternalActionHistoryItem): boolean {
  if (!action.success || action.tool_kind !== 'write') return false;
  if (action.result_status === 'error') return false;
  return action.object_type !== 'proposal' && action.object_type !== 'client_action';
}

function dedupeKey(action: ExternalActionHistoryItem): string {
  return [
    action.tool_name,
    action.object_type ?? '',
    action.object_id ?? '',
    action.result_summary?.trim() ?? '',
  ].join(':');
}

export function selectExternalActionReceipts(
  result: ExternalConnectionsResult,
  now = new Date(),
): ExternalActionReceipt[] {
  const connections = new Map(result.connections.map((connection) => [connection.client_id, connection]));
  const cutoff = now.getTime() - RECEIPT_WINDOW_MS;
  const seen = new Set<string>();

  return [...result.actions]
    .filter(isTerminalDomainWrite)
    .filter((action) => {
      const timestamp = new Date(action.created_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now.getTime();
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((action) => {
      const key = dedupeKey(action);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_HOME_RECEIPTS)
    .map((action) => ({
      id: action.id,
      summary: action.result_summary?.trim() || fallbackSummary(action),
      sourceName: sourceFor(action, connections),
      createdAt: action.created_at,
    }));
}

export function externalReceiptTime(createdAt: string, now = new Date()): string {
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
