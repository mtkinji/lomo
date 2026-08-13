import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
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
import { useToastStore } from '../../../store/useToastStore';
import { cardElevation, colors, fonts, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { AppShell } from '../../../ui/layout/AppShell';
import { HeaderActionPill, ObjectPageHeader } from '../../../ui/layout/ObjectPageHeader';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { ButtonLabel, Heading, Text } from '../../../ui/Typography';
import { KrogerStoreFinder } from '../components/KrogerStoreFinder';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import { retailerStoreConfirmation } from '../data/retailerStoreConfirmation';
import {
  createKrogerConnectionRepository,
  type KrogerConnectionStatus,
  type KrogerMatch,
} from '../data/krogerConnectionRepository';
import {
  krogerCartUrlForBanner,
  type KrogerLocation,
  type KrogerProduct,
} from '../providers/krogerProvider';
import {
  getKrogerCartGroupAlternatives,
  projectKrogerCartGroups,
  type KrogerCartGroup,
  type KrogerCartSelection,
} from '../domain/krogerCartProjection';

type Props = NativeStackScreenProps<FoodStackParamList, 'KrogerCart'>;
type Success = { cartUrl: string; count: number; remainingCount: number; retailerLabel: string; location: KrogerLocation };
type StoreConfirmationStep = 'open_retailer' | 'confirm_store';

const money = (cents: number | null) =>
  cents === null ? null : `$${(cents / 100).toFixed(2)}`;

const productPrice = (product: KrogerProduct) =>
  product.promoPriceCents ?? product.regularPriceCents;

const createDraftCart = (matches: KrogerMatch[]): KrogerCartSelection =>
  Object.fromEntries(
    matches.flatMap((match) => {
      const product = match.products[0];
      return product ? [[match.groceryItem.id, { product, quantity: 1 }]] : [];
    }),
  );

function StoreCartHeader({
  location,
  isPreferred,
  topInset,
  onBack,
  onChange,
  onForget,
}: {
  location: KrogerLocation;
  isPreferred: boolean;
  topInset: number;
  onBack: () => void;
  onChange: () => void;
  onForget: () => void;
}) {
  const label = location.banner || location.name;
  return (
    <View
      testID="kroger-cart-header"
      style={[
        styles.storeHeader,
        {
          marginTop: -topInset,
          minHeight: 52 + topInset,
          paddingTop: topInset + 4,
        },
      ]}
    >
      <Button
        variant="ghost"
        size="icon"
        iconButtonSize={36}
        accessibilityLabel="Back to groceries"
        onPress={onBack}
      >
        <Icon name="arrowLeft" size={21} color={colors.textPrimary} />
      </Button>
      <View style={styles.storeIdentity}>
        <Text style={styles.storeName} numberOfLines={1}>{label}</Text>
        <Text style={styles.storeAddress} tone="secondary" numberOfLines={1}>{location.address}</Text>
      </View>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            testID="store-menu-trigger"
            variant="ghost"
            size="icon"
            iconButtonSize={36}
            accessibilityLabel={`Change store. Current store ${label}, ${location.address}`}
          >
            <Icon name="chevronDown" size={18} color={colors.textSecondary} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem label="Choose another store" icon="pin" onPress={onChange} />
          {isPreferred ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                label="Forget preferred store"
                icon="trash"
                variant="destructive"
                onPress={onForget}
              />
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
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

const sameProduct = (left: KrogerProduct, right: KrogerProduct) =>
  (left.upc.trim() || left.id) === (right.upc.trim() || right.id);

const productSelectionLabel = (product: KrogerProduct) => {
  const price = productPrice(product);
  const hasSalePrice = product.promoPriceCents !== null
    && product.regularPriceCents !== null
    && product.promoPriceCents < product.regularPriceCents;
  const priceDescription = hasSalePrice
    ? `sale price ${money(product.promoPriceCents)}, regular price ${money(product.regularPriceCents)}`
    : money(price);
  return ['Select ' + product.title, product.size, priceDescription].filter(Boolean).join(', ');
};

function ProductAlternativesDrawer({
  group,
  retailerLabel,
  onClose,
  onSelect,
}: {
  group: KrogerCartGroup | null;
  retailerLabel: string;
  onClose: () => void;
  onSelect: (product: KrogerProduct) => void;
}) {
  const alternatives = group ? getKrogerCartGroupAlternatives(group) : [];
  const concept = group?.matches[0]?.groceryItem.concept ?? 'product';

  return (
    <BottomDrawer
      visible={group !== null}
      onClose={onClose}
      snapPoints={['72%']}
      dismissOnBackdropPress
      dynamicSizing={false}
    >
      <BottomDrawerHeader
        variant="withClose"
        title={`Choose ${concept}`}
        subtitle={`${alternatives.length} option${alternatives.length === 1 ? '' : 's'} at ${retailerLabel}`}
        onClose={onClose}
        closeAccessibilityLabel="Close product alternatives"
      />
      <BottomDrawerScrollView
        contentContainerStyle={styles.alternativesContent}
        showsVerticalScrollIndicator={false}
      >
        {alternatives.map((product) => {
          const selected = group ? sameProduct(product, group.product) : false;
          const price = productPrice(product);
          const hasSalePrice = product.promoPriceCents !== null
            && product.regularPriceCents !== null
            && product.promoPriceCents < product.regularPriceCents;
          const details = [product.brand, product.size].filter(Boolean).join(' · ');
          return (
            <Pressable
              key={product.upc.trim() || product.id}
              accessibilityRole="button"
              accessibilityLabel={productSelectionLabel(product)}
              accessibilityState={{ selected }}
              onPress={() => onSelect(product)}
              style={({ pressed }) => [
                styles.alternativeRow,
                pressed ? styles.pressedChoice : null,
              ]}
            >
              <ProductThumbnail product={product} />
              <View style={styles.alternativeIdentity}>
                <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                {details ? <Text style={styles.productDetails} tone="secondary" numberOfLines={1}>{details}</Text> : null}
                {hasSalePrice ? <Text style={styles.saleLabel}>Sale</Text> : null}
              </View>
              <View style={styles.alternativePrice}>
                {price !== null ? <Text style={styles.choicePrice}>{money(price)}</Text> : null}
                {hasSalePrice ? (
                  <Text style={styles.regularPrice} tone="secondary">{money(product.regularPriceCents)}</Text>
                ) : null}
              </View>
              <View style={styles.selectionIndicator}>
                {selected ? <Icon name="check" size={18} color={colors.textPrimary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

function CartLoadingState({
  location,
  itemCount,
  onBack,
}: {
  location: KrogerLocation | null;
  itemCount: number | null;
  onBack: () => void;
}) {
  const retailerLabel = location?.banner || location?.name;
  const detail = retailerLabel && itemCount !== null
    ? `Matching ${itemCount} item${itemCount === 1 ? '' : 's'} with ${retailerLabel}.`
    : 'Getting your grocery list ready.';

  return (
    <View testID="kroger-cart-loading" style={styles.loadingSurface}>
      <ObjectPageHeader
        barHeight={52}
        horizontalPadding={spacing.md}
        showFullWidthBackground={false}
        left={(
          <HeaderActionPill
            accessibilityLabel="Back to groceries"
            materialVariant="floatingWhite"
            size={48}
            onPress={onBack}
          >
            <Icon name="arrowLeft" size={21} color={colors.textPrimary} />
          </HeaderActionPill>
        )}
      />
      <View style={styles.loadingContent}>
        <ActivityIndicator
          accessibilityLabel="Building your cart"
          color={colors.textPrimary}
          size="small"
        />
        <Heading variant="md">Building your cart</Heading>
        <Text tone="secondary" style={styles.loadingDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export function KrogerCartScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const repository = useMemo(() => createKrogerConnectionRepository(), []);
  const groceryRepository = useMemo(() => createGroceryRepository(), []);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [status, setStatus] = useState<KrogerConnectionStatus | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [preferredLocation, setPreferredLocation] = useState<KrogerLocation | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<KrogerLocation | null>(null);
  const [choosingStore, setChoosingStore] = useState(false);
  const [storeSearchMessage, setStoreSearchMessage] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [matches, setMatches] = useState<KrogerMatch[] | null>(null);
  const [selected, setSelected] = useState<KrogerCartSelection>({});
  const [busy, setBusy] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [comparisonGroup, setComparisonGroup] = useState<KrogerCartGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [storeConfirmationStep, setStoreConfirmationStep] = useState<StoreConfirmationStep | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    setInitializing(true);
    void Promise.all([
      groceryRepository.list(),
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
            setSearchQuery(context.postalCode);
            try {
              const result = await repository.searchLocations(context.postalCode);
              setLocations(await hydrateStoreCoordinatesBestEffort(result.locations));
            } catch {
              setStoreSearchMessage('Stores could not load. Search another area.');
            }
          }
        }
      })
      .catch(() =>
        setError('Online shopping is not configured yet. Your plain list is still available.'),
      )
      .finally(() => setInitializing(false));
  }, [groceryRepository, repository, route.params.listId, userId]);

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
      if (!result.locations.length) setStoreSearchMessage('No supported stores were found in this area.');
    } catch {
      setStoreSearchMessage('Stores could not load. Search another area.');
    } finally {
      setBusy(false);
    }
  };
  const findStores = () => {
    void (async () => {
      const query = searchQuery.trim();
      if (!query) {
        setStoreSearchMessage('Enter a city, address, or ZIP.');
        return;
      }
      if (/^\d{5}$/.test(query)) {
        await searchStores(query);
        return;
      }
      setBusy(true);
      setStoreSearchMessage(null);
      const context = await getStoreSearchContextForQueryBestEffort(query);
      if (!context) {
        setBusy(false);
        setStoreSearchMessage('We couldn’t find that area. Try a city, address, or ZIP.');
        return;
      }
      await searchStores(context.postalCode, context);
    })();
  };
  const findCurrentLocation = () => {
    void (async () => {
      setBusy(true);
      setStoreSearchMessage(null);
      const granted = await LocationPermissionService.ensurePermissionWithRationale('attach_place');
      if (!granted) {
        setBusy(false);
        setStoreSearchMessage('We couldn’t use your location. Search an area instead.');
        return;
      }
      const context = await getCurrentStoreSearchContextBestEffort();
      setBusy(false);
      if (!context) {
        setStoreSearchMessage('We couldn’t use your location. Search an area instead.');
        return;
      }
      setShowsUserLocation(true);
      setMapCenter(context);
      setSearchQuery(context.postalCode);
      await searchStores(context.postalCode, context);
    })();
  };
  const choose = (location: KrogerLocation) =>
    run(async () => {
      setStoreConfirmationStep(null);
      setSuccess(null);
      if (selectedLocation?.id !== location.id) {
        await retailerStoreConfirmation.clear(userId);
      }
      setSelectedLocation(location);
      setLocations([]);
      setChoosingStore(false);
      setMatches(null);
      setSelected({});
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
      showToast({ message: `${location.banner || location.name} saved as your store`, variant: 'light' });
    });
  };
  const forgetPreferredStore = () => {
    const remembered = preferredLocation;
    void run(async () => {
      await preferredGroceryStore.clear(userId);
      setPreferredLocation(null);
      showToast({
        message: 'Preferred store forgotten',
        variant: 'light',
        ...(remembered ? {
          actionLabel: 'Undo',
          actionOnPress: () => {
            void preferredGroceryStore.write(userId, remembered).then(() => setPreferredLocation(remembered));
          },
        } : {}),
      });
    });
  };
  const adjustQuantity = (itemIds: string[], delta: number) =>
    setSelected((current) => {
      const itemId = delta < 0
        ? itemIds.find((id) => (current[id]?.quantity ?? 0) > 1)
        : itemIds[0];
      if (!itemId) return current;
      const line = current[itemId];
      if (!line) return current;
      return {
        ...current,
        [itemId]: { ...line, quantity: Math.max(1, line.quantity + delta) },
      };
    });
  const remove = (itemIds: string[]) => {
    setSelected((current) => {
      const next = { ...current };
      itemIds.forEach((itemId) => delete next[itemId]);
      return next;
    });
  };
  const selectAlternative = (product: KrogerProduct) => {
    if (!comparisonGroup) return;
    setSelected((current) => {
      const next = { ...current };
      comparisonGroup.groceryItemIds.forEach((itemId) => {
        const line = current[itemId];
        if (line) next[itemId] = { ...line, product };
      });
      return next;
    });
    setComparisonGroup(null);
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
        let connectedToAnotherAccount = false;
        if (status?.connection?.state !== 'active') {
          const connected = await repository.connect();
          setStatus(connected);
          await retailerStoreConfirmation.clear(userId);
          connectedToAnotherAccount = true;
        }
        await repository.selectLocation(selectedLocation);
        setStatus(await repository.status());
        const confirmation = connectedToAnotherAccount
          ? null
          : await retailerStoreConfirmation.read(userId, selectedLocation);
        if (!confirmation) {
          setStoreConfirmationStep('open_retailer');
          return;
        }
        const result = await repository.cartAdd(list.id, list.revision, selectedLocation);
        setSuccess({
          cartUrl: result.cartUrl,
          count: result.addedItemCount,
          remainingCount: result.remainingItemCount,
          retailerLabel: result.retailerLabel,
          location: selectedLocation,
        });
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const openRetailerForStoreConfirmation = () => {
    if (!selectedLocation) return;
    void run(async () => {
      await openBrowserAsync(krogerCartUrlForBanner(selectedLocation.banner || selectedLocation.name));
      setStoreConfirmationStep('confirm_store');
    });
  };

  const confirmStoreAndAdd = async () => {
    if (!list || !selectedLocation) return;
    setAddingToCart(true);
    try {
      await run(async () => {
        await retailerStoreConfirmation.confirm(userId, selectedLocation);
        const result = await repository.cartAdd(list.id, list.revision, selectedLocation);
        setStoreConfirmationStep(null);
        setSuccess({
          cartUrl: result.cartUrl,
          count: result.addedItemCount,
          remainingCount: result.remainingItemCount,
          retailerLabel: result.retailerLabel,
          location: selectedLocation,
        });
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const showStorePicker = !initializing && (!selectedLocation || choosingStore);
  const showCartLoading = initializing || (!showStorePicker && !error && matches === null);
  const showCartAction = !success && !storeConfirmationStep && !error && !showStorePicker && matches !== null;
  const selectedSourceCount = Object.keys(selected).length;
  const cartGroups = projectKrogerCartGroups(matches ?? [], selected);
  const matchedCount = cartGroups.reduce((total, group) => total + group.quantity, 0);
  const missingCount = Math.max(0, (matches?.length ?? 0) - selectedSourceCount);
  const pricedGroups = cartGroups.filter((group) => productPrice(group.product) !== null);
  const subtotalCents = pricedGroups.reduce(
    (total, group) => total + (productPrice(group.product) ?? 0) * group.quantity,
    0,
  );
  const subtotalLabel =
    pricedGroups.length === cartGroups.length
      ? 'Estimated subtotal'
      : `Estimated subtotal for ${pricedGroups.length} of ${cartGroups.length} products`;
  return (
    <AppShell fullBleedCanvas={showStorePicker}>
      {showCartLoading ? (
        <CartLoadingState
          location={selectedLocation}
          itemCount={list?.items.filter((item) => item.state === 'needed').length ?? null}
          onBack={() => navigation.goBack()}
        />
      ) : showStorePicker ? (
        error ? (
          <View style={styles.finderErrorSurface}>
            <ObjectPageHeader
              barHeight={52}
              horizontalPadding={spacing.md}
              showFullWidthBackground={false}
              left={(
                <HeaderActionPill
                  accessibilityLabel="Back to groceries"
                  materialVariant="floatingWhite"
                  size={48}
                  onPress={() => navigation.goBack()}
                >
                  <Icon name="arrowLeft" size={21} color={colors.textPrimary} />
                </HeaderActionPill>
              )}
            />
            <View style={[styles.finderError, { paddingTop: insets.top + 72 }]}>
              <Text>{error}</Text>
            </View>
          </View>
        ) : (
          <KrogerStoreFinder
            locations={locations}
            preferredLocation={preferredLocation}
            query={searchQuery}
            busy={busy}
            storeSearchMessage={storeSearchMessage}
            mapCenter={mapCenter}
            showsUserLocation={showsUserLocation}
            bottomInset={insets.bottom}
            onQueryChange={setSearchQuery}
            onBack={() => navigation.goBack()}
            onFindStores={findStores}
            onFindCurrentLocation={findCurrentLocation}
            onChoose={choose}
            onSetPreferred={setAsPreferred}
          />
        )
      ) : (
      <>
      {selectedLocation ? (
        <StoreCartHeader
          location={selectedLocation}
          isPreferred={preferredLocation?.id === selectedLocation.id}
          topInset={insets.top}
          onBack={() => navigation.goBack()}
          onChange={() => setChoosingStore(true)}
          onForget={forgetPreferredStore}
        />
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <View style={styles.message}><Text>{error}</Text></View> : null}
        {storeConfirmationStep ? (
          <View style={styles.storeConfirmation}>
            <View style={styles.storeConfirmationIcon}>
              <Icon name="pin" size={22} color={colors.textPrimary} />
            </View>
            <Heading variant="md">Confirm pickup store</Heading>
            {storeConfirmationStep === 'open_retailer' ? (
              <>
                <Text tone="secondary" style={styles.storeConfirmationCopy}>
                  Before Kwilt adds anything, set {selectedLocation?.banner || selectedLocation?.name} pickup to {selectedLocation?.address || selectedLocation?.name}.
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  accessibilityLabel={`Set pickup store at ${selectedLocation?.banner || selectedLocation?.name}`}
                  onPress={openRetailerForStoreConfirmation}
                >
                  Set pickup store at {selectedLocation?.banner || selectedLocation?.name}
                </Button>
              </>
            ) : (
              <>
                <Text tone="secondary" style={styles.storeConfirmationCopy}>
                  Is {selectedLocation?.banner || selectedLocation?.name} pickup set to {selectedLocation?.address || selectedLocation?.name}?
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={busy}
                  accessibilityLabel={`Yes, add ${matchedCount} item${matchedCount === 1 ? '' : 's'}`}
                  onPress={confirmStoreAndAdd}
                >
                  {addingToCart ? 'Adding…' : `Yes, add ${matchedCount} item${matchedCount === 1 ? '' : 's'}`}
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onPress={openRetailerForStoreConfirmation}
                >
                  Check {selectedLocation?.banner || selectedLocation?.name} again
                </Button>
              </>
            )}
            <Text tone="secondary" style={styles.storeConfirmationFootnote}>
              Confirmed by you. The retailer does not currently let Kwilt verify its active pickup store.
            </Text>
          </View>
        ) : success ? (
          <>
            <Heading variant="md">Added to {success.location.name || success.retailerLabel}</Heading>
            <Text tone="secondary">
              {success.count} item{success.count === 1 ? '' : 's'} added to the retailer cart.
              {success.remainingCount
                ? ` ${success.remainingCount} stay on your Kwilt list for another shopping pass.`
                : ' Everything on this pass is now in a retailer cart.'}
            </Text>
            <Button
              variant="primary"
              accessibilityLabel={`Review ${success.retailerLabel} cart`}
              onPress={() => void openBrowserAsync(success.cartUrl)}
            >
              Review {success.retailerLabel} cart
            </Button>
            {success.remainingCount ? (
              <Button variant="outline" onPress={() => navigation.goBack()}>
                Back to {success.remainingCount} remaining
              </Button>
            ) : null}
            <Text tone="secondary">
              Kwilt matched products at this store. The retailer controls the pickup store, substitutions, timing, and checkout.
            </Text>
          </>
        ) : error ? null : (
          <>
            {cartGroups.length ? (
              <View style={styles.cartSection}>
                <Button
                  variant="ghost"
                  size="xs"
                  fullWidth
                  accessibilityLabel="Already have something? Check it off in your grocery list"
                  accessibilityHint="Returns to your grocery list."
                  onPress={() => navigation.goBack()}
                  style={styles.alreadyHaveHint}
                >
                  <View style={styles.alreadyHaveHintContent}>
                    <Icon name="checkCircle" size={16} color={colors.textSecondary} />
                    <Text style={styles.productDetails} tone="secondary">
                      Already have something? Check it off in your grocery list.
                    </Text>
                  </View>
                </Button>
                <View style={styles.cartList}>
                  {cartGroups.map((group) => {
                    const unitPrice = productPrice(group.product);
                    const linePrice = unitPrice === null ? null : unitPrice * group.quantity;
                    const details = [group.product.brand, group.product.size].filter(Boolean).join(' · ');
                    const alternatives = getKrogerCartGroupAlternatives(group);
                    const canCompare = alternatives.length > 1;
                    return (
                      <View key={group.key} style={styles.cartLine}>
                        <Pressable
                          accessibilityRole={canCompare ? 'button' : undefined}
                          accessibilityLabel={canCompare ? `Compare alternatives for ${group.product.title}` : undefined}
                          accessibilityHint={canCompare ? 'Shows other matches and prices at this store.' : undefined}
                          disabled={!canCompare || busy}
                          onPress={() => setComparisonGroup(group)}
                          style={({ pressed }) => [
                            styles.productSummary,
                            pressed ? styles.pressedChoice : null,
                          ]}
                        >
                          <ProductThumbnail product={group.product} />
                          <View style={styles.grow}>
                            <Text style={styles.productTitle} numberOfLines={2}>{group.product.title}</Text>
                            {details ? <Text style={styles.productDetails} tone="secondary" numberOfLines={1}>{details}</Text> : null}
                            {group.quantity > 1 && unitPrice !== null ? (
                              <Text style={styles.productDetails} tone="secondary">{money(unitPrice)} each</Text>
                            ) : null}
                          </View>
                          {linePrice !== null ? <Text>{money(linePrice)}</Text> : null}
                          {canCompare ? (
                            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
                          ) : null}
                        </Pressable>
                        <View style={styles.lineControls}>
                          <View style={styles.quantityControls}>
                            <Button
                              variant="outline"
                              size="icon"
                              iconButtonSize={30}
                              accessibilityLabel={`Decrease quantity for ${group.product.title}`}
                              disabled={busy || group.quantity === group.groceryItemIds.length}
                              onPress={() => adjustQuantity(group.groceryItemIds, -1)}
                            >
                              <Text style={styles.quantityGlyph}>−</Text>
                            </Button>
                            <Text style={styles.quantityLabel}>Qty {group.quantity}</Text>
                            <Button
                              variant="outline"
                              size="icon"
                              iconButtonSize={30}
                              accessibilityLabel={`Increase quantity for ${group.product.title}`}
                              disabled={busy}
                              onPress={() => adjustQuantity(group.groceryItemIds, 1)}
                            >
                              <Text style={styles.quantityGlyph}>+</Text>
                            </Button>
                          </View>
                          <Button
                            variant="ghost"
                            size="icon"
                            iconButtonSize={32}
                            accessibilityLabel={`Remove ${group.product.title} from this cart`}
                            disabled={busy}
                            onPress={() => remove(group.groceryItemIds)}
                          >
                            <Icon name="trash" size={18} color={colors.textSecondary} />
                          </Button>
                        </View>
                      </View>
                    );
                  })}
                </View>
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
      </>
      )}
      {comparisonGroup ? (
        <ProductAlternativesDrawer
          group={comparisonGroup}
          retailerLabel={selectedLocation?.banner || selectedLocation?.name || 'this store'}
          onClose={() => setComparisonGroup(null)}
          onSelect={selectAlternative}
        />
      ) : null}
      {showCartAction ? (
        <View
          testID="kroger-cart-footer"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
        >
          <View style={styles.footerSummary}>
            <View style={styles.subtotalLabelRow}>
              <Text variant="label">{subtotalLabel}</Text>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    iconButtonSize={26}
                    accessibilityLabel="About estimated subtotal"
                  >
                    <Icon name="info" size={16} color={colors.textSecondary} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" style={styles.subtotalMenu}>
                  <DropdownMenuLabel>
                    Based on current item prices from {selectedLocation?.banner ?? 'the retailer'}.
                    Taxes, fees, coupons, weighted-item changes, substitutions, and final availability are confirmed by the retailer.
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
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
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  message: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  storeConfirmation: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  storeConfirmationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
  },
  storeConfirmationCopy: { textAlign: 'center' },
  storeConfirmationFootnote: { ...typography.bodyXs, textAlign: 'center' },
  loadingSurface: { flex: 1, backgroundColor: colors.canvas },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  loadingDetail: { textAlign: 'center' },
  finderErrorSurface: { flex: 1, backgroundColor: colors.canvas },
  finderError: { paddingHorizontal: spacing.xl },
  storeHeader: {
    minHeight: 52,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.canvas,
    ...cardElevation.lift,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1,
  },
  storeIdentity: { flex: 1, alignItems: 'center', gap: 0 },
  storeName: { ...typography.bodySm, fontFamily: fonts.semibold, textAlign: 'center' },
  storeAddress: { ...typography.caption, textAlign: 'center', maxWidth: '100%' },
  cartSection: { gap: spacing.xs },
  alreadyHaveHint: { paddingHorizontal: spacing.xs, alignItems: 'stretch' },
  alreadyHaveHintContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cartList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  cartLine: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    gap: spacing.xs,
  },
  productSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pressedChoice: { opacity: 0.62 },
  thumbnailFrame: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: { width: '100%', height: '100%' },
  productTitle: { ...typography.bodySm, fontFamily: fonts.semibold },
  productDetails: { ...typography.bodyXs },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  quantityLabel: { ...typography.bodyXs, minWidth: 34, textAlign: 'center' },
  quantityGlyph: {
    ...typography.bodySm,
    lineHeight: 18,
    transform: [{ translateY: -1 }],
  },
  grow: { flex: 1, gap: 2 },
  alternativesContent: { paddingBottom: spacing.xl },
  alternativeRow: {
    minHeight: 76,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  alternativeIdentity: { flex: 1, minWidth: 0, gap: 2 },
  alternativePrice: { alignItems: 'flex-end', gap: 1 },
  choicePrice: { fontFamily: fonts.semibold },
  regularPrice: { ...typography.bodyXs, textDecorationLine: 'line-through' },
  saleLabel: { ...typography.bodyXs, fontFamily: fonts.semibold },
  selectionIndicator: { width: 20, alignItems: 'flex-end' },
  emptyCart: { paddingVertical: spacing['2xl'], alignItems: 'center', gap: spacing.xs },
  footer: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    ...cardElevation.lift,
    shadowOffset: { width: 0, height: -4 },
  },
  footerSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtotalLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subtotalMenu: { maxWidth: 320 },
  cartButtonContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
