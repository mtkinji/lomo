import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { ArcListCard } from '../../../src/ui/ArcListCard';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { GoalCard } from '../../../src/ui/GoalCard';
import { GoalPill } from '../../../src/ui/GoalPill';
import { ObjectTypeIconBadge } from '../../../src/ui/ObjectTypeIconBadge';
import { OverlappingAvatarStack } from '../../../src/ui/OverlappingAvatarStack';
import { ProfileAvatar } from '../../../src/ui/ProfileAvatar';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Objects/Cards And Identity',
  parameters: {
    docs: {
      description: {
        component:
          'Object and identity components from Goals. These are mostly local references today, but they expose useful atoms for shared-card maturity.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const demoArc = {
  id: 'arc-story-steady-parent',
  name: 'The Steady Parent',
  narrative:
    'You are practicing a calmer pattern at home: fewer reactive moments, more clear repairs, and a steadier way back after rough evenings.',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  thumbnailVariant: undefined,
  heroImageUrl: null,
  heroHidden: false,
} as any;

export const IdentityAtoms: Story = {
  render: () => (
    <StoryFrame
      title="Identity Atoms"
      description="ProfileAvatar and object badges are small, reusable atoms. Mature them around fallback labels, deterministic colors, and contrast."
    >
      <StoryGrid>
        <Specimen label="ProfileAvatar sizes">
          <View style={styles.row}>
            <ProfileAvatar name="Sarah Kim" size={32} />
            <ProfileAvatar name="Marcus Rivera" size={44} />
            <ProfileAvatar name="Nina Patel" size={56} />
            <ProfileAvatar size={44} />
          </View>
        </Specimen>
        <Specimen label="OverlappingAvatarStack">
          <OverlappingAvatarStack
            size={32}
            avatars={[
              { id: '1', name: 'Sarah Kim' },
              { id: '2', name: 'Marcus Rivera' },
              { id: '3', name: 'David Chen' },
              { id: '4', name: 'Nina Patel' },
              { id: '5', name: 'Elena Morris' },
            ]}
          />
        </Specimen>
        <Specimen label="ObjectTypeIconBadge tones">
          <View style={styles.row}>
            <ObjectTypeIconBadge iconName="arcs" tone="arc" />
            <ObjectTypeIconBadge iconName="goals" tone="goal" />
            <ObjectTypeIconBadge iconName="activity" tone="activity" />
            <ObjectTypeIconBadge iconName="chapters" tone="chapter" />
            <ObjectTypeIconBadge iconName="settings" tone="settings" />
          </View>
        </Specimen>
        <Specimen label="GoalPill">
          <View style={{ maxWidth: 260 }}>
            <GoalPill title="Finish the school packet before Friday" />
          </View>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const ObjectCards: Story = {
  render: () => (
    <StoryFrame
      title="Object Cards"
      description="GoalCard and ArcListCard should stay domain-local for now, but they are reference material for the canonical Card anatomy."
    >
      <StoryGrid>
        <View style={{ width: 340 }}>
          <ArcListCard arc={demoArc} goalCount={3} />
        </View>
        <View style={{ width: 340 }}>
          <GoalCard
            title="Practice the five-minute reset"
            subtitle="The Steady Parent"
            body="After dinner, pause before cleanup and ask what would make tomorrow morning easier."
            metaLeft="This week"
            metaRight="Presence 2/3"
            priority={1}
            onPress={() => undefined}
          />
        </View>
        <Card style={styles.guidanceCard}>
          <StoryStack>
            <Badge variant="outline">Maturity questions</Badge>
            <Heading variant="sm">Promote anatomy before domain cards.</Heading>
            <Text tone="secondary">
              A canonical card system should cover media slots, title/subtitle/body, meta rows,
              action rows, selected/pressed states, and density. Arc and Goal semantics should stay
              in the app until another Kwilt app needs the same object grammar.
            </Text>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  guidanceCard: {
    width: 320,
  },
};
