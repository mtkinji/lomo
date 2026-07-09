import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, radii, spacing } from '../../../src/theme';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
  SettingsToggleRow,
} from '../../../src/ui/SettingsSurface';
import { Badge } from '../../../src/ui/Badge';
import { Heading, Text } from '../../../src/ui/Typography';
import { StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Settings/Patterns',
  parameters: {
    docs: {
      description: {
        component:
          'Settings rows and groups are likely hybrid components: share row anatomy, keep whole settings pages local to each app shell.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SettingsCandidateStory() {
  const [privacyLock, setPrivacyLock] = useState(true);
  const [screenTime, setScreenTime] = useState(false);

  return (
    <StoryFrame
      title="Settings Group"
      description="This should become a shared primitive cluster before extracting full settings pages."
    >
      <StoryGrid>
        <View style={{ width: 360, gap: spacing.md }}>
          <SettingsGroup
            title="Protection"
            footer="Share rows, dividers, toggle rows, and row text behavior. Keep navigation local."
          >
            <SettingsToggleRow
              title="Privacy lock"
              enabled={privacyLock}
              onPress={() => setPrivacyLock((current) => !current)}
            />
            <SettingsDivider />
            <SettingsToggleRow
              title="Screen Time controls"
              enabled={screenTime}
              onPress={() => setScreenTime((current) => !current)}
            />
            <SettingsDivider />
            <SettingsRow title="Monthly amount" value="$600" onPress={() => undefined} />
          </SettingsGroup>
        </View>

        <View
          style={{
            width: 360,
            gap: spacing.md,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: radii.card,
            backgroundColor: colors.card,
            padding: spacing.lg,
          }}
        >
          <Badge variant="secondary">Extraction rule</Badge>
          <StoryStack>
            <Heading variant="sm">Promote the row grammar, not the page shell.</Heading>
            <Text tone="secondary">
              Goals and Money can share settings groups, rows, dividers, and toggle rows. Header,
              navigation, scroll behavior, and product-specific sections should remain app-local until
              repeated across both apps.
            </Text>
          </StoryStack>
        </View>
      </StoryGrid>
    </StoryFrame>
  );
}

export const SettingsGroupCandidate: Story = {
  render: () => <SettingsCandidateStory />,
};
