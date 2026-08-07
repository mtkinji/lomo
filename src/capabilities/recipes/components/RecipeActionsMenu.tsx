import { StyleSheet, View } from 'react-native';

import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { spacing } from '../../../theme';

export function RecipeActionsMenu({ visible, onClose, onEdit, onDelete }: {
  visible: boolean; onClose(): void; onEdit(): void; onDelete(): void;
}) {
  return <BottomDrawer visible={visible} onClose={onClose} snapPoints={[360]}><View style={styles.content}>
    <Heading variant="md">Recipe actions</Heading><Text tone="secondary">Edit the recipe or remove it from your private recipe box.</Text>
    <Button variant="outline" onPress={onEdit}>Edit recipe</Button><Button variant="destructive" onPress={onDelete}>Delete recipe</Button>
  </View></BottomDrawer>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: spacing.md, gap: spacing.sm } });
