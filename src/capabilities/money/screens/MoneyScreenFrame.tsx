import { type ReactNode, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { useMoneyData } from '../data/MoneyDataContext';
import { KwiltLoader } from '../../../ui/KwiltLoader';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../../ui/KwiltRefresh';
import { HapticsService } from '../../../services/HapticsService';
type MoneyScreenFrameProps = {
  children: ReactNode;
  headerRightElement?: ReactNode;
  moreMenu?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  onPressBack?: () => void;
  title: string;
};

export function MoneyScreenFrame(props: MoneyScreenFrameProps) {
  if (props.onPressBack) return <MoneyScreenFrameContent {...props} />;
  return <MoneyCapabilityScreenFrame {...props} />;
}

function MoneyCapabilityScreenFrame(props: MoneyScreenFrameProps) {
  const { openMenu } = useCapabilityShell();
  return <MoneyScreenFrameContent {...props} onPressMenu={openMenu} />;
}

function MoneyScreenFrameContent({
  children,
  headerRightElement,
  moreMenu,
  onRefresh,
  onPressBack,
  onPressMenu,
  title,
}: MoneyScreenFrameProps & { onPressMenu?: () => void }) {
  const { error, refresh, snapshot, status } = useMoneyData();
  const refreshMoney = onRefresh ?? refresh;
  const handlePullRefresh = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    return refreshMoney();
  }, [refreshMoney]);
  const { onScroll, refreshControl, refreshOverlay, refreshing, scrollEventThrottle } = useKwiltRefresh({ onRefresh: handlePullRefresh });

  return (
    <AppShell>
      <PageHeader
        title={title}
        rightElement={headerRightElement}
        moreMenu={moreMenu}
        onPressBack={onPressBack}
        onPressMenu={onPressMenu}
      />
      <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing}>
        {status === 'loading' && !snapshot ? (
          <MoneyFramePreview loading title={title} />
        ) : status === 'error' && !snapshot ? (
          <ScrollView
            contentContainerStyle={styles.recoveryScrollContent}
            onScroll={onScroll}
            refreshControl={refreshControl}
            scrollEventThrottle={scrollEventThrottle}
          >
            <MoneyFramePreview error={error} onRetry={refresh} title={title} />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            onScroll={onScroll}
            refreshControl={refreshControl}
            scrollEventThrottle={scrollEventThrottle}
          >
            {error ? (
              <View accessibilityRole="alert" style={styles.warning}>
                <Text variant="label">Showing the last successful update</Text>
                <Text tone="secondary">{error}</Text>
              </View>
            ) : null}
            {children}
          </ScrollView>
        )}
      </KwiltRefreshFrame>
    </AppShell>
  );
}

function MoneyFramePreview({
  error,
  loading = false,
  onRetry,
  title,
}: {
  error?: string | null;
  loading?: boolean;
  onRetry?: () => Promise<void>;
  title: string;
}) {
  const isBudget = title === 'Budget';
  const testID = loading ? 'money-loading-preview' : 'money-unavailable-preview';
  return (
    <View
      accessibilityLabel={loading ? `Loading ${title}` : undefined}
      style={styles.preview}
      testID={testID}
    >
      <View style={styles.previewMessage}>
        {loading ? (
          <View style={styles.loadingTitleRow}>
            <KwiltLoader color={colors.accent} size="small" />
            <View style={styles.messageCopy}>
              <Text variant="label">Getting your {title.toLowerCase()} ready</Text>
              <Text tone="secondary">Checking your plan and latest activity.</Text>
            </View>
          </View>
        ) : (
          <>
            <Heading variant="md">Your {title.toLowerCase()} is still here</Heading>
            <Text tone="secondary" style={styles.recoveryCopy}>
              Kwilt couldn’t refresh it right now. Your plan and transaction data haven’t been changed.
            </Text>
            <Button variant="outline" onPress={() => void onRetry?.()}>Try again</Button>
          </>
        )}
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.scaffold, !loading ? styles.scaffoldUnavailable : null]}
      >
        {isBudget ? <BudgetScaffold /> : <MoneyListScaffold />}
      </View>
      {!loading && error && error !== 'Money data could not be loaded.' ? (
        <Text accessibilityRole="alert" style={styles.visuallyHidden}>{error}</Text>
      ) : null}
    </View>
  );
}

function BudgetScaffold() {
  return (
    <>
      <View style={styles.scaffoldHeader}>
        <View style={[styles.placeholder, styles.monthPlaceholder]} />
        <View style={[styles.placeholder, styles.circlePlaceholder]} />
      </View>
      <View style={styles.answerScaffold}>
        <View style={[styles.placeholder, styles.labelPlaceholder]} />
        <View style={[styles.placeholder, styles.amountPlaceholder]} />
        <View style={[styles.placeholder, styles.supportPlaceholder]} />
      </View>
      <View style={styles.categoryHeadingScaffold}>
        <View style={[styles.placeholder, styles.sectionPlaceholder]} />
        <View style={[styles.placeholder, styles.compactPlaceholder]} />
      </View>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.categoryScaffold}>
          <View style={styles.categoryScaffoldTop}>
            <View style={[styles.placeholder, styles.categoryNamePlaceholder]} />
            <View style={[styles.placeholder, styles.categoryAmountPlaceholder]} />
          </View>
          <View style={[styles.placeholder, styles.meterPlaceholder]} />
          <View style={[styles.placeholder, styles.categoryMetaPlaceholder]} />
        </View>
      ))}
    </>
  );
}

function MoneyListScaffold() {
  return (
    <>
      <View style={[styles.placeholder, styles.sectionPlaceholder]} />
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={styles.listScaffoldRow}>
          <View style={[styles.placeholder, styles.listIconPlaceholder]} />
          <View style={styles.listScaffoldCopy}>
            <View style={[styles.placeholder, styles.categoryNamePlaceholder]} />
            <View style={[styles.placeholder, styles.categoryMetaPlaceholder]} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  warning: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.fieldFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recoveryScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  preview: { flex: 1, gap: spacing.xl },
  previewMessage: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  loadingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  messageCopy: { flex: 1, gap: 2 },
  recoveryCopy: { maxWidth: 330, lineHeight: 21 },
  scaffold: { gap: spacing.md, paddingHorizontal: spacing.sm },
  scaffoldUnavailable: { opacity: 0.42 },
  scaffoldHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  placeholder: { backgroundColor: colors.fieldFill, borderRadius: 8 },
  monthPlaceholder: { width: 142, height: 24 },
  circlePlaceholder: { width: 32, height: 32, borderRadius: 16 },
  answerScaffold: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  labelPlaceholder: { width: 112, height: 14 },
  amountPlaceholder: { width: 176, height: 44, borderRadius: 12 },
  supportPlaceholder: { width: '68%', height: 14 },
  categoryHeadingScaffold: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionPlaceholder: { width: 94, height: 18 },
  compactPlaceholder: { width: 58, height: 18 },
  categoryScaffold: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  categoryScaffoldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryNamePlaceholder: { width: 116, height: 16 },
  categoryAmountPlaceholder: { width: 66, height: 16 },
  meterPlaceholder: { width: '100%', height: 10, borderRadius: 5 },
  categoryMetaPlaceholder: { width: 78, height: 12 },
  listScaffoldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listIconPlaceholder: { width: 40, height: 40, borderRadius: 20 },
  listScaffoldCopy: { flex: 1, gap: spacing.sm },
  visuallyHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
