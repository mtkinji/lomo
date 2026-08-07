import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, PixelRatio, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Crypto from 'expo-crypto';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { useAppStore } from '../../../store/useAppStore';
import { groceryCache } from '../data/groceryCache';
import { applyQueuedGroceryStates, groceryOfflineQueue, reconcileGroceryOfflineQueue, shouldStackGroceryItemLayout } from '../data/groceryOfflineQueue';

type Props = NativeStackScreenProps<FoodStackParamList, 'AlreadyHaveReview'>;

export function AlreadyHaveReviewScreen({ navigation, route }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { width, fontScale } = useWindowDimensions();
  const stackRows = shouldStackGroceryItemLayout({ width, fontScale: Math.max(fontScale, PixelRatio.getFontScale()) });
  const load = async () => {
    if (!userId) return;
    const [cached, pending] = await Promise.all([groceryCache.read(userId), groceryOfflineQueue.read(userId)]);
    const cachedWithPending = applyQueuedGroceryStates(cached, pending);
    const cachedList = cachedWithPending.find((item) => item.id === route.params.listId) ?? null;
    if (cachedList) setList(cachedList);
    setPendingCount(pending.length);
    try {
      const repository = createGroceryRepository();
      const remote = await repository.list();
      const reconciled = await reconcileGroceryOfflineQueue({ userId, lists: remote, queue: groceryOfflineQueue, setItemState: repository.setItemState });
      const next = reconciled.lists.find((item) => item.id === route.params.listId) ?? null;
      setList(next);
      setPendingCount(reconciled.pendingCount);
      setOffline(reconciled.interrupted);
      await groceryCache.write(userId, reconciled.lists);
    } catch {
      setOffline(Boolean(cachedList));
    }
  };

  useEffect(() => {
    void load();
  }, [route.params.listId]);

  const toggle = async (id: string, state: 'needed' | 'already_have') => {
    if (!list || !userId) return;
    const mutations = await groceryOfflineQueue.enqueue(userId, { listId: list.id, itemId: id, state, queuedAt: `${new Date().toISOString()}#${Crypto.randomUUID()}` });
    const cached = await groceryCache.read(userId);
    const optimistic = applyQueuedGroceryStates(cached.length ? cached : [list], mutations);
    await groceryCache.write(userId, optimistic);
    setList(optimistic.find((item) => item.id === list.id) ?? list);
    setPendingCount(mutations.length);
    void load();
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
      <PageHeader title="Already have" titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}>
        <Heading variant="md">Tap what is already in the house.</Heading>
        <Text tone="secondary">This is a quick review, not a pantry you have to maintain.</Text>
        {offline || pendingCount ? <Text tone="secondary" accessibilityLiveRegion="polite">{pendingCount ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved on this device.` : 'Showing the saved review.'}</Text> : null}
        {list?.items.filter((item) => item.state === 'needed' || item.state === 'already_have').map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityLabel={item.concept}
            accessibilityHint={`Double tap to mark as ${item.state === 'needed' ? 'already have' : 'needed'}.`}
            accessibilityState={{ checked: item.state === 'already_have' }}
            onPress={() => { void toggle(item.id, item.state === 'needed' ? 'already_have' : 'needed'); }}
            style={[styles.item, stackRows && styles.itemStacked, item.state === 'already_have' && styles.active]}
          >
            <Text>{item.concept}</Text>
            <Text tone="secondary">{item.state === 'already_have' ? 'Already have' : 'Need'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button disabled={!list || busy} onPress={() => { void finish(); }}>
          {busy ? 'Checking…' : offline || pendingCount ? 'Sync changes' : 'Done reviewing'}
        </Button>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  itemStacked: { gap: spacing.xs, flexDirection: 'column' },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
