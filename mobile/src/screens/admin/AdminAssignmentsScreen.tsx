import React from 'react';
import { View } from 'react-native';
import { AppText, Avatar, Badge, Card, Icon } from '../../components';
import { fetchAdminAssignments } from '../../api/admin.api';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import type { AdminAssignment } from '../../types/admin';
import type { AssignmentStatus } from '../../types/assignment';
import { assignmentTone } from '../../utils/status';
import { RecordList, type StatusOption } from './components/RecordList';
import type { AdminStackProps } from '../../navigation/types';

const STATUSES: AssignmentStatus[] = [
  'pending_driver',
  'accepted',
  'in_transit',
  'completed',
  'declined',
  'cancelled',
];

/**
 * Every delivery assignment, including declined ones: a decline creates a
 * new assignment row rather than overwriting the old one, so this list is
 * also the delivery history.
 */
export function AdminAssignmentsScreen(_: AdminStackProps<'AdminAssignments'>) {
  const { t } = useI18n();
  const f = useFormat();

  const statuses: StatusOption<AssignmentStatus>[] = STATUSES.map((s) => ({
    value: s,
    label: f.status('assignment', s),
    tone: assignmentTone[s],
  }));

  return (
    <RecordList
      load={fetchAdminAssignments}
      keyOf={(a) => a.assignmentId}
      statusOf={(a) => a.status}
      statuses={statuses}
      searchText={(a) =>
        [
          a.driver.name,
          a.coordinator.name,
          a.request.recipient.name,
          a.request.recipient.organisationName,
          a.request.listing.title,
          a.request.listing.donor.name,
          a.request.listing.donor.organisationName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      }
      searchPlaceholder={t('admin.searchDeliveries')}
      emptyText={t('admin.deliveriesEmpty')}
      renderItem={(assignment) => <AssignmentRow assignment={assignment} />}
    />
  );
}

function AssignmentRow({ assignment }: { assignment: AdminAssignment }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { request } = assignment;
  const donor = request.listing.donor.organisationName ?? request.listing.donor.name;
  const recipient = request.recipient.organisationName ?? request.recipient.name;

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="subtitle">
            {t('donor.deliveryNo', { id: assignment.assignmentId })}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {`${request.listing.title} · ${f.relative(assignment.createdAt)}`}
          </AppText>
        </View>
        <Badge
          size="sm"
          dot
          label={f.status('assignment', assignment.status)}
          tone={assignmentTone[assignment.status]}
        />
      </View>

      {/* Pickup and drop-off as a short route, like the driver sees it. */}
      <View style={styles.route}>
        <View style={styles.stop}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: theme.colors.brand }]} />
            <View style={styles.line} />
          </View>
          <View style={styles.stopBody}>
            <AppText variant="caption" color="textSecondary">
              {t('driver.collectFrom')}
            </AppText>
            <AppText variant="secondaryStrong" numberOfLines={1}>
              {donor}
            </AppText>
          </View>
        </View>
        <View style={styles.stop}>
          <View style={styles.rail}>
            <Icon name="location" size={16} color="olive" />
          </View>
          <View style={styles.stopBody}>
            <AppText variant="caption" color="textSecondary">
              {t('driver.deliverTo')}
            </AppText>
            <AppText variant="secondaryStrong" numberOfLines={1}>
              {recipient}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.people}>
        <Avatar name={assignment.driver.name} size={28} icon="mc:truck-outline" />
        <View style={styles.flex}>
          <AppText variant="secondaryStrong" numberOfLines={1}>
            {assignment.driver.name}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {t('admin.coordinatedBy', { name: assignment.coordinator.name })}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  route: { marginTop: t.spacing.sm + 4 },
  stop: { flexDirection: 'row', gap: t.spacing.sm + 2 },
  rail: { width: 16, alignItems: 'center', paddingTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: {
    flex: 1,
    width: 2,
    minHeight: 14,
    marginVertical: 3,
    backgroundColor: t.colors.border,
  },
  stopBody: { flex: 1, paddingBottom: t.spacing.sm },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingTop: t.spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));
