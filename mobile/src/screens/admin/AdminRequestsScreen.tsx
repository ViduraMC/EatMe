import React from 'react';
import { View } from 'react-native';
import { AppText, Avatar, Badge, Card, Icon } from '../../components';
import { fetchAdminRequests } from '../../api/admin.api';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles } from '../../theme';
import type { AdminRequest } from '../../types/admin';
import type { RequestStatus } from '../../types/assignment';
import { requestTone } from '../../utils/status';
import { RecordList, type StatusOption } from './components/RecordList';
import type { AdminStackProps } from '../../navigation/types';

const STATUSES: RequestStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];

/**
 * Every food request, read-only: who asked, for what, from which donor,
 * and what happened to it. Useful for answering "why didn't we get the
 * food?" without opening the database.
 */
export function AdminRequestsScreen(_: AdminStackProps<'AdminRequests'>) {
  const { t } = useI18n();
  const f = useFormat();

  const statuses: StatusOption<RequestStatus>[] = STATUSES.map((s) => ({
    value: s,
    label: f.status('request', s),
    tone: requestTone[s],
  }));

  return (
    <RecordList
      load={fetchAdminRequests}
      keyOf={(r) => r.requestId}
      statusOf={(r) => r.status}
      statuses={statuses}
      searchText={(r) =>
        [
          r.recipient.name,
          r.recipient.organisationName,
          r.listing.title,
          r.listing.donor.name,
          r.listing.donor.organisationName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      }
      searchPlaceholder={t('admin.searchRequests')}
      emptyText={t('admin.requestsEmpty')}
      renderItem={(request) => <RequestRow request={request} />}
    />
  );
}

function RequestRow({ request }: { request: AdminRequest }) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const who = request.recipient.organisationName ?? request.recipient.name;
  const donor = request.listing.donor.organisationName ?? request.listing.donor.name;

  return (
    <Card>
      <View style={styles.head}>
        <Avatar name={who} size={40} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {who}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {t('coordinator.requestedWhen', { when: f.relative(request.createdAt) })}
          </AppText>
        </View>
        <Badge
          size="sm"
          dot
          label={f.status('request', request.status)}
          tone={requestTone[request.status]}
        />
      </View>

      <View style={styles.box}>
        {request.items.map((line) => (
          <View key={line.requestItemId} style={styles.line}>
            <Icon name="ellipse" size={6} color="brand" />
            <AppText variant="secondary" numberOfLines={1} style={styles.flex}>
              {line.item.foodName}
            </AppText>
            <AppText variant="secondaryStrong">
              {f.quantity(line.quantityRequested, line.item.unit)}
            </AppText>
          </View>
        ))}
        <View style={styles.from}>
          <Icon name="mc:basket-outline" size={14} color="textSecondary" />
          <AppText
            variant="caption"
            color="textSecondary"
            numberOfLines={2}
            style={styles.flex}
          >
            {`${t('coordinator.fromListing', { title: request.listing.title })} · ${donor}`}
          </AppText>
        </View>
      </View>

      {request.message ? (
        <View style={styles.quote}>
          <Icon name="chatbubble-ellipses-outline" size={15} color="textSecondary" />
          <AppText
            variant="secondary"
            color="textSecondary"
            style={[styles.flex, styles.italic]}
          >
            {request.message}
          </AppText>
        </View>
      ) : null}

      {request.status === 'rejected' && request.rejectionReason ? (
        <View style={styles.quote}>
          <Icon name="close-circle-outline" size={15} color="criticalText" />
          <AppText variant="secondary" color="criticalText" style={styles.flex}>
            {request.rejectionReason}
          </AppText>
        </View>
      ) : null}

      {request._count.assignments > 0 ? (
        <View style={styles.quote}>
          <Icon name="mc:truck-outline" size={15} color="textSecondary" />
          <AppText variant="caption" color="textSecondary">
            {t('admin.assignmentsCount', { count: request._count.assignments })}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  italic: { fontStyle: 'italic' },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  box: {
    marginTop: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    gap: t.spacing.xs + 2,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  from: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.xs,
  },
  quote: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm + 2 },
}));
