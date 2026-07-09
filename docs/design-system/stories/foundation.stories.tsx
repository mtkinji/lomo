import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../src/theme';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Foundation/Tokens',
  parameters: {
    docs: {
      description: {
        component:
          'Shared Kwilt foundation tokens. These are the values that should propagate into Goals, Money, desktop, and later extracted packages.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const colorTokens = [
  ['pine700', colors.pine700, 'Goals field / primary'],
  ['pine900', colors.pine900, 'Deep focus field'],
  ['indigo700', colors.indigo700, 'Money field candidate'],
  ['turmeric500', colors.turmeric500, 'Meaning accent'],
  ['madder600', colors.madder600, 'Earth alert'],
  ['quiltBlue', colors.quiltBlue, 'Supporting family color'],
] as const;

export const Palette: Story = {
  render: () => (
    <StoryFrame
      title="Palette"
      description="Color roles should identify product family, attention, and meaning without turning every app into the same green UI."
    >
      <StoryGrid>
        {colorTokens.map(([name, value, description]) => (
          <Specimen key={name} label={name}>
            <View
              style={{
                height: 72,
                borderRadius: radii.compactCard,
                backgroundColor: value,
              }}
            />
            <Text tone="secondary">{description}</Text>
            <Text>{value}</Text>
          </Specimen>
        ))}
      </StoryGrid>
    </StoryFrame>
  ),
};

const radiusTokens = [
  ['control', radii.control],
  ['input', radii.input],
  ['compactCard', radii.compactCard],
  ['card', radii.card],
  ['sheet', radii.sheet],
] as const;

export const Radii: Story = {
  render: () => (
    <StoryFrame
      title="Radii"
      description="Card radius propagation is the first proof that apps get shared changes only when they import shared contracts."
    >
      <StoryGrid>
        {radiusTokens.map(([name, value]) => (
          <Specimen key={name} label={name}>
            <View
              style={{
                width: 120,
                height: 72,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: value,
                backgroundColor: colors.pine50,
              }}
            />
            <Text>{value}px</Text>
          </Specimen>
        ))}
      </StoryGrid>
    </StoryFrame>
  ),
};

export const Typography: Story = {
  render: () => (
    <StoryFrame
      title="Typography"
      description="Core type tokens from the app theme. This is where Goals and Money should stay visibly related."
    >
      <StoryStack>
        <Heading variant="xl">titleXl: Make progress on what matters.</Heading>
        <Heading variant="lg">titleLg: Review the monthly runway.</Heading>
        <Heading variant="md">titleMd: Shared component decisions.</Heading>
        <Heading variant="sm">titleSm: Settings and grouped surfaces.</Heading>
        <Text variant="body">body: Calm, direct product copy for normal app surfaces.</Text>
        <Text variant="bodySm" tone="secondary">
          bodySm: Secondary context for cards, settings rows, and small explanatory states.
        </Text>
        <Text style={typography.label} tone="muted">
          LABEL: CATEGORY AND STATE TEXT
        </Text>
      </StoryStack>
    </StoryFrame>
  ),
};

export const Spacing: Story = {
  render: () => (
    <StoryFrame
      title="Spacing"
      description="A small spacing scale is easier to preserve across app and package boundaries."
    >
      <StoryStack>
        {Object.entries(spacing).map(([name, value]) => (
          <View key={name} style={{ gap: spacing.xs }}>
            <Text variant="label" tone="secondary">
              {name}: {value}
            </Text>
            <View
              style={{
                width: value * 5,
                maxWidth: 260,
                height: 14,
                borderRadius: radii.pill,
                backgroundColor: colors.pine700,
              }}
            />
          </View>
        ))}
      </StoryStack>
    </StoryFrame>
  ),
};
