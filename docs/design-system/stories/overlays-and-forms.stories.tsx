import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { AlertDialog } from '../../../src/ui/AlertDialog';
import { Button } from '../../../src/ui/Button';
import { Dialog } from '../../../src/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../src/ui/DropdownMenu';
import { FormField } from '../../../src/ui/FormField';
import { Input } from '../../../src/ui/Input';
import { PortalHost } from '../../../src/ui/Portal';
import { SegmentedControl } from '../../../src/ui/SegmentedControl';
import { spacing } from '../../../src/theme';
import { Specimen, StoryFrame, StoryGrid, StoryStack } from './storyHelpers';

const meta = {
  title: 'Overlays and Forms/RNR Convergence',
  parameters: {
    docs: {
      description: {
        component:
          'Candidate RNR-aligned anatomy localized through Kwilt tokens and APIs. Review at mobile width before promotion.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function OverlayStory() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [name, setName] = useState('Weekdays');
  const [layout, setLayout] = useState<'list' | 'kanban'>('list');

  return (
    <StoryFrame
      title="Dialog, alert dialog, and menu"
      description="The form has one dominant completion action. Destructive behavior becomes primary only inside an explicit alert dialog."
    >
      <StoryGrid>
        <Specimen label="Dialog form">
          <Button onPress={() => setDialogVisible(true)}>Edit view</Button>
        </Specimen>
        <Specimen label="Contextual menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem label="Rename" icon="edit" />
              <DropdownMenuItem label="Duplicate" icon="clipboard" />
              <DropdownMenuSeparator />
              <DropdownMenuItem label="Delete" icon="trash" variant="destructive" />
            </DropdownMenuContent>
          </DropdownMenu>
        </Specimen>
      </StoryGrid>

      <Dialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title="View settings"
        description="Adjust how this view is arranged and what it shows."
        footer={
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button variant="ghost" onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => setDialogVisible(false)}>Save</Button>
          </View>
        }
      >
        <StoryStack>
          <Input label="View name" value={name} onChangeText={setName} variant="outline" elevation="flat" />
          <FormField label="Layout">
            {(controlProps) => (
              <SegmentedControl
                {...controlProps}
                value={layout}
                onChange={setLayout}
                options={[{ value: 'list', label: 'List' }, { value: 'kanban', label: 'Kanban' }]}
                size="compact"
              />
            )}
          </FormField>
          <Button variant="ghost" onPress={() => setAlertVisible(true)}>Delete view…</Button>
        </StoryStack>
      </Dialog>

      <AlertDialog
        visible={alertVisible}
        title="Delete this view?"
        description="The view will be removed. Your to-dos will remain."
        cancelLabel="Keep view"
        actionLabel="Delete view"
        onClose={() => setAlertVisible(false)}
        onAction={() => setAlertVisible(false)}
      />
      <PortalHost />
    </StoryFrame>
  );
}

export const InteractiveAnatomy: Story = { render: () => <OverlayStory /> };

export const FieldStates: Story = {
  render: () => (
    <StoryFrame title="Form field states" description="Labels stay visible; description and validation occupy one predictable slot.">
      <StoryGrid>
        <Specimen label="Description">
          <FormField label="Grouping" description="Choose how cards are organized.">
            {(controlProps) => <Input {...controlProps} value="Status" editable={false} elevation="flat" />}
          </FormField>
        </Specimen>
        <Specimen label="Error">
          <FormField label="View name" error="Enter a name." required>
            {(controlProps) => <Input {...controlProps} value="" variant="outline" errorText="Enter a name." elevation="flat" />}
          </FormField>
        </Specimen>
        <Specimen label="Disabled">
          <FormField label="Layout" disabled>
            {(controlProps) => <Input {...controlProps} value="List" editable={false} elevation="flat" />}
          </FormField>
        </Specimen>
      </StoryGrid>
    </StoryFrame>
  ),
};
