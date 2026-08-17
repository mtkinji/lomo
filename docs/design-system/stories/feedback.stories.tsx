import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { Badge } from '../../../src/ui/Badge';
import { EmptyState } from '../../../src/ui/EmptyState';
import { Toast } from '../../../src/ui/Toast';
import { KwiltLoader } from '../../../src/ui/KwiltLoader';
import { Heading, Text } from '../../../src/ui/Typography';
import { Card } from '../../../src/ui/Card';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Feedback/States',
  parameters: {
    docs: {
      description: {
        component:
          'Feedback and system-state components that should be matured before promotion: empty states, transient messages, and status badges.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <StoryFrame
      title="KwiltLoader"
      description="Canonical progress mark. Callers may choose a semantic color and size, but own the surrounding surface, copy, and error state."
    >
      <StoryGrid>
        <Specimen label="inline">
          <View style={styles.loaderSpecimen}>
            <KwiltLoader size="small" />
          </View>
        </Specimen>
        <Specimen label="surface">
          <View style={styles.loaderSpecimen}>
            <KwiltLoader size={32} />
          </View>
        </Specimen>
        <Specimen label="inverse">
          <View style={[styles.loaderSpecimen, styles.inverseLoaderSpecimen]}>
            <KwiltLoader color={colors.parchment} size="large" />
          </View>
        </Specimen>
        <Specimen label="pull watermark">
          <View style={styles.loaderSpecimen}>
            <KwiltLoader phase="idle" size={50} />
          </View>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <StoryFrame
      title="EmptyState"
      description="Goals candidate. Mature it by proving density, action slots, illustration/icon fallback, and screen-reader copy."
    >
      <StoryGrid>
        <Specimen label="screen">
          <View style={styles.emptySpecimen}>
            <EmptyState
              variant="screen"
              iconName="inbox"
              title="Nothing planned yet"
              instructions="Add one next action so Kwilt knows what to keep in view."
              primaryAction={{ label: 'Add action', onPress: () => undefined }}
            />
          </View>
        </Specimen>
        <Specimen label="list">
          <View style={styles.emptySpecimen}>
            <EmptyState
              variant="list"
              iconName="goals"
              title="No goals here"
              instructions="Try another filter or create a goal for this Arc."
              primaryAction={{ label: 'Create goal', onPress: () => undefined }}
              secondaryAction={{ label: 'Clear filter', onPress: () => undefined }}
            />
          </View>
        </Specimen>
        <Specimen label="compact">
          <View style={styles.emptySpecimen}>
            <EmptyState
              variant="compact"
              illustration={null}
              iconName="calendar"
              title="No sessions"
              instructions="Schedule a small block when you are ready."
            />
          </View>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const Toasts: Story = {
  render: () => (
    <StoryFrame
      title="Toast"
      description="Goals candidate. Mature with action behavior, dismiss affordance, reduced-motion handling, and announcement semantics."
    >
      <StoryStack>
        <View style={styles.toastStage}>
          {(['default', 'success', 'warning', 'danger', 'credits', 'light'] as const).map(
            (variant, index) => (
              <View
                key={variant}
                style={[
                  styles.toastSlot,
                  { top: spacing.md + index * 58 },
                ]}
              >
                <Toast
                  visible
                  bottomOffset={0}
                  variant={variant}
                  message={
                    variant === 'credits'
                      ? 'AI credits refreshed'
                      : variant === 'danger'
                        ? 'Could not save changes'
                        : `${variant[0].toUpperCase()}${variant.slice(1)} message`
                  }
                  actionLabel={variant === 'default' ? 'Undo' : undefined}
                  onPressAction={variant === 'default' ? () => undefined : undefined}
                />
              </View>
            ),
          )}
        </View>
        <Card elevation="none">
          <StoryStack>
            <Badge variant="outline">Maturity questions</Badge>
            <Heading variant="sm">Toast is visually complete, but not yet fully specified.</Heading>
            <Text tone="secondary">
              Before promotion, define announcement behavior, action timing, queue behavior, max
              message length, and whether Money needs a calmer finance-specific success tone.
            </Text>
          </StoryStack>
        </Card>
      </StoryStack>
    </StoryFrame>
  ),
};

const styles = {
  loaderSpecimen: {
    width: 120,
    height: 88,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  inverseLoaderSpecimen: {
    backgroundColor: colors.sumi900,
  },
  emptySpecimen: {
    width: 300,
    minHeight: 300,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  toastStage: {
    width: 560,
    maxWidth: '100%' as const,
    height: 380,
    position: 'relative' as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden' as const,
  },
  toastSlot: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 52,
  },
};
