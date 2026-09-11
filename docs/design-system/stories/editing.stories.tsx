import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { AiAutofillBadge } from '../../../src/ui/AiAutofillBadge';
import { Badge } from '../../../src/ui/Badge';
import { Card } from '../../../src/ui/Card';
import { EditableField } from '../../../src/ui/EditableField';
import { TagEntryField } from '../../../src/ui/TagEntryField';
import { Input } from '../../../src/ui/Input';
import { TitleInput } from '../../../src/ui/TitleInput';
import { NarrativeEditableTitle } from '../../../src/ui/NarrativeEditableTitle';
import { LongTextFieldPreview } from '../../../src/ui/LongTextFieldPreview';
import { Button } from '../../../src/ui/Button';
import { Toolbar, ToolbarButton, ToolbarGroup } from '../../../src/ui/Toolbar';
import { Heading, Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Forms/Editing',
  parameters: {
    docs: {
      description: {
        component:
          'Canonical filled Input examples and contextual editing adapters. Consult input-guidance.md for the supported API and component-inventory.md for each adapter’s maturity and native acceptance.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function UnifiedWritingSpecimen() {
  const [draft, setDraft] = useState('A small win. Finally made time for a walk together.');
  const [tools, setTools] = useState(true);
  return <StoryFrame title="Filled writing surfaces" description="The field owns material; its host owns completion and keyboard avoidance.">
    <StoryStack>
      <Input surfaceRole="composer" label="Your moment" multiline value={draft} onChangeText={setDraft} footerElement={tools ? <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Button variant="ghost" size="sm">Photo</Button><Text tone="secondary">Words, photos, or both.</Text></View> : undefined} />
      <Button variant="secondary" onPress={() => setTools(current => !current)}>Toggle tools</Button>
      <Input label="Paragraph in a form" multiline value={draft} onChangeText={setDraft} helperText="The form retains its own Save action." />
      <Input variant="plain" label="Text inside an existing group" multiline value={draft} onChangeText={setDraft} />
    </StoryStack>
  </StoryFrame>;
}
export const UnifiedWriting: Story = {render: () => <UnifiedWritingSpecimen />};

function RichNotesSpecimen() {
  const notes = '<p>A little more <b>context</b> for the next step.</p>';
  const [requestedEditor, setRequestedEditor] = useState(false);
  return <StoryFrame title="Rich notes previews" description="Filled preview material is the default. The native rich editor retains its existing formatting, autosave and Done behavior; browser specimens do not certify that editor.">
    <StoryStack>
      <LongTextFieldPreview label="Notes" value={notes} onPress={() => setRequestedEditor(true)} />
      <View style={{backgroundColor: colors.inputFill, padding: spacing.md}}>
        <LongTextFieldPreview onSurface="muted" label="On a muted parent" value={notes} onPress={() => setRequestedEditor(true)} />
      </View>
      <LongTextFieldPreview surfaceVariant="flat" label="Editorial context" value={notes} onPress={() => setRequestedEditor(true)} />
      <LongTextFieldPreview label="Read only" value={notes} onPress={() => setRequestedEditor(true)} disabled />
      {requestedEditor ? <Text>The preview requested its editor. Open the app to exercise native editing.</Text> : null}
    </StoryStack>
  </StoryFrame>;
}
export const RichNotes: Story = {render: () => <RichNotesSpecimen />};

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
      <Specimen label="Canonical Input states">
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
      description="Canonical Input states and the EditableField wrapper. Native migration evidence is tracked separately."
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
    maxWidth: '100%' as const,
    gap: spacing.xs,
  },
  toolbarCard: {
    width: 420,
    maxWidth: '100%' as const,
  },
};

function TagEntrySpecimen() {
  const [tags, setTags] = useState(['Home', 'A longer tag that wraps with its neighbors', 'Outside']);
  const [draft, setDraft] = useState('');
  return <StoryFrame title="Tag entry" description="One shared surface for chips and text. The host owns parsing and commits.">
    <StoryStack>
      <TagEntryField fieldTestID="tag-entry-specimen" tags={tags} value={draft} accessibilityLabel="Add tags" placeholder="Add tags…" onChangeText={setDraft} onRemoveTag={tag => setTags(current => current.filter(item => item !== tag))} onSubmitEditing={() => {
        if (draft.trim()) setTags(current => [...new Set([...current, draft.trim()])]);
        setDraft('');
      }} returnKeyType="done" />
      <TagEntryField tags={[]} value="" accessibilityLabel="Empty tag field" placeholder="Add tags…" onRemoveTag={() => {}} />
      <TagEntryField tags={['Read only']} value="" accessibilityLabel="Disabled tags" editable={false} onRemoveTag={() => {}} />
    </StoryStack>
  </StoryFrame>;
}
export const TagEntry: Story = { render: () => <TagEntrySpecimen /> };


function EditorialTitleSpecimen() {
  const [draft, setDraft] = useState('Plan a weekend outdoors');
  const [saved, setSaved] = useState('Make time for a walk together');
  return <StoryFrame title="Editorial titles" description="Use TitleInput for a parent-owned draft. Use NarrativeEditableTitle for tap-to-edit with validation and commit on finish. Both share uncapped heading entry; the native host owns keyboard scrolling.">
    <StoryStack>
      <Specimen label="Controlled draft">
        <TitleInput accessibilityLabel="Draft title" value={draft} onChangeText={setDraft} placeholder="Name this to-do" returnKeyType="done" blurOnSubmit />
        <Text tone="secondary">Changes stay in this local draft until its owner saves.</Text>
      </Specimen>
      <Specimen label="Commit on finish">
        <NarrativeEditableTitle accessibilityLabel="Edit saved title" value={saved} onCommit={setSaved} />
        <Text tone="secondary">Tap to edit; blur commits a changed title. An empty edit restores the saved title.</Text>
      </Specimen>
      <Specimen label="Read-only title">
        <NarrativeEditableTitle accessibilityLabel="Read-only title" value="A heading with no editing action" editable={false} onCommit={() => {}} />
      </Specimen>
      <Text tone="secondary">This browser specimen verifies draft and commit behavior and intrinsic title growth. Native caret movement, larger text and keyboard-frame acceptance remain tracked separately.</Text>
    </StoryStack>
  </StoryFrame>;
}
export const EditorialTitles: Story = {render: () => <EditorialTitleSpecimen />};
