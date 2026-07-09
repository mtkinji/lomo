import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, radii, spacing } from '../../../src/theme';
import { Badge } from '../../../src/ui/Badge';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { Input } from '../../../src/ui/Input';
import { KwiltSwitch } from '../../../src/ui/KwiltSwitch';
import { SegmentedControl } from '../../../src/ui/SegmentedControl';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Primitives/Candidates',
  parameters: {
    docs: {
      description: {
        component:
          'Candidate primitives for a future @kwilt/ui-native package. Goals is the likely source for most general components; Money is the likely source for the switch pattern.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {
  render: () => (
    <StoryFrame
      title="Card"
      description="Goals candidate. The shared package should inherit radius, surface, padding, and elevation from token contracts."
    >
      <StoryGrid>
        <Card style={{ width: 300 }}>
          <StoryStack>
            <Heading variant="sm">Default card</Heading>
            <Text tone="secondary">
              Current shared surface behavior: white card, soft border, tokenized radius, soft elevation.
            </Text>
            <Badge variant="secondary">Promote Goals</Badge>
          </StoryStack>
        </Card>

        <Card padding="sm" elevation="none" style={{ width: 300 }}>
          <StoryStack>
            <Heading variant="sm">Flat compact card</Heading>
            <Text tone="secondary">
              Useful for denser Money surfaces if the same primitive supports tighter variants.
            </Text>
            <Badge variant="outline">Needs Money density check</Badge>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

export const Buttons: Story = {
  render: () => (
    <StoryFrame
      title="Button"
      description="Goals candidate. Money should probably inherit the anatomy but keep product-specific color roles."
    >
      <StoryGrid>
        {(['cta', 'primary', 'secondary', 'outline', 'ghost', 'link', 'ai', 'inverse', 'destructive', 'turmeric'] as const).map(
          (variant) => (
            <Specimen key={variant} label={variant}>
              <View
                style={{
                  minHeight: 70,
                  justifyContent: 'center',
                  borderRadius: radii.compactCard,
                  backgroundColor: variant === 'inverse' ? colors.pine700 : 'transparent',
                  padding: spacing.sm,
                }}
              >
                <Button variant={variant} onPress={() => undefined}>
                  {variant === 'ai' ? 'Ask Kwilt' : 'Continue'}
                </Button>
              </View>
            </Specimen>
          ),
        )}
      </StoryGrid>
    </StoryFrame>
  ),
};

function InteractiveControlsStory() {
  const [enabled, setEnabled] = useState(true);
  const [range, setRange] = useState<'month' | 'year' | 'all'>('month');

  return (
    <StoryFrame
      title="Switch and SegmentedControl"
      description="Switch leans Money. SegmentedControl leans Goals. Both need to feel natural in settings and dense review surfaces."
    >
      <StoryGrid>
        <Specimen label="KwiltSwitch">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <KwiltSwitch
              accessibilityLabel="Demo switch"
              value={enabled}
              onPress={() => setEnabled((current) => !current)}
            />
            <Text>{enabled ? 'Enabled' : 'Disabled'}</Text>
          </View>
        </Specimen>

        <Specimen label="SegmentedControl">
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
              { value: 'all', label: 'All' },
            ]}
          />
          <Text tone="secondary">Selected: {range}</Text>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  );
}

export const Controls: Story = {
  render: () => <InteractiveControlsStory />,
};

export const InputsAndBadges: Story = {
  render: () => (
    <StoryFrame
      title="Input and Badge"
      description="Goals candidate. Badges are useful but may need softer Money variants before promotion."
    >
      <StoryGrid>
        <Specimen label="Input variants">
          <StoryStack>
            <Input label="Goal name" placeholder="Finish the school packet" />
            <Input label="Amount" placeholder="$600" variant="filled" size="sm" />
            <Input
              label="Notes"
              placeholder="What should Kwilt remember?"
              multiline
              multilineMinHeight={76}
            />
          </StoryStack>
        </Specimen>

        <Specimen label="Badge variants">
          <StoryGrid>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </StoryGrid>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};
