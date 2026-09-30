import React, { type ReactNode, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Icon, type IconName } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { Text } from '../../ui/Typography';
import { FullWidthActionDock, useFullWidthActionDockClearance } from '../../ui/FullWidthActionDock';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import { SubscriptionLegalLinks } from './SubscriptionLegalLinks';
import { splitFoundingOfferPrice } from './foundingOfferPresentation';

type Props = {
  price: string;
  busy: boolean;
  onPurchase: () => void;
  onClose: () => void;
  onOtherPlans: () => void;
  onRestore: () => void;
  annual?: { price: string; trial: boolean };
  onAnnualPurchase?: () => void;
  /** Only include supported routes; no space is reserved for absent links. */
  secondaryActions?: ReadonlyArray<{ label: string; onPress: () => void }>;
};

const benefits: ReadonlyArray<{ icon: IconName; label: string }> = [
  { icon: 'landmark', label: 'Connected accounts & budgets' },
  { icon: 'estimate', label: 'Budget & goal based app limits' },
  { icon: 'sparkles', label: 'Turn goals into next steps with AI' },
];
const serif = Platform.select({ ios: 'ui-serif', android: 'serif', default: 'Georgia' });
const reveal = (index: number) => FadeInUp
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .delay(200 + index * 500).duration(950).easing(Easing.bezier(0.25, 0.1, 0.25, 1));

function Laurel({ mirrored = false }: { mirrored?: boolean }) {
  return <Svg width={24} height={52} viewBox="0 0 24 52" accessible={false}
    style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}>
    <Path d="M21 49C5 39 3 20 17 3" fill="none" stroke={colors.textSecondary} strokeWidth={1.2} />
    <Path fill={colors.textSecondary} d="M12 13C7 11 8 5 16 2c1 6-1 9-4 11Z M8 23C2 21 1 15 4 10c5 4 6 8 4 13Z M9 34C2 34 0 28 1 23c6 2 9 5 8 11Z M14 44C7 46 3 41 3 36c6 0 10 3 11 8Z M10 22c0-6 5-9 10-9-1 6-5 9-10 9Z M10 33c-1-6 3-10 8-11 0 6-3 10-8 11Z M15 43c-3-5-1-10 4-13 2 6 0 10-4 13Z" />
  </Svg>;
}

/** Owned offer presentation; caller retains StoreKit/RevenueCat and navigation ownership. */
export function FoundingLifetimeOffer({ price, busy, onPurchase, onClose, onOtherPlans, onRestore, annual, onAnnualPurchase, secondaryActions = [] }: Props) {
  const insets = useSafeAreaInsets();
  const clearance = useFullWidthActionDockClearance();
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityPreferences();
  const [settled, setSettled] = useState(false);
  const [selection, setSelection] = useState<'lifetime' | 'annual'>('lifetime');
  const annualSelected = selection === 'annual' && Boolean(annual && onAnnualPurchase);
  const trial = annualSelected && annual?.trial;
  const displayedPrice = annualSelected ? annual!.price : price;
  const animate = !reduceMotionEnabled && !screenReaderEnabled && !settled;
  const { symbol, amount } = splitFoundingOfferPrice(displayedPrice);
  const beat = (index: number, children: ReactNode) => <Animated.View
    key={`${index}-${animate ? 'reveal' : 'settled'}`} entering={animate ? reveal(index) : undefined}>
    {children}
  </Animated.View>;

  return <View style={[styles.root, { paddingTop: insets.top }]} testID="foundingOffer">
    <View style={styles.chrome}>
      <Logo size={28} color={colors.textPrimary} />
      <Button variant="ghost" size="icon" accessibilityLabel="Close offer" disabled={busy}
        onPress={onClose} style={styles.close}><Icon name="close" size={22} color={colors.textSecondary} /></Button>
    </View>
    <View style={styles.viewport}>
      <ScrollView showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setSettled(true)}
        contentContainerStyle={[styles.content, { paddingBottom: clearance + spacing.md }]}>
        {beat(0, <View style={styles.rating} accessible accessibilityLabel="Rated 5.0 out of 5 on the US App Store">
          <Laurel /><View style={styles.ratingCopy}>
            <View style={styles.stars}>{[0, 1, 2, 3, 4].map(index => <Icon key={index} name="starFilled" size={17} color={colors.textPrimary} />)}</View>
            {/* US App Store id6755990439, verified 2026-09-29. Refresh before release. */}
            <Text style={styles.ratingLabel}>5.0 on the App Store</Text>
          </View><Laurel mirrored />
        </View>)}
        {beat(1, <View style={styles.offer}>
          <Badge variant="info" style={styles.badge}>{annualSelected ? 'Kwilt Pro' : 'Limited-time founding offer'}</Badge>
          <View style={styles.priceRow} accessible accessibilityLabel={trial ? '1 month free' : displayedPrice}>
            {!trial && symbol ? <Text accessible={false} style={styles.currency}>{symbol}</Text> : null}
            <Text accessible={false} style={[styles.price, trial && styles.trialPrice]}>{trial ? '1 month' : amount}</Text>
          </View>
          <Text style={styles.duration}>{trial ? 'Free to try' : annualSelected ? 'Annual access' : 'Lifetime access'}</Text>
          <Text style={styles.terms}>{annualSelected ? `${trial ? 'Then ' : ''}${annual!.price}/year. Auto-renews until canceled.` : 'One payment. No subscription.'}</Text>
          {annual && onAnnualPurchase ? <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Choose your offer">
            <Button variant={annualSelected ? 'outline' : 'secondary'} fullWidth disabled={busy}
              accessibilityRole="radio" accessibilityState={{ checked: !annualSelected, disabled: busy }}
              accessibilityLabel={`Lifetime, ${price} once, no recurring payments`} onPress={() => setSelection('lifetime')}>
              <View style={styles.choiceRow}><Icon name={annualSelected ? 'dot' : 'checkCircle'} size={20} color={colors.textPrimary} /><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>{`Lifetime · ${price} once`}</Text><Text style={styles.choiceDetail}>No recurring payments</Text></View></View>
            </Button>
            <Button variant={annualSelected ? 'secondary' : 'outline'} fullWidth disabled={busy}
              accessibilityRole="radio" accessibilityState={{ checked: annualSelected, disabled: busy }}
              accessibilityLabel={`${annual.trial ? 'Try 1 month free' : 'Annual'}, ${annual.price}/year, auto-renews until canceled`}
              onPress={() => setSelection('annual')}>
              <View style={styles.choiceRow}><Icon name={annualSelected ? 'checkCircle' : 'dot'} size={20} color={colors.textPrimary} /><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>{annual.trial ? 'Try 1 month free' : 'Annual access'}</Text><Text style={styles.choiceDetail}>{`${annual.trial ? 'Then ' : ''}${annual.price}/year · Cancel anytime`}</Text></View></View>
            </Button>
          </View> : null}
        </View>)}
        {beat(2, <View>
          <View style={styles.benefits}>{benefits.map((benefit, index) => <View key={benefit.icon}
            style={[styles.benefit, index > 0 && styles.divider]}>
            <Icon name={benefit.icon} size={22} color={colors.muted} />
            <Text style={styles.benefitLabel}>{benefit.label}</Text>
          </View>)}</View>
          <Text style={styles.details}>Includes 1,000 AI credits each month.{ '\n' }{annualSelected ? 'Subscription access continues while your plan is active.' : 'Lifetime access for the life of the Kwilt service.'}</Text>
          <View style={styles.links}>
            <Button variant="link" size="sm" disabled={busy} onPress={onOtherPlans}>Other plans</Button>
            <Button variant="link" size="sm" disabled={busy} onPress={onRestore}>Restore purchases</Button>
            {secondaryActions.map(action => <Button key={action.label} variant="link" size="sm" disabled={busy} onPress={action.onPress}>{action.label}</Button>)}
          </View>
          <SubscriptionLegalLinks variant="purchase" />
        </View>)}
      </ScrollView>
      <FullWidthActionDock dockTestID="foundingOffer.actionDock">
        <Button fullWidth size="lg" variant="primary" loading={busy} loadingLabel="Working…" onPress={annualSelected ? onAnnualPurchase : onPurchase}>{annualSelected ? trial ? 'Start my free month' : 'Subscribe to Pro' : 'Purchase'}</Button>
      </FullWidthActionDock>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  chrome: { minHeight: 64, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.xl },
  close: { position: 'absolute', right: 0 },
  viewport: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  rating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl },
  ratingCopy: { alignItems: 'center', gap: spacing.xs },
  stars: { flexDirection: 'row', gap: spacing.xs },
  ratingLabel: { ...typography.caption, color: colors.textSecondary },
  offer: { alignItems: 'center' },
  choices: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%' },
  choiceCopy: { paddingVertical: spacing.xs, flex: 1 },
  choiceTitle: { ...typography.bodySm, color: colors.textPrimary },
  choiceDetail: { ...typography.caption, color: colors.textSecondary },
  trialPrice: { fontSize: 58, lineHeight: 84 },
  badge: { alignSelf: 'center', marginBottom: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%', flexWrap: 'wrap' },
  price: { fontFamily: serif, fontWeight: '400', fontSize: 76, lineHeight: 84, letterSpacing: -2, fontVariant: ['lining-nums'], color: colors.textPrimary },
  currency: { fontFamily: serif, fontWeight: '400', fontSize: 40, lineHeight: 48, marginTop: spacing.sm, marginRight: 3, color: colors.textPrimary },
  duration: { fontFamily: serif, fontWeight: '400', fontSize: 26, lineHeight: 34, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  terms: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  benefits: { marginTop: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.gray100, borderRadius: 24, overflow: 'hidden' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  benefitLabel: { ...typography.bodySm, fontSize: 15, lineHeight: 23, color: colors.textPrimary, flex: 1 },
  details: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.sm },
});
