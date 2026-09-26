import React from 'react';
import { View } from 'react-native';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  useConfirm,
  useToast,
} from '../../components';
import { cancelAdminListing, fetchAdminListings } from '../../api/admin.api';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles } from '../../theme';
import type { AdminListing } from '../../types/admin';
import type { ListingStatus } from '../../types/donation';
import { listingStatusTone } from '../../utils/listing';
import { RecordList, type StatusOption } from './components/RecordList';
import type { AdminStackProps } from '../../navigation/types';

const STATUSES: ListingStatus[] = [
  'open',
  'partially_claimed',
  'fully_claimed',
  'expired',
  'cancelled',
];

/**
 * Every donation listing on the platform, for moderation. An administrator
 * can take down an open listing that breaks the rules; the server only
 * allows this while nothing has been claimed, so the button only appears
 * on open listings.
 */
export function AdminListingsScreen(_: AdminStackProps<'AdminListings'>) {
  const { t } = useI18n();
  const f = useFormat();

  const statuses: StatusOption<ListingStatus>[] = STATUSES.map((s) => ({
    value: s,
    label: f.status('listing', s),
    tone: listingStatusTone[s],
  }));

  return (
    <RecordList
      load={fetchAdminListings}
      keyOf={(l) => l.listingId}
      statusOf={(l) => l.status}
      statuses={statuses}
      searchText={(l) =>
        `${l.title} ${l.donor.name} ${l.donor.organisationName ?? ''} ${l.pickupAddress}`.toLowerCase()
      }
      searchPlaceholder={t('admin.searchListings')}
      emptyText={t('admin.listingsEmpty')}
      renderItem={(listing, replace) => (
        <ListingRow listing={listing} onChange={replace} />
      )}
    />
  );
}

function ListingRow({
  listing,
  onChange,
}: {
  listing: AdminListing;
  onChange: (next: AdminListing) => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const [removing, setRemoving] = React.useState(false);
  const donor = listing.donor.organisationName ?? listing.donor.name;

  async function remove() {
    const ok = await confirm({
      title: t('admin.removeTitle'),
      message: t('admin.removeBody'),
      confirmLabel: t('admin.remove'),
      tone: 'critical',
      icon: 'eye-off-outline',
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const updated = await cancelAdminListing(listing.listingId);
      onChange({ ...listing, ...updated, donor: listing.donor, _count: listing._count });
      toast.show({ type: 'success', title: t('admin.removedToast') });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="subtitle" numberOfLines={2}>
            {listing.title}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {f.relative(listing.createdAt)}
          </AppText>
        </View>
        <Badge
          size="sm"
          dot
          label={f.status('listing', listing.status)}
          tone={listingStatusTone[listing.status]}
        />
      </View>

      <View style={styles.donor}>
        <Avatar name={donor} size={32} />
        <View style={styles.flex}>
          <AppText variant="secondaryStrong" numberOfLines={1}>
            {donor}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {listing.donor.email}
          </AppText>
        </View>
      </View>

      <View style={styles.meta}>
        <Icon name="time-outline" size={15} color="textSecondary" />
        <AppText variant="secondary" color="textSecondary" style={styles.flex}>
          {f.window(listing.pickupWindowStart, listing.pickupWindowEnd)}
        </AppText>
      </View>
      <View style={styles.meta}>
        <Icon name="location-outline" size={15} color="textSecondary" />
        <AppText
          variant="secondary"
          color="textSecondary"
          style={styles.flex}
          numberOfLines={2}
        >
          {listing.pickupAddress}
        </AppText>
      </View>
      <View style={styles.meta}>
        <Icon name="hand-left-outline" size={15} color="textSecondary" />
        <AppText variant="secondary" color="textSecondary" style={styles.flex}>
          {t('admin.requestsCount', { count: listing._count.requests })}
        </AppText>
      </View>

      {listing.status === 'open' ? (
        <Button
          label={t('admin.remove')}
          icon="eye-off-outline"
          variant="dangerGhost"
          size="sm"
          inline
          loading={removing}
          onPress={() => void remove()}
          style={styles.action}
        />
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  donor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm + 4,
    marginBottom: t.spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.sm,
    marginTop: t.spacing.xs + 2,
  },
  action: { marginTop: t.spacing.sm, marginLeft: -t.spacing.sm },
}));
