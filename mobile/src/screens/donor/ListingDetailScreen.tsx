import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  FreshnessRing,
  Icon,
  InfoBanner,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  UrgencyBadge,
  useConfirm,
  useToast,
} from '../../components';
import { cancelListing, fetchListing } from '../../api/donations.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import type { DonationItem, DonationListing } from '../../types/donation';
import { freshnessFraction } from '../../utils/freshness';
import {
  claimedFraction,
  isClosedListing,
  itemIcon,
  listingStatusTone,
} from '../../utils/listing';
import type { DonorStackProps } from '../../navigation/types';

/**
 * One listing in full: pickup details, then every item with its own live
 * freshness and how much of it has been claimed.
 *
 * The one action, cancelling, is a quiet text button at the end rather than
 * a big button at the top. A destructive action should be findable, never
 * the most prominent thing on the screen, and it always asks first.
 */
export function ListingDetailScreen({
  navigation,
  route,
}: DonorStackProps<'ListingDetail'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow();
  const reduced = useReducedMotion();
  const { listingId } = route.params;

  const [listing, setListing] = useState<DonationListing | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setListing(await fetchListing(listingId));
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setRefreshing(false);
      }
    },
    [listingId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onCancel() {
    const ok = await confirm({
      title: t('donor.cancelTitle'),
      message: t('donor.cancelBody'),
      confirmLabel: t('donor.cancelListing'),
      cancelLabel: t('donor.keepListing'),
      tone: 'critical',
      icon: 'close-circle-outline',
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await cancelListing(listingId);
      toast.show({ type: 'success', title: t('donor.cancelledToast') });
      navigation.goBack();
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setCancelling(false);
    }
  }

  if (error && !listing) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  if (!listing) {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.content}>
          <Skeleton width="70%" height={28} />
          <Skeleton width="40%" height={16} style={styles.skGap} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const closed = isClosedListing(listing.status);
  const claimed = claimedFraction(listing.items);

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
      >
        <Animated.View entering={enterSection(0, reduced)}>
          <View style={styles.badges}>
            <Badge
              label={f.status('listing', listing.status)}
              tone={listingStatusTone[listing.status]}
              dot={!closed}
            />
            <AppText variant="caption" color="textSecondary">
              {t('donor.listedOn', { when: f.relative(listing.createdAt, now) })}
            </AppText>
          </View>
          <AppText variant="title" accessibilityRole="header" style={styles.title}>
            {listing.title}
          </AppText>
          {claimed > 0 ? (
            <View style={styles.claimRow}>
              <ProgressBar value={claimed} tone="olive" height={8} style={styles.flex} />
              <AppText variant="secondaryStrong" color="oliveText">
                {t('donor.claimedPercent', { percent: Math.round(claimed * 100) })}
              </AppText>
            </View>
          ) : null}
          {closed ? (
            <InfoBanner
              tone="neutral"
              icon="archive-outline"
              message={t('donor.closedNote')}
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <Card variant="flat" style={styles.pickup}>
            <View style={styles.pickupRow}>
              <View style={styles.pickupIcon}>
                <Icon name="location" size={18} color="brandText" />
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" color="textSecondary">
                  {t('donor.pickupTitle')}
                </AppText>
                <AppText variant="callout">{listing.pickupAddress}</AppText>
              </View>
            </View>
            <View style={styles.pickupRow}>
              <View style={styles.pickupIcon}>
                <Icon name="time" size={18} color="brandText" />
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" color="textSecondary">
                  {t('donor.windowTitle')}
                </AppText>
                <AppText variant="callout">
                  {f.window(listing.pickupWindowStart, listing.pickupWindowEnd)}
                </AppText>
              </View>
            </View>
          </Card>
          {listing.description ? (
            <Card variant="flat">
              <AppText variant="caption" color="textSecondary" style={styles.notesLabel}>
                {t('donor.notesTitle')}
              </AppText>
              <AppText variant="body">{listing.description}</AppText>
            </Card>
          ) : null}
        </Animated.View>

        <SectionHeader
          title={t('donor.foodInListing')}
          meta={String(listing.items.length)}
        />
        {listing.items.map((item, index) => (
          <Animated.View key={item.itemId} entering={enterListItem(index, reduced)}>
            <ItemCard item={item} now={now} closed={closed} />
          </Animated.View>
        ))}

        {!closed ? (
          <Button
            label={t('donor.cancelListing')}
            variant="dangerGhost"
            icon="close-circle-outline"
            onPress={() => void onCancel()}
            loading={cancelling}
            style={styles.cancel}
            accessibilityHint={t('donor.cancelBody')}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ItemCard({
  item,
  now,
  closed,
}: {
  item: DonationItem;
  now: number;
  closed: boolean;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const total = Number(item.quantity);
  const remaining = Number(item.quantityRemaining);
  const claimedShare = total > 0 ? (total - remaining) / total : 0;
  const live = !closed && remaining > 0;

  const origin =
    item.category === 'prepared' && item.preparedAt && item.safeWindowHours
      ? `${t('donor.cookedAt', { when: f.dayTime(item.preparedAt) })}, ${t(
          'donor.safeFor',
          {
            hours: t('donor.hours', { count: item.safeWindowHours }),
          },
        )}`
      : item.expiryDate
        ? t('donor.bestBefore', { when: f.dateMedium(item.expiryDate) })
        : '';

  return (
    <Card style={!live ? styles.dim : undefined}>
      <View style={styles.itemTop}>
        {live ? (
          <FreshnessRing
            fraction={freshnessFraction(item, now)}
            level={item.urgencyLevel}
            size={48}
            accessibilityLabel={`${t(`urgency.${item.urgencyLevel}`)}, ${f.timeLeft(item.effectiveExpiry, now)}`}
          />
        ) : (
          <View style={styles.itemIcon}>
            <Icon name={itemIcon(item)} size={22} color="textSecondary" />
          </View>
        )}
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {item.foodName}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {origin}
          </AppText>
        </View>
      </View>

      <View style={styles.qtyRow}>
        <AppText variant="secondaryStrong">
          {f.quantityOf(item.quantityRemaining, item.quantity, item.unit)}
        </AppText>
        {claimedShare > 0 ? (
          <AppText variant="caption" color="oliveText">
            {t('donor.claimedOf', {
              claimed: f.number(total - remaining),
              total: f.number(total),
            })}
          </AppText>
        ) : null}
      </View>
      <ProgressBar
        value={total > 0 ? remaining / total : 0}
        tone={live ? 'brand' : 'neutral'}
        height={6}
      />

      <View style={styles.itemBadges}>
        {live ? (
          <UrgencyBadge
            level={item.urgencyLevel}
            timeLeft={f.timeLeft(item.effectiveExpiry, now)}
            size="sm"
          />
        ) : null}
        <Badge
          size="sm"
          label={t(`categories.${item.category}`)}
          tone={item.category === 'prepared' ? 'urgent' : 'olive'}
        />
        <Badge
          size="sm"
          label={t(`storage.${item.storageType}`)}
          icon={
            item.storageType === 'frozen'
              ? 'snow-outline'
              : item.storageType === 'chilled'
                ? 'mc:fridge-outline'
                : 'sunny-outline'
          }
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  skGap: { marginTop: t.spacing.sm, marginBottom: t.spacing.lg },
  badges: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  title: { marginTop: t.spacing.sm, marginBottom: t.spacing.md },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: t.spacing.md,
  },
  pickup: { gap: t.spacing.md },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  pickupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabel: { marginBottom: t.spacing.xs },
  dim: { opacity: 0.65 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: t.spacing.sm + 4,
    marginBottom: t.spacing.xs + 2,
  },
  itemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.sm + 4,
  },
  cancel: { alignSelf: 'center', marginTop: t.spacing.lg },
}));
