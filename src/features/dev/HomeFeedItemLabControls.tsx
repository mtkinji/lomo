import { ScrollView } from "react-native";
import { Button, HStack } from "../../ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/DropdownMenu";
import {
  homeFeedReviewTypes,
  type HomeItemExample,
} from "./homeFeedItemExamples";
export function HomeFeedItemLabControls({
  typeId,
  onType,
  examples,
  currentId,
  onExample,
}: {
  typeId: string;
  onType: (id: string) => void;
  examples: HomeItemExample[];
  currentId: string;
  onExample: (id: string) => void;
}) {
  return (
    <HStack>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            accessibilityLabel="Choose feed content category"
          >
            {homeFeedReviewTypes.find((t) => t.id === typeId)?.label ??
              (typeId === "overview" ? "Four patterns" : "All categories")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <ScrollView style={{ maxHeight: 340 }}>
            <DropdownMenuItem
              label="All categories"
              selected={!typeId}
              onPress={() => onType("")}
            />
            <DropdownMenuItem
              label="Four patterns"
              selected={typeId === "overview"}
              onPress={() => onType("overview")}
            />
            {homeFeedReviewTypes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                label={t.label}
                selected={typeId === t.id}
                onPress={() => onType(t.id)}
              />
            ))}
          </ScrollView>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" accessibilityLabel="Choose feed item variant">
            Variants
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ScrollView style={{ maxHeight: 340 }}>
            {examples.map((e) => (
              <DropdownMenuItem
                key={e.id}
                label={e.name}
                selected={currentId === e.id}
                onPress={() => onExample(e.id)}
              />
            ))}
          </ScrollView>
        </DropdownMenuContent>
      </DropdownMenu>
    </HStack>
  );
}
