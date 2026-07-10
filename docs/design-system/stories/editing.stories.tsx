import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { AiAutofillBadge } from '../../../src/ui/AiAutofillBadge';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { EditableField } from '../../../src/ui/EditableField';
import { Input } from '../../../src/ui/Input';
import { Toolbar, ToolbarButton, ToolbarGroup } from '../../../src/ui/Toolbar';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Forms/Editing',
  parameters: {
    docs: {
      description: {
        component:
          'Text-entry and editing candidates. These should mature around field anatomy, error states, AI affordances, and keyboard behavior.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function EditableFieldSpecimen() {
  const [title, setTitle] = useState('Become the calm parent in the room');
  const [note, setNote] = useState('A compact inline field for details.');

  return (
    <StoryGrid>
      <Specimen label="EditableField variants">
        <View style={styles.fieldColumn}>
          <EditableField
            label="Title"
            value={title}
            onChange={setTitle}
            variant="title"
            elevation="flat"
          />
          <EditableField
            label="Note"
            value={note}
            onChange={setNote}
            variant="body"
            validate={(next) => (next.trim().length < 4 ? 'Use a little more detail.' : null)}
          />
          <EditableField
            label="Locked"
            value="Synced from calendar"
            onChange={() => undefined}
            variant="meta"
            disabled
          />
        </View>
      </Specimen>
      <Specimen label="Input with AI slot">
        <StoryStack>
          <Input
            label="Goal name"
            placeholder="Name the concrete thing"
            trailingElement={
              <AiAutofillBadge
                accessibilityLabel="Suggest goal name"
                onPress={() => undefined}
              />
            }
          />
          <Input
            label="Error"
            value=""
            placeholder="Required"
            errorText="Add a name before continuing."
          />
          <Input
            label="Disabled"
            value="Imported from shared goal"
            editable={false}
          />
        </StoryStack>
      </Specimen>
    </StoryGrid>
  );
}

export const TextFields: Story = {
  render: () => (
    <StoryFrame
      title="Text Fields"
      description="Input is a primitive candidate; EditableField is an inline editing candidate that needs a clearer canonical contract."
    >
      <EditableFieldSpecimen />
    </StoryFrame>
  ),
};

export const Toolbars: Story = {
  render: () => (
    <StoryFrame
      title="Toolbar"
      description="Goals reference for compact editing controls. Mature as a shared toolbar only after grouping, disabled, icon-only, and AI tone rules are documented."
    >
      <StoryGrid>
        <Card style={styles.toolbarCard}>
          <StoryStack>
            <Badge variant="secondary">Editing toolbar</Badge>
            <Toolbar center>
              <ToolbarGroup>
                <ToolbarButton accessibilityLabel="Bold" icon="bold" onPress={() => undefined} />
                <ToolbarButton accessibilityLabel="Italic" icon="italic" onPress={() => undefined} />
                <ToolbarButton accessibilityLabel="Underline" icon="underline" disabled />
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarButton accessibilityLabel="Checklist" icon="checklist" onPress={() => undefined} />
                <ToolbarButton accessibilityLabel="Numbered list" icon="listOrdered" onPress={() => undefined} />
              </ToolbarGroup>
              <ToolbarButton
                accessibilityLabel="Refine with AI"
                icon="sparkles"
                label="Refine"
                tone="ai"
                onPress={() => undefined}
              />
            </Toolbar>
          </StoryStack>
        </Card>
        <Card style={styles.toolbarCard}>
          <StoryStack>
            <Badge variant="outline">Maturity questions</Badge>
            <Heading variant="sm">Toolbar should own editing anatomy, not editor workflow.</Heading>
            <Text tone="secondary">
              The shared component can own grouped buttons, icon/label sizing, selected state, and
              accessibility labels. Long-form editor autosave, AI prompts, and WebView behavior should
              remain workflow-level until repeated.
            </Text>
          </StoryStack>
        </Card>
      </StoryGrid>
    </StoryFrame>
  ),
};

const styles = {
  fieldColumn: {
    width: 360,
    gap: spacing.xs,
  },
  toolbarCard: {
    width: 420,
  },
};
