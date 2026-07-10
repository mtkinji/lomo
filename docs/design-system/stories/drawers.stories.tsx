import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, radii, spacing } from '../../../src/theme';
import { Badge } from '../../../src/ui/Badge';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { Icon } from '../../../src/ui/Icon';
import { Input } from '../../../src/ui/Input';
import { SegmentedControl } from '../../../src/ui/SegmentedControl';
import { Heading, Text } from '../../../src/ui/Typography';
import { StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Overlays/Drawers',
  parameters: {
    docs: {
      description: {
        component:
          'Drawer taxonomy for Kwilt Goals and Kwilt Money. Shared mechanics should not force every drawer to share the same anatomy.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DrawerShell({
  children,
  height = 520,
  label,
}: {
  children: React.ReactNode;
  height?: number;
  label: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View style={[styles.phoneCanvas, { height }]}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </View>
  );
}

function MoneyChoiceRow({
  checked = false,
  icon,
  label,
  meta,
}: {
  checked?: boolean;
  icon: React.ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <View style={[styles.choiceRow, checked ? styles.choiceRowSelected : null]}>
      <View style={styles.choiceLeading}>
        <View style={styles.choiceIcon}>{icon}</View>
        <Text style={styles.choiceLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {meta && !checked ? (
        <Text style={styles.choiceMeta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      <View style={styles.checkSlot}>
        {checked ? <Icon name="check" size={18} color={colors.textPrimary} /> : null}
      </View>
    </View>
  );
}

function MoneyChoicePickerSpecimen() {
  return (
    <DrawerShell label="Money-style choice picker" height={620}>
      <StoryStack>
        <View style={styles.centerTitleBlock}>
          <Heading variant="md" style={styles.centerTitle}>
            Choose category
          </Heading>
        </View>
        <Input
          leadingIcon="search"
          placeholder="Search categories"
          variant="filled"
          elevation="flat"
        />
        <View style={styles.choiceList}>
          <MoneyChoiceRow icon={<Icon name="trendUp" size={16} color={colors.pine700} />} label="Income" />
          <MoneyChoiceRow checked icon={<Icon name="arrowDown" size={16} color={colors.pine700} />} label="Internal transfer" />
          <MoneyChoiceRow icon={<Icon name="close" size={16} color={colors.pine700} />} label="No budget category" />
          <MoneyChoiceRow icon={<Text>🏠</Text>} label="Housing" />
          <MoneyChoiceRow icon={<Text>🛍️</Text>} label="Shopping" />
          <MoneyChoiceRow icon={<Text>🥬</Text>} label="Groceries" meta="Suggested" />
          <MoneyChoiceRow icon={<Text>🍽️</Text>} label="Restaurants" />
        </View>
      </StoryStack>
    </DrawerShell>
  );
}

function GoalsTaskDrawerSpecimen() {
  return (
    <DrawerShell label="Goals-style task drawer" height={620}>
      <StoryStack>
        <View style={styles.taskHeader}>
          <View style={styles.actionSlot} />
          <View style={styles.taskTitleBlock}>
            <Heading variant="sm" style={{ textAlign: 'center' }}>
              Filter To-dos
            </Heading>
            <Text tone="secondary" style={{ textAlign: 'center' }}>
              Build a saved view from multiple conditions.
            </Text>
          </View>
          <View style={styles.actionSlot}>
            <Icon name="close" size={18} color={colors.textPrimary} />
          </View>
        </View>
        <Card padding="sm" elevation="none">
          <StoryStack>
            <View style={styles.fieldRow}>
              <Input value="Status" editable={false} variant="outline" elevation="flat" />
              <Icon name="close" size={16} color={colors.textSecondary} />
            </View>
            <SegmentedControl
              value="and"
              onChange={() => undefined}
              options={[
                { value: 'and', label: 'and' },
                { value: 'or', label: 'or' },
              ]}
              size="compact"
            />
            <Input value="Due this week" editable={false} variant="outline" elevation="flat" />
          </StoryStack>
        </Card>
        <Button onPress={() => undefined}>Apply filters</Button>
      </StoryStack>
    </DrawerShell>
  );
}

export const Taxonomy: Story = {
  render: () => (
    <StoryFrame
      title="Drawer Taxonomy"
      description="Money's category picker should inform a shared choice-picker variant. Goals' heavier drawers should remain the source for task/edit mechanics."
    >
      <StoryGrid>
        <MoneyChoicePickerSpecimen />
        <GoalsTaskDrawerSpecimen />
      </StoryGrid>
    </StoryFrame>
  ),
};

export const Guidance: Story = {
  render: () => (
    <StoryFrame
      title="What Should Become Canonical?"
      description="The shared package should own mechanics and primitives. Product apps should own domain-specific rows and workflow composition."
    >
      <StoryGrid>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="secondary">Share</Badge>
            <Heading variant="sm">Drawer mechanics</Heading>
            <Text tone="secondary">
              Snap points, scrim, safe-area padding, keyboard avoidance, handle, drag-to-dismiss, and scroll gesture coordination.
            </Text>
          </StoryStack>
        </Card>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="secondary">Share</Badge>
            <Heading variant="sm">Choice picker anatomy</Heading>
            <Text tone="secondary">
              Title, optional search, selectable rows, selected check slot, command rows, and dense list spacing.
            </Text>
          </StoryStack>
        </Card>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="outline">Keep local</Badge>
            <Heading variant="sm">Domain option rendering</Heading>
            <Text tone="secondary">
              Category emojis, transaction meanings, budget suggestions, goal/activity relationships, and workflow-specific copy.
            </Text>
          </StoryStack>
        </Card>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="outline">Keep local</Badge>
            <Heading variant="sm">Whole workflow composition</Heading>
            <Text tone="secondary">
              A full transaction-review drawer or multi-step goal creation drawer should not become a generic primitive too early.
            </Text>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = {
  phoneCanvas: {
    width: 390,
    maxWidth: '100%' as const,
    justifyContent: 'flex-end' as const,
    borderRadius: 34,
    backgroundColor: '#D8DBDF',
    overflow: 'hidden' as const,
    paddingTop: 64,
  },
  sheet: {
    flex: 1,
    gap: spacing.md,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
  },
  handle: {
    width: 64,
    height: 5,
    alignSelf: 'center' as const,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  centerTitleBlock: {
    alignItems: 'center' as const,
  },
  centerTitle: {
    textAlign: 'center' as const,
  },
  choiceList: {
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    backgroundColor: colors.card,
  },
  choiceRow: {
    minHeight: 50,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  choiceRowSelected: {
    backgroundColor: colors.pine50,
  },
  choiceLeading: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  choiceIcon: {
    width: 28,
    height: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radii.control,
    backgroundColor: colors.fieldFill,
  },
  choiceLabel: {
    flex: 1,
    minWidth: 0,
  },
  choiceMeta: {
    color: colors.pine700,
  },
  checkSlot: {
    width: 22,
    alignItems: 'flex-end' as const,
  },
  taskHeader: {
    minHeight: 56,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  actionSlot: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  taskTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  guidanceCard: {
    width: 260,
  },
};
