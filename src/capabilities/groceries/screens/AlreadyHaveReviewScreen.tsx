import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, PixelRatio, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Crypto from 'expo-crypto';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../../ui/KwiltRefresh';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { useAppStore } from '../../../store/useAppStore';
import { groceryCache } from '../data/groceryCache';
import { createGroceryCheckTracker } from '../data/groceryOptimisticChecks';
import { applyQueuedGroceryStates, groceryOfflineQueue, syncGroceryOfflineQueue, shouldStackGroceryItemLayout } from '../data/groceryOfflineQueue';

type Props = NativeStackScreenProps<FoodStackParamList, 'AlreadyHaveReview'>;

function groceryItemLabel(item: GroceryProjection['items'][number]): string {
  if (item.quantityMin === null) return item.concept;
  const quantity = `${item.quantityMin}${item.quantityMax === null ? '' : `–${item.quantityMax}`}`;
  return `${quantity}${item.unit ? ` ${item.unit}` : ''} ${item.concept}`;
}

export function AlreadyHaveReviewScreen({ navigation, route }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { width, fontScale } = useWindowDimensions();
  const stackRows = shouldStackGroceryItemLayout({ width, fontScale: Math.max(fontScale, PixelRatio.getFontScale()) });
  const listRef = useRef(list);
  listRef.current = list;
  const editGeneration = useRef(0);
  const pendingChecks = useMemo(createGroceryCheckTracker, []);
  const loadTail = useRef<Promise<void>>(Promise.resolve());
  const load = () => {
    const run = async () => {
      const generation = editGeneration.current;
      if (!userId) return;
      let cachedList: GroceryProjection | null = null;
      try {
        const [cached, pending] = await Promise.all([groceryCache.read(userId), groceryOfflineQueue.read(userId)]);
        cachedList = applyQueuedGroceryStates(cached, pending).find((item) => item.id === route.params.listId) ?? null;
        if (cachedList && !listRef.current) setList(cachedList);
        setPendingCount(pending.length);
        const repository = createGroceryRepository();
        const reconciled = await syncGroceryOfflineQueue({ userId, loadLists: repository.list, queue: groceryOfflineQueue, setItemState: repository.setItemState });
        if (generation === editGeneration.current) {
          setList(reconciled.lists.find((item) => item.id === route.params.listId) ?? null);
        }
        setPendingCount(reconciled.pendingCount);
        setOffline(reconciled.interrupted);
        await groceryCache.write(userId, reconciled.lists);
      } catch {
        setOffline(Boolean(listRef.current ?? cachedList));
      }
    };
    const result = loadTail.current.then(run, run);
    loadTail.current = result.catch(() => undefined);
    return result;
  };
  const { onScroll, refreshControl, refreshOverlay, refreshing, scrollEventThrottle } = useKwiltRefresh({ onRefresh: load });

  useEffect(() => {
    void load();
  }, [route.params.listId]);

  const toggle = async (id: string, state: 'needed' | 'already_have') => {
    const current = listRef.current;
    const item = current?.items.find((entry) => entry.id === id);
    if (!current || !item || !userId || current.status === 'stale') return;
    ++editGeneration.current;
    const mutation = { listId: current.id, itemId: id, state, queuedAt: `${new Date().toISOString()}#${Crypto.randomUUID()}` };
    const key = `${userId}:${current.id}:${id}`;
    pendingChecks.begin(key, item.state, mutation);
    const optimistic = { ...current, items: current.items.map((entry) => entry.id === id ? { ...entry, state } : entry) };
    listRef.current = optimistic;
    setList(optimistic);
    const settle = (persisted: boolean) => {
      const settledState = pendingChecks.settle(key, mutation.queuedAt, persisted);
      const latest = listRef.current;
      if (settledState === null || latest?.id !== current.id) return;
      const next = { ...latest, items: latest.items.map((entry) => entry.id === id ? { ...entry, state: settledState } : entry) };
      ++editGeneration.current;
      listRef.current = next;
      setList(next);
    };
    try {
      const mutations = await groceryOfflineQueue.enqueue(userId, mutation);
      settle(true);
      setPendingCount(mutations.length);
      void load();
    } catch {
      settle(false);
      Alert.alert('Item not saved', 'Your check could not be saved on this device. Try again.');
    }
  };

  const finish = async () => {
    if (!list || busy) return;
    setBusy(true);
    try {
      if (offline || pendingCount) {
        await load();
        return;
      }
      await createGroceryRepository().markReviewed(list.id, list.revision);
      navigation.replace('GroceryList', { listId: list.id });
    } catch (error) {
      Alert.alert('Review not finished', error instanceof Error ? error.message : 'Refresh and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Get ingredients" titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing}>
        <ScrollView
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          refreshControl={refreshControl}
          scrollEventThrottle={scrollEventThrottle}
        >
        <Heading variant="md">What do you already have?</Heading>
        <Text tone="secondary">Check everything that is already in the house. This is a quick review, not a pantry you have to maintain.</Text>
        {offline || pendingCount ? <Text tone="secondary" accessibilityLiveRegion="polite">{pendingCount ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved on this device.` : 'Showing the saved review.'}</Text> : null}
        {list?.items.filter((item) => item.state === 'needed' || item.state === 'already_have').map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityLabel={groceryItemLabel(item)}
            accessibilityHint={`Double tap to mark as ${item.state === 'needed' ? 'already have' : 'needed'}.`}
            accessibilityState={{ checked: item.state === 'already_have' }}
            onPress={() => { void toggle(item.id, item.state === 'needed' ? 'already_have' : 'needed'); }}
            style={[styles.item, stackRows && styles.itemStacked, item.state === 'already_have' && styles.active]}
          >
            <View style={styles.itemIdentity}>
              <View style={[styles.checkbox, item.state === 'already_have' && styles.checkboxActive]}>
                {item.state === 'already_have' ? <Icon name="check" size={16} color={colors.parchment} /> : null}
              </View>
              <Text style={styles.itemLabel}>{groceryItemLabel(item)}</Text>
            </View>
            <Text tone="secondary">{item.state === 'already_have' ? 'Have' : 'Need'}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </KwiltRefreshFrame>
      <View style={styles.footer}>
        <Button disabled={!list || busy} onPress={() => { void finish(); }}>
          {busy ? 'Making list…' : offline || pendingCount ? 'Sync changes' : 'Make grocery list'}
        </Button>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  itemIdentity: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemLabel: { flexShrink: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.pine700, borderColor: colors.pine700 },
  itemStacked: { gap: spacing.xs, flexDirection: 'column' },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
