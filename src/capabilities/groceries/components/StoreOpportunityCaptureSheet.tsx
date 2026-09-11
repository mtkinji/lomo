import { Input } from '../../../ui/Input';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { spacing } from '../../../theme';

export type StoreOpportunityDraft = { concept: string; retailer: string; price: string; regularUnitPrice: string; quantity: string; unit: string };
export function StoreOpportunityCaptureSheet({ visible, onClose, onSubmit }: { visible: boolean; onClose(): void; onSubmit(draft: StoreOpportunityDraft): Promise<void>|void }) {
  const [draft, setDraft] = useState<StoreOpportunityDraft>({ concept: '', retailer: '', price: '', regularUnitPrice: '', quantity: '1', unit: 'pound' }); const [busy, setBusy] = useState(false);
  const field = (label: string, key: keyof StoreOpportunityDraft, keyboardType?: 'decimal-pad') => <View style={styles.field}><Input label={label} accessibilityLabel={label} value={draft[key]} keyboardType={keyboardType} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))} /></View>;
  const valid = draft.concept.trim() && draft.retailer.trim() && Number(draft.price) >= 0 && Number(draft.quantity) > 0 && draft.unit.trim();
  return <BottomDrawer visible={visible} onClose={onClose} snapPoints={['85%']}><View style={styles.content}><Heading variant="md">Capture a store find</Heading><Text tone="secondary">Record what you can see. Kwilt won’t call it a good deal until the unit price and household use hold up.</Text>{field('Item', 'concept')}{field('Store', 'retailer')}<View style={styles.row}>{field('Current package price', 'price', 'decimal-pad')}{field('Displayed unit price', 'regularUnitPrice', 'decimal-pad')}</View><View style={styles.row}>{field('Package quantity', 'quantity', 'decimal-pad')}{field('Comparable unit', 'unit')}</View><Button disabled={!valid || busy} onPress={() => { setBusy(true); void Promise.resolve(onSubmit(draft)).finally(() => setBusy(false)); }}>{busy ? 'Saving…' : 'Review this opportunity'}</Button></View></BottomDrawer>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: spacing.md, gap: spacing.sm }, field: { flex: 1, gap: spacing.xs }, row: { flexDirection: 'row', gap: spacing.sm },  });
