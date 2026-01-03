import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent, Text } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type StaticMapProvider = 'osmde' | 'wikimedia';

type TileProvider = 'tiles';
type StaticMapProviderWithTiles = StaticMapProvider | TileProvider;

function buildOsmDeStaticMapUrl(params: {
  lat: number;
  lon: number;
  widthPx: number;
  heightPx: number;
  zoom: number;
}): string {
  const { lat, lon, widthPx, heightPx, zoom } = params;
  const size = `${Math.max(1, Math.round(widthPx))}x${Math.max(1, Math.round(heightPx))}`;
  // StaticMap.de expects marker colors like "red", "blue", "green" (not Google-style pushpin names).
  const marker = `${lat},${lon},red`;
  const query =
    `center=${encodeURIComponent(`${lat},${lon}`)}` +
    `&zoom=${encodeURIComponent(String(zoom))}` +
    `&size=${encodeURIComponent(size)}` +
    `&maptype=mapnik` +
    `&markers=${encodeURIComponent(marker)}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?${query}`;
}

function buildWikimediaStaticMapUrl(params: {
  lat: number;
  lon: number;
  widthPx: number;
  heightPx: number;
  zoom: number;
}): string {
  const { lat, lon, widthPx, heightPx, zoom } = params;
  const w = Math.max(1, Math.round(widthPx));
  const h = Math.max(1, Math.round(heightPx));
  // Wikimedia Kartographer static maps (no API key). Format: /img/osm-intl,zoom,lat,lon,widthxheight.png
  // Example: https://maps.wikimedia.org/img/osm-intl,15,37.789,-122.401,500x300.png
  return `https://maps.wikimedia.org/img/osm-intl,${encodeURIComponent(String(zoom))},${encodeURIComponent(
    String(lat),
  )},${encodeURIComponent(String(lon))},${encodeURIComponent(`${w}x${h}`)}.png`;
}

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function lonToWorldX(lon: number, worldSize: number) {
  return ((lon + 180) / 360) * worldSize;
}

function latToWorldY(lat: number, worldSize: number) {
  const rad = (clampLat(lat) * Math.PI) / 180;
  const sin = Math.sin(rad);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
}

export function StaticMapImage({
  latitude,
  longitude,
  heightPx = 180,
  zoom = 15,
  radiusM,
}: {
  latitude: number;
  longitude: number;
  heightPx?: number;
  zoom?: number;
  radiusM?: number;
}) {
  const [widthPx, setWidthPx] = useState<number>(0);
  const [hadError, setHadError] = useState(false);
  const [provider, setProvider] = useState<StaticMapProviderWithTiles>('osmde');

  const requestWidth = useMemo(() => {
    // Request at ~2x for retina-ish sharpness, but cap so providers don't reject.
    const w = widthPx > 0 ? Math.round(widthPx * 2) : 900;
    return Math.max(256, Math.min(900, w));
  }, [widthPx]);

  const requestHeight = useMemo(() => {
    const h = Math.round(heightPx * 2);
    return Math.max(256, Math.min(900, h));
  }, [heightPx]);

  const mapUrl = useMemo(() => {
    const params = { lat: latitude, lon: longitude, widthPx: requestWidth, heightPx: requestHeight, zoom };
    if (provider === 'tiles') return '';
    return provider === 'wikimedia' ? buildWikimediaStaticMapUrl(params) : buildOsmDeStaticMapUrl(params);
  }, [latitude, longitude, provider, requestHeight, requestWidth, zoom]);

  const radiusPx = useMemo(() => {
    if (!radiusM || !Number.isFinite(radiusM) || radiusM <= 0) return 0;
    if (!widthPx || widthPx <= 0) return 0;
    // Approx meters-per-pixel at this zoom (WebMercator approximation).
    // m/px = 156543.03392 * cos(lat) / 2^zoom
    const latRad = (latitude * Math.PI) / 180;
    const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
    if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return 0;
    const px = radiusM / metersPerPixel;
    // Clamp so the ring doesn't explode; keep within the visible frame.
    return Math.max(0, Math.min(px, Math.min(widthPx, heightPx) * 0.95));
  }, [heightPx, latitude, radiusM, widthPx, zoom]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== widthPx) setWidthPx(w);
  };

  const tileGrid = useMemo(() => {
    if (provider !== 'tiles') return null;
    if (!widthPx || widthPx <= 0) return null;
    const tileSize = 256;
    const worldSize = tileSize * Math.pow(2, zoom);
    const wx = lonToWorldX(longitude, worldSize);
    const wy = latToWorldY(latitude, worldSize);
    const tileX = Math.floor(wx / tileSize);
    const tileY = Math.floor(wy / tileSize);
    const offsetX = wx - tileX * tileSize;
    const offsetY = wy - tileY * tileSize;

    const centerX = widthPx / 2;
    const centerY = heightPx / 2;
    const originLeft = centerX - offsetX - tileSize;
    const originTop = centerY - offsetY - tileSize;

    const maxTile = Math.pow(2, zoom) - 1;
    const wrapX = (x: number) => {
      const mod = ((x % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
      return mod;
    };
    const clampY = (y: number) => Math.max(0, Math.min(maxTile, y));

    const tiles: Array<{ key: string; x: number; y: number; left: number; top: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = wrapX(tileX + dx);
        const y = clampY(tileY + dy);
        tiles.push({
          key: `${zoom}:${x}:${y}`,
          x,
          y,
          left: originLeft + (dx + 1) * tileSize,
          top: originTop + (dy + 1) * tileSize,
        });
      }
    }
    return { tiles, tileSize };
  }, [heightPx, latitude, longitude, provider, widthPx, zoom]);

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {provider === 'tiles' ? (
        <View style={[styles.image, { height: heightPx }]}>
          {tileGrid?.tiles.map((t) => (
            <Image
              key={t.key}
              source={{ uri: `https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png` }}
              style={{
                position: 'absolute',
                left: t.left,
                top: t.top,
                width: tileGrid.tileSize,
                height: tileGrid.tileSize,
              }}
              resizeMode="cover"
              onError={() => setHadError(true)}
              onLoad={() => setHadError(false)}
            />
          ))}
        </View>
      ) : (
        <Image
          source={{ uri: mapUrl }}
          style={[styles.image, { height: heightPx }]}
          resizeMode="cover"
          onError={() => {
            // Some providers occasionally 403/rate-limit image requests from mobile clients.
            // Fall back to Wikimedia, then to raw OSM tiles.
            if (provider === 'osmde') {
              setProvider('wikimedia');
              return;
            }
            if (provider === 'wikimedia') {
              setProvider('tiles');
              return;
            }
            setHadError(true);
          }}
          onLoad={() => setHadError(false)}
        />
      )}
      {radiusPx > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.radiusRing,
            {
              width: radiusPx * 2,
              height: radiusPx * 2,
              borderRadius: radiusPx,
              left: widthPx / 2 - radiusPx,
              top: heightPx / 2 - radiusPx,
            },
          ]}
        />
      ) : null}
      {hadError ? (
        <View pointerEvents="none" style={[styles.errorOverlay, { height: heightPx }]}>
          <Text style={styles.errorText}>Map preview unavailable (check internet)</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  image: {
    width: '100%',
    backgroundColor: colors.shellAlt,
  },
  radiusRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'rgba(49,85,69,0.12)',
  },
  errorOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(245,245,244,0.55)',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});


