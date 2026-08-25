import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { colors } from "../../../theme";
import { BottomDrawer, BottomDrawerScrollView } from "../../../ui/BottomDrawer";
import { Button, IconButton } from "../../../ui/Button";
import { Icon, type IconName } from "../../../ui/Icon";
import { BottomDrawerHeader } from "../../../ui/layout/BottomDrawerHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../ui/DropdownMenu";
import { RESTING_COMPOSER_HEIGHT_PX } from "../../../ui/layout/restingComposerMetrics";
import { Heading, Text } from "../../../ui/Typography";
import { FloatingControlSurface } from "../../../features/activities/FloatingControlSurface";
import { FloatingDockActionButton } from "../../../features/activities/FloatingDockActionButton";
import { INVENTORY_DOCK_BUTTON_SIZE_PX } from "../../../features/activities/InventoryDockAffordances";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { OverlappingAvatarStack } from "../../../ui/OverlappingAvatarStack";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_CATEGORIES,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
  type StarterRecipeMetadata,
} from "../data/starterRecipeCatalog";
import {
  CUISINE_FAMILIES,
  type CuisineFamilyId,
} from "../domain/cuisineFamilies";
import { styles } from "./RecipeLibraryScreen.styles";
import {
  formatMealTiming,
  type MealCommitment,
} from "../../meal-planning/domain/mealCommitments";
import type { MealPeriod, MealTimingIntent } from "../../meal-planning/domain/mealPlanContracts";
import type { CommittedMealPreview, GroceryPlanAction } from "../domain/mealPlanAffordance";
import { KwiltLoader } from '../../../ui/KwiltLoader';

export { MealPlanDrawer, type MealPlanTrayItem } from "./MealPlanDrawer";

const RECIPE_CATEGORIES: readonly StarterRecipeMetadata["category"][] =
  STARTER_RECIPE_CATEGORIES;
type FilterKey = keyof RecipeInventoryFilters;

function useDelayedFilterProgress(updating: boolean, delayMs = 180): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!updating) {
      setVisible(false);
      return;
    }
    const timeout = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, updating]);
  return visible;
}

const CATEGORY_FILTER_ICONS: Record<
  StarterRecipeMetadata["category"],
  IconName
> = {
  "Breakfast & brunch": "coffee",
  "Lunch & handhelds": "sandwich",
  Dinner: "drumstick",
  "Soups & stews": "soup",
  "Salads & bowls": "salad",
  "Appetizers & snacks": "popcorn",
  Sides: "carrot",
  "Breads & baking": "wheat",
  Desserts: "cakeSlice",
};

const CUISINE_FILTER_ICONS: Record<CuisineFamilyId, IconName> = {
  "north-american": "mapPinHouse",
  mexican: "citrus",
  "latin-american": "banana",
  caribbean: "waves",
  french: "croissant",
  italian: "pizza",
  "british-irish": "beef",
  european: "landmark",
  mediterranean: "grape",
  "middle-eastern": "bean",
  african: "nut",
  "indian-south-asian": "sprout",
  chinese: "cookingPot",
  taiwanese: "cupSoda",
  japanese: "fish",
  korean: "flame",
  thai: "leafyGreen",
  vietnamese: "flower",
  "southeast-asian": "shrimp",
  australian: "shell",
};

function FilterChoice({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChoice,
        selected && styles.filterChoiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        testID={`recipe-filter-choice-icon-${icon}`}
      >
        <Icon
          name={icon}
          size={15}
          color={selected ? colors.canvas : colors.textSecondary}
        />
      </View>
      <Text
        variant="label"
        style={selected ? styles.filterChoiceTextSelected : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function RecipeFilterDrawer({
  visible,
  value,
  updating = false,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: RecipeInventoryFilters;
  updating?: boolean;
  onClose(): void;
  onChange(value: RecipeInventoryFilters): void;
}) {
  const showProgress = useDelayedFilterProgress(updating);
  const update = <Key extends FilterKey>(
    key: Key,
    next: RecipeInventoryFilters[Key],
  ) => {
    onChange({ ...value, [key]: next });
  };
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={["82%"]}
      enableContentPanningGesture
    >
      <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
        <BottomDrawerHeader
          title="Filter meals"
          subtitle="Choose only what matters for this search."
          variant="withClose"
          onClose={onClose}
        />
        {showProgress ? (
          <View
            testID="recipe-filter-progress"
            accessibilityRole="progressbar"
            accessibilityLabel="Updating meals"
            style={styles.filterProgress}
          >
            <KwiltLoader size="small" color={colors.textSecondary} />
            <Text variant="label" tone="secondary">
              Updating meals…
            </Text>
          </View>
        ) : null}
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            SOURCE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              icon="recipeLibrary"
              label="All recipes"
              selected={value.source === "all"}
              onPress={() => update("source", "all")}
            />
            <FilterChoice
              icon="identity"
              label="Yours"
              selected={value.source === "yours"}
              onPress={() => update("source", "yours")}
            />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            TIME
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              icon="clock"
              label="Any time"
              selected={value.maxMinutes === null}
              onPress={() => update("maxMinutes", null)}
            />
            <FilterChoice
              icon="timer"
              label="30 min or less"
              selected={value.maxMinutes === 30}
              onPress={() => update("maxMinutes", 30)}
            />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            MEAL TYPE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              icon="meal"
              label="Any meal"
              selected={value.category === null}
              onPress={() => update("category", null)}
            />
            {RECIPE_CATEGORIES.map((category) => (
              <FilterChoice
                key={category}
                icon={CATEGORY_FILTER_ICONS[category]}
                label={category}
                selected={value.category === category}
                onPress={() => update("category", category)}
              />
            ))}
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            CUISINE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              icon="globe"
              label="Any cuisine"
              selected={value.cuisine === null}
              onPress={() => update("cuisine", null)}
            />
            {CUISINE_FAMILIES.map((cuisine) => (
              <FilterChoice
                key={cuisine.id}
                icon={CUISINE_FILTER_ICONS[cuisine.id]}
                label={cuisine.label}
                selected={value.cuisine === cuisine.label}
                onPress={() => update("cuisine", cuisine.label)}
              />
            ))}
          </View>
        </View>
        <Button
          variant="ghost"
          onPress={() => onChange(DEFAULT_RECIPE_INVENTORY_FILTERS)}
        >
          Reset filters
        </Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}
export function RecipeSortDrawer({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: RecipeInventorySortMode;
  onClose(): void;
  onChange(value: RecipeInventorySortMode): void;
}) {
  const options: Array<{
    value: RecipeInventorySortMode;
    label: string;
    detail: string;
  }> = [
    { value: "featured", label: "Featured", detail: "Kwilt’s household order" },
    { value: "quickest", label: "Quickest", detail: "Least total time first" },
    { value: "title", label: "A–Z", detail: "Recipe title" },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[360]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader
          title="Sort meals"
          variant="withClose"
          onClose={onClose}
        />
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={selected ? styles.optionSelected : undefined}>
                  {option.label}
                </Text>
                <Text tone="secondary">{option.detail}</Text>
              </View>
              {selected ? (
                <Icon name="check" size={18} color={colors.accent} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomDrawer>
  );
}

export function RecipeCaptureDrawer({
  visible,
  onClose,
  onFamily,
  onWeb,
  onManual,
}: {
  visible: boolean;
  onClose(): void;
  onFamily(): void;
  onWeb(): void;
  onManual(): void;
}) {
  const options: Array<{
    icon: IconName;
    label: string;
    detail: string;
    onPress(): void;
  }> = [
    {
      icon: "heart",
      label: "Family recipe",
      detail: "Photograph, paste, dictate, or type it",
      onPress: onFamily,
    },
    {
      icon: "link",
      label: "Recipe from the web",
      detail: "Bring it in from a link",
      onPress: onWeb,
    },
    {
      icon: "edit",
      label: "Start blank",
      detail: "Write it one line at a time",
      onPress: onManual,
    },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[430]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader
          title="Add a recipe"
          subtitle="Where does this recipe live now?"
          variant="withClose"
          onClose={onClose}
        />
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              onClose();
              option.onPress();
            }}
            style={({ pressed }) => [
              styles.captureRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.captureIcon}>
              <Icon name={option.icon} size={19} color={colors.textPrimary} />
            </View>
            <View style={styles.optionCopy}>
              <Text>{option.label}</Text>
              <Text tone="secondary">{option.detail}</Text>
            </View>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </BottomDrawer>
  );
}

export function RecipeInventoryDock({
  onAdd,
  onSearch,
  onAsk,
}: {
  onAdd(): void;
  onSearch(): void;
  onAsk(): void;
}) {
  return (
    <View
      testID="recipe-inventory-dock"
      pointerEvents="box-none"
      style={styles.dock}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Find recipes"
        accessibilityHint="Opens Search scoped to Recipes"
        onPress={onSearch}
        style={({ pressed }) => [
          styles.primaryDockButton,
          pressed && styles.pressed,
        ]}
      >
        <FloatingControlSurface
          borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
          isProminent
          style={styles.primaryDockSurface}
          surfaceStyle={styles.primaryDockSurfaceContent}
        >
          <View style={styles.primaryDockContent}>
            <Icon name="search" size={19} color={colors.textPrimary} />
            <Text tone="secondary">Find recipes</Text>
          </View>
        </FloatingControlSurface>
      </Pressable>
      <FloatingDockActionButton
        testID="recipe-inventory-add"
        accessibilityLabel="Add a recipe"
        accessibilityHint="Opens options to add a recipe"
        icon="plus"
        isProminent
        onPress={onAdd}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
      <FloatingDockActionButton
        testID="recipe-inventory-ai"
        accessibilityLabel="Ask Kwilt about meals"
        accessibilityHint="Opens AI chat"
        icon="navAiGuide"
        isProminent
        onPress={onAsk}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
    </View>
  );
}

type LegacyMealPlanTrayItem = {
  id: string;
  candidateId: string;
  title: string;
  storageRef: string | null;
  contributor?: { personId: string; displayName: string; avatarUrl: string | null };
  supporters?: Array<{ personId: string; displayName: string; avatarUrl: string | null }>;
  viewerReacted?: boolean;
  canReact?: boolean;
  canWithdraw?: boolean;
  selected?: boolean;
};

function MealPeopleMenu({ item }: { item: LegacyMealPlanTrayItem }) {
  if (!item.contributor) return null;
  const people = new Map<string, NonNullable<LegacyMealPlanTrayItem["contributor"]>>();
  people.set(item.contributor.personId, item.contributor);
  item.supporters?.forEach((supporter) => people.set(supporter.personId, supporter));
  const avatars = [...people.values()];
  const otherSupporters = avatars.filter((person) => person.personId !== item.contributor?.personId);
  const peopleAccessibilityLabel = [
    `People for ${item.title}`,
    `Added by ${item.contributor.displayName}`,
    otherSupporters.length
      ? `Liked by ${otherSupporters.map((person) => person.displayName).join(", ")}`
      : "No other likes yet",
  ].join(". ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={peopleAccessibilityLabel}
          accessibilityHint="Shows who added and liked this meal"
          hitSlop={8}
          style={({ pressed }) => [styles.planPeopleTrigger, pressed && styles.pressed]}
        >
          <OverlappingAvatarStack
            avatars={avatars.map((person) => ({ id: person.personId, name: person.displayName, avatarUrl: person.avatarUrl }))}
            size={22}
            maxVisible={4}
            overlapPx={7}
          />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" sideOffset={6} style={styles.planPeopleMenu}>
        <Text variant="label">Added by {item.contributor.displayName}</Text>
        <Text tone="secondary">
          {otherSupporters.length
            ? `Liked by ${otherSupporters.map((person) => person.displayName).join(", ")}`
            : "No other likes yet"}
        </Text>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LegacyMealPlanDrawer({
  visible,
  items,
  committedMeals = [],
  committedMealCount = committedMeals.length,
  groceryAction,
  canEdit,
  onClose,
  onContinue,
  onRemove,
  canSettle = false,
  onReact,
  onSettle,
  onOpenGroceries,
}: {
  visible: boolean;
  items: LegacyMealPlanTrayItem[];
  committedMeals?: CommittedMealPreview[];
  committedMealCount?: number;
  groceryAction?: GroceryPlanAction | null;
  canEdit: boolean;
  onClose(): void;
  onContinue(): void;
  onRemove(candidateId: string): void;
  canSettle?: boolean;
  onReact?(candidateId: string, reacted: boolean): void;
  onSettle?(commitments: MealCommitment[]): void;
  onOpenGroceries?(): void;
}) {
  const [phase, setPhase] = useState<"cart" | "choose" | "place">("cart");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timingByCandidateId, setTimingByCandidateId] = useState<Record<string, MealTimingIntent>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) {
      setPhase("cart");
      setSelectedIds(new Set());
      setTimingByCandidateId({});
      setEditingCandidateId(null);
    }
  }, [visible]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.candidateId)),
    [items, selectedIds],
  );
  const setTiming = (candidateId: string, timing: MealTimingIntent) => {
    setTimingByCandidateId((current) => ({ ...current, [candidateId]: timing }));
  };
  const startPlacement = () => {
    setTimingByCandidateId(Object.fromEntries([...selectedIds].map((candidateId) => [candidateId, { kind: "flexible" }])));
    setPhase("place");
  };
  const count = items.length;
  const visiblePlanCount = committedMealCount + count;
  const planLabel = [
    committedMealCount === 1 ? "1 committed meal" : committedMealCount ? `${committedMealCount} committed meals` : null,
    count === 1 ? "1 idea waiting" : count ? `${count} ideas waiting` : null,
  ].filter(Boolean).join(", ") || "empty";
  const confirmLabel = `Confirm ${selectedItems.length} ${selectedItems.length === 1 ? "meal" : "meals"}`;
  return (
    <BottomDrawer
        visible={visible}
        onClose={onClose}
        snapPoints={["88%"]}
        snapIndex={0}
        dismissable={false}
        presentation="inline"
        enableContentPanningGesture
        contentExtendsIntoBottomSafeArea
        sheetStyle={styles.planDrawerSheet}
        handleContainerStyle={styles.planDrawerHandleRegion}
      >
        <View style={styles.planDrawerViewport}>
          <BottomDrawerHeader
            variant="withClose"
            titleVariant="sm"
            onClose={onClose}
            closeAccessibilityLabel="Close Meal Plan"
            containerStyle={styles.planDrawerHeader}
            title={(
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Meal Plan, ${planLabel}`}
                style={styles.planDrawerHeaderMain}
              >
                <Icon name="meal" size={16} color={colors.textPrimary} />
                <Heading variant="sm">Plan</Heading>
                {visiblePlanCount ? <Text tone="secondary">{visiblePlanCount}</Text> : null}
              </View>
            )}
          />
          <BottomDrawerScrollView
            contentContainerStyle={styles.planDrawerContent}
          >
            {phase === "cart" && committedMeals.length ? (
              <View style={styles.committedPlanSection}>
                <View style={styles.committedPlanHeading}>
                  <Heading variant="sm">{committedMealCount} {committedMealCount === 1 ? "meal" : "meals"} decided</Heading>
                </View>
                <View style={styles.committedMealList}>
                  {committedMeals.map((meal) => (
                    <View key={meal.id} style={styles.committedMealCard}>
                      <RecipeArtwork storageRef={meal.storageRef} accessibilityLabel={meal.title} style={styles.committedMealArtwork} />
                      <View style={styles.committedMealCopy}>
                        <Text numberOfLines={2} style={styles.committedMealTitle}>{meal.title}</Text>
                        <Text tone="secondary" numberOfLines={1}>{meal.timingLabel}</Text>
                        {meal.detail ? <Text tone="secondary" numberOfLines={1}>{meal.detail}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
                {groceryAction && onOpenGroceries ? (
                  <Button variant="secondary" fullWidth onPress={onOpenGroceries}>{groceryAction.label}</Button>
                ) : null}
              </View>
            ) : null}
            {phase === "choose" ? (
              <View style={styles.planDrawerPlacementIntro}>
                <Heading variant="sm">Decide the next meals</Heading>
                <Text tone="secondary">Family support stays visible. Nothing reaches Groceries until you confirm.</Text>
              </View>
            ) : null}
            {phase === "place" ? (
              <View style={styles.planDrawerPlacementIntro}>
                <Heading variant="sm">Place any meals whose timing matters.</Heading>
                <Text tone="secondary">Flexible meals are already ready to use.</Text>
              </View>
            ) : null}
            {items.length ? (
              <View style={styles.planDrawerList}>
                {(phase === "place" ? selectedItems : items).map((item) => (
                  <View key={item.id} style={styles.planDrawerItem}>
                    <Pressable
                      disabled={phase === "cart"}
                      accessibilityRole={phase === "choose" ? "checkbox" : "button"}
                      accessibilityLabel={phase === "choose" ? `Use ${item.title}` : phase === "place" ? `Set timing for ${item.title}, ${formatMealTiming(timingByCandidateId[item.candidateId] ?? { kind: "flexible" })}` : undefined}
                      accessibilityState={phase === "choose" ? { checked: selectedIds.has(item.candidateId) } : undefined}
                      onPress={() => phase === "choose" ? setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(item.candidateId)) next.delete(item.candidateId); else next.add(item.candidateId);
                        return next;
                      }) : phase === "place" ? setEditingCandidateId((current) => current === item.candidateId ? null : item.candidateId) : undefined}
                      style={({ pressed }) => [styles.planDrawerRow, pressed && styles.pressed]}
                    >
                      {phase === "choose" ? (
                        <View style={[styles.planDrawerSelection, selectedIds.has(item.candidateId) && styles.planDrawerSelectionActive]}>
                          {selectedIds.has(item.candidateId) ? <Icon name="check" size={14} color={colors.canvas} /> : null}
                        </View>
                      ) : null}
                      <View style={styles.planDrawerArtworkFrame}>
                        <RecipeArtwork
                          storageRef={item.storageRef}
                          accessibilityLabel={item.title}
                          style={styles.planDrawerArtwork}
                        />
                      </View>
                      <View style={styles.planDrawerMealCopy}>
                        <Text style={styles.planDrawerTitle} numberOfLines={2}>{item.title}</Text>
                        {phase === "place" ? <Text tone="secondary">{formatMealTiming(timingByCandidateId[item.candidateId] ?? { kind: "flexible" })}</Text> : null}
                        {phase !== "place" ? <MealPeopleMenu item={item} /> : null}
                      </View>
                      {phase === "cart" && item.canReact && onReact ? (
                        <Button
                          size="icon"
                          iconButtonSize={34}
                          variant={item.viewerReacted ? "secondary" : "ghost"}
                          accessibilityLabel={`${item.viewerReacted ? "Unlike" : "Like"} ${item.title}`}
                          accessibilityHint="Updates your Sounds good response"
                          accessibilityState={{ selected: item.viewerReacted }}
                          onPress={() => onReact(item.candidateId, !item.viewerReacted)}
                        >
                          <Icon name="thumbsUp" size={17} color={colors.textPrimary} />
                        </Button>
                      ) : null}
                      {phase === "cart" && canEdit && (item.canWithdraw ?? true) ? (
                        <IconButton
                          accessibilityLabel={`Remove ${item.title} from Meal Plan`}
                          variant="ghost"
                          onPress={() => onRemove(item.candidateId)}
                        >
                          <Icon name="close" size={17} color={colors.textSecondary} />
                        </IconButton>
                      ) : null}
                    </Pressable>
                    {phase === "place" && editingCandidateId === item.candidateId ? (
                      <MealTimingEditor
                        value={timingByCandidateId[item.candidateId] ?? { kind: "flexible" }}
                        onChange={(timing) => setTiming(item.candidateId, timing)}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : !committedMeals.length ? (
              <View style={styles.planDrawerEmpty}>
                <Heading variant="sm">Choose what sounds good.</Heading>
                <Text tone="secondary">
                  Tap + on any meal. Your choices will collect here.
                </Text>
              </View>
            ) : null}
            {!canEdit && items.length && !canSettle ? (
              <Text tone="secondary">
                This settled Plan is ready for Groceries.
              </Text>
            ) : null}
            {items.length && phase === "choose" ? (
              <Button
                variant="primary"
                fullWidth
                disabled={selectedIds.size === 0}
                style={selectedIds.size === 0 ? styles.planDrawerSettlementDisabled : undefined}
                onPress={startPlacement}
              >
                Review timing
              </Button>
            ) : items.length && phase === "cart" && canSettle ? (
              <Button variant="secondary" fullWidth onPress={() => { setPhase("choose"); setSelectedIds(new Set()); }}>
                Decide meals
              </Button>
            ) : phase === "place" ? (
              <Button
                variant="primary"
                fullWidth
                accessibilityLabel={confirmLabel}
                onPress={() => onSettle?.(selectedItems.map((item) => ({
                  candidateId: item.candidateId,
                  timing: timingByCandidateId[item.candidateId] ?? { kind: "flexible" },
                })))}
              >
                {confirmLabel}
              </Button>
            ) : items.length && !onSettle ? (
              <Button variant="primary" fullWidth onPress={onContinue}>Review Meal Plan</Button>
            ) : null}
          </BottomDrawerScrollView>
        </View>
      </BottomDrawer>
  );
}

const MEAL_PERIODS: MealPeriod[] = ["breakfast", "lunch", "dinner", "snack"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextSevenDays(): Array<{ date: string; label: string; weekday: number }> {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      date: dateKey(date),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric" }).format(date),
      weekday: date.getDay(),
    };
  });
}

function TimingChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.planTimingChoice, selected && styles.planTimingChoiceSelected, pressed && styles.pressed]}
    >
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

function MealTimingEditor({ value, onChange }: { value: MealTimingIntent; onChange(value: MealTimingIntent): void }) {
  const days = useMemo(nextSevenDays, []);
  const period = value.kind === "flexible" ? "dinner" : value.mealPeriod;
  const setPeriod = (mealPeriod: MealPeriod) => {
    if (value.kind === "occasion") onChange({ ...value, mealPeriod });
    if (value.kind === "coverage") onChange({ ...value, mealPeriod });
  };
  const chooseCoverage = () => {
    const weekdays = days.filter((day) => day.weekday > 0 && day.weekday < 6).map((day) => day.date);
    onChange({ kind: "coverage", dates: weekdays.length ? weekdays : [days[0].date], mealPeriod: "lunch", label: "Weekday lunches" });
  };
  return (
    <View style={styles.planTimingEditor} onStartShouldSetResponder={() => true}>
      <View style={styles.planTimingChoices}>
        <TimingChoice label="Flexible" selected={value.kind === "flexible"} onPress={() => onChange({ kind: "flexible" })} />
        <TimingChoice label="One day" selected={value.kind === "occasion"} onPress={() => onChange({ kind: "occasion", date: days[0].date, mealPeriod: "dinner" })} />
        <TimingChoice label="Several days" selected={value.kind === "coverage"} onPress={chooseCoverage} />
      </View>
      {value.kind === "occasion" ? (
        <DateTimePicker
          value={new Date(`${value.date}T12:00:00`)}
          mode="date"
          display="compact"
          minimumDate={new Date(`${days[0].date}T00:00:00`)}
          onChange={(_event: DateTimePickerEvent, date?: Date) => date && onChange({ ...value, date: dateKey(date) })}
        />
      ) : null}
      {value.kind === "coverage" ? (
        <>
          <View style={styles.planTimingChoices}>
            {days.map((day) => <TimingChoice key={day.date} label={day.label} selected={value.dates.includes(day.date)} onPress={() => onChange({ ...value, dates: value.dates.includes(day.date) ? value.dates.filter((date) => date !== day.date) : [...value.dates, day.date].sort() })} />)}
          </View>
          <TextInput
            accessibilityLabel="Coverage name"
            value={value.label}
            onChangeText={(label) => onChange({ ...value, label })}
            placeholder="What covers these meals?"
            placeholderTextColor={colors.textSecondary}
            style={styles.planTimingInput}
          />
        </>
      ) : null}
      {value.kind !== "flexible" ? (
        <View style={styles.planTimingChoices}>
          {MEAL_PERIODS.map((mealPeriod) => <TimingChoice key={mealPeriod} label={mealPeriod.charAt(0).toUpperCase() + mealPeriod.slice(1)} selected={period === mealPeriod} onPress={() => setPeriod(mealPeriod)} />)}
        </View>
      ) : null}
    </View>
  );
}
