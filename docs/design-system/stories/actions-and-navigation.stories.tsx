import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { ActionDock } from '../../../src/ui/ActionDock';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { HeaderActionPill, ObjectPageHeader } from '../../../src/ui/layout/ObjectPageHeader';
import { Icon } from '../../../src/ui/Icon';
import { KeyActionsRow } from '../../../src/ui/KeyActionsRow';
import { StreakCapsule } from '../../../src/ui/StreakCapsule';
import { Heading, Text } from '../../../src/ui/Typography';
import { StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Navigation/Actions',
  parameters: {
    docs: {
      description: {
        component:
          'Action and navigation surfaces from Goals. These need maturity review for hit targets, focus behavior, safe areas, and state completeness.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionSurfaces: Story = {
  render: () => (
    <StoryFrame
      title="Action Surfaces"
      description="Goals reference patterns for key actions, streak affordances, and floating docks."
    >
      <StoryGrid>
        <Card style={styles.actionCard}>
          <StoryStack>
            <Badge variant="secondary">KeyActionsRow</Badge>
            <KeyActionsRow
              items={[
                {
                  id: 'calendar',
                  icon: 'calendar',
                  label: 'Schedule',
                  accessibilityHint: 'Choose a time for this activity.',
                  onPress: () => undefined,
                },
                {
                  id: 'share',
                  icon: 'share',
                  label: 'Share',
                  onPress: () => undefined,
                },
                {
                  id: 'ai',
                  icon: 'sparkles',
                  label: 'Ask Kwilt',
                  tileBackgroundColor: colors.aiGradientStart,
                  tileBorderColor: colors.aiBorder,
                  tileLabelColor: colors.aiForeground,
                  iconColor: colors.aiForeground,
                  onPress: () => undefined,
                },
              ]}
            />
          </StoryStack>
        </Card>

        <Card style={styles.actionCard}>
          <StoryStack>
            <Badge variant="secondary">StreakCapsule</Badge>
            <View style={styles.row}>
              <StreakCapsule streakCount={12} shieldCount={2} showedUpToday onPress={() => undefined} />
              <StreakCapsule streakCount={4} shieldCount={0} showedUpToday={false} repairWindowActive onPress={() => undefined} />
            </View>
          </StoryStack>
        </Card>

        <View style={styles.phoneStage}>
          <ActionDock
            insetX={18}
            insetBottom={18}
            safeAreaLift="none"
            leftItems={[
              { id: 'filter', icon: 'funnel', accessibilityLabel: 'Filter', onPress: () => undefined },
              { id: 'sort', icon: 'sort', accessibilityLabel: 'Sort', onPress: () => undefined },
            ]}
            rightItem={{
              id: 'add',
              icon: 'plus',
              accessibilityLabel: 'Add activity',
              onPress: () => undefined,
            }}
            rightItemProgress={0.65}
          />
        </View>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const HeaderActions: Story = {
  render: () => (
    <StoryFrame
      title="ObjectPageHeader"
      description="Reference for object-page navigation. Mature through safe-area behavior, material variants, grouped actions, and reduced-motion scroll transitions."
    >
      <StoryGrid>
        <View style={styles.headerStage}>
          <ObjectPageHeader
            safeAreaTopInset={12}
            horizontalPadding={16}
            blurBackground
            left={
              <HeaderActionPill
                accessibilityLabel="Go back"
                materialVariant="onLight"
                onPress={() => undefined}
              >
                <Icon name="arrowLeft" size={18} color={colors.textPrimary} />
              </HeaderActionPill>
            }
            center={
              <View style={styles.headerCenterPill}>
                <Icon name="goals" size={14} color={colors.textSecondary} />
                <Text variant="label" tone="secondary">
                  Goal
                </Text>
              </View>
            }
            right={
              <View style={styles.row}>
                <HeaderActionPill
                  accessibilityLabel="Share"
                  materialVariant="onLight"
                  onPress={() => undefined}
                >
                  <Icon name="share" size={17} color={colors.textPrimary} />
                </HeaderActionPill>
                <HeaderActionPill
                  accessibilityLabel="More actions"
                  materialVariant="onLight"
                  onPress={() => undefined}
                >
                  <Icon name="more" size={17} color={colors.textPrimary} />
                </HeaderActionPill>
              </View>
            }
          />
          <View style={styles.headerContent}>
            <Heading variant="md">Practice the five-minute reset</Heading>
            <Text tone="secondary">
              The header floats above object content and should preserve stable touch targets while
              scroll-linked materials change underneath.
            </Text>
          </View>
        </View>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="outline">Maturity questions</Badge>
            <Heading variant="sm">These are pattern candidates, not generic primitives yet.</Heading>
            <Text tone="secondary">
              Header pills and docks need exact safe-area, keyboard, focus, and state contracts before
              extraction. Storybook should prove those states before promotion.
            </Text>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = {
  actionCard: {
    width: 360,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  phoneStage: {
    width: 390,
    height: 420,
    position: 'relative' as const,
    borderRadius: 34,
    backgroundColor: colors.shell,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerStage: {
    width: 390,
    height: 300,
    position: 'relative' as const,
    borderRadius: 28,
    backgroundColor: colors.canvas,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerContent: {
    paddingTop: 92,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  headerCenterPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  guidanceCard: {
    width: 320,
  },
};
