import React from 'react';
import { View } from 'react-native';
import { AppText, Badge, Card, Icon, type IconName } from '../../../components';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { makeStyles, useTheme } from '../../../theme';
import type { DriverAssignment } from '../../../types/driver';
import { assignmentTone } from '../../../utils/status';

const ICON: Partial<Record<DriverAssignment['status'], IconName>> = {
  completed: 'checkmark-circle',
  declined: 'close-circle',
  cancelled: 'remove-circle',
};

/** One past delivery: what, to whom, when, and how it ended. */
export function HistoryRow({
  assignment,
  now,
}: {
  assignment: DriverAssignment;
  now: number;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const tone = theme.tone(assignmentTone[assignment.status]);
  const completed = assignment.status === 'completed';

  return (
    <Card variant="flat" style={styles.row}>
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <Icon
          name={ICON[assignment.status] ?? 'ellipse-outline'}
          size={22}
          color={tone.fg}
        />
      </View>
      <View style={styles.flex}>
        <AppText variant="secondaryStrong" numberOfLines={1}>
          {assignment.request.listing.title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {`${assignment.request.listing.donor.name} → ${assignment.request.recipient.name}`}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {completed && assignment.completedAt
            ? t('driver.completedOn', { when: f.relative(assignment.completedAt, now) })
            : t('driver.assignedOn', { when: f.relative(assignment.assignedAt, now) })}
        </AppText>
        {assignment.status === 'declined' && assignment.declineReason ? (
          <AppText variant="caption" color="criticalText" numberOfLines={2}>
            {t('donor.reason', { reason: assignment.declineReason })}
          </AppText>
        ) : null}
      </View>
      <Badge
        label={f.status('assignment', assignment.status)}
        tone={assignmentTone[assignment.status]}
        size="sm"
      />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: t.spacing.sm + 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 1 },
}));
