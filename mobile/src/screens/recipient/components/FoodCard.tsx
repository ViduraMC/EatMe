import React from 'react';
import { View } from 'react-native';
import {
  AppText,
  Avatar,
  Card,
  FreshnessRing,
  Icon,
  UrgencyBadge,
} from '../../../components';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { makeStyles } from '../../../theme';
import type { DonationListing } from '../../../types/donation';
import { freshnessFraction } from '../../../utils/freshness';
import { itemIcon, listingUrgency, soonestItem } from '../../../utils/listing';

interface FoodCardProps {
  listing: DonationListing;
  now: number;
  onPress: () => void;
}

/**
 * A listing as a recipient sees it while browsing.
 *
 * A recipient is choosing between donations, so the card answers their
 * questions in order: how urgent is it (the ring), what is it, who is giving
 * it, when can it be collected, and how much of each food is left.
 */
export function FoodCard({ listing, now, onPress }: FoodCardProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const donor = listing.donor.organisationName ?? listing.donor.name;
  const level = listingUrgency(listing);
  const next = soonestItem(listing.items);
  const available = listing.items.filter((i) => Number(i.quantityRemaining) > 0);
  const preview = available.slice(0, 3);
  const extra = available.length - preview.length;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${listing.title}. ${t('recipient.fromDonor', { name: donor })}. ${
        next ? `${t(`urgency.${level}`)}, ${f.timeLeft(next.effectiveExpiry, now)}` : ''
      }`}
      accessibilityHint={t('common.viewDetails')}
    >
      <View style={styles.top}>
        {next ? (
          <FreshnessRing
            fraction={freshnessFraction(next, now)}
            level={level}
            size={54}
          />
        ) : null}
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {listing.title}
          </AppText>
          <View style={styles.donorRow}>
            <Avatar name={donor} size={20} />
            <AppText
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}
            >
              {donor}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.items}>
        {preview.map((item) => (
          <View key={item.itemId} style={styles.line}>
            <Icon name={itemIcon(item)} size={16} color="textSecondary" />
            <AppText variant="secondary" numberOfLines={1} style={styles.flex}>
              {item.foodName}
            </AppText>
            <AppText variant="secondaryStrong">
              {f.quantity(item.quantityRemaining, item.unit)}
            </AppText>
          </View>
        ))}
        {extra > 0 ? (
          <AppText variant="caption" color="textSecondary">
            {t('donor.moreItems', { count: extra })}
          </AppText>
        ) : null}
      </View>

      <View style={styles.footer}>
        {next ? (
          <UrgencyBadge
            level={level}
            timeLeft={f.timeLeft(next.effectiveExpiry, now)}
            size="sm"
          />
        ) : (
          <View />
        )}
        <View style={styles.when}>
          <Icon name="time-outline" size={14} color="textSecondary" />
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {f.dayTime(listing.pickupWindowStart)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 2,
    marginTop: 4,
  },
  items: {
    marginTop: t.spacing.sm + 4,
    gap: t.spacing.xs + 2,
    paddingTop: t.spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.sm + 4,
    gap: t.spacing.sm,
  },
  when: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, flexShrink: 1 },
}));
