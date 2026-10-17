import React from 'react';
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Card,
  FreshnessRing,
  Icon,
  ProgressBar,
  UrgencyBadge,
} from '../../../components';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { makeStyles } from '../../../theme';
import type { DonationListing } from '../../../types/donation';
import { freshnessFraction } from '../../../utils/freshness';
import {
  claimedFraction,
  isActiveListing,
  isClosedListing,
  itemIcon,
  listingStatusTone,
  listingUrgency,
  soonestItem,
} from '../../../utils/listing';

interface ListingCardProps {
  listing: DonationListing;
  now: number;
  onPress: () => void;
}

/**
 * One listing, as the donor sees it in their list.
 *
 * Reading order follows what a donor needs to know: how urgent (the
 * freshness ring, top left), what it is, when it's being collected, what's
 * in it, and how much has been claimed. Closed listings fade back so the
 * live ones stand out.
 */
export function ListingCard({ listing, now, onPress }: ListingCardProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();

  const active = isActiveListing(listing.status);
  const closed = isClosedListing(listing.status);
  const level = listingUrgency(listing);
  const next = soonestItem(listing.items);
  const claimed = claimedFraction(listing.items);
  const percent = Math.round(claimed * 100);
  const preview = listing.items.slice(0, 2);
  const extra = listing.items.length - preview.length;

  return (
    <Card
      onPress={onPress}
      style={closed ? styles.closed : undefined}
      accessibilityLabel={`${listing.title}, ${f.status('listing', listing.status)}, ${t('common.items', { count: listing.items.length })}`}
      accessibilityHint={t('common.viewDetails')}
    >
      <View style={styles.top}>
        {next && active ? (
          <FreshnessRing
            fraction={freshnessFraction(next, now)}
            level={level}
            size={50}
          />
        ) : (
          <View style={styles.closedIcon}>
            <Icon
              name={closed ? 'archive-outline' : 'checkmark-done'}
              size={22}
              color="textSecondary"
            />
          </View>
        )}
        <View style={styles.titleCol}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {listing.title}
          </AppText>
          <View style={styles.metaRow}>
            <Icon name="time-outline" size={14} color="textSecondary" />
            <AppText
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}
            >
              {f.window(listing.pickupWindowStart, listing.pickupWindowEnd)}
            </AppText>
          </View>
        </View>
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      </View>

      <View style={styles.items}>
        {preview.map((item) => (
          <View key={item.itemId} style={styles.itemPill}>
            <Icon name={itemIcon(item)} size={14} color="textSecondary" />
            <AppText variant="caption" numberOfLines={1} style={styles.itemText}>
              {item.foodName}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {f.quantity(item.quantityRemaining, item.unit)}
            </AppText>
          </View>
        ))}
        {extra > 0 ? (
          <View style={styles.itemPill}>
            <AppText variant="caption" color="textSecondary">
              {t('donor.moreItems', { count: extra })}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <Badge
            label={f.status('listing', listing.status)}
            tone={listingStatusTone[listing.status]}
            size="sm"
          />
          {active && next ? (
            <UrgencyBadge
              level={level}
              timeLeft={f.timeLeft(next.effectiveExpiry, now)}
              size="sm"
            />
          ) : null}
        </View>
        {percent > 0 ? (
          <View style={styles.claimed}>
            <AppText variant="caption" color="textSecondary">
              {t('donor.claimedPercent', { percent })}
            </AppText>
            <ProgressBar
              value={claimed}
              tone="olive"
              height={5}
              style={styles.claimBar}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  closed: { opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  closedIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  flex: { flex: 1 },
  items: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.sm + 4,
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 1,
    maxWidth: '100%',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 5,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceMuted,
  },
  itemText: { flexShrink: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm + 4,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs + 2, flex: 1 },
  claimed: { alignItems: 'flex-end', gap: 4, width: 96 },
  claimBar: { width: 96 },
}));
