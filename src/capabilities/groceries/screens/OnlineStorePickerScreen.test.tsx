import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSearchLocations = jest.fn();
const mockPreferredRead = jest.fn();
const mockPreferredWrite = jest.fn();
const mockSyncPermission = jest.fn();
const mockEnsurePermission = jest.fn();

jest.mock('../data/krogerConnectionRepository', () => ({
  createKrogerConnectionRepository: () => ({ searchLocations: mockSearchLocations }),
}));
jest.mock('../data/preferredGroceryStore', () => ({
  preferredGroceryStore: {
    read: (...args: unknown[]) => mockPreferredRead(...args),
    write: (...args: unknown[]) => mockPreferredWrite(...args),
  },
}));
jest.mock('../../../services/LocationPermissionService', () => ({
  LocationPermissionService: {
    syncOsPermissionStatus: (...args: unknown[]) => mockSyncPermission(...args),
    ensurePermissionWithRationale: (...args: unknown[]) => mockEnsurePermission(...args),
  },
}));
jest.mock('../../../services/location/currentLocation', () => ({
  geocodeStoreSearchBestEffort: jest.fn().mockResolvedValue(null),
  getCurrentStoreSearchContextBestEffort: jest.fn().mockResolvedValue(null),
  getStoreSearchContextForQueryBestEffort: jest.fn().mockResolvedValue(null),
  hydrateStoreCoordinatesBestEffort: jest.fn(async (locations: unknown[]) => locations),
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'person-1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));
jest.mock('../components/KrogerStoreFinder', () => {
  const { Pressable, Text, TextInput, View } = jest.requireActual('react-native');
  return {
    KrogerStoreFinder: ({
      backAccessibilityLabel,
      locations,
      onChoose,
      onFindStores,
      onQueryChange,
      query,
    }: {
      backAccessibilityLabel: string;
      locations: Array<{ id: string; banner: string; address: string }>;
      onChoose(location: { id: string; banner: string; address: string }): void;
      onFindStores(): void;
      onQueryChange(value: string): void;
      query: string;
    }) => (
      <View>
        <Text>{backAccessibilityLabel}</Text>
        <TextInput
          accessibilityLabel="Search for supported online stores"
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={onFindStores}
        />
        {locations.map((location) => (
          <Pressable
            key={location.id}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${location.banner}`}
            onPress={() => onChoose(location)}
          >
            <Text>{location.banner}</Text>
            <Text>{location.address}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

import { OnlineStorePickerScreen } from './OnlineStorePickerScreen';

describe('OnlineStorePickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferredRead.mockResolvedValue(null);
    mockPreferredWrite.mockResolvedValue(undefined);
    mockSyncPermission.mockResolvedValue('denied');
    mockEnsurePermission.mockResolvedValue(false);
    mockSearchLocations.mockResolvedValue({ locations: [] });
  });

  it('finds and saves the consumer-facing local banner without starting a cart', async () => {
    const smiths = {
      id: '70600123',
      name: 'Smiths',
      banner: "Smith's",
      address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
      latitude: 40.34,
      longitude: -111.91,
    };
    mockSearchLocations.mockResolvedValue({ locations: [smiths] });
    const goBack = jest.fn();
    const screen = render(
      <OnlineStorePickerScreen
        navigation={{ goBack } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    const search = screen.getByLabelText('Search for supported online stores');
    fireEvent.changeText(search, '84045');
    fireEvent(search, 'submitEditing');

    await waitFor(() => expect(mockSearchLocations).toHaveBeenCalledWith('84045'));
    fireEvent.press(await screen.findByRole('button', { name: "Choose Smith's" }));

    await waitFor(() => expect(mockPreferredWrite).toHaveBeenCalledWith('person-1', smiths));
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Kroger family')).toBeNull();
  });
});
