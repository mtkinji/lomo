import { useAppStore } from '../../../store/useAppStore';
import { createDestinationActions, type DestinationActionsBoundary } from './destinationActions';

export const DEFAULT_DESTINATION_ACTIONS_BOUNDARY: DestinationActionsBoundary = {
  readEnabled: () => useAppStore.getState().enabledSendToDestinations,
  setEnabled: (kind, enabled) => useAppStore.getState().setSendToDestinationEnabled(kind, enabled),
};

export const destinationActions = createDestinationActions(DEFAULT_DESTINATION_ACTIONS_BOUNDARY);
