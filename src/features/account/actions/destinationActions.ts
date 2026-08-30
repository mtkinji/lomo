import { OOTB_DESTINATIONS } from '../../../domain/ootbDestinations';

export const SUPPORTED_DESTINATION_KINDS = ['amazon', 'home_depot', 'instacart', 'doordash'] as const;
export type SupportedDestinationKind = typeof SUPPORTED_DESTINATION_KINDS[number];

export type DestinationActionsBoundary = {
  readEnabled(): Record<string, boolean>;
  setEnabled(kind: string, enabled: boolean): void;
};

export class DestinationConflictError extends Error {
  constructor() {
    super('The destination changed after this uninstall was reviewed.');
    this.name = 'DestinationConflictError';
  }
}

function definition(kind: string) {
  if (!(SUPPORTED_DESTINATION_KINDS as readonly string[]).includes(kind)) {
    throw new Error('Choose a supported retailer destination.');
  }
  const found = OOTB_DESTINATIONS.find((item) => item.kind === kind && item.kind !== 'cursor_repo');
  if (!found) throw new Error('That supported retailer destination is unavailable.');
  return found;
}

function summary(kind: SupportedDestinationKind, enabled: Record<string, boolean>) {
  const item = definition(kind);
  return {
    destinationId: kind,
    kind,
    displayName: item.displayName,
    description: item.description,
    supportedActivityTypes: item.supportedTypes,
    installed: Boolean(enabled[kind]),
  };
}

export function createDestinationActions(boundary: DestinationActionsBoundary) {
  return {
    list() {
      const enabled = boundary.readEnabled();
      return { destinations: SUPPORTED_DESTINATION_KINDS.map((kind) => summary(kind, enabled)) };
    },
    get(input: { destinationId: string }) {
      const item = definition(input.destinationId);
      return summary(item.kind as SupportedDestinationKind, boundary.readEnabled());
    },
    install(input: { kind: SupportedDestinationKind }) {
      const item = definition(input.kind);
      boundary.setEnabled(item.kind, true);
      const result = summary(item.kind as SupportedDestinationKind, boundary.readEnabled());
      if (!result.installed) throw new Error('Kwilt did not confirm that the destination was installed.');
      return result;
    },
    uninstall(input: { destinationId: string; expectedInstalled: boolean }) {
      const item = definition(input.destinationId);
      const before = summary(item.kind as SupportedDestinationKind, boundary.readEnabled());
      if (before.installed !== input.expectedInstalled) throw new DestinationConflictError();
      boundary.setEnabled(item.kind, false);
      const result = summary(item.kind as SupportedDestinationKind, boundary.readEnabled());
      if (result.installed) throw new Error('Kwilt did not confirm that the destination was uninstalled.');
      return result;
    },
  };
}
