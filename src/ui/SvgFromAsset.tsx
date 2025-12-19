import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

type SvgXmlProps = ComponentProps<typeof SvgXml>;

type SvgSource = number;

const svgXmlCache = new Map<string, string>();

interface SvgFromAssetProps {
  source: SvgSource;
  width?: SvgXmlProps['width'];
  height?: SvgXmlProps['height'];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SvgFromAsset({
  source,
  width,
  height,
  style,
  accessibilityLabel,
}: SvgFromAssetProps) {
  const asset = useMemo(() => Asset.fromModule(source), [source]);
  const [xml, setXml] = useState<string | null>(() => {
    const key = asset.uri;
    return svgXmlCache.get(key) ?? null;
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const cached = svgXmlCache.get(uri) ?? svgXmlCache.get(asset.uri);
        if (cached) {
          if (!cancelled) setXml(cached);
          return;
        }

        // On native, `fetch(file://...)` can fail or return empty. Prefer reading the
        // downloaded asset via Expo FileSystem.
        let text: string | null = null;
        try {
          if (asset.localUri) {
            text = await FileSystem.readAsStringAsync(asset.localUri);
          }
        } catch {
          text = null;
        }

        // Fallback: attempt fetch for web / http(s) URIs.
        if (!text) {
          const res = await fetch(uri);
          text = await res.text();
        }

        svgXmlCache.set(uri, text);
        if (asset.uri !== uri) {
          svgXmlCache.set(asset.uri, text);
        }
        if (!cancelled) setXml(text);
      } catch {
        if (!cancelled) setXml(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (!xml) {
    return <View style={style} accessibilityLabel={accessibilityLabel} />;
  }

  return (
    <View style={style} accessibilityLabel={accessibilityLabel}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}


