import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { Input } from '../../../src/ui/Input';
import { ChatComposer } from '../../../src/ui/ChatComposer';
import { SearchField } from '../../../src/ui/SearchField';
import { SmallSetPickerField } from '../../../src/ui/PickerFields';
import { Text } from '../../../src/ui/Typography';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Forms/Input Family',
  parameters: {
    docs: {
      description: {
        component: 'Canonical Input, SearchField and small-set picker treatments. Use input-guidance.md for pattern selection and component-inventory.md for scope. Filled fields own their material; plain editors share an existing composer or editorial surface. Native acceptance remains separately tracked.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function UnifiedInputStory() {
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState('');
  return <StoryFrame title="Canonical input family" description="Interactive material review. Native keyboard, contrast and assistive-technology acceptance remain separate.">
    <StoryGrid>
      {(['canvas', 'muted'] as const).map(onSurface => <Specimen key={onSurface} label={`${onSurface} parent`}>
        <View style={{backgroundColor: onSurface === 'muted' ? colors.shellAlt : colors.canvas, padding: spacing.lg, gap: spacing.lg}}>
          <Input onSurface={onSurface} label="A descriptive field label that may wrap at large text sizes" value={value} onChangeText={setValue} placeholder="Enter a value" />
          <SearchField onSurface={onSurface} accessibilityLabel="Search specimens" value={value} onChangeText={setValue} placeholder="Search" />
          <SmallSetPickerField onSurface={onSurface} value={choice} onValueChange={setChoice} placeholder="Choose a value" accessibilityLabel="Choose specimen" options={[{value: 'first', label: 'First choice'}, {value: 'second', label: 'A longer second choice'}]} />
          <Input onSurface={onSurface} label="Invalid value" value={value} onChangeText={setValue} errorText="Enter a value before continuing." />
          <Input onSurface={onSurface} label="Read-only value" value="Readable saved value" readOnly />
          <Input onSurface={onSurface} label="Unavailable field" value="Unavailable" editable={false} />
          <Input onSurface={onSurface} size="sm" label="Explicit compact entry" value={value} onChangeText={setValue} />
        </View>
      </Specimen>)}
      <Specimen label="Default field"><Input label="Default filled treatment" value={value} onChangeText={setValue} /></Specimen>
      <Specimen label="Explicit outlined exception"><Input variant="outline" label="Stronger field boundary" value={value} onChangeText={setValue} /></Specimen>
    </StoryGrid>
  </StoryFrame>;
}
export const StandaloneFields: Story = {render: () => <UnifiedInputStory />};

function EmbeddedEditorsSpecimen() {
  const [draft, setDraft] = useState('');
  return <StoryFrame title="Editing inside an existing surface" description="Plain and inline editors remain borderless when focused. Their host supplies the visual grouping; the native caret and selection show the editing position. Keep completion and keyboard behavior with the host.">
    <StoryStack>
      <Specimen label="Existing composer surface">
        <View style={{backgroundColor: colors.canvas, gap: spacing.md}}>
          <Input variant="plain" accessibilityLabel="Embedded draft" placeholder="Write a note…" multiline value={draft} onChangeText={setDraft} />
          <Text tone="secondary">An existing composer owns its tools and completion action.</Text>
        </View>
      </Specimen>
      <Input label="Standalone note" surfaceRole="composer" multiline value={draft} onChangeText={setDraft} placeholder="Write a note…" />
      <Text tone="secondary">Focus each editor to compare their treatment. This specimen changes local text only.</Text>
    </StoryStack>
  </StoryFrame>;
}
export const EmbeddedEditors: Story = {render: () => <EmbeddedEditorsSpecimen />};

function ChatComposerSpecimen() {
  const [message, setMessage] = useState('');
  return <StoryFrame title="Canonical message composer" description="Native counterpart to Unified Chat: a compact filled pill at rest, a two-row focused writing surface, measured growth, and Send inside the same composer.">
    <StoryStack>
      <ChatComposer
        accessibilityLabel="Message"
        placeholder="Write a message…"
        value={message}
        onChangeText={setMessage}
        onSend={() => setMessage('')}
      />
      <Text tone="secondary">Focus the empty pill, add wrapped or multiline text, and send.</Text>
    </StoryStack>
  </StoryFrame>;
}
export const MessageComposer: Story = {render: () => <ChatComposerSpecimen />};
