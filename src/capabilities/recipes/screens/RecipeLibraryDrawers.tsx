import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { colors } from "../../../theme";
import { BottomDrawer, BottomDrawerScrollView } from "../../../ui/BottomDrawer";
import { Button, IconButton } from "../../../ui/Button";
import { Icon, type IconName } from "../../../ui/Icon";
import { BottomDrawerHeader } from "../../../ui/layout/BottomDrawerHeader";
import { RESTING_COMPOSER_HEIGHT_PX } from "../../../ui/layout/restingComposerMetrics";
import { Heading, Text } from "../../../ui/Typography";
import { FloatingControlSurface } from "../../../features/activities/FloatingControlSurface";
import { FloatingDockActionButton } from "../../../features/activities/FloatingDockActionButton";
import { INVENTORY_DOCK_BUTTON_SIZE_PX } from "../../../features/activities/InventoryDockAffordances";
import { RecipeArtwork } from "../components/RecipeArtwork";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_CATEGORIES,
  STARTER_RECIPE_CUISINES,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
  type StarterRecipeMetadata,
} from "../data/starterRecipeCatalog";
import { styles } from "./RecipeLibraryScreen.styles";

const RECIPE_CATEGORIES: readonly StarterRecipeMetadata["category"][] =
  STARTER_RECIPE_CATEGORIES;
const RECIPE_CUISINES = STARTER_RECIPE_CUISINES;
type FilterKey = keyof RecipeInventoryFilters;

function FilterChoice({
  label,
  selected,
  onPress,
}: {
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
  onClose,
  onApply,
}: {
  visible: boolean;
  value: RecipeInventoryFilters;
  onClose(): void;
  onApply(value: RecipeInventoryFilters): void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);
  const update = <Key extends FilterKey>(
    key: Key,
    next: RecipeInventoryFilters[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: next }));
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
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            SOURCE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              label="All recipes"
              selected={draft.source === "all"}
              onPress={() => update("source", "all")}
            />
            <FilterChoice
              label="Yours"
              selected={draft.source === "yours"}
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
              label="Any time"
              selected={draft.maxMinutes === null}
              onPress={() => update("maxMinutes", null)}
            />
            <FilterChoice
              label="30 min or less"
              selected={draft.maxMinutes === 30}
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
              label="Any meal"
              selected={draft.category === null}
              onPress={() => update("category", null)}
            />
            {RECIPE_CATEGORIES.map((category) => (
              <FilterChoice
                key={category}
                label={category}
                selected={draft.category === category}
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
              label="Any cuisine"
              selected={draft.cuisine === null}
              onPress={() => update("cuisine", null)}
            />
            {RECIPE_CUISINES.map((cuisine) => (
              <FilterChoice
                key={cuisine}
                label={cuisine}
                selected={draft.cuisine === cuisine}
                onPress={() => update("cuisine", cuisine)}
              />
            ))}
          </View>
        </View>
        <View style={styles.drawerActions}>
          <Button
            variant="ghost"
            onPress={() => setDraft(DEFAULT_RECIPE_INVENTORY_FILTERS)}
          >
            Reset
          </Button>
          <View style={styles.drawerApply}>
            <Button fullWidth variant="primary" onPress={() => onApply(draft)}>
              Show meals
            </Button>
          </View>
        </View>
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
  onImport,
  onManual,
}: {
  visible: boolean;
  onClose(): void;
  onImport(): void;
  onManual(): void;
}) {
  const options: Array<{
    icon: IconName;
    label: string;
    detail: string;
    onPress(): void;
  }> = [
    {
      icon: "camera",
      label: "Photo or scan",
      detail: "Capture a cookbook page or recipe card",
      onPress: onImport,
    },
    {
      icon: "link",
      label: "Link, text, or voice",
      detail: "Bring in a recipe from wherever it lives",
      onPress: onImport,
    },
    {
      icon: "edit",
      label: "Write it yourself",
      detail: "Start with a blank family recipe",
      onPress: onManual,
    },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[430]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader
          title="Add a recipe"
          subtitle="Start with what you already have."
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
        accessibilityLabel="Add a recipe"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addDockButton,
          pressed && styles.pressed,
        ]}
      >
        <FloatingControlSurface
          borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
          isProminent
          style={styles.addDockSurface}
          surfaceStyle={styles.addDockSurfaceContent}
        >
          <View style={styles.addDockContent}>
            <Icon name="plus" size={19} color={colors.textPrimary} />
            <Text tone="secondary">Add a recipe</Text>
          </View>
        </FloatingControlSurface>
      </Pressable>
      <FloatingDockActionButton
        testID="recipe-inventory-search"
        accessibilityLabel="Search meals"
        accessibilityHint="Opens Search scoped to Meals"
        icon="search"
        isProminent
        onPress={onSearch}
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

export type MealPlanTrayItem = {
  id: string;
  candidateId: string;
  title: string;
  storageRef: string | null;
};

const MEAL_PLAN_DRAWER_PEEK_HEIGHT = 124;

export function MealPlanDrawer({
  visible,
  items,
  canEdit,
  snapIndex,
  onSnapIndexChange,
  onSearch,
  onClose,
  onContinue,
  onRemove,
}: {
  visible: boolean;
  items: MealPlanTrayItem[];
  canEdit: boolean;
  snapIndex: number;
  onSnapIndexChange(index: number): void;
  onSearch(): void;
  onClose(): void;
  onContinue(): void;
  onRemove(candidateId: string): void;
}) {
  const count = items.length;
  const mealLabel = count === 1 ? "1 meal" : `${count} meals`;
  const visibleItems = items.slice(0, 4);
  const overflowCount = Math.max(0, count - visibleItems.length);
  return (
    <>
      {visible && snapIndex === 0 ? (
        <View style={styles.planDrawerSearch}>
          <FloatingDockActionButton
            testID="meal-plan-drawer-search"
            accessibilityLabel="Search meals"
            accessibilityHint="Opens Search scoped to Meals"
            icon="search"
            isProminent
            onPress={onSearch}
            size={INVENTORY_DOCK_BUTTON_SIZE_PX}
          />
        </View>
      ) : null}
      <BottomDrawer
        visible={visible}
        onClose={onClose}
        snapPoints={[MEAL_PLAN_DRAWER_PEEK_HEIGHT, "88%"]}
        snapIndex={snapIndex}
        onSnapIndexChange={(index) => onSnapIndexChange(index)}
        dismissable={false}
        hideBackdrop={snapIndex === 0}
        presentation="inline"
        enableContentPanningGesture
        contentExtendsIntoBottomSafeArea
        sheetStyle={styles.planDrawerSheet}
        handleContainerStyle={styles.planDrawerHandleRegion}
      >
        <View style={styles.planDrawerViewport}>
          <View style={styles.planDrawerHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Review Meal Plan, ${mealLabel}`}
              accessibilityHint={
                snapIndex === 0 ? "Expands the Meal Plan drawer" : undefined
              }
              onPress={() => onSnapIndexChange(1)}
              style={({ pressed }) => [
                styles.planDrawerHeaderMain,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.planDrawerTitleRow}>
                <Icon name="meal" size={16} color={colors.textPrimary} />
                <Text variant="label">Plan</Text>
                <Text variant="label" tone="secondary">
                  {count}
                </Text>
              </View>
              <View style={styles.planDrawerThumbnails}>
                {visibleItems.map((item) => (
                  <View
                    key={item.id}
                    testID="meal-plan-drawer-thumbnail"
                    style={styles.planDrawerThumbnailFrame}
                  >
                    <RecipeArtwork
                      storageRef={item.storageRef}
                      accessibilityLabel={item.title}
                      style={styles.planDrawerThumbnail}
                    />
                  </View>
                ))}
                {overflowCount ? (
                  <Text
                    variant="label"
                    tone="secondary"
                    style={styles.planDrawerOverflow}
                  >
                    +{overflowCount}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Meal Plan"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.planDrawerClose,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="close" size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
          <BottomDrawerScrollView
            contentContainerStyle={styles.planDrawerContent}
          >
            {items.length ? (
              <View style={styles.planDrawerList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.planDrawerRow}>
                    <View style={styles.planDrawerArtworkFrame}>
                      <RecipeArtwork
                        storageRef={item.storageRef}
                        accessibilityLabel={item.title}
                        style={styles.planDrawerArtwork}
                      />
                    </View>
                    <Text style={styles.planDrawerTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {canEdit ? (
                      <IconButton
                        accessibilityLabel={`Remove ${item.title} from Meal Plan`}
                        variant="ghost"
                        onPress={() => onRemove(item.candidateId)}
                      >
                        <Icon
                          name="close"
                          size={17}
                          color={colors.textSecondary}
                        />
                      </IconButton>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.planDrawerEmpty}>
                <Heading variant="sm">Choose what sounds good.</Heading>
                <Text tone="secondary">
                  Tap + on any meal. Your choices will collect here.
                </Text>
              </View>
            )}
            {!canEdit && items.length ? (
              <Text tone="secondary">
                Family choices are underway. Finish reviewing them before
                changing this plan.
              </Text>
            ) : null}
            {items.length ? (
              <Button fullWidth onPress={onContinue}>
                Review Meal Plan
              </Button>
            ) : null}
          </BottomDrawerScrollView>
        </View>
      </BottomDrawer>
    </>
  );
}
