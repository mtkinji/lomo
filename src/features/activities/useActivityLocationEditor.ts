import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity } from '../../domain/types';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import { getCurrentLocationBestEffort } from '../../services/location/currentLocation';
import {
  applePlaceSearchBestEffort,
  cancelApplePlaceSearchBestEffort,
} from '../../services/locationOffers/applePlaceSearch';
import type { useAppStore } from '../../store/useAppStore';
import { useAppStore as appStore } from '../../store/useAppStore';
import {
  DEFAULT_LOCATION_RADIUS_FT,
  feetToMeters,
  formatLocationRadiusLabel,
  resolveActivityLocationDraft,
  type ActivityLocationPreview,
} from './activityLocationTriggers';
import {
  isActivityLocationDraftDirty,
  serializeActivityLocationDraft,
  type ActivityLocationAlert,
} from './activityLocationDraft';

type UpdateActivity = ReturnType<typeof useAppStore.getState>['updateActivity'];
export type Coordinates = { latitude: number; longitude: number };
export type ActivityLocationSearchResult = ActivityLocationPreview & { id: string };

type ActivityLocationEditorProps = {
  visible: boolean;
  activity: Activity | undefined;
  updateActivity: UpdateActivity;
  onClose: () => void;
};

export type ActivityLocationEditorController = {
  query: string;
  results: ActivityLocationSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  statusHint: string | null;
  previewLocation: ActivityLocationPreview | null;
  currentCoords: Coordinates | null;
  searchOpen: boolean;
  selectedValue: string;
  trigger: ActivityLocationAlert;
  radiusM: number;
  isDirty: boolean;
  radiusLabel: string;
  setQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setSelectedValue: (value: string) => void;
  setTrigger: (trigger: ActivityLocationAlert) => void;
  setRadiusM: (radiusM: number) => void;
  setPreviewLocation: (location: ActivityLocationPreview | null) => void;
  selectResult: (result: ActivityLocationSearchResult) => void;
  useCurrentLocation: () => Promise<ActivityLocationPreview | null>;
  clearSelection: () => void;
  save: () => void;
  close: () => void;
};

function normalizePlaceLabel(raw: string): string {
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  while (parts.length > 0 && /^(united states(?: of america)?|usa|us)$/i.test(parts.at(-1) ?? '')) {
    parts.pop();
  }
  const withoutCounty = parts.filter((part) => !/\bcounty\b/i.test(part));
  if (withoutCounty.length >= 2 && /^\d+$/.test(withoutCounty[0])) {
    withoutCounty[0] = `${withoutCounty[0]} ${withoutCounty[1]}`;
    withoutCounty.splice(1, 1);
  }
  return withoutCounty.join(', ') || raw.trim();
}

async function searchNominatim(
  query: string,
  currentCoords: Coordinates | null,
  signal: AbortSignal,
  bounded: boolean,
): Promise<ActivityLocationSearchResult[]> {
  const params = new URLSearchParams({
    format: 'json',
    limit: currentCoords ? '18' : '6',
    q: query,
    'accept-language': 'en',
    countrycodes: 'us',
  });
  if (currentCoords) {
    const radiusKm = 200;
    const deltaLat = radiusKm / 111;
    const cosine = Math.max(0.2, Math.cos((currentCoords.latitude * Math.PI) / 180));
    const deltaLon = radiusKm / (111 * cosine);
    params.set('viewbox', `${currentCoords.longitude - deltaLon},${currentCoords.latitude + deltaLat},${currentCoords.longitude + deltaLon},${currentCoords.latitude - deltaLat}`);
    if (bounded) params.set('bounded', '1');
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': 'Kwilt/1.0 (location search)' },
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const rows = await response.json() as Array<Record<string, unknown>>;
  const results = rows.map((row) => {
    const latitude = Number.parseFloat(String(row.lat ?? ''));
    const longitude = Number.parseFloat(String(row.lon ?? ''));
    const label = normalizePlaceLabel(String(row.display_name ?? ''));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label) return null;
    return {
      id: String(row.place_id ?? row.osm_id ?? `${latitude}:${longitude}:${label}`),
      label,
      latitude,
      longitude,
    };
  }).filter((result): result is ActivityLocationSearchResult => Boolean(result));

  if (!currentCoords) return results.slice(0, 6);
  const distance = (result: ActivityLocationSearchResult) => {
    const lat = result.latitude - currentCoords.latitude;
    const lon = result.longitude - currentCoords.longitude;
    return lat * lat + lon * lon;
  };
  return results.sort((left, right) => distance(left) - distance(right)).slice(0, 6);
}

export function useActivityLocationEditor({
  visible,
  activity,
  updateActivity,
  onClose,
}: ActivityLocationEditorProps): ActivityLocationEditorController {
  const initial = resolveActivityLocationDraft(activity?.location);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ActivityLocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [previewLocation, setPreviewLocation] = useState(initial.previewLocation);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [trigger, setTrigger] = useState<ActivityLocationAlert>(
    activity?.location?.trigger === 'arrive' || activity?.location?.trigger === 'leave'
      ? activity.location.trigger
      : 'off',
  );
  const [radiusM, setRadiusM] = useState(initial.radiusM);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, ActivityLocationSearchResult[]>());

  useEffect(() => {
    if (!visible) return;
    const draft = resolveActivityLocationDraft(activity?.location);
    setPreviewLocation(draft.previewLocation);
    setTrigger(
      activity?.location?.trigger === 'arrive' || activity?.location?.trigger === 'leave'
        ? activity.location.trigger
        : 'off',
    );
    setRadiusM(draft.radiusM);
    setStatusHint(null);
    setSelectedValue('');
    if (!draft.previewLocation && activity?.placeLink?.target.query) {
      setQuery(activity.placeLink.target.query);
    }
    void (async () => {
      const permission = await LocationPermissionService.syncOsPermissionStatus();
      if (permission !== 'authorized' && permission !== 'foregroundOnly') return;
      const coordinates = await getCurrentLocationBestEffort();
      if (coordinates) {
        setCurrentCoords(coordinates);
        return;
      }
      const nextPermission = appStore.getState().locationOfferPreferences.osPermissionStatus;
      setStatusHint(nextPermission === 'denied' || nextPermission === 'restricted'
        ? 'Location is blocked in system settings. Search still works.'
        : nextPermission === 'foregroundOnly'
          ? 'Location is enabled while using the app. Search still works.'
          : nextPermission === 'unavailable'
            ? 'Location isn\'t available in this build yet. Search still works.'
            : 'Couldn\'t read current location. Search still works.');
    })();
  }, [activity?.id, visible]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    abortRef.current?.abort();
    cancelApplePlaceSearchBestEffort();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      const key = trimmed.toLowerCase();
      const cached = cacheRef.current.get(key);
      if (cached) {
        setResults(cached);
        setIsSearching(false);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      void (async () => {
        try {
          const appleResults = await applePlaceSearchBestEffort({
            query: trimmed,
            center: currentCoords,
            radiusKm: 200,
            limit: 6,
          });
          if (controller.signal.aborted) return;
          let next = appleResults?.length
            ? appleResults.map((result) => ({ ...result, label: normalizePlaceLabel(result.label) }))
            : await searchNominatim(trimmed, currentCoords, controller.signal, Boolean(currentCoords));
          if (next.length === 0 && currentCoords) {
            next = await searchNominatim(trimmed, currentCoords, controller.signal, false);
          }
          if (controller.signal.aborted) return;
          cacheRef.current.set(key, next);
          setResults(next);
        } catch (error) {
          if ((error as { name?: string }).name === 'AbortError') return;
          setResults([]);
          setSearchError(error instanceof Error ? error.message : 'Search failed.');
        } finally {
          if (!controller.signal.aborted) setIsSearching(false);
        }
      })();
    }, 280);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
      cancelApplePlaceSearchBestEffort();
    };
  }, [currentCoords, query, visible]);

  const clearSelection = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setPreviewLocation(null);
    setSelectedValue('');
    setSearchOpen(false);
  }, []);
  const close = useCallback(() => {
    clearSelection();
    abortRef.current?.abort();
    onClose();
  }, [clearSelection, onClose]);
  const isDirty = useMemo(() => isActivityLocationDraftDirty({
    saved: activity?.location,
    draft: { place: previewLocation, alert: trigger, radiusM },
  }), [activity?.location, previewLocation, radiusM, trigger]);

  return {
    query,
    results,
    isSearching,
    searchError,
    statusHint,
    previewLocation,
    currentCoords,
    searchOpen,
    selectedValue,
    trigger,
    radiusM,
    isDirty,
    radiusLabel: formatLocationRadiusLabel(radiusM),
    setQuery,
    setSearchOpen,
    setSelectedValue,
    setTrigger,
    setRadiusM,
    setPreviewLocation,
    selectResult: (result) => {
      setSelectedValue(result.id);
      setPreviewLocation(result);
    },
    useCurrentLocation: async () => {
      await LocationPermissionService.ensurePermissionWithRationale('attach_place');
      const coordinates = await getCurrentLocationBestEffort();
      if (!coordinates) {
        setStatusHint((current) => current ?? 'Couldn\'t read current location on this device.');
        return null;
      }
      setCurrentCoords(coordinates);
      const location = { label: 'Pinned place', ...coordinates };
      setPreviewLocation(location);
      return location;
    },
    clearSelection,
    save: () => {
      if (!activity) return;
      const location = serializeActivityLocationDraft({
        place: previewLocation,
        alert: trigger,
        radiusM,
      });
      const updatedAt = new Date().toISOString();
      updateActivity(activity.id, (previous) => ({
        ...previous,
        location,
        placeLink: previewLocation
          ? previous.placeLink
            ? {
                ...previous.placeLink,
                resolution: 'specific',
                provenance: { source: 'user_selected', confidence: 1 },
              }
            : previous.placeLink
          : null,
        updatedAt,
      }));
      close();
    },
    close,
  };
}

export const LOCATION_RADIUS_FT_OPTIONS = [50, 100, 150, 300, 500] as const;
export const DEFAULT_LOCATION_RADIUS_M = feetToMeters(DEFAULT_LOCATION_RADIUS_FT);
