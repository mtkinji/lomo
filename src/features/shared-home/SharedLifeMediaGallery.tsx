import { useAccessibilityPreferences } from "../../ui/hooks/useAccessibilityPreferences";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageURISource,
} from "react-native";
import { Button, HStack, Text } from "../../ui/primitives";
import { Pressable as HapticPressable } from "../../ui/HapticPressable";
import { colors, radii, spacing, typography } from "../../theme";
import { homePhotoSource } from "./sharedLifeMedia";
import { SharedLifePage } from "./SharedLifePage";
import type { HomePost } from "./sharedLifeTypes";
export const HomeMediaSourceContext =
  createContext<(path: string) => Promise<ImageURISource>>(homePhotoSource);
export function HomePhoto({
  path,
  alt,
  contain = false,
  height,
  width,
}: {
  path: string;
  alt: string;
  contain?: boolean;
  height?: number;
  width?: number;
}) {
  const resolveSource = useContext(HomeMediaSourceContext);
  const [source, setSource] = useState<ImageURISource | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSource(null);
    setFailed(false);
    void resolveSource(path)
      .then((s) => {
        if (active) setSource(s);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path, attempt, resolveSource]);
  return (
    <View
      style={[
        styles.photo,
        height ? { height } : { aspectRatio: 4 / 3 },
        width ? { width } : null,
      ]}
    >
      {source && !failed ? (
        <Image
          source={{ ...source, cache: "reload" }}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          resizeMode={contain ? "contain" : "cover"}
          accessible
          accessibilityLabel={alt || "Shared photo"}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>{failed ? "Photo unavailable" : "Loading photo…"}</Text>
          {failed ? (
            <Button variant="ghost" onPress={() => setAttempt((a) => a + 1)}>
              Retry photo
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}
export function SharedLifeMediaGallery({
  post,
  index = 0,
  onIndexChange,
  sourceLabel,
}: {
  post: HomePost;
  index?: number;
  onIndexChange?: (i: number) => void;
  sourceLabel?: string;
}) {
  const [local, setLocal] = useState(index);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const { height: screenHeight } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const selected = Math.min(local, post.media.length - 1);
  const move = (i: number) => {
    setLocal(i);
    onIndexChange?.(i);
    scroller.current?.scrollTo({
      x: i * width,
      animated: !reduceMotionEnabled,
    });
  };
  if (!post.media.length) return null;
  const detailControls = (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      style={styles.controls}
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={selected === 0}
        accessibilityLabel="Previous photo"
        onPress={() => move(selected - 1)}
      >
        ‹
      </Button>
      <Text>
        {selected + 1} of {post.media.length}
      </Text>
      <Button
        variant="ghost"
        size="sm"
        disabled={selected === post.media.length - 1}
        accessibilityLabel="Next photo"
        onPress={() => move(selected + 1)}
      >
        ›
      </Button>
    </HStack>
  );
  return (
    <>
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setWidth(w);
          requestAnimationFrame(() =>
            scroller.current?.scrollTo({ x: selected * w, animated: false }),
          );
        }}
      >
        <ScrollView
          horizontal
          pagingEnabled
          ref={scroller}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            if (width) {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              setLocal(i);
              onIndexChange?.(i);
            }
          }}
        >
          {post.media.map((photo, i) => (
            <HapticPressable
              key={photo.path}
              style={{ width }}
              accessibilityRole="button"
              accessibilityLabel={`Open photo ${i + 1} of ${post.media.length}`}
              onPress={() => {
                setLocal(i);
                setOpen(true);
              }}
            >
              <HomePhoto
                {...photo}
                width={width}
                height={
                  width *
                  Math.max(
                    0.65,
                    Math.min(
                      1.25,
                      post.media[0].height && post.media[0].width
                        ? post.media[0].height / post.media[0].width
                        : 0.75,
                    ),
                  )
                }
                contain={i > 0}
              />
            </HapticPressable>
          ))}
        </ScrollView>
        {sourceLabel ? (
          <View pointerEvents="none" style={styles.sourceLabel}>
            <Text style={styles.sourceLabelText} numberOfLines={1}>
              {sourceLabel}
            </Text>
          </View>
        ) : null}
        {post.media.length > 1 ? (
          <View pointerEvents="none" style={styles.pageCount}>
            <Text style={styles.sourceLabelText}>{`${selected + 1} / ${post.media.length}`}</Text>
          </View>
        ) : null}
      </View>
      {open ? (
        <SharedLifePage title="Photos" onClose={() => setOpen(false)}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <HomePhoto
              {...post.media[selected]}
              contain
              height={Math.max(160, screenHeight - 260)}
            />
          </View>
          {detailControls}
          <Text style={styles.description}>{post.media[selected].alt}</Text>
        </SharedLifePage>
      ) : null}
    </>
  );
}
const styles = StyleSheet.create({
  photo: {
    width: "100%",
    backgroundColor: colors.shellAlt,
    overflow: "hidden",
  },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: spacing.lg },
  description: { padding: spacing.lg },
  sourceLabel: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    alignSelf: "flex-start",
    maxWidth: "78%",
    backgroundColor: "rgba(20, 20, 20, 0.72)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceLabelText: {
    ...typography.bodySm,
    color: colors.primaryForeground,
    fontWeight: "600",
  },
  pageCount: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(20, 20, 20, 0.72)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
