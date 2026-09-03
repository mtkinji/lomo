import { EmptyState } from '../../ui/EmptyState';
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme';

const TODOS_EMPTY_ILLUSTRATION = require('../../../assets/illustrations/todos-empty.png');

export function TodosEmptyState() {
  return (
    <EmptyState
      variant="screen"
      illustration={TODOS_EMPTY_ILLUSTRATION}
      title="No to-dos yet"
      instructions="When something comes to mind, add it in the dock below."
      style={styles.centered}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 0,
    paddingBottom: spacing['3xl'],
  },
});
