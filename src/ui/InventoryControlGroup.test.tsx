import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../theme';
import {
  INVENTORY_CONTROL_HEIGHT_PX,
  INVENTORY_CONTROL_MIN_WIDTH_PX,
  InventoryControlGroup,
  InventoryControlSurface,
} from './InventoryControlGroup';

describe('InventoryControlGroup', () => {
  it('holds the canonical compact inventory-control geometry and neutral active state', () => {
    const screen = render(
      <InventoryControlGroup testID="controls">
        <InventoryControlSurface iconName="funnel" testID="filter" />
        <InventoryControlSurface active count={2} iconName="sort" testID="sort" />
      </InventoryControlGroup>,
    );

    const groupStyle = StyleSheet.flatten(screen.getByTestId('controls').props.style);
    const filterStyle = StyleSheet.flatten(screen.getByTestId('filter').props.style);
    const sortStyle = StyleSheet.flatten(screen.getByTestId('sort').props.style);

    expect(groupStyle).toMatchObject({ borderRadius: 12, borderWidth: 1, overflow: 'hidden' });
    expect(filterStyle).toMatchObject({
      minWidth: INVENTORY_CONTROL_MIN_WIDTH_PX,
      height: INVENTORY_CONTROL_HEIGHT_PX,
      backgroundColor: colors.canvas,
    });
    expect(sortStyle).toMatchObject({
      minWidth: INVENTORY_CONTROL_MIN_WIDTH_PX,
      height: INVENTORY_CONTROL_HEIGHT_PX,
      backgroundColor: colors.sumi900,
    });
    expect(sortStyle.backgroundColor).not.toBe(colors.pine700);
    expect(screen.getByText('2')).toBeTruthy();
  });
});
