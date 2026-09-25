import React from 'react';
import { View } from 'react-native';
import { AppText, Badge, Button, Card, Icon } from '../../../components';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { makeStyles } from '../../../theme';
import type { DriverAssignment } from '../../../types/driver';
import { RouteStops } from './RouteStops';

interface NewDeliveryCardProps {
  assignment: DriverAssignment;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * A delivery the coordinator has just sent. It shows everything needed to
 * decide in one look (where from, where to, when, how much) so the driver
 * can accept or decline without opening anything else.
 */
export function NewDeliveryCard({
  assignment,
  accepting,
  onAccept,
  onDecline,
}: NewDeliveryCardProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { request } = assignment;

  return (
    <Card variant="flat" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{t('driver.newTitle')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {t('donor.deliveryNo', { id: assignment.assignmentId })}
          </AppText>
        </View>
        <Badge label={t('driver.newBadge')} tone="brand" dot />
      </View>

      <RouteStops
        from={{
          name: request.listing.donor.name,
          detail: request.listing.pickupAddress,
          phone: request.listing.donor.phone,
        }}
        to={{
          name: request.recipient.name,
          detail: request.recipient.address,
          phone: request.recipient.phone,
        }}
      />

      <View style={styles.meta}>
        <Icon name="time-outline" size={16} color="textSecondary" />
        <AppText variant="secondary" color="textSecondary" style={styles.flex}>
          {f.window(request.listing.pickupWindowStart, request.listing.pickupWindowEnd)}
        </AppText>
      </View>
      <View style={styles.meta}>
        <Icon name="mc:package-variant" size={16} color="textSecondary" />
        <AppText
          variant="secondary"
          color="textSecondary"
          style={styles.flex}
          numberOfLines={2}
        >
          {request.items
            .map(
              (i) =>
                `${i.item.foodName} (${f.quantity(i.quantityRequested, i.item.unit)})`,
            )
            .join(', ')}
        </AppText>
      </View>

      {assignment.noteToDriver ? (
        <View style={styles.note}>
          <Icon name="chatbox-ellipses-outline" size={16} color="textSecondary" />
          <AppText variant="secondary" style={styles.flex}>
            {assignment.noteToDriver}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('driver.decline')}
          variant="secondary"
          onPress={onDecline}
          style={styles.flex}
          disabled={accepting}
        />
        <Button
          label={t('driver.accept')}
          variant="success"
          icon="checkmark"
          onPress={onAccept}
          loading={accepting}
          style={styles.flexWide}
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderColor: t.colors.brand,
    borderWidth: 1.5,
    backgroundColor: t.colors.surface,
  },
  flex: { flex: 1 },
  flexWide: { flex: 1.6 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
  note: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  actions: { flexDirection: 'row', gap: t.spacing.sm + 4, marginTop: t.spacing.md },
}));
