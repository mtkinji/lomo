import { StyleSheet, View } from 'react-native';

import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { spacing } from '../../../theme';

export function RecipeActionsMenu({ visible, onClose, onEdit, onExport, onDelete, editable = true }: {
  visible: boolean; onClose(): void; onEdit(): void; onExport(): void; onDelete(): void; editable?: boolean;
}) {
  return <BottomDrawer visible={visible} onClose={onClose} snapPoints={[360]}><View style={styles.content}>
    <Heading variant="md">Recipe actions</Heading><Text tone="secondary">{editable ? 'The recipe stays private unless you explicitly share it.' : 'This Kwilt recipe is ready to cook or export. Add your own copy to make it personal.'}</Text>
    {editable ? <Button variant="outline" onPress={onEdit}>Edit recipe</Button> : null}<Button variant="outline" onPress={onExport}>Export a copy</Button>{editable ? <Button variant="destructive" onPress={onDelete}>Delete recipe</Button> : null}
  </View></BottomDrawer>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: spacing.md, gap: spacing.sm } });
