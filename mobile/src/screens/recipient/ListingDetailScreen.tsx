import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  FreshnessRing,
  Icon,
  InfoBanner,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  UrgencyBadge,
} from '../../components';
import { fetchListing } from '../../api/donations.api';
import { fetchMyRequests } from '../../api/requests.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import type { DonationListing } from '../../types/donation';
import type { DonationRequest } from '../../types/request';
import { freshnessFraction } from '../../utils/freshness';
import { isActiveListing, itemIcon } from '../../utils/listing';
import type { RecipientStackProps } from '../../navigation/types';

/**
 * One listing, before a recipient requests from it.
 *
 * If this recipient has already asked for this listing, that is said first,
 * with the request's status. It stops a busy person sending a duplicate
 * request because they forgot they had already asked this morning.
 */
export function ListingDetailScreen({
  navigation,
  route,
}: RecipientStackProps<'ListingDetail'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const now = useNow();
  const reduced = useReducedMotion();
  const { listingId } = route.params;

  const [listing, setListing] = useState<DonationListing | null>(null);
  const [existing, setExisting] = useState<DonationRequest | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const [found, mine] = await Promise.all([
          fetchListing(listingId),
          fetchMyRequests(),
        ]);
        setListing(found);
        setExisting(
          mine.find(
            (r) =>
              r.listingId === listingId &&
              (r.status === 'pending' || r.status === 'accepted'),
          ) ?? null,
        );
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
          <Skeleton width="75%" height={28} />
          <Skeleton width="45%" height={16} style={styles.skGap} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const donor = listing.donor.organisationName ?? listing.donor.name;
  const available = listing.items.filter((i) => Number(i.quantityRemaining) > 0);
  const canRequest = isActiveListing(listing.status) && available.length > 0 && !existing;

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        canRequest ? (
          <Button
            label={t('recipient.requestFood')}
            icon="mc:basket-plus-outline"
            size="lg"
            onPress={() => navigation.navigate('CreateRequest', { listingId })}
          />
        ) : existing ? (
          <Button
            label={t('recipient.viewMyRequests')}
            variant="secondary"
            size="lg"
            onPress={() => navigation.navigate('RecipientTabs', { screen: 'MyRequests' })}
          />
        ) : undefined
      }
    >
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
          <AppText variant="title" accessibilityRole="header">
            {listing.title}
          </AppText>
          <Card variant="flat" style={styles.donor}>
            <Avatar
              name={donor}
              size={44}
              icon={listing.donor.organisationName ? 'business' : undefined}
            />
            <View style={styles.flex}>
              <AppText variant="caption" color="textSecondary">
                {t('recipient.donatedBy')}
              </AppText>
              <AppText variant="bodyStrong">{donor}</AppText>
            </View>
          </Card>

          {existing ? (
            <InfoBanner
              tone="info"
              icon="checkmark-done-circle-outline"
              title={t('recipient.alreadyRequested', {
                when: f.relative(existing.createdAt, now),
              })}
              message={t('recipient.alreadyRequestedBody', {
                status: f.status('request', existing.status),
              })}
            />
          ) : null}
          {available.length === 0 ? (
            <InfoBanner
              tone="neutral"
              icon="checkmark-done"
              message={t('recipient.noLongerAvailable')}
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <Card variant="flat" style={styles.pickup}>
            <Row
              icon="location"
              label={t('donor.pickupTitle')}
              value={listing.pickupAddress}
            />
            <Row
              icon="time"
              label={t('donor.windowTitle')}
              value={f.window(listing.pickupWindowStart, listing.pickupWindowEnd)}
            />
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
        {listing.items.map((item, index) => {
          const left = Number(item.quantityRemaining) > 0;
          return (
            <Animated.View key={item.itemId} entering={enterListItem(index, reduced)}>
              <Card style={!left ? styles.dim : undefined}>
                <View style={styles.itemRow}>
                  {left ? (
                    <FreshnessRing
                      fraction={freshnessFraction(item, now)}
                      level={item.urgencyLevel}
                      size={46}
                    />
                  ) : (
                    <View style={styles.itemIcon}>
                      <Icon name={itemIcon(item)} size={20} color="textSecondary" />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>
                      {item.foodName}
                    </AppText>
                    <AppText variant="secondary" color="textSecondary">
                      {t('recipient.available', {
                        qty: f.quantity(item.quantityRemaining, item.unit),
                      })}
                    </AppText>
                  </View>
                </View>
                <View style={styles.badges}>
                  {left ? (
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
                  <Badge size="sm" label={t(`storage.${item.storageType}`)} />
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: 'location' | 'time';
  label: string;
  value: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color="brandText" />
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="callout">{value}</AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  skGap: { marginTop: t.spacing.sm, marginBottom: t.spacing.lg },
  donor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginTop: t.spacing.md,
  },
  pickup: { gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesLabel: { marginBottom: t.spacing.xs },
  dim: { opacity: 0.55 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.sm + 4,
  },
}));
