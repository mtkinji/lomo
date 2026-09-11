import type { ReactNode } from "react";
import type { SharedHomeDelivery } from "./sharedHomeTypes";
import { Alert, ScrollView } from "react-native";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../../ui/DropdownMenu";
import { Button, Text, VStack } from "../../ui/primitives";
import { Pressable } from "../../ui/HapticPressable";
import { Icon } from "../../ui/Icon";
import { ProfileAvatar } from "../../ui/ProfileAvatar";
import { colors, spacing, typography } from "../../theme";
import type { HomePerson, HomeCatchUp } from "./sharedLifeTypes";
export type HomeMenuChoice =
  "all" | "moments" | "people" | "mine" | "saved" | "places";
export function SharedLifeFeedMenu({
  households,
  onChoose,
  onHousehold,
  selectedChoice,
  householdId,
  onNextSteps,
}: {
  households: HomePerson[];
  onNextSteps?: () => void;
  selectedChoice?: HomeMenuChoice;
  householdId?: string;
  onChoose: (choice: HomeMenuChoice) => void;
  onHousehold: (id: string) => void;
}) {
  const choices: { id: HomeMenuChoice; label: string }[] = [
    { id: "all", label: "All moments" },
    { id: "moments", label: "Moments only" },
    { id: "people", label: "People" },
    { id: "mine", label: "My moments" },
    { id: "saved", label: "Saved" },
    { id: "places", label: "Saved places" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" iconButtonSize={44} accessibilityLabel="Home options">
          <Icon name="more" size={20} color={colors.textPrimary} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" style={{ minWidth: 220 }}>
        {onNextSteps ? <><DropdownMenuItem label="Your next steps" onPress={onNextSteps}/><DropdownMenuSeparator/></> : null}
        {choices.map((c) => (
          <DropdownMenuItem key={c.id} label={c.label} selected={selectedChoice === c.id} onPress={() => onChoose(c.id)} />
        ))}
        {households.length ? <DropdownMenuSeparator/> : null}
        {households.map((h) => (
          <DropdownMenuItem key={h.id} label={h.name} selected={householdId === h.id} onPress={() => onHousehold(h.id)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function SharedLifeCatchUpRail({
  bubbles,
  onOpen,
  onPeople,
}: {
  bubbles: HomeCatchUp[];
  onOpen: (bubble: HomeCatchUp) => void;
  onPeople: () => void;
}) {
  if (!bubbles.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.lg }}
    >
      {bubbles.map((b) => (
        <Pressable
          key={b.kind + b.id}
          accessibilityRole="button"
          accessibilityLabel={`${b.name}, ${b.count} new moments`}
          style={{ width: 88, paddingVertical: spacing.sm }}
          onPress={() => onOpen(b)}
        >
          <VStack space="xs" alignItems="center">
            <ProfileAvatar name={b.name} size={48} />
            <Text style={typography.bodySm} numberOfLines={1}>
              {b.name}
            </Text>
            <Text style={typography.bodySm}>{`${b.count} new`}</Text>
          </VStack>
        </Pressable>
      ))}
      <Button variant="ghost" onPress={onPeople}>
        All people
      </Button>
    </ScrollView>
  );
}

export function SharedLifeNeedsYou({
  items,
  renderDelivery,
  onOpen,
}: {
  items: SharedHomeDelivery[];
  renderDelivery: (d: SharedHomeDelivery) => ReactNode;
  onOpen: (d: SharedHomeDelivery) => void;
}) {
  if (!items.length) return null;
  return (
    <VStack space="sm">
      <Text tone="secondary">Needs you</Text>
      {renderDelivery(items[0])}
      {items.length > 1 ? (
        <Button
          variant="ghost"
          onPress={() =>
            Alert.alert("Needs you", undefined, [
              ...items.map((d) => ({
                text: d.title,
                onPress: () => onOpen(d),
              })),
              { text: "Cancel", style: "cancel" },
            ])
          }
        >{`View all ${items.length}`}</Button>
      ) : null}
    </VStack>
  );
}

export function SharedLifeShareButton({ onChoose }: { onChoose: (intent: "photo" | "write") => void }) {
  return (
    <Button variant="ghost" size="icon" iconButtonSize={44} accessibilityLabel="Share a moment"
      onPress={() => onChoose("write")}>
      <Icon name="plus" size={20} color={colors.textPrimary} />
    </Button>
  );
}
