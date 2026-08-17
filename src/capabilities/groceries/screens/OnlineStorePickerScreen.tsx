import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { LocationPermissionService } from '../../../services/LocationPermissionService';
import {
  geocodeStoreSearchBestEffort,
  getCurrentStoreSearchContextBestEffort,
  getStoreSearchContextForQueryBestEffort,
  hydrateStoreCoordinatesBestEffort,
} from '../../../services/location/currentLocation';
import { useAppStore } from '../../../store/useAppStore';
import { KrogerStoreFinder } from '../components/KrogerStoreFinder';
import { createKrogerConnectionRepository } from '../data/krogerConnectionRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import type { KrogerLocation } from '../providers/krogerProvider';

type Props = NativeStackScreenProps<FoodStackParamList, 'OnlineStorePicker'>;

export function OnlineStorePickerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const repository = useMemo(() => createKrogerConnectionRepository(), []);
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [preferredLocation, setPreferredLocation] = useState<KrogerLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);

  const search = async (
    postalCode: string,
    center?: { latitude: number; longitude: number } | null,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await repository.searchLocations(postalCode);
      setLocations(await hydrateStoreCoordinatesBestEffort(result.locations));
      const nextCenter = center ?? await geocodeStoreSearchBestEffort(postalCode);
      if (nextCenter) setMapCenter(nextCenter);
      if (!result.locations.length) setMessage('No supported online stores were found in this area.');
    } catch {
      setMessage('Stores could not load. Search another area.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      preferredGroceryStore.read(personId),
      LocationPermissionService.syncOsPermissionStatus(),
    ]).then(async ([preferred, permission]) => {
      setPreferredLocation(preferred);
      if (permission !== 'authorized' && permission !== 'foregroundOnly') return;
      const context = await getCurrentStoreSearchContextBestEffort();
      if (!context) return;
      setShowsUserLocation(true);
      setMapCenter(context);
      setQuery(context.postalCode);
      await search(context.postalCode, context);
    }).catch(() => setMessage('Stores could not load. Search another area.'));
  // The repository is memoized for the lifetime of this screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, repository]);

  const findStores = () => {
    void (async () => {
      const value = query.trim();
      if (!value) {
        setMessage('Enter a city, address, or ZIP.');
        return;
      }
      if (/^\d{5}$/.test(value)) {
        await search(value);
        return;
      }
      setBusy(true);
      setMessage(null);
      const context = await getStoreSearchContextForQueryBestEffort(value);
      if (!context) {
        setBusy(false);
        setMessage('We couldn’t find that area. Try a city, address, or ZIP.');
        return;
      }
      await search(context.postalCode, context);
    })();
  };

  const findCurrentLocation = () => {
    void (async () => {
      setBusy(true);
      setMessage(null);
      const granted = await LocationPermissionService.ensurePermissionWithRationale('attach_place');
      if (!granted) {
        setBusy(false);
        setMessage('We couldn’t use your location. Search an area instead.');
        return;
      }
      const context = await getCurrentStoreSearchContextBestEffort();
      setBusy(false);
      if (!context) {
        setMessage('We couldn’t use your location. Search an area instead.');
        return;
      }
      setShowsUserLocation(true);
      setMapCenter(context);
      setQuery(context.postalCode);
      await search(context.postalCode, context);
    })();
  };

  const choose = (location: KrogerLocation) => {
    void (async () => {
      setBusy(true);
      setMessage(null);
      try {
        await preferredGroceryStore.write(personId, location);
        setPreferredLocation(location);
        navigation.goBack();
      } catch {
        setMessage('That store could not be saved. Try again.');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <View style={{ flex: 1 }}>
      <KrogerStoreFinder
        locations={locations}
        preferredLocation={preferredLocation}
        query={query}
        busy={busy}
        storeSearchMessage={message}
        mapCenter={mapCenter}
        showsUserLocation={showsUserLocation}
        bottomInset={insets.bottom}
        backAccessibilityLabel="Back to online stores"
        chooseActionLabel="Add this online store"
        onQueryChange={setQuery}
        onBack={() => navigation.goBack()}
        onFindStores={findStores}
        onFindCurrentLocation={findCurrentLocation}
        onChoose={choose}
      />
    </View>
  );
}
