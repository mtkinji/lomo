import { act, render, waitFor } from '@testing-library/react-native';
import { useKwiltLabsStore } from '../../../labs/useKwiltLabsStore';
import { stopExploreBackgroundUpdates } from './exploreLocationUpdates';
import { ExploreLabsRuntimeHost } from './ExploreLabsRuntimeHost';

jest.mock('./ExploreAlwaysOnRuntimeHost', () => ({
  ExploreAlwaysOnRuntimeHost: () => {
    const { Text } = require('react-native');
    return <Text>Explore recording runtime</Text>;
  },
}));
jest.mock('./ExploreSyncRuntimeHost', () => ({
  ExploreSyncRuntimeHost: () => {
    const { Text } = require('react-native');
    return <Text>Explore sync runtime</Text>;
  },
}));
jest.mock('./exploreLocationUpdates', () => ({
  stopExploreBackgroundUpdates: jest.fn(async () => undefined),
}));

describe('ExploreLabsRuntimeHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKwiltLabsStore.setState({ enabledCapabilities: [] });
  });

  it('stops services and mounts no Explore runtime while the Lab is off', async () => {
    const screen = render(<ExploreLabsRuntimeHost userId="user-1" />);

    expect(screen.queryByText('Explore recording runtime')).toBeNull();
    expect(screen.queryByText('Explore sync runtime')).toBeNull();
    await waitFor(() => expect(stopExploreBackgroundUpdates).toHaveBeenCalledTimes(1));
  });

  it('mounts recording and sync only after explicit enablement', async () => {
    const screen = render(<ExploreLabsRuntimeHost userId="user-1" />);
    await act(async () => {
      useKwiltLabsStore.getState().setEnabled('explore', true);
    });

    await waitFor(() => expect(screen.getByText('Explore recording runtime')).toBeTruthy());
    expect(screen.getByText('Explore sync runtime')).toBeTruthy();
  });
});
