import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  LargeTitle,
  Screen,
  SkeletonList,
  Timeline,
  TopBar,
  useScrollY,
} from '../../components';
import { fetchAssignments } from '../../api/assignments.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, useReducedMotion } from '../../theme/animations';
import type { AssignmentStatus, CoordinatorAssignment } from '../../types/assignment';
import { compactSteps } from '../../utils/assignmentTimeline';
import { assignmentTone } from '../../utils/status';
import type { CoordinatorTabProps } from '../../navigation/types';

type Filter = 'all' | AssignmentStatus;
const FILTERS: Filter[] = [
  'all',
  'declined',
  'pending_driver',
  'accepted',
  'in_transit',
  'completed',
  'cancelled',
];

/**
 * Every delivery and where it is.
 *
 * A declined delivery is the one that needs the coordinator, so it is
 * listed with its filter first and its card offers "Reassign" directly. The
 * tiles on the home tab open this list already filtered.
 */
export function AssignmentsListScreen({
  navigation,
  route,
}: CoordinatorTabProps<'AssignmentsList'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const now = useNow(60_000);
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>([]);
  const [filter, setFilter] = useState<Filter>(route.params?.status ?? 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // A tile on the home tab can open this list with a status already chosen.
  useEffect(() => {
    if (route.params?.status) setFilter(route.params.status);
  }, [route.params?.status]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setAssignments(await fetchAssignments());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const c = { all: assignments.length } as Record<Filter, number>;
    FILTERS.forEach((key) => {
      if (key !== 'all') c[key] = assignments.filter((a) => a.status === key).length;
    });
    return c;
  }, [assignments]);

  const visible =
    filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const header = (
    <View>
      <LargeTitle
        title={t('coordinator.deliveriesTitle')}
        subtitle={t('coordinator.deliveriesSubtitle')}
        scrollY={scrollY}
      />
      {!loading && !error && assignments.length > 0 ? (
        <ChipRow style={styles.chips}>
          {FILTERS.filter(
            (key) => key === 'all' || counts[key] > 0 || key === filter,
          ).map((key) => (
            <Chip
              key={key}
              label={key === 'all' ? t('common.all') : f.status('assignment', key)}
              count={counts[key]}
              tone={key === 'all' ? 'brand' : assignmentTone[key]}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={3} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else if (assignments.length === 0)
    empty = (
      <EmptyState
        illustration="deliverFood"
        title={t('coordinator.deliveriesEmptyTitle')}
        message={t('coordinator.deliveriesEmptyBody')}
      />
    );
  else
    empty = (
      <EmptyState
        compact
        illustration="allClear"
        title={t('coordinator.deliveriesFilterEmpty')}
      />
    );

  return (
    <Screen>
      <TopBar title={t('coordinator.deliveriesTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(a) => String(a.assignmentId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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
        renderItem={({ item, index }) => (
          <Animated.View entering={enterListItem(index, reduced)}>
            <DeliveryCard
              assignment={item}
              now={now}
              onOpen={() =>
                navigation.navigate('AssignmentDetail', {
                  assignmentId: item.assignmentId,
                })
              }
            />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function DeliveryCard({
  assignment,
  now,
  onOpen,
}: {
  assignment: CoordinatorAssignment;
  now: number;
  onOpen: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const recipient =
    assignment.request.recipient.organisationName ?? assignment.request.recipient.name;
  const declined = assignment.status === 'declined';

  return (
    <Card
      onPress={onOpen}
      variant={declined ? 'flat' : 'raised'}
      style={declined ? styles.declined : undefined}
      accessibilityLabel={`${t('donor.deliveryNo', { id: assignment.assignmentId })}, ${assignment.request.listing.title}, ${f.status('assignment', assignment.status)}`}
      accessibilityHint={t('common.viewDetails')}
    >
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {t('donor.deliveryNo', { id: assignment.assignmentId })}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {assignment.request.listing.title}
          </AppText>
        </View>
        <Badge
          label={f.status('assignment', assignment.status)}
          tone={assignmentTone[assignment.status]}
          dot={
            assignment.status === 'in_transit' || assignment.status === 'pending_driver'
          }
          size="sm"
        />
      </View>

      <Timeline
        steps={compactSteps(assignment)}
        orientation="horizontal"
        style={styles.track}
      />

      <View style={styles.people}>
        <View style={styles.person}>
          <Avatar
            name={assignment.driver.name}
            size={28}
            icon="mc:truck-delivery-outline"
          />
          <AppText variant="caption" numberOfLines={1} style={styles.flex}>
            {assignment.driver.name}
          </AppText>
        </View>
        <Icon name="arrow-forward" size={14} color="textTertiary" />
        <View style={styles.person}>
          <Avatar name={recipient} size={28} icon="mc:home-heart" />
          <AppText variant="caption" numberOfLines={1} style={styles.flex}>
            {recipient}
          </AppText>
        </View>
      </View>

      {declined ? (
        <View style={styles.declineRow}>
          <AppText
            variant="caption"
            color="criticalText"
            style={styles.flex}
            numberOfLines={2}
          >
            {assignment.declineReason
              ? t('coordinator.declineReason', { reason: assignment.declineReason })
              : t('coordinator.declinedBy', { name: assignment.driver.name })}
          </AppText>
          <Button
            label={t('coordinator.reassign')}
            size="sm"
            inline
            icon="refresh"
            onPress={onOpen}
          />
        </View>
      ) : (
        <AppText variant="caption" color="textTertiary" style={styles.when}>
          {t('coordinator.assignedWhen', {
            when: f.relative(assignment.assignedAt, now),
          })}
        </AppText>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  chips: { marginBottom: t.spacing.md },
  flex: { flex: 1 },
  declined: { borderColor: t.colors.critical, backgroundColor: t.colors.criticalSoft },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  track: { marginVertical: t.spacing.md, paddingHorizontal: t.spacing.xs },
  people: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs + 2 },
  declineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm + 4,
  },
  when: { marginTop: t.spacing.sm + 4 },
}));
