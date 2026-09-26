import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  HandshakePanel,
  Icon,
  IconButton,
  InfoBanner,
  LargeTitle,
  Screen,
  SkeletonList,
  SlideToConfirm,
  TextField,
  Timeline,
  TopBar,
  useScrollY,
  useToast,
  type TimelineStep,
} from '../../components';
import { confirmPickup, fetchPendingConfirmations } from '../../api/donations.api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, useReducedMotion } from '../../theme/animations';
import type { DonorAssignment } from '../../types/assignment';
import { assignmentTone } from '../../utils/status';
import type { DonorTabProps } from '../../navigation/types';
import { setPendingPickups } from './pickupBadge';

/**
 * The donor's handovers: confirm the driver has collected the food.
 *
 * Since the coordinator approves requests, this is the donor's only step
 * after posting. Each handover shows the whole picture (who is coming, where
 * the food is going, what they are taking) and asks the donor to tick off
 * each item as it leaves, then slide to confirm. Ticking first turns
 * "confirm" from a reflex into a quick, real check, and sliding makes an
 * accidental confirmation practically impossible.
 */
export function ConfirmPickupScreen({ route }: DonorTabProps<'ConfirmPickup'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();
  const focusedId = route.params?.assignmentId;

  const [assignments, setAssignments] = useState<DonorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const rows = await fetchPendingConfirmations();
        setPendingPickups(rows.filter((a) => !a.pickupDonorConfirmedAt).length);
        // A focused assignment goes first rather than hiding the others.
        const sorted = focusedId
          ? [...rows].sort((a, b) =>
              a.assignmentId === focusedId ? -1 : b.assignmentId === focusedId ? 1 : 0,
            )
          : rows;
        setAssignments(sorted);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [focusedId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={2} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else
    empty = (
      <EmptyState
        illustration="deliverFood"
        title={t('donor.pickupsEmptyTitle')}
        message={t('donor.pickupsEmptyBody')}
      />
    );

  return (
    <Screen avoidKeyboard>
      <TopBar title={t('donor.pickupsTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : assignments}
        keyExtractor={(a) => String(a.assignmentId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <LargeTitle
            title={t('donor.pickupsTitle')}
            subtitle={t('donor.pickupsSubtitle')}
            scrollY={scrollY}
          />
        }
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
            <HandoverCard assignment={item} onConfirmed={() => void load()} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function HandoverCard({
  assignment,
  onConfirmed,
}: {
  assignment: DonorAssignment;
  onConfirmed: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const { request, driver } = assignment;
  const listing = request.listing;
  const recipient = request.recipient.organisationName ?? request.recipient.name;
  const youConfirmed = !!assignment.pickupDonorConfirmedAt;

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const allChecked = request.items.every((i) => checked[i.requestItemId]);

  const steps: TimelineStep[] = [
    { key: 'listed', title: t('donor.stepListed'), state: 'done' },
    { key: 'approved', title: t('donor.stepApproved'), state: 'done' },
    {
      key: 'driver',
      title: t('donor.stepDriver'),
      state:
        assignment.status === 'in_transit' || assignment.status === 'completed'
          ? 'done'
          : 'current',
    },
    {
      key: 'pickup',
      title: t('donor.stepPickedUp'),
      state:
        assignment.status === 'in_transit' || assignment.status === 'completed'
          ? 'done'
          : 'upcoming',
    },
    {
      key: 'delivered',
      title: t('donor.stepDelivered'),
      state: assignment.status === 'completed' ? 'done' : 'upcoming',
    },
  ];

  async function confirm() {
    try {
      const updated = await confirmPickup(assignment.assignmentId, {
        notes: notes.trim() || null,
      });
      toast.show({
        type: 'success',
        title: t('donor.pickupConfirmed'),
        message:
          updated.status === 'in_transit'
            ? t('donor.confirmedBoth')
            : t('donor.confirmedYou'),
      });
      // Let the slider's "confirmed" state show for a moment before reloading.
      setTimeout(onConfirmed, 1200);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
      throw err;
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {t('donor.deliveryNo', { id: assignment.assignmentId })}
          </AppText>
          <AppText variant="subtitle" numberOfLines={2}>
            {listing.title}
          </AppText>
        </View>
        <Badge
          label={f.status('assignment', assignment.status)}
          tone={assignmentTone[assignment.status]}
          dot
          size="sm"
        />
      </View>

      <Timeline steps={steps} orientation="horizontal" style={styles.timeline} />

      <View style={styles.driverRow}>
        <Avatar name={driver.name} size={44} icon="mc:truck-delivery-outline" />
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            {t('donor.driver')}
          </AppText>
          <AppText variant="bodyStrong">{driver.name}</AppText>
          <AppText variant="caption" color="textSecondary">
            {driver.phone}
          </AppText>
        </View>
        <IconButton
          icon="call"
          variant="filled"
          tone="olive"
          onPress={() => void Linking.openURL(`tel:${driver.phone.replace(/\s/g, '')}`)}
          accessibilityLabel={t('donor.callDriver', { name: driver.name })}
        />
      </View>

      <View style={styles.facts}>
        <Fact icon="mc:home-heart" label={t('donor.goingTo')} value={recipient} />
        <Fact
          icon="location-outline"
          label={t('donor.collectFrom')}
          value={listing.pickupAddress}
        />
        <Fact
          icon="time-outline"
          label={t('donor.windowTitle')}
          value={f.window(listing.pickupWindowStart, listing.pickupWindowEnd)}
        />
      </View>

      {assignment.noteToDriver ? (
        <InfoBanner
          tone="neutral"
          icon="chatbox-ellipses-outline"
          title={t('donor.noteFromCoordinator')}
          message={assignment.noteToDriver}
        />
      ) : null}

      <HandshakePanel
        title={t('donor.bothConfirm')}
        waitingLabel={t('donor.waiting')}
        left={{
          label: t('donor.you'),
          name: user?.organisationName ?? user?.name ?? listing.title,
          confirmedAt: assignment.pickupDonorConfirmedAt,
          confirmedText: assignment.pickupDonorConfirmedAt
            ? t('donor.confirmedAt', { when: f.time(assignment.pickupDonorConfirmedAt) })
            : undefined,
        }}
        right={{
          label: driver.name.split(' ')[0] ?? driver.name,
          name: driver.name,
          confirmedAt: assignment.pickupDriverConfirmedAt,
          confirmedText: assignment.pickupDriverConfirmedAt
            ? t('donor.confirmedAt', { when: f.time(assignment.pickupDriverConfirmedAt) })
            : undefined,
        }}
      />

      {youConfirmed ? (
        <InfoBanner
          tone="safe"
          icon="checkmark-circle"
          message={t('donor.alreadyConfirmed')}
        />
      ) : (
        <>
          <AppText variant="secondaryStrong">{t('donor.checklist')}</AppText>
          <AppText variant="caption" color="textSecondary" style={styles.hint}>
            {t('donor.checklistHint')}
          </AppText>
          {request.items.map((line) => (
            <Checkbox
              key={line.requestItemId}
              checked={!!checked[line.requestItemId]}
              onChange={(v) => setChecked((c) => ({ ...c, [line.requestItemId]: v }))}
              label={line.item.foodName}
              trailing={
                <AppText variant="secondaryStrong" color="textSecondary">
                  {f.quantity(line.quantityRequested, line.item.unit)}
                </AppText>
              }
            />
          ))}

          <TextField
            label={t('donor.handoverNotes')}
            optional
            value={notes}
            onChangeText={setNotes}
            placeholder={t('donor.handoverPlaceholder')}
            multiline
            maxLength={500}
            containerStyle={styles.notes}
          />

          <SlideToConfirm
            label={t('donor.slideToConfirm')}
            doneLabel={t('donor.pickupConfirmed')}
            onConfirm={confirm}
            disabled={!allChecked}
          />
          {!allChecked ? (
            <View style={styles.lockHint}>
              <Icon name="lock-closed-outline" size={14} color="textSecondary" />
              <AppText variant="caption" color="textSecondary">
                {t('donor.checkAllFirst')}
              </AppText>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color="brandText" />
      <View style={styles.flex}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="secondaryStrong">{value}</AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  timeline: { marginVertical: t.spacing.md },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.oliveSoft,
    marginBottom: t.spacing.md,
  },
  facts: { gap: t.spacing.sm + 4, marginBottom: t.spacing.md },
  fact: { flexDirection: 'row', gap: t.spacing.sm + 4, alignItems: 'flex-start' },
  hint: { marginBottom: t.spacing.xs },
  notes: { marginTop: t.spacing.sm },
  lockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
  },
}));
