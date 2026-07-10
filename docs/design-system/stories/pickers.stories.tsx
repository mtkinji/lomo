import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, radii, spacing } from '../../../src/theme';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { Icon } from '../../../src/ui/Icon';
import { Input } from '../../../src/ui/Input';
import { EnumPickerField, RelationPickerField, type PickerFieldOption } from '../../../src/ui/PickerFields';
import { Heading, Text } from '../../../src/ui/Typography';
import { StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Forms/Pickers',
  parameters: {
    docs: {
      description: {
        component:
          'Picker trigger and selection-surface guidance. Goals is the canonical source for picker triggers; Money can influence category-specific drawer content.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const categoryOptions: PickerFieldOption[] = [
  { value: 'income', label: 'Income', leftElement: <Icon name="trendUp" size={16} color={colors.pine700} /> },
  { value: 'internal-transfer', label: 'Internal transfer', leftElement: <Icon name="arrowDown" size={16} color={colors.pine700} /> },
  { value: 'uncategorized', label: 'No budget category', leftElement: <Icon name="close" size={16} color={colors.pine700} /> },
  { value: 'housing', label: 'Housing', leftElement: <Text>🏠</Text> },
  { value: 'shopping', label: 'Shopping', leftElement: <Text>🛍️</Text> },
  { value: 'groceries', label: 'Groceries', leftElement: <Text>🥬</Text> },
];

const arcOptions: PickerFieldOption[] = [
  { value: 'steady-keeper', label: 'The Steady Keeper', subtitle: 'Protecting attention and presence.' },
  { value: 'visible-maker', label: 'The Visible Maker', subtitle: 'Making one idea real enough to share.' },
  { value: 'patient-parent', label: 'The Patient Parent', subtitle: 'Practicing steadiness at home.' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" tone="secondary">
      {children}
    </Text>
  );
}

function GoalsPickerTriggerCard() {
  const [category, setCategory] = React.useState('income');
  const [arc, setArc] = React.useState('steady-keeper');

  return (
    <Card style={styles.exampleCard}>
      <StoryStack>
        <Badge variant="secondary">Canonical</Badge>
        <Heading variant="sm">Goals picker trigger</Heading>
        <Text tone="secondary">
          Use this closed-field grammar across apps. The app can still choose the right open surface.
        </Text>
        <View style={styles.formStack}>
          <View style={styles.fieldStack}>
            <FieldLabel>Category</FieldLabel>
            <EnumPickerField
              value={category}
              onValueChange={setCategory}
              options={categoryOptions}
              title="Choose category"
              placeholder="Choose category"
              accessibilityLabel="Choose category"
              allowDeselect={false}
              leadingIcon="tag"
            />
          </View>
          <View style={styles.fieldStack}>
            <FieldLabel>Arc</FieldLabel>
            <RelationPickerField
              value={arc}
              onValueChange={setArc}
              options={arcOptions}
              title="Choose Arc"
              placeholder="Choose Arc"
              accessibilityLabel="Choose Arc"
              searchPlaceholder="Search Arcs"
              allowDeselect={false}
              leadingIcon="arcs"
            />
          </View>
        </View>
      </StoryStack>
    </Card>
  );
}

function MoneyCurrentTriggerCard() {
  return (
    <Card style={styles.exampleCard}>
      <StoryStack>
        <Badge variant="outline">Reference</Badge>
        <Heading variant="sm">Money category field</Heading>
        <Text tone="secondary">
          The content is useful, but the trigger shape should converge with Goals before becoming shared.
        </Text>
        <View style={styles.fieldStack}>
          <FieldLabel>Category</FieldLabel>
          <View style={styles.moneyField}>
            <Text style={styles.moneyFieldValue}>Income</Text>
            <View style={styles.moneyFieldButton}>
              <Icon name="chevronDown" size={18} color={colors.textSecondary} />
            </View>
          </View>
        </View>
      </StoryStack>
    </Card>
  );
}

function AvoidedVariantCard() {
  return (
    <Card style={styles.exampleCard}>
      <StoryStack>
        <Badge variant="outline">Avoid</Badge>
        <Heading variant="sm">Drawer-only redesign</Heading>
        <Text tone="secondary">
          A new drawer style is not enough if the trigger remains bespoke. Judge generated variants against the full picker contract.
        </Text>
        <View style={styles.fieldStack}>
          <FieldLabel>Category</FieldLabel>
          <View style={styles.avoidField}>
            <View style={styles.avoidLeading}>
              <View style={styles.avoidIcon}>
                <Icon name="trendUp" size={16} color={colors.pine700} />
              </View>
              <View style={{ minWidth: 0 }}>
                <Text variant="label">Income</Text>
                <Text tone="secondary" numberOfLines={1}>
                  Deposit received
                </Text>
              </View>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textSecondary} />
          </View>
        </View>
      </StoryStack>
    </Card>
  );
}

export const TriggerTaxonomy: Story = {
  render: () => (
    <StoryFrame
      title="Picker Trigger Taxonomy"
      description="The closed picker field should be canonical before the drawer is canonical. Goals is the baseline; Money contributes finance-specific option content."
    >
      <StoryGrid>
        <GoalsPickerTriggerCard />
        <MoneyCurrentTriggerCard />
        <AvoidedVariantCard />
      </StoryGrid>
    </StoryFrame>
  ),
};

export const Guidance: Story = {
  render: () => (
    <StoryFrame
      title="Picker Extraction Rule"
      description="Promote the trigger first, then add selection surfaces by list size and task."
    >
      <StoryGrid>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="secondary">Share</Badge>
            <Heading variant="sm">Trigger grammar</Heading>
            <Text tone="secondary">
              Outside label, selected value, optional leading icon, trailing affordance, clear state, disabled state, and open/focus state.
            </Text>
          </StoryStack>
        </Card>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="secondary">Share</Badge>
            <Heading variant="sm">Selection surfaces</Heading>
            <Text tone="secondary">
              Fixed-set drawer, searchable choice drawer, and full-screen relation picker. Choose by list size and search need.
            </Text>
          </StoryStack>
        </Card>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="outline">Keep local</Badge>
            <Heading variant="sm">Domain intelligence</Heading>
            <Text tone="secondary">
              Category suggestions, transaction meanings, rule hints, goal relationships, and app-specific ordering.
            </Text>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = {
  exampleCard: {
    width: 320,
  },
  guidanceCard: {
    width: 280,
  },
  formStack: {
    gap: spacing.lg,
  },
  fieldStack: {
    gap: spacing.xs,
  },
  moneyField: {
    minHeight: 60,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.control,
    backgroundColor: colors.card,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  moneyFieldValue: {
    fontWeight: '800' as const,
    color: colors.textPrimary,
  },
  moneyFieldButton: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radii.control,
    backgroundColor: colors.fieldFill,
  },
  avoidField: {
    minHeight: 64,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    backgroundColor: colors.pine50,
    paddingHorizontal: spacing.md,
  },
  avoidLeading: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  avoidIcon: {
    width: 32,
    height: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radii.control,
    backgroundColor: colors.card,
  },
};
