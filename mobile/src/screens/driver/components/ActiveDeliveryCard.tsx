import React, { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Card,
  Checkbox,
  HandshakePanel,
  Icon,
  InfoBanner,
  SlideToConfirm,
} from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { makeStyles, useTheme } from '../../../theme';
import type { DriverAssignment } from '../../../types/driver';
import { assignmentTone } from '../../../utils/status';
import { RouteStops } from './RouteStops';

type Phase = 'collect' | 'handover' | 'deliver';

function phaseOf(a: DriverAssignment): Phase {
  if (a.status === 'in_transit') return 'deliver';
  return a.pickupDriverConfirmedAt ? 'handover' : 'collect';
}

interface ActiveDeliveryCardProps {
  assignment: DriverAssignment;
  onConfirmPickup: () => Promise<void>;
  onConfirmDropoff: () => Promise<void>;
}

/**
 * The delivery in progress, as three plain steps: collect, hand over,
 * deliver.
 *
 * Only what the current step needs is in focus. At pickup, the load
 * checklist and the handshake with the donor; once the driver has confirmed
 * but the donor has not, a clear "waiting for the donor" state instead of a
 * dead button; once both have confirmed, the drop-off and its own slide.
 */
export function ActiveDeliveryCard({
  assignment,
  onConfirmPickup,
  onConfirmDropoff,
}: ActiveDeliveryCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { user } = useAuth();
  const { request } = assignment;
  const phase = phaseOf(assignment);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = request.items.every((_, i) => checked[i]);
  const phaseIndex = phase === 'collect' ? 0 : phase === 'handover' ? 1 : 2;

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="subtitle">{t('driver.activeTitle')}</AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {`${t('donor.deliveryNo', { id: assignment.assignmentId })} · ${request.listing.title}`}
          </AppText>
        </View>
        <Badge
          label={f.status('assignment', assignment.status)}
          tone={assignmentTone[assignment.status]}
          dot
        />
      </View>

      <View
        style={styles.steps}
        accessible
        accessibilityLabel={
          [t('driver.step1'), t('driver.step2'), t('driver.step3')][phaseIndex]
        }
      >
        {[t('driver.step1'), t('driver.step2'), t('driver.step3')].map((label, i) => {
          const done = i < phaseIndex;
          const current = i === phaseIndex;
          return (
            <React.Fragment key={label}>
              <View style={styles.step}>
                <View
                  style={[
                    styles.stepDot,
                    done && {
                      backgroundColor: theme.colors.olive,
                      borderColor: theme.colors.olive,
                    },
                    current && {
                      backgroundColor: theme.colors.brand,
                      borderColor: theme.colors.brand,
                    },
                  ]}
                >
                  {done ? (
                    <Icon name="checkmark" size={14} color={theme.colors.onOlive} />
                  ) : (
                    <AppText
                      variant="caption"
                      color={current ? 'onBrand' : 'textTertiary'}
                    >
                      {String(i + 1)}
                    </AppText>
                  )}
                </View>
                <AppText
                  variant="caption"
                  color={current ? 'text' : 'textSecondary'}
                  style={current ? styles.bold : undefined}
                >
                  {label}
                </AppText>
              </View>
              {i < 2 ? (
                <View
                  style={[
                    styles.stepLine,
                    done && { backgroundColor: theme.colors.olive },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      <RouteStops
        active={phase === 'deliver' ? 'to' : 'from'}
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

      {phase !== 'deliver' ? (
        <View style={styles.window}>
          <Icon name="time-outline" size={16} color="textSecondary" />
          <AppText variant="secondary" color="textSecondary">
            {f.window(request.listing.pickupWindowStart, request.listing.pickupWindowEnd)}
          </AppText>
        </View>
      ) : null}

      {assignment.noteToDriver ? (
        <InfoBanner
          tone="neutral"
          icon="chatbox-ellipses-outline"
          title={t('driver.note')}
          message={assignment.noteToDriver}
        />
      ) : null}

      <AppText variant="secondaryStrong" style={styles.loadTitle}>
        {t('driver.load')}
      </AppText>
      {phase === 'collect' ? (
        <>
          <AppText variant="caption" color="textSecondary">
            {t('driver.checkLoad')}
          </AppText>
          {request.items.map((line, i) => (
            <Checkbox
              key={`${line.item.foodName}-${i}`}
              checked={!!checked[i]}
              onChange={(v) => setChecked((c) => ({ ...c, [i]: v }))}
              label={line.item.foodName}
              trailing={
                <AppText variant="secondaryStrong" color="textSecondary">
                  {f.quantity(line.quantityRequested, line.item.unit)}
                </AppText>
              }
            />
          ))}
        </>
      ) : (
        <View style={styles.loadList}>
          {request.items.map((line, i) => (
            <View key={`${line.item.foodName}-${i}`} style={styles.loadRow}>
              <Icon name="checkmark-circle" size={16} color="olive" />
              <AppText variant="secondary" style={styles.flex}>
                {line.item.foodName}
              </AppText>
              <AppText variant="secondaryStrong">
                {f.quantity(line.quantityRequested, line.item.unit)}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {phase !== 'deliver' ? (
        <HandshakePanel
          title={t('driver.bothConfirm')}
          waitingLabel={t('driver.waiting')}
          left={{
            label: t('driver.you'),
            name: user?.name ?? t('driver.you'),
            confirmedAt: assignment.pickupDriverConfirmedAt,
            confirmedText: assignment.pickupDriverConfirmedAt
              ? t('driver.confirmedAt', {
                  when: f.time(assignment.pickupDriverConfirmedAt),
                })
              : undefined,
          }}
          right={{
            label: t('driver.donor'),
            name: request.listing.donor.name,
            confirmedAt: assignment.pickupDonorConfirmedAt,
            confirmedText: assignment.pickupDonorConfirmedAt
              ? t('driver.confirmedAt', {
                  when: f.time(assignment.pickupDonorConfirmedAt),
                })
              : undefined,
          }}
        />
      ) : null}

      {phase === 'collect' ? (
        <>
          <SlideToConfirm
            key="pickup"
            label={t('driver.slidePickup')}
            doneLabel={t('driver.pickupDone')}
            onConfirm={onConfirmPickup}
            disabled={!allChecked}
          />
          {!allChecked ? (
            <View style={styles.lockHint}>
              <Icon name="lock-closed-outline" size={14} color="textSecondary" />
              <AppText variant="caption" color="textSecondary">
                {t('driver.checkAllFirst')}
              </AppText>
            </View>
          ) : null}
        </>
      ) : phase === 'handover' ? (
        <InfoBanner
          tone="urgent"
          icon="hourglass-outline"
          title={t('driver.waitingDonor')}
          message={t('driver.waitingDonorBody')}
        />
      ) : (
        <SlideToConfirm
          key="dropoff"
          tone="brand"
          label={t('driver.slideDropoff')}
          doneLabel={t('driver.dropoffDone')}
          onConfirm={onConfirmDropoff}
        />
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  bold: { fontFamily: t.fonts.bold },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  steps: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: t.spacing.md },
  step: { alignItems: 'center', gap: 4, width: 72 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: t.colors.border,
    marginTop: 13,
  },
  window: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  loadTitle: { marginTop: t.spacing.xs },
  loadList: {
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  lockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
  },
}));
