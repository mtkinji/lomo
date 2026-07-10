import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { colors, radii, spacing, typography } from '../../../src/theme';
import { Badge } from '../../../src/ui/Badge';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const goalSet = imageSource('../../../assets/illustrations/goal-set.png');
const welcome = imageSource('../../../assets/illustrations/welcome.png');
const aspirations = imageSource('../../../assets/illustrations/aspirations.png');
const notifications = imageSource('../../../assets/illustrations/notifications.png');
const empty = imageSource('../../../assets/illustrations/empty.png');

const meta = {
  title: 'Illustration/Goals Styles',
  parameters: {
    docs: {
      description: {
        component:
          'Kwilt Goals illustration references for onboarding, celebration, and empty-state surfaces. These are design-system guidance assets, not shared primitives yet.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function imageSource(path: string): ImageSourcePropType {
  return { uri: new URL(path, import.meta.url).href };
}

const illustrationSpecs = [
  {
    id: 'goal-set',
    title: 'Goal set',
    role: 'Moment hero',
    source: goalSet,
    dimensions: '534 x 680',
    guidance: 'Use for first-goal creation and other high-encouragement moments.',
  },
  {
    id: 'welcome',
    title: 'Welcome',
    role: 'Onboarding hero',
    source: welcome,
    dimensions: '748 x 656',
    guidance: 'Use when introducing Kwilt as the calm place to name what matters.',
  },
  {
    id: 'aspirations',
    title: 'Aspirations',
    role: 'Path-setting hero',
    source: aspirations,
    dimensions: '681 x 656',
    guidance: 'Use for planning, path, and future-self setup moments.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    role: 'Permission hero',
    source: notifications,
    dimensions: '596 x 712',
    guidance: 'Use for reminder and notification setup. Give it extra width in narrow frames.',
  },
  {
    id: 'empty',
    title: 'Empty state',
    role: 'Utility spot',
    source: empty,
    dimensions: '496 x 624',
    guidance: 'Use for empty lists and quiet recovery states when an icon would feel too bare.',
  },
] as const;

export const Catalog: Story = {
  render: () => (
    <StoryFrame
      title="Goals Illustration Catalog"
      description="Goals illustrations use soft handmade textures, rounded organic objects, calm character scenes, and one clear narrative action per surface."
    >
      <StoryGrid>
        {illustrationSpecs.map((illustration) => (
          <Specimen key={illustration.id} label={illustration.role}>
            <View style={styles.catalogImageSlot}>
              <Image
                source={illustration.source}
                style={styles.catalogImage}
                resizeMode="contain"
                accessibilityLabel={`${illustration.title} illustration`}
              />
            </View>
            <StoryStack>
              <View style={styles.catalogHeading}>
                <Heading variant="sm">{illustration.title}</Heading>
                <Badge variant={illustration.role === 'Moment hero' ? 'info' : 'secondary'}>
                  {illustration.dimensions}
                </Badge>
              </View>
              <Text tone="secondary">{illustration.guidance}</Text>
            </StoryStack>
          </Specimen>
        ))}
      </StoryGrid>
    </StoryFrame>
  ),
};

export const SurfaceScale: Story = {
  render: () => (
    <StoryFrame
      title="Surface Scale"
      description="Illustrations should scale with the emotional weight of the surface: largest for full-screen moments, smaller for onboarding steps, smallest for utility empty states."
    >
      <StoryGrid>
        <View style={styles.phoneMoment}>
          <Text style={styles.momentBadge}>Goal created</Text>
          <Heading style={styles.momentTitle}>Nice work.</Heading>
          <Text style={styles.momentBody}>
            Your next step is simple: add a couple of to-dos so you always know what to do next.
          </Text>
          <View style={styles.momentMediaSlot}>
            <Image
              source={goalSet}
              style={styles.momentImage}
              resizeMode="contain"
              accessibilityLabel="Goal created illustration example"
            />
          </View>
          <View style={styles.momentButton}>
            <Text style={styles.momentButtonLabel}>Continue</Text>
          </View>
        </View>

        <View style={styles.referenceColumn}>
          <View style={styles.onboardingPanel}>
            <View style={styles.onboardingMediaSlot}>
              <Image
                source={aspirations}
                style={styles.onboardingImage}
                resizeMode="contain"
                accessibilityLabel="Onboarding illustration example"
              />
            </View>
            <Heading variant="sm">Shape the next season.</Heading>
            <Text tone="secondary">
              Onboarding illustrations can carry the idea, but copy and controls still need the
              clearest hierarchy.
            </Text>
          </View>

          <View style={styles.emptyPanel}>
            <Image
              source={empty}
              style={styles.emptyImage}
              resizeMode="contain"
              accessibilityLabel="Empty state illustration example"
            />
            <View style={styles.emptyCopy}>
              <Heading variant="sm">No to-dos yet</Heading>
              <Text tone="secondary">
                Use smaller spot art for quiet utility states so the screen still feels calm.
              </Text>
            </View>
          </View>
        </View>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const StyleRules: Story = {
  render: () => (
    <StoryFrame
      title="Style Rules"
      description="Use this as the first pass for deciding whether a new illustration belongs in the Kwilt Goals family."
    >
      <StoryGrid>
        <Specimen label="Composition">
          <StoryStack>
            <Heading variant="sm">One scene, one action.</Heading>
            <Text tone="secondary">
              Prefer a single human-scale scene with a clear task, signal, or invitation. Avoid
              collage-like collections of disconnected symbols.
            </Text>
          </StoryStack>
        </Specimen>

        <Specimen label="Color">
          <StoryStack>
            <Heading variant="sm">Earthy but not monotone.</Heading>
            <Text tone="secondary">
              Keep pine, quilt blue, turmeric, clay, and warm neutrals in play. Saturated accents
              should support the scene, not become the product UI.
            </Text>
          </StoryStack>
        </Specimen>

        <Specimen label="Rendering">
          <StoryStack>
            <Heading variant="sm">Soft texture, clean edges.</Heading>
            <Text tone="secondary">
              The current assets use gentle grain, soft shadow, rounded shapes, and approachable
              characters. Do not add photorealistic, glossy, or corporate-vector art to this set.
            </Text>
          </StoryStack>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = StyleSheet.create({
  catalogImageSlot: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.compactCard,
    backgroundColor: colors.sumi50,
    overflow: 'hidden',
  },
  catalogImage: {
    width: '86%',
    height: '86%',
  },
  catalogHeading: {
    gap: spacing.xs,
  },
  phoneMoment: {
    width: 330,
    minHeight: 620,
    justifyContent: 'space-between',
    borderRadius: radii.sheet,
    backgroundColor: colors.indigo,
    padding: spacing.lg,
  },
  momentBadge: {
    ...typography.label,
    color: 'rgba(250,247,237,0.74)',
  },
  momentTitle: {
    ...typography.titleXl,
    color: colors.parchment,
    marginTop: spacing.sm,
  },
  momentBody: {
    ...typography.body,
    color: 'rgba(250,247,237,0.78)',
    marginTop: spacing.sm,
  },
  momentMediaSlot: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentImage: {
    width: '100%',
    maxWidth: 300,
    height: 300,
  },
  momentButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    backgroundColor: colors.parchment,
  },
  momentButtonLabel: {
    ...typography.bodyBold,
    color: colors.indigo,
  },
  referenceColumn: {
    width: 360,
    gap: spacing.md,
  },
  onboardingPanel: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  onboardingMediaSlot: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.compactCard,
    backgroundColor: colors.quiltBlue100,
  },
  onboardingImage: {
    width: '94%',
    height: '94%',
  },
  emptyPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  emptyImage: {
    width: 96,
    height: 96,
  },
  emptyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
