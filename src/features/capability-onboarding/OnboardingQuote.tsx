import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { Pressable } from '../../ui/HapticPressable';
import { Text } from '../../ui/Typography';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';

// Match the price typography in FoundingLifetimeOffer.
const serif = Platform.select({ ios: 'ui-serif', android: 'serif', default: 'Georgia' });

/** Draft design copy only. Replace with approved, sourced reviews before release. */
export function OnboardingQuote({ quotes }: { quotes: readonly [string, ...string[]] }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [readingSession, setReadingSession] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const pager = useRef<ScrollView>(null);
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityPreferences();
  const staticQuote = reduceMotionEnabled || screenReaderEnabled;
  const select = useCallback((next: number) => {
    setIndex(next);
    setReadingSession((value) => value + 1);
    pager.current?.scrollTo({ x: next * width, animated: !staticQuote });
  }, [staticQuote, width]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  // A new full reading interval follows every manual selection or settled swipe.
  useEffect(() => {
    if (staticQuote || !active || dragging || !width || quotes.length < 2) return;
    const timer = setTimeout(() => select((index + 1) % quotes.length), 8000);
    return () => clearTimeout(timer);
  }, [active, dragging, index, quotes.length, readingSession, select, staticQuote, width]);

  return (
    <View style={styles.content}>
      <ScrollView ref={pager} horizontal pagingEnabled bounces={false} directionalLockEnabled
        showsHorizontalScrollIndicator={false} style={styles.pager}
        testID="onboarding.quotePager"
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          setWidth(nextWidth);
          pager.current?.scrollTo({ x: index * nextWidth, animated: false });
        }}
        onScrollBeginDrag={() => setDragging(true)}
        onScrollEndDrag={() => setDragging(false)}
        onMomentumScrollEnd={(event) => {
          if (!width) return;
          setIndex(Math.max(0, Math.min(quotes.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
          setDragging(false);
          setReadingSession((value) => value + 1);
        }}>
        {quotes.map((quote, page) => (
          <View key={quote} style={[styles.page, { width }]}
            accessibilityElementsHidden={page !== index}
            importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}>
            <Text style={styles.quote}>“{quote}”</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {quotes.map((quote, page) => (
          <Pressable key={quote} accessibilityRole="button" accessibilityLabel={`Show quote ${page + 1} of ${quotes.length}`}
            accessibilityState={{ selected: page === index }} onPress={() => select(page)} style={styles.dotTarget}>
            <View style={[styles.dot, { opacity: page === index ? 1 : 0.25 }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing['2xl'], width: '100%', maxWidth: 520, alignSelf: 'center' },
  pager: { flexGrow: 0, flexShrink: 0 },
  // All pages share the tallest quote's natural height, including at larger text sizes.
  page: { justifyContent: 'center', paddingHorizontal: spacing.sm },
  quote: { fontFamily: serif, fontWeight: '400', fontSize: 26, lineHeight: 35, textAlign: 'center' },
  dots: { flexDirection: 'row', alignSelf: 'center', marginTop: spacing.lg },
  dotTarget: { width: 24, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textPrimary },
});
