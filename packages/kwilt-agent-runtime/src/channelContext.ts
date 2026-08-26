export const KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION = 1 as const;

export type KwiltChannelContextPacket = {
  schemaVersion: typeof KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION;
  locale: string;
  timeZone: string;
  appState: 'foreground' | 'background';
  origin: { screen: string; action: string };
  selectedEntities: Array<{
    capabilityId: string;
    objectType: string;
    objectId: string;
    label: string;
  }>;
  attachments: Array<{
    attachmentId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    objectPath: string | null;
  }>;
  pendingWork: { proposalIds: string[]; clientActionIds: string[] };
  availableDeviceProviders: string[];
};

type ChannelContextInput = {
  locale: unknown;
  timeZone: unknown;
  appState: unknown;
  origin: { screen: unknown; action: unknown };
  selectedEntities: readonly Record<string, unknown>[];
  attachments: readonly Record<string, unknown>[];
  pendingProposalIds: readonly unknown[];
  pendingClientActionIds: readonly unknown[];
  availableDeviceProviders: readonly unknown[];
};

function text(value: unknown, maxLength: number, fallback = ''): string {
  const normalized = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (normalized || fallback).slice(0, maxLength);
}

function identifiers(values: readonly unknown[], maxItems: number): string[] {
  return [...new Set(values.map((value) => text(value, 120)).filter(Boolean))].slice(0, maxItems);
}

export function buildKwiltChannelContext(input: ChannelContextInput): KwiltChannelContextPacket {
  return {
    schemaVersion: KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION,
    locale: text(input.locale, 35, 'en-US'),
    timeZone: text(input.timeZone, 100, 'UTC'),
    appState: input.appState === 'active' || input.appState === 'foreground' ? 'foreground' : 'background',
    origin: {
      screen: text(input.origin.screen, 80, 'unknown'),
      action: text(input.origin.action, 80, 'unknown'),
    },
    selectedEntities: input.selectedEntities.slice(0, 8).map((entity) => ({
      capabilityId: text(entity.capabilityId, 80, 'unknown'),
      objectType: text(entity.objectType, 80, 'unknown'),
      objectId: text(entity.objectId, 120, 'unknown'),
      label: text(entity.label, 160, 'Selected item'),
    })),
    attachments: input.attachments.slice(0, 3).map((attachment) => ({
      attachmentId: text(attachment.id ?? attachment.attachmentId, 120, 'unknown'),
      name: text(attachment.name, 120, 'Attachment'),
      mimeType: text(attachment.mimeType, 120, 'application/octet-stream'),
      sizeBytes: typeof attachment.sizeBytes === 'number' && Number.isFinite(attachment.sizeBytes)
        ? Math.max(0, Math.round(attachment.sizeBytes)) : 0,
      objectPath: typeof attachment.objectPath === 'string' && attachment.objectPath.trim()
        ? text(attachment.objectPath, 500) : null,
    })),
    pendingWork: {
      proposalIds: identifiers(input.pendingProposalIds, 20),
      clientActionIds: identifiers(input.pendingClientActionIds, 20),
    },
    availableDeviceProviders: identifiers(input.availableDeviceProviders, 16),
  };
}

export function normalizeKwiltChannelContext(value: unknown): KwiltChannelContextPacket | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION) return null;
  const origin = raw.origin && typeof raw.origin === 'object' && !Array.isArray(raw.origin)
    ? raw.origin as Record<string, unknown> : {};
  const pendingWork = raw.pendingWork && typeof raw.pendingWork === 'object' && !Array.isArray(raw.pendingWork)
    ? raw.pendingWork as Record<string, unknown> : {};
  return buildKwiltChannelContext({
    locale: raw.locale,
    timeZone: raw.timeZone,
    appState: raw.appState,
    origin: { screen: origin.screen, action: origin.action },
    selectedEntities: Array.isArray(raw.selectedEntities)
      ? raw.selectedEntities.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [],
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [],
    pendingProposalIds: Array.isArray(pendingWork.proposalIds) ? pendingWork.proposalIds : [],
    pendingClientActionIds: Array.isArray(pendingWork.clientActionIds) ? pendingWork.clientActionIds : [],
    availableDeviceProviders: Array.isArray(raw.availableDeviceProviders) ? raw.availableDeviceProviders : [],
  });
}
