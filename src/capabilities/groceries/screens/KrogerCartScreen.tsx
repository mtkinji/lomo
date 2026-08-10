import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { LocationPermissionService } from '../../../services/LocationPermissionService';
import {
  geocodeStoreSearchBestEffort,
  getCurrentStoreSearchContextBestEffort,
  hydrateStoreCoordinatesBestEffort,
} from '../../../services/location/currentLocation';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { ButtonLabel, Heading, Text } from '../../../ui/Typography';
import { KrogerStoreFinder } from '../components/KrogerStoreFinder';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import {
  createKrogerConnectionRepository,
  type KrogerConnectionStatus,
  type KrogerMatch,
} from '../data/krogerConnectionRepository';
import type { KrogerLocation, KrogerProduct } from '../providers/krogerProvider';
import { replacementMatchesConcept } from '../domain/krogerProductMatching';

type Props = NativeStackScreenProps<FoodStackParamList, 'KrogerCart'>;
type CartLine = { product: KrogerProduct; quantity: number };
type Selection = Record<string, CartLine>;
type Success = { cartUrl: string; count: number; remainingCount: number; retailerLabel: string };

const money = (cents: number | null) =>
  cents === null ? null : `$${(cents / 100).toFixed(2)}`;

const productPrice = (product: KrogerProduct) =>
  product.promoPriceCents ?? product.regularPriceCents;

const createDraftCart = (matches: KrogerMatch[]): Selection =>
  Object.fromEntries(
    matches.flatMap((match) => {
      const product = match.products[0];
      return product ? [[match.groceryItem.id, { product, quantity: 1 }]] : [];
    }),
  );

function StoreSelector({ location, onPress }: { location: KrogerLocation; onPress: () => void }) {
  const label = location.banner || location.name;
  return (
    <Button
      variant="ghost"
      size="sm"
      accessibilityLabel={`Store: ${label}. Change store`}
      onPress={onPress}
    >
      <View style={styles.storeSelectorContent}>
        <Text>{label}</Text>
        <Icon name="chevronDown" size={16} color={colors.textSecondary} />
      </View>
    </Button>
  );
}

function ProductThumbnail({ product }: { product: KrogerProduct }) {
  return (
    <View style={styles.thumbnailFrame} accessible={false}>
      {product.thumbnailUrl ? (
        <Image
          accessibilityRole="image"
          accessibilityLabel={`${product.title} product image`}
          source={{ uri: product.thumbnailUrl }}
          resizeMode="contain"
          style={styles.thumbnail}
        />
      ) : (
        <Icon name="image" size={20} color={colors.textSecondary} />
      )}
    </View>
  );
}

function ReplacementChoice({
  product,
  disabled,
  onPress,
}: {
  product: KrogerProduct;
  disabled: boolean;
  onPress: () => void;
}) {
  const price = money(productPrice(product));
  const details = [product.brand, product.size].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`Use ${product.title}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.replacement, pressed && styles.productPressed]}
    >
      <ProductThumbnail product={product} />
      <View style={styles.grow}>
        <Text>{product.title}</Text>
        {details ? <Text tone="secondary">{details}</Text> : null}
      </View>
      {price ? <Text>{price}</Text> : null}
    </Pressable>
  );
}

export function KrogerCartScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const repository = useMemo(() => createKrogerConnectionRepository(), []);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [status, setStatus] = useState<KrogerConnectionStatus | null>(null);
  const [zip, setZip] = useState('');
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [preferredLocation, setPreferredLocation] = useState<KrogerLocation | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<KrogerLocation | null>(null);
  const [choosingStore, setChoosingStore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeSearchMessage, setStoreSearchMessage] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [matches, setMatches] = useState<KrogerMatch[] | null>(null);
  const [selected, setSelected] = useState<Selection>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  useEffect(() => {
    void Promise.all([
      createGroceryRepository().list(),
      repository.status(),
      preferredGroceryStore.read(userId),
    ])
      .then(async ([lists, next, preferred]) => {
        const nextList = lists.find((row) => row.id === route.params.listId) ?? null;
        setList(nextList);
        setStatus(next);
        setPreferredLocation(preferred);
        const remembered = preferred ?? (next.connection?.location
          ? {
              ...next.connection.location,
              banner: next.connection.retailerLabel,
              latitude: null,
              longitude: null,
            }
          : null);
        if (remembered) {
          const location = remembered;
          setSelectedLocation(location);
          if (nextList?.status === 'ready') {
            const result = await repository.prepareMatches(nextList.id, nextList.revision, location);
            setMatches(result.matches);
            setSelected(createDraftCart(result.matches));
          }
          return;
        }

        const permission = await LocationPermissionService.syncOsPermissionStatus();
        if (permission === 'authorized' || permission === 'foregroundOnly') {
          const context = await getCurrentStoreSearchContextBestEffort();
          if (context) {
            setShowsUserLocation(true);
            setMapCenter(context);
            setZip(context.postalCode);
            try {
              const result = await repository.searchLocations(context.postalCode);
              setLocations(await hydrateStoreCoordinatesBestEffort(result.locations));
            } catch {
              setStoreSearchMessage('Stores could not load. Search by ZIP instead.');
            }
          }
        }
      })
      .catch(() =>
        setError('Online shopping is not configured yet. Your plain list is still available.'),
      );
  }, [repository, route.params.listId, userId]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message.includes('check_retailer_cart')
          ? 'The request may have reached the retailer. Check your cart before trying again.'
          : "That didn't go through. Your grocery list has not changed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const searchStores = async (postalCode: string, center?: { latitude: number; longitude: number } | null) => {
    setBusy(true);
    setStoreSearchMessage(null);
    try {
      const result = await repository.searchLocations(postalCode);
      setLocations(await hydrateStoreCoordinatesBestEffort(result.locations));
      const nextCenter = center ?? await geocodeStoreSearchBestEffort(postalCode);
      if (nextCenter) setMapCenter(nextCenter);
      setSearchOpen(false);
      if (!result.locations.length) setStoreSearchMessage('No supported stores were found in this area.');
    } catch {
      setStoreSearchMessage('Stores could not load. Try another ZIP code.');
    } finally {
      setBusy(false);
    }
  };
  const findStores = () => {
    if (/^\d{5}$/.test(zip)) void searchStores(zip);
  };
  const findCurrentLocation = () => {
    void (async () => {
      setBusy(true);
      setStoreSearchMessage(null);
      const granted = await LocationPermissionService.ensurePermissionWithRationale('attach_place');
      if (!granted) {
        setBusy(false);
        setSearchOpen(true);
        return;
      }
      const context = await getCurrentStoreSearchContextBestEffort();
      setBusy(false);
      if (!context) {
        setStoreSearchMessage('Current location is unavailable. Search by ZIP instead.');
        setSearchOpen(true);
        return;
      }
      setShowsUserLocation(true);
      setMapCenter(context);
      setZip(context.postalCode);
      await searchStores(context.postalCode, context);
    })();
  };
  const choose = (location: KrogerLocation) =>
    run(async () => {
      setSelectedLocation(location);
      setLocations([]);
      setChoosingStore(false);
      setMatches(null);
      setSelected({});
      setEditingItemId(null);
      if (status?.connection?.state === 'active') {
        await repository.selectLocation(location);
        setStatus(await repository.status());
      }
      if (!list || list.status !== 'ready') return;
      const result = await repository.prepareMatches(list.id, list.revision, location);
      setMatches(result.matches);
      setSelected(createDraftCart(result.matches));
    });
  const setAsPreferred = (location: KrogerLocation) => {
    void run(async () => {
      await preferredGroceryStore.write(userId, location);
      setPreferredLocation(location);
      setSelectedLocation(location);
      setLocations([]);
      setChoosingStore(false);
      setMatches(null);
      setSelected({});
      setEditingItemId(null);
      if (status?.connection?.state === 'active') {
        await repository.selectLocation(location);
        setStatus(await repository.status());
      }
      if (!list || list.status !== 'ready') return;
      const result = await repository.prepareMatches(list.id, list.revision, location);
      setMatches(result.matches);
      setSelected(createDraftCart(result.matches));
    });
  };
  const replaceProduct = (itemId: string, product: KrogerProduct) => {
    setSelected((current) => ({ ...current, [itemId]: { product, quantity: 1 } }));
    setEditingItemId(null);
  };
  const adjustQuantity = (itemId: string, delta: number) =>
    setSelected((current) => {
      const line = current[itemId];
      if (!line) return current;
      return {
        ...current,
        [itemId]: { ...line, quantity: Math.max(1, line.quantity + delta) },
      };
    });
  const remove = (itemId: string) => {
    setSelected((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setEditingItemId((current) => (current === itemId ? null : current));
  };
  const add = async () => {
    setAddingToCart(true);
    try {
      await run(async () => {
        if (!list || !selectedLocation) return;
        const selectedMatches = (matches ?? []).flatMap((match) => {
          const line = selected[match.groceryItem.id];
          return line ? [{ match, line }] : [];
        });
        for (const { match, line } of selectedMatches) {
          await repository.confirmMapping(
            list.id,
            match.groceryItem.id,
            line.product,
            line.quantity,
            selectedLocation,
          );
        }
        if (status?.connection?.state !== 'active') {
          const connected = await repository.connect();
          setStatus(connected);
        }
        await repository.selectLocation(selectedLocation);
        setStatus(await repository.status());
        const result = await repository.cartAdd(list.id, list.revision);
        setSuccess({
          cartUrl: result.cartUrl,
          count: result.addedItemCount,
          remainingCount: result.remainingItemCount,
          retailerLabel: result.retailerLabel,
        });
        await openBrowserAsync(result.cartUrl);
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const matchedCount = Object.keys(selected).length;
  const showStorePicker = !selectedLocation || choosingStore;
  const showCartAction = !success && !error && !showStorePicker && matches !== null;
  const missingCount = Math.max(0, (matches?.length ?? 0) - matchedCount);
  const cartLines = (matches ?? []).flatMap((match) => {
    const line = selected[match.groceryItem.id];
    return line ? [{ match, line }] : [];
  });
  const pricedLines = cartLines.filter(({ line }) => productPrice(line.product) !== null);
  const subtotalCents = pricedLines.reduce(
    (total, { line }) => total + (productPrice(line.product) ?? 0) * line.quantity,
    0,
  );
  const subtotalLabel =
    pricedLines.length === cartLines.length
      ? 'Estimated subtotal'
      : `Estimated subtotal for ${pricedLines.length} of ${cartLines.length} items`;
  const pageTitle = selectedLocation && !showStorePicker ? 'Cart' : 'Shop online';

  return (
    <AppShell>
      <PageHeader
        title={pageTitle}
        titleMaxFontSizeMultiplier={1.6}
        onPressBack={() => navigation.goBack()}
        rightElement={
          selectedLocation && !showStorePicker ? (
            <StoreSelector location={selectedLocation} onPress={() => setChoosingStore(true)} />
          ) : undefined
        }
      />
      {showStorePicker && !error ? (
        <KrogerStoreFinder
          locations={locations}
          preferredLocation={preferredLocation}
          zip={zip}
          busy={busy}
          searchOpen={searchOpen}
          storeSearchMessage={storeSearchMessage}
          mapCenter={mapCenter}
          showsUserLocation={showsUserLocation}
          bottomInset={insets.bottom}
          onZipChange={setZip}
          onOpenSearch={() => setSearchOpen(true)}
          onFindStores={findStores}
          onFindCurrentLocation={findCurrentLocation}
          onChoose={choose}
          onSetPreferred={setAsPreferred}
        />
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <View style={styles.message}><Text>{error}</Text></View> : null}
        {success ? (
          <>
            <Heading variant="md">Added to {success.retailerLabel}</Heading>
            <Text tone="secondary">
              {success.count} item{success.count === 1 ? '' : 's'} added to the retailer cart.
              {success.remainingCount
                ? ` ${success.remainingCount} stay on your Kwilt list for another shopping pass.`
                : ' Everything on this pass is now in a retailer cart.'}
            </Text>
            <Button variant="primary" onPress={() => void openBrowserAsync(success.cartUrl)}>
              Open {success.retailerLabel} cart
            </Button>
            {success.remainingCount ? (
              <Button variant="outline" onPress={() => navigation.goBack()}>
                Back to {success.remainingCount} remaining
              </Button>
            ) : null}
            <Text tone="secondary">
              Checkout, substitutions, and pickup timing are confirmed by the retailer.
            </Text>
          </>
        ) : error ? null : status === null ? (
          <Text>Checking online shopping…</Text>
        ) : matches === null ? (
          <>
            <Text tone="secondary">Finding products…</Text>
          </>
        ) : (
          <>
            {cartLines.length ? (
              <View style={styles.cartList}>
                {cartLines.map(({ match, line }) => {
                  const unitPrice = productPrice(line.product);
                  const linePrice = unitPrice === null ? null : unitPrice * line.quantity;
                  const details = [line.product.brand, line.product.size].filter(Boolean).join(' · ');
                  const alternatives = match.products.filter(
                    (product) =>
                      product.upc !== line.product.upc &&
                      replacementMatchesConcept(match.groceryItem.concept, product),
                  );
                  const editing = editingItemId === match.groceryItem.id;

                  return (
                    <View key={match.groceryItem.id} style={styles.cartLine}>
                      <View style={styles.productSummary}>
                        <ProductThumbnail product={line.product} />
                        <View style={styles.grow}>
                          <Heading variant="sm">{line.product.title}</Heading>
                          {details ? <Text tone="secondary">{details}</Text> : null}
                          {line.quantity > 1 && unitPrice !== null ? (
                            <Text tone="secondary">{money(unitPrice)} each</Text>
                          ) : null}
                        </View>
                        {linePrice !== null ? <Text>{money(linePrice)}</Text> : null}
                      </View>
                      <View style={styles.lineControls}>
                        <View style={styles.quantityControls}>
                          <Button
                            variant="outline"
                            size="sm"
                            accessibilityLabel={`Decrease quantity for ${line.product.title}`}
                            disabled={busy || line.quantity === 1}
                            onPress={() => adjustQuantity(match.groceryItem.id, -1)}
                          >
                            −
                          </Button>
                          <Text>Qty {line.quantity}</Text>
                          <Button
                            variant="outline"
                            size="sm"
                            accessibilityLabel={`Increase quantity for ${line.product.title}`}
                            disabled={busy}
                            onPress={() => adjustQuantity(match.groceryItem.id, 1)}
                          >
                            +
                          </Button>
                        </View>
                        <View style={styles.itemActions}>
                          {alternatives.length ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              accessibilityLabel={`Edit ${line.product.title}`}
                              onPress={() =>
                                setEditingItemId((current) =>
                                  current === match.groceryItem.id ? null : match.groceryItem.id,
                                )
                              }
                            >
                              Edit
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            accessibilityLabel={`Remove ${line.product.title} from cart`}
                            onPress={() => remove(match.groceryItem.id)}
                          >
                            Remove
                          </Button>
                        </View>
                      </View>
                      {editing ? (
                        <View style={styles.replacements}>
                          <Text variant="label">Replace with</Text>
                          {alternatives.map((product) => (
                            <ReplacementChoice
                              key={product.upc}
                              product={product}
                              disabled={busy}
                              onPress={() => replaceProduct(match.groceryItem.id, product)}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCart}>
                <Heading variant="md">Your cart is empty</Heading>
                <Text tone="secondary">Your grocery list has not changed.</Text>
              </View>
            )}
            {missingCount ? (
              <Text tone="secondary">
                {missingCount} grocery list item{missingCount === 1 ? '' : 's'} {missingCount === 1 ? "isn't" : "aren't"} in this cart.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
      )}
      {showCartAction ? (
        <View
          testID="kroger-cart-footer"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
        >
          <View style={styles.footerSummary}>
            <View style={styles.grow}>
              <Text variant="label">{subtotalLabel}</Text>
              <Text tone="secondary">Current item prices at {selectedLocation?.banner ?? 'this store'}</Text>
            </View>
            <Heading variant="md">{money(subtotalCents)}</Heading>
          </View>
          <Button
            variant="primary"
            disabled={busy || matchedCount === 0}
            fullWidth
            accessibilityLabel={
              addingToCart
                ? 'Adding items to retailer cart'
                : `Add ${matchedCount} item${matchedCount === 1 ? '' : 's'} to ${selectedLocation?.banner ?? 'retailer'}`
            }
            onPress={add}
          >
            <View style={styles.cartButtonContent}>
              <ButtonLabel tone="inverse">
                {addingToCart
                  ? 'Adding…'
                  : `Add ${matchedCount} item${matchedCount === 1 ? '' : 's'} to ${selectedLocation?.banner ?? 'retailer'}`}
              </ButtonLabel>
            </View>
          </Button>
          <Text tone="secondary" style={styles.footerNote}>
            Then review pickup, substitutions, fees, and the final total at {selectedLocation?.banner ?? 'the retailer'}.
          </Text>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  message: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  storeSelectorContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cartList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  cartLine: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
  },
  productSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  thumbnailFrame: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: { width: '100%', height: '100%' },
  productPressed: { backgroundColor: colors.muted },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, gap: 2 },
  replacements: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    gap: spacing.xs,
  },
  replacement: {
    minHeight: 58,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyCart: { paddingVertical: spacing['2xl'], alignItems: 'center', gap: spacing.xs },
  footer: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  footerSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footerNote: { textAlign: 'center' },
  cartButtonContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
