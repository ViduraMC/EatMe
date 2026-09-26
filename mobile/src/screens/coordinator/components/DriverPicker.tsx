import React from 'react';
import { View } from 'react-native';
import { AppText, Badge, ChoiceCard, EmptyState } from '../../../components';
import { useI18n } from '../../../i18n';
import { makeStyles } from '../../../theme';
import type { DriverInfo } from '../../../types/assignment';

interface DriverPickerProps {
  drivers: DriverInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** A driver who should not be offered again, e.g. the one who declined. */
  excludeId?: number;
}

/**
 * Drivers as large selectable cards, available ones first.
 *
 * Unavailable drivers stay visible but disabled, under their own heading,
 * so the coordinator can see the whole team at a glance and understand why
 * someone cannot be picked, instead of wondering where they went.
 */
export function DriverPicker({
  drivers,
  selectedId,
  onSelect,
  excludeId,
}: DriverPickerProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const pool = drivers.filter((d) => d.userId !== excludeId);
  const available = pool.filter((d) => d.isAvailable);
  const unavailable = pool.filter((d) => !d.isAvailable);

  if (pool.length === 0) {
    return (
      <EmptyState
        compact
        illustration="deliverFood"
        title={t('coordinator.noDrivers')}
        message={t('coordinator.noDriversBody')}
      />
    );
  }

  return (
    <View>
      {available.length > 0 ? (
        <AppText variant="overline" color="textSecondary" style={styles.group}>
          {`${t('coordinator.availableDrivers')} · ${available.length}`}
        </AppText>
      ) : null}
      {available.map((d) => (
        <ChoiceCard
          key={d.userId}
          title={d.name}
          description={d.phone}
          icon="mc:truck-delivery-outline"
          tone="olive"
          selected={selectedId === d.userId}
          onPress={() => onSelect(d.userId)}
          footer={
            <Badge
              label={t('settings.available')}
              tone="safe"
              dot
              size="sm"
              style={styles.badge}
            />
          }
        />
      ))}
      {unavailable.length > 0 ? (
        <AppText variant="overline" color="textSecondary" style={styles.group}>
          {`${t('coordinator.unavailableDrivers')} · ${unavailable.length}`}
        </AppText>
      ) : null}
      {unavailable.map((d) => (
        <ChoiceCard
          key={d.userId}
          title={d.name}
          description={d.phone}
          icon="mc:truck-outline"
          tone="neutral"
          selected={false}
          disabled
          onPress={() => undefined}
          footer={
            <Badge label={t('settings.unavailable')} size="sm" style={styles.badge} />
          }
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  group: { marginTop: t.spacing.sm, marginBottom: t.spacing.sm },
  badge: { marginTop: t.spacing.xs },
}));
